import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email, items, subtotal } = (await req.json()) as {
    email?: string;
    items?: unknown;
    subtotal?: number;
  };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !items || typeof subtotal !== "number") {
    return NextResponse.json({ error: "Invalid cart data" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_abandoned_cart", {
    p_email: email,
    p_items: items,
    p_subtotal: subtotal,
  });
  if (error) return NextResponse.json({ error: "Could not save cart" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
