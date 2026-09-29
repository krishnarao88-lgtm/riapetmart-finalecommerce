import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyTelegram, tg } from "@/lib/telegram";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Records a real page view (record=true) and returns the last-24h count. { cartVariantId } counts an add-to-cart instead. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.cartVariantId !== undefined) {
    const variant = String(body.cartVariantId);
    if (!UUID.test(variant)) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const supabase = await createClient();
    await supabase.rpc("record_cart_add", { p_variant_id: variant });
    const { data: v } = await supabase.from("variants").select("title, price, products(name)").eq("id", variant).maybeSingle();
    const name = (v?.products as unknown as { name: string } | null)?.name;
    if (v && name) await notifyTelegram(`➕ <b>Added to cart</b>: ${tg(name)} (${tg(v.title)}) · RM ${tg(Number(v.price).toFixed(2))}`);
    return NextResponse.json({ ok: true });
  }
  const id = String(body?.productId ?? "");
  if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const supabase = await createClient();
  if (body?.record === true) await supabase.rpc("record_product_view", { p_product_id: id });
  const { data } = await supabase.rpc("product_view_count", { p_product_id: id });
  return NextResponse.json({ count: Number(data ?? 0) });
}
