import "server-only";
import type Stripe from "stripe";
import { getShipmentCharges, isSandboxAwb } from "@/lib/shipping/easyparcel";
import { getLalamoveOrder } from "@/lib/shipping/lalamove";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

type Row = {
  id: string;
  stripe_payment_intent: string | null;
  payment_fee: number | null;
  courier_cost: number | null;
  easyparcel_awb_number: string | null;
  lalamove_order_id: string | null;
};

/**
 * Fills in the real money for recent paid orders so Finance shows actual profit, not estimates:
 * Stripe's processing fee, what EasyParcel charged (re-read until 60 days old, so a reweigh adjustment shows up),
 * and the Lalamove fare. Runs when Finance opens and before the 9pm summary. Never throws; returns orders updated.
 */
export async function syncOrderCosts(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("orders")
      .select("id, stripe_payment_intent, payment_fee, courier_cost, easyparcel_awb_number, lalamove_order_id")
      .eq("status", "paid")
      .eq("is_test", false)
      .gte("created_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
      .limit(200);
    const orders = (data ?? []) as Row[];
    const updates = new Map<string, { payment_fee?: number; courier_cost?: number }>();
    const set = (id: string, patch: { payment_fee?: number; courier_cost?: number }) =>
      updates.set(id, { ...updates.get(id), ...patch });

    // Stripe: the fee is on the charge's balance transaction (it appears once the payment settles).
    const stripe = getStripe();
    for (const o of orders.filter((o) => o.payment_fee == null && o.stripe_payment_intent).slice(0, 20)) {
      const pi = await stripe.paymentIntents
        .retrieve(o.stripe_payment_intent as string, { expand: ["latest_charge.balance_transaction"] })
        .catch(() => null);
      const bt = (pi?.latest_charge as Stripe.Charge | null)?.balance_transaction;
      if (bt && typeof bt === "object") set(o.id, { payment_fee: bt.fee / 100 });
    }

    // EasyParcel: one list call covers every waybill.
    const awbs = orders.map((o) => o.easyparcel_awb_number).filter((a): a is string => !!a && !isSandboxAwb(a));
    const charges = await getShipmentCharges(awbs);
    for (const o of orders) {
      const charge = o.easyparcel_awb_number ? charges.get(o.easyparcel_awb_number) : undefined;
      if (charge !== undefined && charge !== Number(o.courier_cost)) set(o.id, { courier_cost: charge });
    }

    // Lalamove: the fare is fixed at booking, so fetch it once.
    for (const o of orders.filter((o) => o.lalamove_order_id && o.courier_cost == null).slice(0, 10)) {
      const ride = await getLalamoveOrder(o.lalamove_order_id as string).catch(() => null);
      if (ride?.price) set(o.id, { courier_cost: ride.price });
    }

    for (const [id, patch] of updates) await supabase.from("orders").update(patch).eq("id", id);
    return updates.size;
  } catch (err) {
    console.error("Order cost sync failed:", err);
    return 0;
  }
}
