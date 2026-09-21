"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { submitEasyParcelOrder } from "@/lib/shipping/easyparcel";

export type ActionState = { ok?: string; error?: string } | null;

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
    .select("shipping_method, shipping_service_id, shipping_address, items, easyparcel_order_number")
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
      orderId.slice(0, 8),
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
