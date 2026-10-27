import { allow, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

export async function POST(req: Request) {
  if (!allow(`cart:${clientIp(req)}`, 15)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }
  const { email, items, subtotal } = (await req.json()) as {
    email?: string;
    items?: unknown;
    subtotal?: number;
  };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Array.isArray(items) || items.length > 50 || typeof subtotal !== "number" || !Number.isFinite(subtotal)) {
    return NextResponse.json({ error: "Invalid cart data" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("save_abandoned_cart", {
    p_email: email,
    p_items: items,
    p_subtotal: subtotal,
  });
  if (error) return NextResponse.json({ error: "Could not save cart" }, { status: 500 });

  await notifyTelegram(`🧺 <b>Cart saved</b> by ${tg(email)} · ${items.length} item${items.length === 1 ? "" : "s"} · RM ${tg(subtotal.toFixed(2))} (not checked out yet)`);
  return NextResponse.json({ ok: true });
}
