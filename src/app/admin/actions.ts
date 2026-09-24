"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/login?error=email");

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/admin` },
  });

  redirect(error ? "/admin/login?error=send" : "/admin/login?sent=1");
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/login?error=email");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=password");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function moderateReview(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["approved", "rejected"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("reviews").update({ status }).eq("id", id);
  redirect("/admin/reviews");
}

export async function inviteStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/staff?error=email");

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_staff", { p_email: email });
  redirect(error ? "/admin/staff?error=1" : "/admin/staff?invited=1");
}

export async function removeStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  await supabase.rpc("remove_staff", { p_email: email });
  redirect("/admin/staff");
}
