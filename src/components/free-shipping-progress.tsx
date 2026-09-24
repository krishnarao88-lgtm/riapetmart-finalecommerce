import { formatMyr } from "@/lib/pricing";

/** Progress toward the free-delivery threshold from settings (null = free delivery off) — shown in the cart drawer and /cart. */
export function FreeShippingProgress({ subtotal, threshold }: { subtotal: number; threshold: number | null }) {
  if (threshold === null) return null;
  const remaining = threshold - subtotal;
  const pct = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;

  return (
    <div className="grid gap-1.5">
      <p className="text-center text-sm font-semibold text-choc">
        {remaining <= 0 ? "🎉 You've unlocked free delivery!" : `Add ${formatMyr(remaining)} more for free delivery`}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-peach/50">
        <div className="h-full rounded-full bg-terracotta transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
