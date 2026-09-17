"use client";

import { useActionState, useState } from "react";
import { saveVariantPricing } from "@/app/admin/products/actions";
import {
  formatMyr,
  formatPercent,
  markupFromPrice,
  MAX_MARGIN,
  priceFromMargin,
  profitPerUnit,
} from "@/lib/pricing";

export type VariantPricing = {
  id: string;
  sku: string;
  title: string;
  price: number;
  cost: number | null;
  margin: number | null;
};

export function VariantPricingRow({ variant, productId }: { variant: VariantPricing; productId: string }) {
  const [state, action, pending] = useActionState(saveVariantPricing, null);
  const [cost, setCost] = useState(variant.cost ?? 0);
  const [marginPercent, setMarginPercent] = useState(Math.round((variant.margin ?? 0.25) * 100));
  const [manualPrice, setManualPrice] = useState<string>("");

  const margin = Math.min(marginPercent / 100, MAX_MARGIN - 0.001);
  const suggested = priceFromMargin(cost, margin);
  const typed = manualPrice.trim() === "" ? null : Number(manualPrice);
  const effective = typed !== null && Number.isFinite(typed) ? typed : suggested;
  const markup = markupFromPrice(cost, effective);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-line bg-surface p-4"
    >
      <input type="hidden" name="variant_id" value={variant.id} />
      <input type="hidden" name="product_id" value={productId} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{variant.title}</span>
        <span className="font-mono text-xs text-ink-3">{variant.sku}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`cost-${variant.id}`}>
          Cost price (RM)
          <input
            id={`cost-${variant.id}`}
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value) || 0)}
            className="min-h-11 rounded-xl border-2 border-line bg-ground px-3 font-normal tabular-nums"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold" htmlFor={`margin-${variant.id}`}>
          Margin {marginPercent}% <span className="font-normal text-ink-3">(markup {formatPercent(markup)})</span>
          <input
            id={`margin-${variant.id}`}
            name="margin"
            type="range"
            min="0"
            max="70"
            value={marginPercent}
            onChange={(e) => setMarginPercent(Number(e.target.value))}
            className="h-11 w-full accent-tangerine"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`price-${variant.id}`}>
          Selling price
          <span className="text-xs font-normal text-ink-3">
            Leave blank to use the margin price. Type a price to set it yourself.
          </span>
          <input
            id={`price-${variant.id}`}
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder={suggested.toFixed(2)}
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="min-h-11 rounded-xl border-2 border-line bg-ground px-3 font-normal tabular-nums"
          />
        </label>

        <div className="grid gap-1 rounded-xl bg-sunk px-4 py-3 text-sm tabular-nums">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-3">Sells at</span>
          <span className="font-display text-2xl font-extrabold">{formatMyr(effective)}</span>
          <span className="text-ink-2">Profit {formatMyr(profitPerUnit(cost, effective))} per unit</span>
          <span className="text-ink-3">Currently {formatMyr(variant.price)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Saving…" : "Save pricing"}
        </button>
        {state?.ok && (
          <span role="status" className="text-sm font-semibold text-ok-fg">
            {state.ok}
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-sm font-semibold text-bad-fg">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
