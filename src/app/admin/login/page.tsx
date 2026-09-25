import { Mail, PawPrint } from "lucide-react";
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

  const input =
    "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-ink-3 focus:border-terracotta focus:outline-none";

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-md gap-6 rounded-3xl border border-line bg-surface p-8 shadow-[var(--shadow-chunk)] sm:p-10">
        <div className="grid justify-items-center gap-1 border-b border-line pb-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-terracotta text-white">
            <PawPrint className="size-6" aria-hidden />
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Ria Pet Mart Staff Portal</h1>
          <p className="text-sm text-ink-2">Sign in to manage orders, products and the shop.</p>
        </div>

        <form action={signInWithPassword} className="grid gap-3">
          <label htmlFor="password-email" className="sr-only">
            Work email
          </label>
          <input id="password-email" name="email" type="email" required autoComplete="email" placeholder="Work email address" className={input} />
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            aria-invalid={error === "password"}
            aria-describedby={message ? "login-error" : undefined}
            className={input}
          />
          {message && (
            <p id="login-error" role="alert" className="text-sm font-medium text-bad-fg">
              {message}
            </p>
          )}
          <button type="submit" className="mt-2 min-h-12 rounded-xl bg-terracotta-deep font-semibold text-white hover:brightness-95 active:scale-[0.99]">
            Sign in
          </button>
        </form>

        {sent ? (
          <p role="status" className="rounded-xl bg-ok-bg p-3 text-sm font-medium text-ok-fg">
            Check your inbox. The link signs you in on this device and expires in 1 hour.
          </p>
        ) : (
          <details className="group text-sm" open={error === "email" || error === "send" || error === "link"}>
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-ink-2 hover:text-ink">
              <Mail className="size-4" aria-hidden /> Forgot your password? Email me a sign-in link
            </summary>
            <form action={sendMagicLink} className="mt-3 grid gap-2">
              <label htmlFor="email" className="sr-only">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Work email address"
                aria-invalid={error === "email"}
                className={input}
              />
              <button type="submit" className="min-h-11 rounded-xl border border-line font-semibold hover:bg-sunk">
                Send sign-in link
              </button>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}
