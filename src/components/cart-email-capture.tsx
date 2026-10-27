"use client";

import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";

const SAVED_KEY = "riapetmart:cart-email";
const POPUP_KEY = "riapetmart:welcome-popup-seen";

/**
 * Asks for an email in the cart drawer, before checkout. Saving the cart means the abandoned-cart reminder can reach
 * shoppers who never get as far as typing their email at checkout; the welcome code is the reason to type it.
 */
export function CartEmailCapture({ percent }: { percent: number | null }) {
  const { lines, subtotal } = useCart();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "hidden">("hidden");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setState(localStorage.getItem(SAVED_KEY) ? "hidden" : "idle");
    } catch {
      setState("idle");
    }
  }, []);

  if (state === "hidden" || lines.length === 0) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const items = lines.map((l) => ({ name: l.productName, title: l.variantTitle, qty: l.qty, price: l.price }));
    const cart = await fetch("/api/cart-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, items, subtotal }),
    }).catch(() => null);
    if (!cart?.ok) {
      setError("Please check your email address and try again.");
      setState("idle");
      return;
    }
    if (percent) {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { code?: string }) : null;
      setCode(data?.code ?? null);
    }
    try {
      localStorage.setItem(SAVED_KEY, "1");
      localStorage.setItem(POPUP_KEY, "1");
    } catch {}
    setState("done");
  }

  if (state === "done") {
    return (
      <div role="status" className="mb-3 rounded-2xl bg-peach/50 p-3 text-sm text-choc">
        <p className="font-bold">Cart saved. Check your inbox.</p>
        {code && (
          <p className="mt-1">
            Your {percent}% code: <span className="font-mono font-bold">{code}</span> (type it in the code box on the cart page)
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mb-3 grid gap-2 rounded-2xl border border-choc/20 bg-surface p-3">
      <label htmlFor="cart-email" className="flex items-center gap-1.5 text-sm font-bold text-choc">
        <Mail className="size-4 text-rust" aria-hidden />
        {percent ? `Email me my cart + ${percent}% off my first order` : "Email me my cart"}
      </label>
      <div className="flex gap-2">
        <input
          id="cart-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="min-w-0 flex-1 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-sm"
        />
        <button type="submit" disabled={state === "saving"} className="rounded-xl bg-choc px-3 py-2 text-sm font-bold text-cream disabled:opacity-60">
          {state === "saving" ? "Saving…" : "Send"}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-bad-fg">{error}</p>}
      <p className="text-xs text-choc-2">We&apos;ll email your cart and the occasional offer. Unsubscribe any time.</p>
    </form>
  );
}
