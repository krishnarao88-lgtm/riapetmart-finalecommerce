import { NextResponse } from "next/server";
import { getLalamoveOrder } from "@/lib/shipping/lalamove";
import { fulfilmentForLalamove } from "@/lib/shipping/lalamove-rules";
import { createServiceClient } from "@/lib/supabase/service";

const STEP_ORDER = ["new", "packed", "shipped", "delivered"];

// Lalamove posts order events here. The payload is only trusted for the order id: the status is
// re-read from Lalamove's API with our own keys, so a forged call can't move an order.
// Always 200 for events we don't act on — Lalamove needs a 200 to keep the webhook enabled.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const lalamoveId: unknown = body?.data?.order?.orderId;
  if (typeof lalamoveId !== "string" || !lalamoveId) return NextResponse.json({ ok: true });

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, fulfilment_status")
    .eq("lalamove_order_id", lalamoveId)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  let live;
  try {
    live = await getLalamoveOrder(lalamoveId);
  } catch {
    return NextResponse.json({ error: "Could not verify with Lalamove" }, { status: 502 });
  }

  const update: Record<string, string | null> = { lalamove_status: live.status, lalamove_share_link: live.shareLink };
  const step = fulfilmentForLalamove(live.status);
  // Only move forward (events can arrive out of order) and never touch cancelled/refunded orders.
  const current = STEP_ORDER.indexOf(order.fulfilment_status);
  if (step && current !== -1 && STEP_ORDER.indexOf(step) > current) update.fulfilment_status = step;

  const { error } = await supabase.from("orders").update(update).eq("id", order.id);
  if (error) return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
