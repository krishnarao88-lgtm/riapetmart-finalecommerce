import { ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { CodeField } from "@/components/admin/code-field";
import { MfaSetup } from "@/components/admin/mfa-setup";
import { requireStaff } from "@/lib/auth";
import { verifiedTotp } from "@/lib/mfa";
import { turnOffMfa } from "./actions";

export const metadata: Metadata = { title: "Sign-in security", robots: { index: false } };

const notices: Record<string, string> = {
  on: "2-step verification is on. You'll be asked for a code each time you sign in.",
  off: "2-step verification is off.",
};
const errors: Record<string, string> = {
  code: "That code didn't match. Check your phone's clock and try the newest code.",
  off: "Couldn't turn it off. Try again in a minute.",
};

export default async function SecurityPage({ searchParams }: PageProps<"/admin/security">) {
  const { user } = await requireStaff();
  const { status, error } = await searchParams;
  const notice = typeof status === "string" ? notices[status] : undefined;
  const message = typeof error === "string" ? errors[error] : undefined;
  const on = Boolean(verifiedTotp(user.factors));

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Sign-in security</h1>
        <p className="text-ink-2">
          2-step verification asks for a code from an authenticator app on your phone after your password or
          email link, so a stolen password alone can&apos;t open the admin.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border-2 border-ok-fg bg-ok-bg px-3 py-2 text-sm text-ok-fg">
          {notice}
        </p>
      )}

      <p className="font-semibold">
        2-step verification is <span className={on ? "text-ok-fg" : "text-bad-fg"}>{on ? "on" : "off"}</span> for{" "}
        {user.email}.
      </p>

      {on ? (
        <form action={turnOffMfa} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 shadow-[var(--shadow-chunk)]">
          <p className="text-ink-2">To turn it off, enter a current code from your authenticator app.</p>
          <CodeField error={message} />
          <button type="submit" className="btn-chunk bg-surface">
            <ShieldOff className="size-5" aria-hidden /> Turn off
          </button>
        </form>
      ) : (
        <MfaSetup />
      )}
    </div>
  );
}
