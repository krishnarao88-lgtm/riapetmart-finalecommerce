"use client";

import { useActionState, useState } from "react";
import { savePromotion } from "@/app/admin/promotions/actions";

export type PromotionRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  discount: number;
  scope: string;
  brand_id: string | null;
  category_id: string | null;
  banner: string | null;
  is_active: boolean;
  excluded_product_ids?: string[];
};
type Option = { id: string; name: string };

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal";

export function PromotionForm({
  promo,
  brands,
  categories,
}: {
  promo?: PromotionRow;
  brands: Option[];
  categories: Option[];
}) {
  const [state, action, pending] = useActionState(savePromotion, null);
  const [scope, setScope] = useState(promo?.scope ?? "house");

  return (
    <form action={action} className="grid gap-3">
      {promo && <input type="hidden" name="id" value={promo.id} />}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-sm font-semibold">
          Sale name
          <input name="name" defaultValue={promo?.name} required placeholder="Raya Sale" className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Starts
          <input type="date" name="starts_on" defaultValue={promo?.starts_on} required className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ends
          <input type="date" name="ends_on" defaultValue={promo?.ends_on} required className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          % off
          <input
            type="number"
            name="percent"
            min={1}
            max={50}
            step={0.5}
            defaultValue={promo ? Math.round(promo.discount * 1000) / 10 : 10}
            required
            className={`${field} tabular-nums`}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <label className="grid gap-1 text-sm font-semibold">
          Applies to
          <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className={field}>
            <option value="house">Own brands (Aniamor, Robust, Phyto)</option>
            <option value="all">Everything</option>
            <option value="brand">One brand</option>
            <option value="category">One category</option>
          </select>
        </label>
        {scope === "brand" && (
          <label className="grid gap-1 text-sm font-semibold">
            Brand
            <select name="brand_id" defaultValue={promo?.brand_id ?? ""} required className={field}>
              <option value="">Choose…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope === "category" && (
          <label className="grid gap-1 text-sm font-semibold">
            Category
            <select name="category_id" defaultValue={promo?.category_id ?? ""} required className={field}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1 text-sm font-semibold sm:col-start-3">
          Banner text (optional)
          <input name="banner" defaultValue={promo?.banner ?? ""} placeholder="Selamat Hari Raya! 10% off…" className={field} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_active" defaultChecked={promo?.is_active ?? false} className="size-5" />
          Approved: runs on its dates
        </label>
        <button type="submit" disabled={pending} className="btn-chunk bg-grape text-sm text-surface disabled:opacity-60">
          {pending ? "Saving…" : promo ? "Save" : "Add sale"}
        </button>
        {state?.ok && <span className="text-sm font-semibold text-ok-fg">{state.ok}</span>}
        {state?.error && (
          <span role="alert" className="text-sm font-semibold text-bad-fg">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
