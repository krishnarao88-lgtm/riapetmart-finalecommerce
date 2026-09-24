"use server";

import { redirect } from "next/navigation";
import { getSessionPendingMfa, requireStaff } from "@/lib/auth";
import { isTotpCode, safeAdminPath, verifiedTotp } from "@/lib/mfa";

export type SetupState = { factorId: string; qrCode: string; secret: string; error?: string } | { error: string } | null;

/** First submit enrolls a new TOTP factor and returns its QR code; later submits check the code to activate it. */
export async function setUpMfa(prev: SetupState, formData: FormData): Promise<SetupState> {
  if (prev && "factorId" in prev) return confirmMfaSetup(prev, formData);

  const { supabase, user } = await requireStaff();
  if (verifiedTotp(user.factors)) redirect("/admin/security");

  // Leftovers from abandoned attempts would clash with the new factor's friendly name.
  for (const f of user.factors ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Ria Pet Mart admin" });
  if (error) return { error: "Couldn't start set-up. Refresh the page and try again." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

async function confirmMfaSetup(prev: { factorId: string; qrCode: string; secret: string }, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!isTotpCode(code)) return { ...prev, error: "Enter the 6-digit code from your authenticator app." };

  const { supabase } = await requireStaff();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: prev.factorId, code });
  if (error) return { ...prev, error: "That code didn't match. Check your phone's clock and try the newest code." };
  redirect("/admin/security?status=on");
}

export async function turnOffMfa(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!isTotpCode(code)) redirect("/admin/security?error=code");

  const { supabase, user } = await requireStaff();
  const factor = verifiedTotp(user.factors);
  if (!factor) redirect("/admin/security");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) redirect("/admin/security?error=code");
  const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  redirect(removeError ? "/admin/security?error=off" : "/admin/security?status=off");
}

export async function verifyMfaStep(formData: FormData) {
  const next = safeAdminPath(formData.get("next"));
  const code = String(formData.get("code") ?? "").trim();
  const retry = `/admin/mfa?error=code&next=${encodeURIComponent(next)}`;
  if (!isTotpCode(code)) redirect(retry);

  const { supabase, user } = await getSessionPendingMfa();
  const factor = verifiedTotp(user.factors);
  if (!factor) redirect(next);
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  redirect(error ? retry : next);
}
