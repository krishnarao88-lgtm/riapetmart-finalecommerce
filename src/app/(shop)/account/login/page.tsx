import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { sendAccountMagicLink } from "../actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const errors: Record<string, string> = {
  email: "Enter a valid email address, like name@example.com.",
  send: "We couldn't send the sign-in link. Wait a minute, then try again.",
  link: "That sign-in link has expired or was already used. Request a new one below.",
};

export default async function AccountLogin({ searchParams }: PageProps<"/account/login">) {
  const { sent, error } = await searchParams;
  const message = typeof error === "string" ? errors[error] : undefined;

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div className="grid gap-2">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Log in or sign up</h1>
        <p className="text-choc-2">No password to remember. New here? This creates your account too.</p>
        <ol className="mt-1 grid gap-1.5 text-sm text-choc-2">
          {[
            "Type your email below (use the one from your orders to see them).",
            "We email you a sign-in link.",
            "Tap the link and you're in. Your orders and reorders are waiting.",
          ].map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-peach text-xs font-bold text-choc">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {sent ? (
        <p role="status" className="rounded-2xl card-soft bg-cream p-4 font-semibold text-choc">
          Check your inbox (and spam folder) and tap the link from Ria Pet Mart. It signs you in on this device and works for 1 hour.
        </p>
      ) : (
        <form action={sendAccountMagicLink} className="grid gap-4 rounded-2xl card-soft bg-surface p-5">
          <label htmlFor="email" className="grid gap-2 font-semibold text-choc">
            Email
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={error === "email"}
              aria-describedby={message ? "login-error" : undefined}
              className="min-h-12 rounded-xl border border-choc/40 bg-cream px-3 text-base font-normal text-choc"
            />
          </label>
          {message && (
            <p id="login-error" role="alert" className="text-sm font-medium text-bad-fg">
              {message}
            </p>
          )}
          <button type="submit" className="btn-bubble bg-terracotta px-6 py-3 text-cream">
            <Mail className="size-5" aria-hidden /> Send my sign-in link
          </button>
        </form>
      )}
    </div>
  );
}
