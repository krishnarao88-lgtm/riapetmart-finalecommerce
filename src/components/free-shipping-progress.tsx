import { formatMyr } from "@/lib/pricing";

export const FREE_SHIPPING_THRESHOLD = 150;

/** Visual progress toward the real RM150 free-delivery threshold — shown in the cart drawer and /cart. */
export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

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
