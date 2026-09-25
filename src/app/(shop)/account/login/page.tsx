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
        <h1 className="font-bubble text-3xl font-extrabold text-choc">My orders</h1>
        <p className="text-choc-2">
          Enter the email you used at checkout and we&apos;ll send you a sign-in link — no password needed.
        </p>
      </div>

      {sent ? (
        <p role="status" className="rounded-2xl card-soft bg-cream p-4 font-semibold text-choc">
          Check your inbox. The link signs you in on this device and expires in 1 hour.
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
            <Mail className="size-5" aria-hidden /> Email me a sign-in link
          </button>
        </form>
      )}
    </div>
  );
}
