"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { setUpMfa } from "@/app/admin/security/actions";
import { CodeField } from "./code-field";

export function MfaSetup() {
  const [state, action, pending] = useActionState(setUpMfa, null);
  const enrolling = state && "factorId" in state;

  return (
    <form action={action} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 shadow-[var(--shadow-chunk)]">
      {enrolling ? (
        <>
          <ol className="grid list-decimal gap-2 pl-5 text-ink-2">
            <li>Open an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
            <li>Scan this QR code, or type the setup key instead.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- one-off SVG data URL from Supabase */}
          <img src={state.qrCode} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl border-2 border-line bg-white p-2" />
          <p className="grid gap-1 text-sm">
            <span className="font-semibold">Setup key</span>
            <code className="break-all rounded-xl border-2 border-line bg-ground px-3 py-2">{state.secret}</code>
          </p>
          <CodeField error={state.error} />
          <button type="submit" disabled={pending} className="btn-chunk bg-tangerine">
            <ShieldCheck className="size-5" aria-hidden /> Turn on 2-step verification
          </button>
        </>
      ) : (
        <>
          {state?.error && (
            <p role="alert" className="text-sm font-medium text-bad-fg">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-chunk bg-tangerine">
            <ShieldCheck className="size-5" aria-hidden /> Turn on
          </button>
        </>
      )}
    </form>
  );
}
