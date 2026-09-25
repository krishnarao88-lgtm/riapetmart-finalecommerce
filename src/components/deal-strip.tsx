"use client";

import { Eye, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => setNow(Date.now()), 0); // client-only clock avoids a hydration mismatch
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [active]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Real deadlines only: counts down to the moment an approved sale ends, or states how long a
 * short-dated item has before its best-before date. No invented timers.
 */
export function DealStrip({
  saleName,
  saleEndsAt,
  shortDatedDays,
}: {
  saleName: string | null;
  saleEndsAt: string | null;
  shortDatedDays: number | null;
}) {
  const now = useNow(Boolean(saleEndsAt));
  if (saleName && saleEndsAt) {
    const left = now === null ? null : Math.max(0, new Date(saleEndsAt).getTime() - now);
    const d = left === null ? 0 : Math.floor(left / 86_400_000);
    const h = left === null ? 0 : Math.floor((left % 86_400_000) / 3_600_000);
    const m = left === null ? 0 : Math.floor((left % 3_600_000) / 60_000);
    const s = left === null ? 0 : Math.floor((left % 60_000) / 1000);
    const cell = "rounded-md bg-surface px-2 py-0.5 font-bold tabular-nums text-choc";
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-ok-fg/30 bg-ok-bg px-4 py-2.5">
        <span className="flex items-center gap-1.5 font-bubble font-extrabold text-ok-fg">
          <Zap className="size-5 fill-current" aria-hidden /> {saleName}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-choc-2" aria-live="off">
          Ends in
          {d > 0 && <span className={cell}>{d}d</span>}
          <span className={cell}>{pad(h)}h</span>
          <span className={cell}>{pad(m)}m</span>
          <span className={cell}>{pad(s)}s</span>
        </span>
      </div>
    );
  }
  if (shortDatedDays !== null) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-rust/30 bg-peach/40 px-4 py-2.5 text-sm">
        <Zap className="size-5 fill-current text-rust" aria-hidden />
        <span className="font-bold text-rust">Clearance deal</span>
        <span className="text-choc-2">
          priced down while it lasts: best before in {shortDatedDays} day{shortDatedDays === 1 ? "" : "s"}
        </span>
      </div>
    );
  }
  return null;
}

/** "N people viewed this in the last 24 hours": real counts, shown from 3 up. */
export function ViewCount({ productId }: { productId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const key = `viewed:${productId}`;
    let record = true;
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      record = Date.now() - last > 30 * 60_000;
      if (record) sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // storage blocked: still count this view
    }
    fetch("/api/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, record }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCount(typeof d?.count === "number" ? d.count : null))
      .catch(() => {});
  }, [productId]);

  if (count === null || count < 3) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-choc-2">
      <Eye className="size-4 text-rust" aria-hidden />
      <strong className="text-choc">{count}</strong> people viewed this in the last 24 hours
    </p>
  );
}
