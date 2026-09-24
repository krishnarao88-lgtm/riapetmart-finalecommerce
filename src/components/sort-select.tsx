"use client";

import { sortOptions } from "@/lib/shop-search";

/** Lives inside the /shop GET form, so changing it resubmits with the search and filters intact. */
export function SortSelect({ value }: { value: string }) {
  return (
    <select
      name="sort"
      defaultValue={value}
      aria-label="Sort products"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-full border-2 border-choc bg-cream px-3 py-2 text-sm font-semibold text-choc"
    >
      {sortOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
