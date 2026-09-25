"use client";

import { Bot, Loader2, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AssistantProduct } from "@/lib/assistant-tools";
import { formatMyr } from "@/lib/pricing";

type Turn = { role: "user" | "assistant"; text: string; products?: AssistantProduct[] };

const STARTERS = ["Food for a cat with hairballs", "Where is my order?", "How do refunds work?", "Skin itch: what helps?"];

/** Floating shopping assistant, stacked above the WhatsApp button. Hidden in admin. */
export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [turns, busy]);
  if (pathname.startsWith("/admin")) return null;

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: "user", text: question }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text: t }) => ({ role, text: t })) }),
      });
      const data = await res.json().catch(() => ({}));
      setTurns([
        ...next,
        { role: "assistant", text: data.text ?? data.error ?? "Sorry, something went wrong.", products: data.products },
      ]);
    } catch {
      setTurns([...next, { role: "assistant", text: "I'm offline right now. Please message us on WhatsApp." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close shopping assistant" : "Ask our shopping assistant"}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-30 grid size-14 place-items-center rounded-full border-2 border-choc bg-cream text-rust shadow-[3px_3px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5 print:hidden"
      >
        {open ? <X className="size-6" aria-hidden /> : <Bot className="size-7" aria-hidden />}
      </button>

      {open && (
        <section
          aria-label="Shopping assistant"
          className="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] right-4 z-40 flex max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border-2 border-choc bg-cream shadow-[4px_4px_0_0_var(--color-choc)]"
        >
          <header className="border-b-2 border-choc/15 bg-terracotta px-4 py-3 text-cream">
            <p className="font-bubble text-lg font-extrabold">Ask Ria</p>
            <p className="text-xs text-cream/90">Product help, orders and returns. Not a vet: for emergencies, see one now.</p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {turns.length === 0 && (
              <div className="grid gap-2">
                <p className="text-sm text-choc-2">Hi! What can I help your pet with today?</p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border-2 border-choc/30 bg-surface px-3 py-1.5 text-xs font-semibold text-choc hover:border-rust"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "grid gap-2"}>
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                    t.role === "user" ? "bg-terracotta text-cream" : "bg-surface text-choc"
                  }`}
                >
                  {t.text}
                </p>
                {t.products && t.products.length > 0 && (
                  <ul className="grid gap-2">
                    {t.products.map((p) => (
                      <li key={p.url}>
                        <Link
                          href={p.url}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-xl border-2 border-choc/15 bg-surface p-2 hover:border-rust"
                        >
                          <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-peach/40">
                            {p.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt="" className="size-full object-contain" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm font-bold text-choc">{p.name}</span>
                            <span className="text-xs text-choc-2">
                              from {formatMyr(p.price_from)}
                              {p.sale ? ` · ${p.sale}` : ""}
                              {p.own_brand ? " · our brand" : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-sm text-choc-2">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Thinking…
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2 border-t-2 border-choc/15 p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Your question
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={800}
              placeholder="Ask about food, care or your order"
              className="min-h-11 flex-1 rounded-full border-2 border-choc/30 bg-surface px-4 text-sm text-choc"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="grid size-11 place-items-center rounded-full bg-terracotta text-cream disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
