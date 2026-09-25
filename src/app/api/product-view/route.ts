import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Records a real page view (record=true) and returns the last-24h count. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.productId ?? "");
  if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const supabase = await createClient();
  if (body?.record === true) await supabase.rpc("record_product_view", { p_product_id: id });
  const { data } = await supabase.rpc("product_view_count", { p_product_id: id });
  return NextResponse.json({ count: Number(data ?? 0) });
}
