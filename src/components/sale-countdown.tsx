"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useNow } from "@/components/deal-strip";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live d/h/m/s to a real sale boundary; refreshes the page when it passes so the banner switches state. */
export function SaleCountdown({ target, label }: { target: string; label: string }) {
  const router = useRouter();
  const now = useNow(true);
  const left = now === null ? null : Math.max(0, Date.parse(target) - now);
  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);
  if (left === null) return null;
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const cell = "rounded bg-cream/95 px-1.5 py-0.5 font-bold tabular-nums text-rust";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" aria-label={`${label} ${d} days ${h} hours ${m} minutes`}>
      <span className="mr-0.5 opacity-90">{label}</span>
      {d > 0 && <span className={cell}>{d}d</span>}
      <span className={cell}>{pad(h)}h</span>
      <span className={cell}>{pad(m)}m</span>
      <span className={cell}>{pad(s)}s</span>
    </span>
  );
}
