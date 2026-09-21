import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_newsletter_signup", { p_email: email });
  if (error) return NextResponse.json({ error: "Could not save your email" }, { status: 500 });

  return NextResponse.json({ code: "WELCOME10" });
}
