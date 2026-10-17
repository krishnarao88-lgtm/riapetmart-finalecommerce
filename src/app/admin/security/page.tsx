import { ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { CodeField } from "@/components/admin/code-field";
import { btnSecondary, Notice, PageHeader, pageWrap } from "@/components/admin/form-parts";
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
    <div className={pageWrap}>
      <div className="grid w-full max-w-2xl gap-5">
        <PageHeader
          title="Sign-in security"
          description="2-step verification asks for a code from an authenticator app on your phone after your password or email link, so a stolen password alone can't open the admin."
        />

        {notice && <Notice tone="ok">{notice}</Notice>}

        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-cream/70 p-3 font-semibold text-choc">
          {on ? (
            <ShieldCheck className="size-5 shrink-0 text-ok-fg" aria-hidden />
          ) : (
            <ShieldOff className="size-5 shrink-0 text-bad-fg" aria-hidden />
          )}
          <span>
            2-step verification is{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-sm font-bold ${on ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}`}
            >
              {on ? "on" : "off"}
            </span>{" "}
            for <span className="break-all">{user.email}</span>.
          </span>
        </p>

        {on ? (
          <form
            action={turnOffMfa}
            className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]"
          >
            <p className="text-ink-2">To turn it off, enter a current code from your authenticator app.</p>
            <CodeField error={message} />
            <button type="submit" className={`${btnSecondary} w-fit`}>
              <ShieldOff className="size-5" aria-hidden /> Turn off
            </button>
          </form>
        ) : (
          <MfaSetup />
        )}
      </div>
    </div>
  );
}
