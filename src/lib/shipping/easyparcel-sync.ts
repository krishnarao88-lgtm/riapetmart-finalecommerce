import "server-only";
import { getTrackingStatuses } from "@/lib/shipping/easyparcel";
import { EP_PROBLEM, EP_STATUS, fulfilmentForEasyParcel } from "@/lib/shipping/easyparcel-status";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

/**
 * Pulls the real courier status from EasyParcel and saves any change on the order (and moves it to
 * shipped/delivered). Called by the EasyParcel webhook for one waybill, and by Admin → Orders for every
 * shipment still on its way. Returns how many orders changed. Never throws.
 */
export async function syncEasyParcelStatuses(onlyAwb?: string): Promise<number> {
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("orders")
      .select("id, order_number, fulfilment_status, easyparcel_awb_number, easyparcel_status_code")
      .eq("shipping_method", "easyparcel")
      .not("easyparcel_awb_number", "is", null)
      .not("easyparcel_awb_number", "like", "EPSAMPLE%");
    query = onlyAwb
      ? query.eq("easyparcel_awb_number", onlyAwb)
      : query
          .in("fulfilment_status", ["new", "packed", "shipped"])
          .gte("created_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
          .limit(100);
    const { data: orders } = await query;
    if (!orders?.length) return 0;

    const results = await getTrackingStatuses(orders.map((o) => o.easyparcel_awb_number as string));
    let changed = 0;
    for (const r of results) {
      const order = orders.find((o) => o.easyparcel_awb_number === r.awb_number);
      const code = r.latest_shipment_status_code;
      if (!order || order.easyparcel_status_code === code) continue;
      const step = fulfilmentForEasyParcel(code, order.fulfilment_status);
      await supabase
        .from("orders")
        .update({
          easyparcel_status_code: code,
          easyparcel_status: r.latest_tracking_status || EP_STATUS[code] || `Status ${code}`,
          easyparcel_status_at: new Date().toISOString(),
          ...(step && { fulfilment_status: step }),
        })
        .eq("id", order.id);
      changed += 1;
      if (code === 5 || EP_PROBLEM.has(code)) {
        await notifyTelegram(
          `${code === 5 ? "📦✅" : "📦⚠️"} <b>${tg(order.order_number)}</b> courier: ${tg(EP_STATUS[code] ?? r.latest_tracking_status)}` +
            (code === 0 ? "\nShipment cancelled: book it again in Admin → Orders." : ""),
        );
      }
    }
    return changed;
  } catch (err) {
    console.error("EasyParcel status sync failed:", err);
    return 0;
  }
}
