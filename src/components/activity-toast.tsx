"use client";

import { Eye, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Activity } from "@/app/api/activity/route";

const FIRST_DELAY = 8_000;
const SHOW_FOR = 7_000;
const GAP = 14_000;
const DISMISS_KEY = "activity-toast-dismissed";

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} hour${hours === 1 ? "" : "s"} ago` : `${Math.round(hours / 24)} day${hours < 36 ? "" : "s"} ago`;
}

/**
 * Rotating social-proof pop-up. Only real events: product views counted in the last 24 hours (2 or
 * more) and paid orders from the last 3 days (first name and town only). Shows nothing if there are none.
 */
export function ActivityToast() {
  const pathname = usePathname();
  const [items, setItems] = useState<Activity[]>([]);
  const [index, setIndex] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // storage blocked: just show it
    }
    const t = setTimeout(() => {
      fetch("/api/activity")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
        .catch(() => {});
    }, FIRST_DELAY);
    return () => clearTimeout(t);
  }, []);

  // Cycle: show one for SHOW_FOR, hide for GAP, move to the next; loops through everything real.
  useEffect(() => {
    if (!items.length || dismissed) return;
    if (!visible) {
      const t = setTimeout(() => {
        // One pop-up at a time: skip this turn while a dialog (e.g. the welcome offer) is open.
        if (document.querySelector("dialog[open]")) {
          setTick((n) => n + 1); // try again after another gap
          return;
        }
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, index === -1 ? 0 : GAP);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(false), SHOW_FOR);
    return () => clearTimeout(t);
  }, [items, visible, index, dismissed, tick]);

  // Keep it off checkout-focused pages.
  if (dismissed || index < 0 || !items.length || pathname.startsWith("/cart") || pathname.startsWith("/order")) return null;
  const a = items[index];

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[calc(1rem+var(--sticky-bar,0px))] left-4 z-40 w-[min(22rem,calc(100vw-6.5rem))] transition-all duration-500 motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-peach bg-white/95 p-3 pr-8 shadow-[0_12px_32px_-12px_rgb(46_29_20/0.35)] backdrop-blur">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-peach/60 text-rust">
          {a.kind === "views" ? <Eye className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
        </span>
        <Link href={`/shop/${a.slug}`} className="grid gap-0.5 text-sm leading-snug text-choc">
          {a.kind === "views" ? (
            <span>
              <strong>{a.count} people</strong> viewed <strong>{a.name}</strong> in the last 24 hours
            </span>
          ) : (
            <>
              <span>
                <strong>{a.firstName ?? "Someone"}</strong>
                {a.town && ` from ${a.town}`} bought <strong>{a.name}</strong>
              </span>
              <span className="text-xs text-choc-2">{ago(a.at)}</span>
            </>
          )}
        </Link>
        <button type="button" onClick={dismiss} aria-label="Hide these notifications" className="absolute right-2 top-2 p-1 text-choc-2 hover:text-choc">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
