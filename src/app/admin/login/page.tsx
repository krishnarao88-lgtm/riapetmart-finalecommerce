import { Lock, Mail } from "lucide-react";
import type { Metadata } from "next";
import { sendMagicLink, signInWithPassword } from "../actions";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

const errors: Record<string, string> = {
  email: "Enter a valid email address, like name@example.com.",
  send: "We couldn't send the sign-in link. Wait a minute, then try again.",
  link: "That sign-in link has expired or was already used. Request a new one below.",
  password: "Wrong email or password. Try again.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const { sent, error } = await searchParams;
  const message = typeof error === "string" ? errors[error] : undefined;

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="grid gap-2">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Staff sign in</h1>
        <p className="text-ink-2">Sign in with your password, or request a one-time email link.</p>
      </div>

      <form action={signInWithPassword} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 shadow-[var(--shadow-chunk)]">
        <label htmlFor="password-email" className="grid gap-2 font-semibold">
          Work email
          <input
            id="password-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-12 rounded-xl border-2 border-line bg-ground px-3 text-base font-normal focus:border-grape"
          />
        </label>
        <label htmlFor="password" className="grid gap-2 font-semibold">
          Password
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={error === "password"}
            aria-describedby={message ? "login-error" : undefined}
            className="min-h-12 rounded-xl border-2 border-line bg-ground px-3 text-base font-normal focus:border-grape"
          />
        </label>
        {message && (
          <p id="login-error" role="alert" className="text-sm font-medium text-bad-fg">
            {message}
          </p>
        )}
        <button type="submit" className="btn-chunk bg-tangerine">
          <Lock className="size-5" aria-hidden /> Sign in
        </button>
      </form>

      <p className="text-center text-sm text-ink-2">or</p>

      {sent ? (
        <p role="status" className="rounded-[var(--radius-chunk)] border-2 border-ink bg-ok-bg p-4 font-medium text-ok-fg">
          Check your inbox. The link signs you in on this device and expires in 1 hour.
        </p>
      ) : (
        <form action={sendMagicLink} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 shadow-[var(--shadow-chunk)]">
          <label htmlFor="email" className="grid gap-2 font-semibold">
            Work email
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={error === "email"}
              aria-describedby={message ? "login-error" : undefined}
              className="min-h-12 rounded-xl border-2 border-line bg-ground px-3 text-base font-normal focus:border-grape"
            />
          </label>
          <button type="submit" className="btn-chunk bg-surface">
            <Mail className="size-5" aria-hidden /> Email me a sign-in link
          </button>
        </form>
      )}
    </div>
  );
}
