"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { cancelEasyParcelShipment, getEasyParcelQuote, isSandboxAwb, submitEasyParcelOrder } from "@/lib/shipping/easyparcel";
import { EP_CANCELLED } from "@/lib/shipping/easyparcel-status";
import { bookLalamoveOrder, cancelLalamoveOrder } from "@/lib/shipping/lalamove";
import { MY_STATES } from "@/lib/my-states";
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

/** Owner types the courier's real charge (from the EasyParcel/Lalamove bill) when it wasn't recorded at booking. */
export async function setCourierCost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const orderId = String(formData.get("order_id") ?? "");
  const raw = String(formData.get("courier_cost") ?? "").trim();
  const cost = raw === "" ? null : Number(raw);
  if (!orderId || (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 2000))) {
    throw new Error("Enter the courier cost in RM, e.g. 12.50.");
  }
  const { error } = await supabase.from("orders").update({ courier_cost: cost }).eq("id", orderId);
  if (error) throw new Error(`Couldn't save the courier cost: ${error.message}`);
  revalidatePath("/admin/finance");
}

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Booked = waiting for collection, so the order moves to "packed" (couriers then move it to shipped/delivered). */
async function markPacked(supabase: Db, orderId: string) {
  await supabase.from("orders").update({ fulfilment_status: "packed" }).eq("id", orderId).eq("fulfilment_status", "new");
}

