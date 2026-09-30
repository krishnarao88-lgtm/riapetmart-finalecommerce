"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-surface px-3 text-sm";

/** "Remind me on WhatsApp before it runs out": the shop messages them on the day (see api/refill-reminder). */
export function RefillReminder({ productId, monthlyDose = false }: { productId: string; monthlyDose?: boolean }) {
  const [state, setState] = useState<{ done?: string; error?: string; busy?: boolean }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ busy: true });
    const res = await fetch("/api/refill-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        name: f.get("name"),
        phone: f.get("phone"),
        weeks: Number(f.get("weeks")),
        website: f.get("website"),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) return setState({ error: data.error ?? "Something went wrong, please try again." });
    const day = data.remindOn
      ? new Date(`${data.remindOn}T00:00:00+08:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short" })
      : "the day";
    setState({ done: `Done! We'll WhatsApp you on ${day}.` });
  }

  return (
    <details className="rounded-xl bg-peach/40 px-3 py-2 text-sm text-choc">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <BellRing className="size-4 shrink-0 text-rust" aria-hidden />
        {monthlyDose ? "Remind me on WhatsApp when the next monthly dose is due" : "Remind me on WhatsApp before it runs out"}
      </summary>
      {state.done ? (
        <p role="status" className="mt-2 font-semibold text-ok-fg">
          {state.done}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="name" required maxLength={60} placeholder="Your name" autoComplete="given-name" className={field} />
            <input name="phone" required type="tel" placeholder="012-345 6789" autoComplete="tel" className={field} />
          </div>
          <label className="flex items-center gap-2 whitespace-nowrap">
            Remind me in
            <select name="weeks" defaultValue="4" className="min-h-11 rounded-xl border-2 border-line bg-surface px-3 text-sm">
              <option value="2">2 weeks</option>
              <option value="3">3 weeks</option>
              <option value="4">4 weeks</option>
              <option value="6">6 weeks</option>
            </select>
          </label>
          {/* Honeypot for bots: hidden from people and screen readers. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <p className="text-xs text-choc-2">One WhatsApp message from Ria Pet Mart about this product. Nothing else.</p>
          {state.error && (
            <p role="alert" className="font-semibold text-bad-fg">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={state.busy} className="btn-bubble w-fit bg-rust px-5 py-2 text-cream">
            {state.busy ? "Saving…" : "Remind me"}
          </button>
        </form>
      )}
    </details>
  );
}
