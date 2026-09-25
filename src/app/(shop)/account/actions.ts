"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN = "/account/login";

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function fields(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function logIn(formData: FormData) {
  const { email, password } = fields(formData);
  if (!EMAIL.test(email) || !password) redirect(`${LOGIN}?error=missing`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`${LOGIN}?error=${error.code === "email_not_confirmed" ? "unconfirmed" : "wrong"}`);
  redirect("/account");
}

export async function signUp(formData: FormData) {
  const { email, password } = fields(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!EMAIL.test(email)) redirect(`${LOGIN}?mode=signup&error=email`);
  if (password.length < 8) redirect(`${LOGIN}?mode=signup&error=short`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name || undefined },
      emailRedirectTo: `${await origin()}/auth/callback?next=/account&login=${LOGIN}`,
    },
  });
  if (error) redirect(`${LOGIN}?mode=signup&error=${error.code === "weak_password" ? "short" : "signup"}`);
  // With email confirmation on there's no session yet: the customer confirms from their inbox first.
  redirect(data.session ? "/account" : `${LOGIN}?sent=confirm`);
}

export async function forgotPassword(formData: FormData) {
  const { email } = fields(formData);
  if (!EMAIL.test(email)) redirect(`${LOGIN}?mode=forgot&error=email`);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/account/password&login=${LOGIN}`,
  });
  // Same answer whether or not the email has an account, so the form can't be used to look people up.
  redirect(`${LOGIN}?sent=reset`);
}

export async function setNewPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/account/password?error=short");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/account/password?error=${error.code === "same_password" ? "same" : "failed"}`);
  redirect("/account?password=changed");
}

export async function signOutAccount() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN);
}
