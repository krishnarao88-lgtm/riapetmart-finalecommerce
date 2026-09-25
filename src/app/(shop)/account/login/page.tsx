import { KeyRound, LogIn, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forgotPassword, logIn, signUp } from "../actions";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

const errors: Record<string, string> = {
  missing: "Enter your email and password.",
  wrong: "That email and password don't match. Try again, or reset your password below.",
  unconfirmed: "Please confirm your email first: tap the link we sent when you signed up.",
  email: "Enter a valid email address, like name@example.com.",
  short: "Use at least 8 characters for your password.",
  signup: "We couldn't create that account. If you've signed up before, log in or reset your password.",
  link: "That link has expired or was already used. Log in, or request a new one below.",
};

const sentMessages: Record<string, string> = {
  confirm: "Almost done! We've emailed you a link to confirm your address. Tap it and you're in.",
  reset: "If that email has an account, a password reset link is on its way. Check your spam folder too.",
};

const field = "min-h-12 rounded-xl border border-choc/40 bg-cream px-3 text-base font-normal text-choc";
const labelCls = "grid gap-2 font-semibold text-choc";

function Email() {
  return (
    <label className={labelCls}>
      Email
      <input name="email" type="email" required autoComplete="email" className={field} />
    </label>
  );
}

export default async function AccountLogin({ searchParams }: PageProps<"/account/login">) {
  const { sent, error, mode: modeParam } = await searchParams;
  const mode = modeParam === "signup" || modeParam === "forgot" ? modeParam : "login";
  const message = typeof error === "string" ? errors[error] : undefined;
  const notice = typeof sent === "string" ? sentMessages[sent] : undefined;

  const tabs = [
    { key: "login", label: "Log in", href: "/account/login" },
    { key: "signup", label: "Create account", href: "/account/login?mode=signup" },
  ];

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="grid gap-2">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="text-choc-2">
          {mode === "signup"
            ? "Track orders, reorder in one tap and get restock reminders. Use the email from your past orders to see them here."
            : mode === "forgot"
              ? "Enter your email and we'll send you a link to set a new password."
              : "Log in to see your orders and reorder your pet's favourites."}
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-2xl card-soft bg-cream p-4 font-semibold text-choc">
          {notice}
        </p>
      )}

      <div className="grid gap-4 rounded-2xl card-soft bg-surface p-5">
        {mode !== "forgot" && (
          <nav aria-label="Log in or create account" className="grid grid-cols-2 gap-1 rounded-full bg-peach/40 p-1">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={mode === t.key ? "page" : undefined}
                className={`rounded-full py-2 text-center text-sm font-bold ${mode === t.key ? "bg-surface text-choc shadow-sm" : "text-choc-2"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        {message && (
          <p role="alert" className="text-sm font-medium text-bad-fg">
            {message}
          </p>
        )}

        {mode === "login" && (
          <form action={logIn} className="grid gap-4">
            <Email />
            <label className={labelCls}>
              Password
              <input name="password" type="password" required autoComplete="current-password" className={field} />
            </label>
            <button type="submit" className="btn-bubble bg-terracotta px-6 py-3 text-cream">
              <LogIn className="size-5" aria-hidden /> Log in
            </button>
            <Link href="/account/login?mode=forgot" className="text-center text-sm text-choc-2 underline">
              Forgot your password?
            </Link>
          </form>
        )}

        {mode === "signup" && (
          <form action={signUp} className="grid gap-4">
            <label className={labelCls}>
              Your name
              <input name="name" type="text" autoComplete="name" className={field} />
            </label>
            <Email />
            <label className={labelCls}>
              Password
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
              <span className="text-xs font-normal text-choc-2">At least 8 characters.</span>
            </label>
            <button type="submit" className="btn-bubble bg-terracotta px-6 py-3 text-cream">
              <UserPlus className="size-5" aria-hidden /> Create account
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form action={forgotPassword} className="grid gap-4">
            <Email />
            <button type="submit" className="btn-bubble bg-terracotta px-6 py-3 text-cream">
              <KeyRound className="size-5" aria-hidden /> Send reset link
            </button>
            <Link href="/account/login" className="text-center text-sm text-choc-2 underline">
              Back to log in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