/** Books EasyParcel for an order. `replacing` skips the "already booked" guard after the old booking was cancelled. */
async function easyParcelBook(supabase: Db, orderId: string, receiverName: string, receiverPhone: string, replacing = false): Promise<ActionState> {
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
  const rebookable = replacing || isSandboxAwb(order.easyparcel_awb_number) || order.easyparcel_status_code === EP_CANCELLED;
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
    // EasyParcel's booking reply has no price; ask for this exact service's price for the per-order profit.
    const priced = await getEasyParcelQuote(address.postcode, address.state, weightKg, order.shipping_service_id).catch(() => null);
    // New waybill: forget the old shipment's courier status so the badge starts fresh.
    await supabase
      .from("orders")
      .update({ easyparcel_status_code: null, easyparcel_status: null, easyparcel_status_at: null, courier_cost: priced?.price ?? null })
      .eq("id", orderId);
    await markPacked(supabase, orderId);
    revalidatePath("/admin/orders");
    return { ok: `Booked with ${result.courierName}. Refresh to see the waybill link.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed." };
  }
}

/** Books a Lalamove rider for an order. `replacing` skips the "already booked" guard after the old ride was cancelled. */
async function lalamoveBook(supabase: Db, orderId: string, receiverName: string, receiverPhone: string | null, replacing = false): Promise<ActionState> {
  if (!receiverName) return { error: "Receiver name is required." };
  if (!receiverPhone) return { error: "Enter a Malaysian mobile number (e.g. 012-345 6789)." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, status, shipping_method, shipping_address, items, customer_email, lalamove_order_id, lalamove_status")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid" || order.shipping_method !== "lalamove") return { error: "This order isn't a paid Lalamove order." };
  if (!replacing && order.lalamove_order_id && !LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "")) {
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
      .update({
        lalamove_order_id: booked.orderId,
        lalamove_status: booked.status,
        lalamove_share_link: booked.shareLink,
        courier_cost: Number(booked.price) || null,
      })
      .eq("id", orderId);
    if (error) return { error: `Rider booked (Lalamove ${booked.orderId}) but saving failed: ${error.message}. Don't book again.` };
    await markPacked(supabase, orderId);

    if (order.customer_email && booked.shareLink) {
      await sendTemplate(order.customer_email, onItsWay(ref, booked.shareLink)).catch(() => undefined); // the booking stands even if the email fails
    }
    revalidatePath("/admin/orders");
    return { ok: `Rider booked (RM${booked.price}). Lalamove is finding a driver.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed." };
  }
}

export async function bookEasyParcelShipment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  return easyParcelBook(
    supabase,
    String(formData.get("order_id")),
    String(formData.get("receiver_name") ?? "").trim(),
    String(formData.get("receiver_phone") ?? "").trim(),
  );
}

export async function bookLalamoveRider(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  return lalamoveBook(
    supabase,
    String(formData.get("order_id")),
    String(formData.get("receiver_name") ?? "").trim(),
    toE164MY(String(formData.get("receiver_phone") ?? "")),
  );
}

// EasyParcel codes once the courier has the parcel (shipped, delivered, returned, failed…): too late to change.
const EP_COLLECTED = new Set([3, 4, 5, 6, 8, 11]);

/**
 * Customer asked (e.g. on WhatsApp) to change their address or contact details. Saves them on the order; if a courier
 * is booked but hasn't collected yet, cancels that booking and books again to the new address.
 */
export async function updateShippingDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = String(formData.get("order_id") ?? "");
  const name = String(formData.get("customer_name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("customer_phone") ?? "").trim().slice(0, 20);
  const addressLine = String(formData.get("address_line") ?? "").trim().slice(0, 200);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const postcode = String(formData.get("postcode") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  if (!name || phone.replace(/\D/g, "").length < 9) return { error: "Enter the customer's name and a phone number." };

  const { data: order } = await supabase
    .from("orders")
    .select("status, shipping_method, easyparcel_awb_number, easyparcel_awb_url, easyparcel_status_code, lalamove_order_id, lalamove_status")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "paid") return { error: "Only paid orders can be changed." };
  const pickup = order.shipping_method === "pickup";
  if (!pickup && (!addressLine || !/^\d{5}$/.test(postcode) || !MY_STATES.includes(state))) {
    return { error: "Enter the full address, a 5-digit postcode and the state." };
  }

  const epBooked = !!order.easyparcel_awb_number && !isSandboxAwb(order.easyparcel_awb_number) && order.easyparcel_status_code !== EP_CANCELLED;
  const lmBooked = !!order.lalamove_order_id && !LALAMOVE_REBOOKABLE.includes(order.lalamove_status ?? "");
  if ((epBooked && EP_COLLECTED.has(order.easyparcel_status_code ?? -1)) || (lmBooked && ["PICKED_UP", "COMPLETED"].includes(order.lalamove_status ?? ""))) {
    return { error: "The courier already has this parcel, so the address can't be changed here. Contact EasyParcel or Lalamove support." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      customer_name: name,
      customer_phone: phone,
      ...(pickup ? {} : { shipping_address: { addressLine, city, postcode, state } }),
    })
    .eq("id", orderId);
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath("/admin/orders");

  if (epBooked) {
    try {
      await cancelEasyParcelShipment(order.easyparcel_awb_number as string, order.easyparcel_awb_url, "Customer changed delivery details");
    } catch (err) {
      return { error: `Details saved, but the old EasyParcel booking couldn't be cancelled (${err instanceof Error ? err.message : "error"}). Cancel it in EasyParcel, then book again here.` };
    }
    const rebooked = await easyParcelBook(supabase, orderId, name, phone, true);
    return rebooked?.ok
      ? { ok: `Details saved. Old courier booking cancelled (refunded to your EasyParcel wallet) and rebooked: ${rebooked?.ok} Print the new waybill.` }
      : { error: `Details saved and the old booking cancelled, but rebooking failed: ${rebooked?.error} Book again below.` };
  }
  if (lmBooked) {
    try {
      await cancelLalamoveOrder(order.lalamove_order_id as string);
    } catch (err) {
      return { error: `Details saved, but the Lalamove rider couldn't be cancelled (${err instanceof Error ? err.message : "error"}). Cancel it in the Lalamove app, then book again here.` };
    }
    const rebooked = await lalamoveBook(supabase, orderId, name, toE164MY(phone), true);
    return rebooked?.ok
      ? { ok: `Details saved. Old rider cancelled and a new one booked: ${rebooked?.ok}` }
      : { error: `Details saved and the old rider cancelled, but rebooking failed: ${rebooked?.error} Book again below.` };
  }
  return { ok: "Details saved. The courier will get the new details when you book." };
}
