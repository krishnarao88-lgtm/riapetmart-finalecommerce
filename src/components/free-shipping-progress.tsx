import { Truck } from "lucide-react";
import { formatMyr } from "@/lib/pricing";

/** Progress toward the free-delivery threshold from settings (null = free delivery off) — shown in the cart drawer and /cart. */
export function FreeShippingProgress({
  subtotal,
  threshold,
  cap = null,
}: {
  subtotal: number;
  threshold: number | null;
  cap?: number | null;
}) {
  if (threshold === null) return null;
  const remaining = threshold - subtotal;
  const pct = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;

  return (
    <div className="grid gap-1.5">
      <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-choc">
        <Truck className="size-4 shrink-0 text-rust" aria-hidden />
        {remaining <= 0 ? "You've unlocked free delivery!" : `Add ${formatMyr(remaining)} more for free delivery`}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-peach/50">
        <div className="h-full origin-left rounded-full bg-terracotta transition-transform duration-500" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      {cap !== null && (
        <p className="text-center text-xs text-choc-2">Free delivery covers up to {formatMyr(cap)} of the delivery fee.</p>
      )}
    </div>
  );
}
