import { Barcode, Box, PackageCheck, Scale, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimary, btnSecondary, PageHeader, pageWrap } from "@/components/admin/form-parts";
import { CountTile, EmptyState } from "@/components/admin/list-parts";
import { ShippingRow, type ShippingVariant } from "@/components/admin/shipping-row";
import { requireAdmin } from "@/lib/auth";
import { isInternalCode, isValidGtin } from "@/lib/gtin";

export const metadata: Metadata = { title: "Weights & barcodes", robots: { index: false } };

const PAGE_SIZE = 60;
const FILTERS = {
  missing: "Missing anything",
  weight: "Missing weight",
  size: "Missing box size",
  barcode: "No real barcode",
  all: "All",
} as const;
type Filter = keyof typeof FILTERS;

type Row = {
  id: string;
  sku: string;
  title: string;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  barcode: string | null;
  products: { name: string } | null;
};

const noWeight = (v: ShippingVariant) => v.weightGrams == null;
const noSize = (v: ShippingVariant) => v.lengthMm == null || v.widthMm == null || v.heightMm == null;
/** Real = a manufacturer GTIN Google accepts (same rule as the feed, plus a valid check digit). */
const noBarcode = (v: ShippingVariant) => !v.barcode || isInternalCode(v.barcode) || !isValidGtin(v.barcode);
const MATCH: Record<Filter, (v: ShippingVariant) => boolean> = {
  missing: (v) => noWeight(v) || noSize(v) || noBarcode(v),
  weight: noWeight,
  size: noSize,
  barcode: noBarcode,
  all: () => true,
};

export default async function ShippingDetailsPage({ searchParams }: PageProps<"/admin/products/shipping">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : "");
  const filter: Filter = str("filter") in FILTERS ? (str("filter") as Filter) : "missing";
  const q = str("q").slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  // ponytail: loads every active size (a few thousand at most) and filters here; move to SQL if it grows past ~10k.
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("variants")
      .select("id, sku, title, weight_grams, length_mm, width_mm, height_mm, barcode, products!inner(name, status)")
      .eq("is_active", true)
      .neq("products.status", "archived")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }

  const variants: ShippingVariant[] = rows
    .map((r) => ({
      id: r.id,
      product: r.products?.name ?? "",
      title: r.title,
      sku: r.sku,
      weightGrams: r.weight_grams,
      lengthMm: r.length_mm,
      widthMm: r.width_mm,
      heightMm: r.height_mm,
      barcode: r.barcode,
    }))
    .sort((a, b) => a.product.localeCompare(b.product) || a.title.localeCompare(b.title));

  const needle = q.toLowerCase();
  const matching = variants.filter(
    (v) => MATCH[filter](v) && (!needle || `${v.product} ${v.title} ${v.sku}`.toLowerCase().includes(needle)),
  );
  const lastPage = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const shown = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = (to: number) => {
    const qs = new URLSearchParams({ filter, page: String(to) });
    if (q) qs.set("q", q);
    return `/admin/products/shipping?${qs}`;
  };
  const select = "min-h-11 rounded-xl border border-line bg-ground px-3 text-sm font-semibold text-choc";

  return (
    <div className={pageWrap}>
      <PageHeader
        title="Weights & barcodes"
        description="Packed weight and box size give accurate delivery charges (couriers bill the higher of weight and box size). Real barcodes let Google match products in Shopping."
        actions={<Link href="/admin/products" className={btnSecondary}>Back to products</Link>}
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CountTile label="Missing weight" value={variants.filter(noWeight).length} note={`of ${variants.length} sizes`} Icon={Scale} chip="bg-warn-bg text-warn-fg" />
        <CountTile label="Missing box size" value={variants.filter(noSize).length} note="Length, width and height" Icon={Box} chip="bg-peach/60 text-rust" />
        <CountTile label="No real barcode" value={variants.filter(noBarcode).length} note="Empty or shop-made 2… code" Icon={Barcode} chip="bg-sunk text-terracotta-deep" />
      </ul>

      <form role="search" className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-chunk)] sm:p-4">
        <label htmlFor="q" className="sr-only">Search by product name or SKU</label>
        <span className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by product name or SKU"
            className="min-h-11 w-full rounded-xl border border-line bg-ground pr-3 pl-9 text-sm placeholder:text-ink-3"
          />
        </span>
        <select name="filter" defaultValue={filter} aria-label="Show" className={select}>
          {Object.entries(FILTERS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>Show</button>
      </form>

      <p className="text-sm text-ink-2" aria-live="polite">
        {matching.length} {matching.length === 1 ? "size" : "sizes"} · {FILTERS[filter]}
        {q && <> matching &ldquo;{q}&rdquo;</>}. Box size is the packed carton in cm. With a USB or Bluetooth scanner, click a barcode box and scan: it saves and moves to the next row.
      </p>

      {shown.length === 0 ? (
        <EmptyState Icon={PackageCheck}>
          {q || filter === "all" ? "No sizes match this search." : "Nothing missing here. Every size in this view is filled in."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {shown.map((v) => (
            <ShippingRow key={v.id} v={v} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={href(page - 1)} className={btnSecondary}>Previous</Link>}
          <span className="text-ink-2">Page {page} of {lastPage}</span>
          {page < lastPage && <Link href={href(page + 1)} className={btnSecondary}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
