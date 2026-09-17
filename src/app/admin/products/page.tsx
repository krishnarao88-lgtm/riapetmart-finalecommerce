import { AlertTriangle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { BulkMarginForm } from "@/components/admin/bulk-margin-form";
import { requireAdmin } from "@/lib/auth";
import { formatMyr, formatPercent, marginFromPrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Products & stock", robots: { index: false } };

const PAGE_SIZE = 25;

type Row = {
  id: string;
  name: string;
  status: string;
  needs_review: boolean;
  is_regulated: boolean;
  size_display: string | null;
  brands: { name: string } | null;
  variants: {
    id: string;
    price: number;
    variant_costs: { cost_price: number; margin: number | null } | null;
    stock_batches: { quantity: number; expiry_date: string | null }[];
  }[];
};

function summarise(row: Row) {
  const prices = row.variants.map((v) => Number(v.price));
  const stock = row.variants.reduce(
    (sum, v) => sum + v.stock_batches.reduce((s, b) => s + b.quantity, 0),
    0,
  );
  const expiries = row.variants
    .flatMap((v) => v.stock_batches.filter((b) => b.quantity > 0).map((b) => b.expiry_date))
    .filter((d): d is string => Boolean(d))
    .sort();
  const first = row.variants[0];
  const cost = first?.variant_costs?.cost_price;
  const margin = cost != null && first ? marginFromPrice(Number(cost), Number(first.price)) : null;
  return {
    stock,
    nearestExpiry: expiries[0],
    priceLabel: prices.length
      ? prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
        ? `${formatMyr(Math.min(...prices))} – ${formatMyr(Math.max(...prices))}`
        : formatMyr(prices[0])
      : "—",
    margin,
  };
}

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  let query = supabase
    .from("products")
    .select(
      "id, name, status, needs_review, is_regulated, size_display, brands(name), variants(id, price, variant_costs(cost_price, margin), stock_batches(quantity, expiry_date))",
      { count: "exact" },
    )
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("name", `%${q}%`);
  if (status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <AdminNav current="/admin/products" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Products &amp; stock</h1>
          <p className="text-sm text-ink-2">
            {total} {total === 1 ? "product" : "products"}
            {q ? ` matching “${q}”` : ""}
          </p>
        </div>
        <Link href="/admin/import" className="btn-chunk bg-sunshine text-sm">
          Import from Excel
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" role="search">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <div className="flex min-w-60 flex-1 items-center gap-2 rounded-full border-2 border-line bg-surface px-4">
          <Search className="size-4 text-ink-3" aria-hidden />
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by product name"
            className="min-h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="min-h-11 rounded-full border-2 border-line bg-surface px-4 text-sm font-semibold"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" className="btn-chunk bg-surface text-sm">
          Apply
        </button>
      </form>

      {total > 0 && <BulkMarginForm q={q} status={status} count={total} />}

      {error && (
        <p role="alert" className="rounded-[var(--radius-chunk)] border-2 border-ink bg-bad-bg p-4 text-bad-fg">
          Couldn&apos;t load products: {error.message}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-chunk)] border-2 border-line bg-surface p-6 text-ink-2">
          No products yet. Use <Link href="/admin/import" className="underline">Import &amp; export</Link> to load your
          Excel catalogue.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-chunk)] border-2 border-ink bg-surface">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b-2 border-line text-left text-xs uppercase tracking-widest text-ink-3">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Margin</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Nearest expiry</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const s = summarise(row);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/products/${row.id}`} className="font-semibold underline">
                        {row.name}
                      </Link>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                        {row.brands?.name && <span>{row.brands.name}</span>}
                        {row.size_display && <span>{row.size_display}</span>}
                        <span>
                          {row.variants.length} {row.variants.length === 1 ? "variant" : "variants"}
                        </span>
                        {row.is_regulated && (
                          <span className="rounded-full bg-warn-bg px-2 py-0.5 font-bold text-warn-fg">Regulated</span>
                        )}
                        {row.needs_review && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bad-bg px-2 py-0.5 font-bold text-bad-fg">
                            <AlertTriangle className="size-3" aria-hidden /> Needs review
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 tabular-nums">{s.priceLabel}</td>
                    <td className="p-3 tabular-nums">{formatPercent(s.margin)}</td>
                    <td className="p-3 tabular-nums">
                      {s.stock === 0 ? <span className="text-bad-fg">Out of stock</span> : s.stock}
                    </td>
                    <td className="p-3 tabular-nums">{s.nearestExpiry ?? "—"}</td>
                    <td className="p-3">{row.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lastPage > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/products?${new URLSearchParams({ q, status, page: String(page - 1) })}`}
              className="btn-chunk bg-surface text-sm"
            >
              Previous
            </Link>
          )}
          <span className="text-ink-2">
            Page {page} of {lastPage}
          </span>
          {page < lastPage && (
            <Link
              href={`/admin/products?${new URLSearchParams({ q, status, page: String(page + 1) })}`}
              className="btn-chunk bg-surface text-sm"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
