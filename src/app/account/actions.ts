"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendAccountMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/account/login?error=email");

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/account&login=/account/login` },
  });

  redirect(error ? "/account/login?error=send" : "/account/login?sent=1");
}

export async function signOutAccount() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/account/login");
}
