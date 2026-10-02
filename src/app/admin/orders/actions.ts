"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isSandboxAwb, submitEasyParcelOrder } from "@/lib/shipping/easyparcel";
import { EP_CANCELLED } from "@/lib/shipping/easyparcel-status";
import { bookLalamoveOrder } from "@/lib/shipping/lalamove";
import { LALAMOVE_REBOOKABLE, toE164MY } from "@/lib/shipping/lalamove-rules";
import { lineGrams, parcelKg } from "@/lib/shipping/parcel";
import { sendTemplate } from "@/lib/resend";
import { site } from "@/lib/site";
import { onItsWay } from "@/lib/emails";

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

/** Same packed weight the checkout quoted, so the courier's reweigh matches what we declared. */
async function orderParcelKg(supabase: SupabaseClient, items: OrderItem[]): Promise<number> {
  const { data: variants } = await supabase
    .from("variants")
    .select("id, weight_grams, products(categories(name))")
    .in("id", items.map((i) => i.variant_id));
  const byId = new Map(
    ((variants ?? []) as unknown as { id: string; weight_grams: number | null; products: { categories: { name: string } | null } | null }[])
      .map((v) => [v.id, v]),
  );
  const grams = items.reduce((sum, i) => {
    const v = byId.get(i.variant_id);
    return sum + lineGrams(v?.weight_grams ?? null, i.qty, v?.products?.categories?.name);
  }, 0);
  return parcelKg(grams);
}
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
    .select("order_number, shipping_method, shipping_service_id, shipping_address, items, easyparcel_order_number, easyparcel_awb_number, easyparcel_status_code")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return { error: "Order not found." };
  // A sandbox (test) waybill or a shipment the courier cancelled isn't a live booking, so it can be replaced.
  const rebookable = isSandboxAwb(order.easyparcel_awb_number) || order.easyparcel_status_code === EP_CANCELLED;
  if (order.easyparcel_order_number && !rebookable) {
    return { error: "This order is already booked." };
  }
  if (order.shipping_method !== "easyparcel" || !order.shipping_service_id) {
    return { error: "This order isn't set up for EasyParcel booking." };
  }

  const address = order.shipping_address as ShippingAddress;
  if (!address) return { error: "No delivery address on file for this order." };

  const items = order.items as unknown as OrderItem[];
  const weightKg = await orderParcelKg(supabase, items);

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
    // New waybill: forget the old shipment's courier status so the badge starts fresh.
    await supabase
      .from("orders")
      .update({ easyparcel_status_code: null, easyparcel_status: null, easyparcel_status_at: null })
      .eq("id", orderId);
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
  const weightKg = await orderParcelKg(supabase, items);
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
      await sendTemplate(order.customer_email, onItsWay(ref, booked.shareLink)).catch(() => undefined); // the booking stands even if the email fails
    }
    revalidatePath("/admin/orders");
    return { ok: `Rider booked (RM${booked.price}). Lalamove is finding a driver.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed." };
  }
}
