"use client";

import { Copy, Gift, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "riapetmart:welcome-popup-seen";

export function WelcomePopup() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const suppressed = pathname === "/cart" || pathname.startsWith("/shop/");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (suppressed) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = setTimeout(() => {
          if (!dialogRef.current?.open) dialogRef.current?.showModal();
        }, 30_000);
        return () => clearTimeout(timer);
      }
    } catch {
      // storage blocked — just don't show the popup
    }
  }, [suppressed]);

  // Runs for every close path: the X, Esc, and the in-dialog buttons.
  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setCode(data.code);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const dismiss = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={markSeen}
      aria-labelledby="welcome-popup-title"
      className="m-auto w-full max-w-sm rounded-3xl border-2 border-choc bg-cream p-6 shadow-[6px_6px_0_0_var(--color-choc)] backdrop:bg-choc/50"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-surface text-choc"
      >
        <X className="size-4" aria-hidden />
      </button>

      <Gift className="size-10 text-rust" aria-hidden />
      <h2 id="welcome-popup-title" className="mt-3 font-bubble text-2xl font-extrabold text-choc">Get 10% off</h2>

      {code ? (
        <div className="mt-3 grid gap-3">
          <p className="text-choc-2">Your code is ready — paste it at checkout.</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(code)}
            className="flex items-center justify-between rounded-xl border-2 border-dashed border-rust bg-surface px-4 py-3 font-mono text-lg font-bold text-choc"
          >
            {code}
            <Copy className="size-4 text-rust" aria-hidden />
          </button>
          <button type="button" onClick={dismiss} className="btn-bubble bg-terracotta px-6 py-2.5 text-cream">
            Start shopping
          </button>
        </div>
      ) : (
        <form onSubmit={claim} className="mt-3 grid gap-3">
          <p className="text-choc-2">Your first order, 10% off — just for signing up.</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="rounded-xl border-2 border-choc/40 px-3 py-2.5"
          />
          {error && <p className="text-sm font-medium text-bad-fg">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn-bubble bg-terracotta px-6 py-2.5 text-cream disabled:opacity-60"
          >
            {submitting ? "Claiming…" : "Claim my 10% off"}
          </button>
          <button type="button" onClick={dismiss} className="text-center text-sm text-choc-2 underline">
            No thanks, I&apos;ll pay full price
          </button>
        </form>
      )}
    </dialog>
  );
}
