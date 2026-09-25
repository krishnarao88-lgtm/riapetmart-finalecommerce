import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setNewPassword } from "../actions";

export const metadata: Metadata = { title: "New password", robots: { index: false } };

const errors: Record<string, string> = {
  short: "Use at least 8 characters.",
  same: "That's your current password. Pick a new one.",
  failed: "We couldn't save that password. Request a new reset link and try again.",
};

/** Opened from the reset email (the link signs the customer in first), or from the account page. */
export default async function NewPassword({ searchParams }: PageProps<"/account/password">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?error=link");
  const { error } = await searchParams;
  const message = typeof error === "string" ? errors[error] : undefined;

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="grid gap-2">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Set a new password</h1>
        <p className="text-choc-2">For {user.email}. You&apos;ll stay logged in on this device.</p>
      </div>
      <form action={setNewPassword} className="grid gap-4 rounded-2xl card-soft bg-surface p-5">
        <label className="grid gap-2 font-semibold text-choc">
          New password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="min-h-12 rounded-xl border border-choc/40 bg-cream px-3 text-base font-normal text-choc"
          />
          <span className="text-xs font-normal text-choc-2">At least 8 characters.</span>
        </label>
        {message && (
          <p role="alert" className="text-sm font-medium text-bad-fg">
            {message}
          </p>
        )}
        <button type="submit" className="btn-bubble bg-terracotta px-6 py-3 text-cream">
          <KeyRound className="size-5" aria-hidden /> Save password
        </button>
      </form>
    </div>
  );
}
