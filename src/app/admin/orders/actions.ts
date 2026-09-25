"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { submitEasyParcelOrder } from "@/lib/shipping/easyparcel";
import { bookLalamoveOrder } from "@/lib/shipping/lalamove";
import { LALAMOVE_REBOOKABLE, toE164MY } from "@/lib/shipping/lalamove-rules";
import { sendEmail } from "@/lib/resend";
import { site } from "@/lib/site";

export type ActionState = { ok?: string; error?: string } | null;

const FULFILMENT_STATUSES = ["new", "packed", "shipped", "delivered", "cancelled", "refunded"] as const;
export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

// Admin-only: orders RLS gives staff SELECT but not UPDATE.
export async function setFulfilmentStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("fulfilment_status") ?? "");
  if (!orderId || !FULFILMENT_STATUSES.includes(status as FulfilmentStatus)) {
    throw new Error("Invalid fulfilment update.");
  }

  const { error } = await supabase.from("orders").update({ fulfilment_status: status }).eq("id", orderId);
  if (error) throw new Error(`Couldn't update the order: ${error.message}`);
  revalidatePath("/admin/orders");
}

type OrderItem = { variant_id: string; name: string; title: string; qty: number; price: number };
type ShippingAddress = { addressLine: string; city: string; postcode: string; state: string } | null;

export async function bookEasyParcelShipment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = String(formData.get("order_id"));
  const receiverName = String(formData.get("receiver_name") ?? "").trim();
  const receiverPhone = String(formData.get("receiver_phone") ?? "").trim();

  if (!receiverName || !receiverPhone) {
    return { error: "Receiver name and phone number are required to book with EasyParcel." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number, shipping_method, shipping_service_id, shipping_address, items, easyparcel_order_number")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return { error: "Order not found." };
  if (order.easyparcel_order_number) return { error: "This order is already booked." };
  if (order.shipping_method !== "easyparcel" || !order.shipping_service_id) {
    return { error: "This order isn't set up for EasyParcel booking." };
  }

  const address = order.shipping_address as ShippingAddress;
  if (!address) return { error: "No delivery address on file for this order." };

  const items = order.items as unknown as OrderItem[];
  const { data: variants } = await supabase
    .from("variants")
    .select("id, weight_grams")
    .in("id", items.map((i) => i.variant_id));
  const weightByVariant = new Map((variants ?? []).map((v) => [v.id, v.weight_grams ?? 500]));
  const totalGrams = items.reduce((sum, i) => sum + (weightByVariant.get(i.variant_id) ?? 500) * i.qty, 0);
  const weightKg = Math.max(0.5, totalGrams / 1000);

  try {
    const result = await submitEasyParcelOrder(
      order.shipping_service_id,
      weightKg,
      { name: receiverName, phone: receiverPhone, addressLine: address.addressLine, city: address.city, postcode: address.postcode, state: address.state },
      order.order_number ?? orderId.slice(0, 8),
    );
    await supabase.rpc("save_easyparcel_booking", {
      p_order_id: orderId,
      p_order_number: result.orderNumber,
      p_awb_number: result.awbNumber,
      p_awb_url: result.awbUrl,
      p_tracking_url: result.trackingUrl,
    });
    revalidatePath("/admin/orders");
    return { ok: `Booked with ${result.courierName}. Refresh to see the waybill link.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed." };
  }
}

export async function bookLalamoveRider(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = String(formData.get("order_id"));
  const receiverName = String(formData.get("receiver_name") ?? "").trim();
  const receiverPhone = toE164MY(String(formData.get("receiver_phone") ?? ""));
  if (!receiverName) return { error: "Receiver name is required." };
  if (!receiverPhone) return { error: "Enter a Malaysian mobile number (e.g. 012-345 6789)." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, status, shipping_method, shipping_address, items, customer_email, lalamove_order_id, lalamove_status")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid" || order.shipping_method !== "lalamove") return { error: "This order isn't a paid Lalamove order." };
  if (order.lalamove_order_id && !LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "")) {
    return { error: "A rider is already booked for this order." };
  }
  const address = order.shipping_address as ShippingAddress;
  if (!address) return { error: "No delivery address on file for this order." };

  const items = order.items as unknown as OrderItem[];
  const { data: variants } = await supabase.from("variants").select("id, weight_grams").in("id", items.map((i) => i.variant_id));
  const weightByVariant = new Map((variants ?? []).map((v) => [v.id, v.weight_grams ?? 500]));
  const weightKg = items.reduce((sum, i) => sum + (weightByVariant.get(i.variant_id) ?? 500) * i.qty, 0) / 1000;
  const ref = order.order_number ?? `#${orderId.slice(0, 8).toUpperCase()}`;

  try {
    const booked = await bookLalamoveOrder({
      dropoffAddress: `${address.addressLine}, ${address.city}, ${address.postcode} ${address.state}, Malaysia`,
      weightKg,
      recipientName: receiverName,
      recipientPhone: receiverPhone,
      remarks: `${site.name} order ${ref}`,
      orderRef: ref,
    });
    const { error } = await supabase
      .from("orders")
      .update({ lalamove_order_id: booked.orderId, lalamove_status: booked.status, lalamove_share_link: booked.shareLink })
      .eq("id", orderId);
    if (error) return { error: `Rider booked (Lalamove ${booked.orderId}) but saving failed: ${error.message}. Don't book again.` };

    if (order.customer_email && booked.shareLink) {
      await sendEmail(order.customer_email, `Your order ${ref} is on its way — ${site.name}`, {
        preheader: "A Lalamove rider is heading your way. Track it live.",
        heading: "Your order is on its way",
        paragraphs: [`We've booked a Lalamove rider for order ${ref}. You can follow the rider live on the map.`],
        cta: { label: "Track your delivery", url: booked.shareLink },
        note: "The rider may call you on arrival. Please keep your phone nearby.",
      }).catch(() => undefined); // the booking stands even if the email fails
    }
    revalidatePath("/admin/orders");
    return { ok: `Rider booked (RM${booked.price}). Lalamove is finding a driver.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed." };
  }
}
