import { NextResponse } from "next/server";
import { syncEasyParcelStatuses } from "@/lib/shipping/easyparcel-sync";

/**
 * EasyParcel webhook (topics: Shipment Status Update, Tracking Status Update). EasyParcel doesn't sign these,
 * so the payload is only a nudge: we take the waybill number and ask EasyParcel for the real status, which
 * means a forged call can't change an order. Always answers 200 so EasyParcel doesn't retry forever.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { awb_number?: unknown } | null;
  const awb = typeof body?.awb_number === "string" ? body.awb_number.trim().slice(0, 64) : "";
  if (awb) await syncEasyParcelStatuses(awb);
  return NextResponse.json({ received: true });
}
