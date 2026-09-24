import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { verifyMfaStep } from "@/app/admin/security/actions";
import { CodeField } from "@/components/admin/code-field";
import { getSessionPendingMfa } from "@/lib/auth";
import { mfaStepRequired, safeAdminPath } from "@/lib/mfa";

export const metadata: Metadata = { title: "2-step verification", robots: { index: false } };

export default async function MfaPage({ searchParams }: PageProps<"/admin/mfa">) {
  const { supabase, user } = await getSessionPendingMfa();
  const { next, error } = await searchParams;
  const target = safeAdminPath(next);
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!mfaStepRequired(data?.currentLevel, user.factors)) redirect(target);

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="grid gap-2">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">2-step verification</h1>
        <p className="text-ink-2">Open your authenticator app and enter the 6-digit code for Ria Pet Mart.</p>
      </div>

      <form action={verifyMfaStep} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 shadow-[var(--shadow-chunk)]">
        <input type="hidden" name="next" value={target} />
        <CodeField error={error === "code" ? "That code didn't match. Try the newest code in the app." : undefined} />
        <button type="submit" className="btn-chunk bg-tangerine">
          <ShieldCheck className="size-5" aria-hidden /> Verify
        </button>
      </form>

      <form action={signOut} className="grid gap-2 text-center text-sm text-ink-2">
        <p>Lost your phone? Ask the shop owner to reset 2-step verification for {user.email}.</p>
        <button type="submit" className="min-h-11 font-semibold underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
