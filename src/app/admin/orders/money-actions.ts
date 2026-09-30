"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { formatMyr } from "@/lib/pricing";
import { cancelEasyParcelShipment } from "@/lib/shipping/easyparcel";
import { EP_CANCELLED } from "@/lib/shipping/easyparcel-status";
import { getStripe } from "@/lib/stripe";
import type { ActionState } from "./actions";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Refunds a paid order through Stripe: the rest of what was charged by default, or a smaller amount.
 * The Stripe webhook records it too; saving here makes the badge show straight away.
 */
export async function refundOrder(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = String(f.get("order_id") ?? "");
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, status, total, code_discount, refunded_amount, stripe_payment_intent")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "paid" || !order.stripe_payment_intent) return { error: "Only paid card/FPX orders can be refunded here." };

  // What the customer actually paid: order total minus any promo code taken off at Stripe checkout.
  const charged = round2(Number(order.total) - Number(order.code_discount ?? 0));
  const already = Number(order.refunded_amount ?? 0);
  const left = round2(charged - already);
  const typed = String(f.get("amount") ?? "").trim();
  const amount = typed ? round2(Number(typed)) : left;
  if (!(amount > 0) || amount > left) return { error: `Enter an amount up to ${formatMyr(left)} (what's left to refund).` };

  try {
    await getStripe().refunds.create(
      { payment_intent: order.stripe_payment_intent, amount: Math.round(amount * 100), reason: "requested_by_customer", metadata: { order_number: order.order_number ?? orderId } },
      // Same order + same running total = same refund, so a double click can't refund twice.
      { idempotencyKey: `refund-${orderId}-${Math.round((already + amount) * 100)}` },
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe couldn't refund this payment." };
  }
  const total = round2(already + amount);
  await supabase
    .from("orders")
    .update({ refunded_amount: total, ...(total >= charged && { fulfilment_status: "refunded" }) })
    .eq("id", orderId);
  revalidatePath("/admin/orders");
  return { ok: `Refunded ${formatMyr(amount)}. The customer sees it in 5–10 working days.` };
}

/** Cancels the EasyParcel booking (before the courier collects). EasyParcel credits the charge back to the wallet. */
export async function cancelCourierBooking(_prev: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const orderId = String(f.get("order_id") ?? "");
  const { data: order } = await supabase
    .from("orders")
    .select("easyparcel_awb_number, easyparcel_awb_url, easyparcel_status_code")
    .eq("id", orderId)
    .single();
  if (!order?.easyparcel_awb_number) return { error: "This order has no EasyParcel booking." };
  if (order.easyparcel_status_code === EP_CANCELLED) return { error: "This shipment is already cancelled." };

  try {
    await cancelEasyParcelShipment(order.easyparcel_awb_number, order.easyparcel_awb_url, String(f.get("remark") ?? ""));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "EasyParcel couldn't cancel this shipment." };
  }
  await supabase
    .from("orders")
    .update({ easyparcel_status_code: EP_CANCELLED, easyparcel_status: "Cancelled", easyparcel_status_at: new Date().toISOString() })
    .eq("id", orderId);
  revalidatePath("/admin/orders");
  return { ok: "Shipment cancelled. You can book it again, or refund the order." };
}
