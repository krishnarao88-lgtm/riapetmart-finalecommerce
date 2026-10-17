import { AlertTriangle, Boxes, FileSpreadsheet, ImagePlus, PackageMinus, PackageX, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimary, btnSecondary, Notice, PageHeader, pageWrap } from "@/components/admin/form-parts";
import { OrderStat } from "@/components/admin/order-card";
import { type AdminProductRow, LOW_STOCK, ProductTable } from "@/components/admin/product-table";
import { requireAdmin } from "@/lib/auth";
import { formatMyr, marginFromPrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Products & stock", robots: { index: false } };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  name: string;
  status: string;
  needs_review: boolean;
  is_regulated: boolean;
  size_display: string | null;
  updated_at: string;
  brands: { name: string } | null;
  product_images: { path: string; sort: number }[];
  variants: {
    id: string;
    sku: string;
    title: string;
    price: number;
    barcode: string | null;
    weight_grams: number | null;
    sort: number;
    variant_costs: { cost_price: number } | null;
    stock_batches: { quantity: number; expiry_date: string | null }[];
  }[];
};

type ListRow = AdminProductRow & { minPrice: number; updatedAt: string };

function toRow(row: Row): ListRow {
  const variants = [...row.variants]
    .sort((a, b) => a.sort - b.sort)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price: Number(v.price),
      barcode: v.barcode,
      weightGrams: v.weight_grams,
      stock: v.stock_batches.reduce((s, b) => s + b.quantity, 0),
    }));
  const prices = variants.map((v) => v.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const expiries = row.variants
    .flatMap((v) => v.stock_batches.filter((b) => b.quantity > 0).map((b) => b.expiry_date))
    .filter((d): d is string => Boolean(d))
    .sort();
  const first = row.variants[0];
  const cost = first?.variant_costs?.cost_price;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    needsReview: row.needs_review,
    isRegulated: row.is_regulated,
    sizeDisplay: row.size_display,
    brand: row.brands?.name ?? null,
    image: [...row.product_images].sort((a, b) => a.sort - b.sort)[0]?.path ?? null,
    stock: variants.reduce((s, v) => s + v.stock, 0),
    nearestExpiry: expiries[0],
    priceLabel: !prices.length ? "—" : min === max ? formatMyr(min) : `${formatMyr(min)} – ${formatMyr(max)}`,
    margin: cost != null && first ? marginFromPrice(Number(cost), Number(first.price)) : null,
    variants,
    minPrice: min,
    updatedAt: row.updated_at,
  };
}

const SORTS: Record<string, (a: ListRow, b: ListRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  price_asc: (a, b) => a.minPrice - b.minPrice,
  price_desc: (a, b) => b.minPrice - a.minPrice,
  stock_asc: (a, b) => a.stock - b.stock,
  stock_desc: (a, b) => b.stock - a.stock,
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : "");
  const f = {
    q: str("q"),
    status: str("status") || "all",
    brand: UUID.test(str("brand")) ? str("brand") : "",
    category: UUID.test(str("category")) ? str("category") : "",
    pet: str("pet"),
    review: str("review"),
    stock: str("stock"),
    photo: str("photo"),
    price: str("price"),
    sort: SORTS[str("sort")] ? str("sort") : "name",
  };
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  // Filters the database can do go in the query; stock, photo and price are worked out per product below.
  // ponytail: loads the whole matching catalogue (fine at a few hundred products); move to a SQL view past ~2,000.
  let query = supabase
    .from("products")
    .select(
      "id, name, status, needs_review, is_regulated, size_display, updated_at, brands(name), product_images(path, sort), variants(id, sku, title, price, barcode, weight_grams, sort, variant_costs(cost_price), stock_batches(quantity, expiry_date))",
    )
    .order("name")
    .limit(2000);
  if (f.q) query = query.ilike("name", `%${f.q}%`);
  if (f.status !== "all") query = query.eq("status", f.status);
  if (f.brand) query = query.eq("brand_id", f.brand);
  if (f.category) query = query.eq("category_id", f.category);
  if (["dog", "cat", "dog_cat", "small_pet"].includes(f.pet)) query = query.eq("pet_type", f.pet);
  if (f.review === "yes") query = query.eq("needs_review", true);
  if (f.review === "no") query = query.eq("needs_review", false);

  const [{ data, error }, { data: brands }, { data: categories }] = await Promise.all([
    query,
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("sort").order("name"),
  ]);

  let rows = ((data ?? []) as unknown as Row[]).map(toRow);
  if (f.stock === "out") rows = rows.filter((r) => r.stock === 0);
  if (f.stock === "low") rows = rows.filter((r) => r.stock > 0 && r.stock <= LOW_STOCK);
  if (f.stock === "in") rows = rows.filter((r) => r.stock > 0);
  if (f.photo === "none") rows = rows.filter((r) => !r.image);
  if (f.photo === "has") rows = rows.filter((r) => r.image);
  if (f.price === "zero") rows = rows.filter((r) => r.variants.some((v) => v.price <= 0));
  rows.sort(SORTS[f.sort]);

  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = Object.entries(f).some(([k, v]) => (k === "status" ? v !== "all" : k !== "sort" && Boolean(v)));

  const href = (nextPage: number) => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== "all"));
    qs.set("page", String(nextPage));
    return `/admin/products?${qs}`;
  };

  const select = "min-h-11 rounded-xl border border-line bg-ground px-3 text-sm font-semibold text-choc";
  const outCount = rows.filter((r) => r.stock === 0).length;
  const lowCount = rows.filter((r) => r.stock > 0 && r.stock <= LOW_STOCK).length;
  const reviewCount = rows.filter((r) => r.needsReview).length;

  return (
    <div className={pageWrap}>
      <PageHeader
        title="Products & stock"
        description={
          <>
            {total} {total === 1 ? "product" : "products"}
            {filtered ? " match these filters" : ""}
          </>
        }
        actions={
          <>
            <Link href="/admin/products/new" className={btnPrimary}>
              <Plus className="size-4" aria-hidden /> Add product
            </Link>
            <Link href="/admin/products/photos" className={btnSecondary}>
              <ImagePlus className="size-4" aria-hidden /> Bulk photo upload
            </Link>
            <Link href="/admin/import" className={btnSecondary}>
              <FileSpreadsheet className="size-4" aria-hidden /> Bulk import / export (Excel)
            </Link>
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrderStat label="Products" count={total} note={filtered ? "Matching these filters" : "In the catalogue"} href="/admin/products" Icon={Boxes} chip="bg-peach/60 text-rust" />
        <OrderStat label="Out of stock" count={outCount} note="In this list" href="/admin/products?stock=out" Icon={PackageX} chip="bg-bad-bg text-bad-fg" />
        <OrderStat label="Low stock" count={lowCount} note={`${LOW_STOCK} or fewer left`} href="/admin/products?stock=low" Icon={PackageMinus} chip="bg-warn-bg text-warn-fg" />
        <OrderStat label="Needs review" count={reviewCount} note="In this list" href="/admin/products?review=yes" Icon={AlertTriangle} chip="bg-sunk text-terracotta-deep" />
      </ul>

      <form className="grid gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-chunk)] sm:p-4" role="search">
        <div className="flex flex-wrap gap-2">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <span className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              id="q"
              name="q"
              defaultValue={f.q}
              placeholder="Search by product name"
              className="min-h-11 w-full rounded-xl border border-line bg-ground pr-3 pl-9 text-sm placeholder:text-ink-3"
            />
          </span>
          <select name="sort" defaultValue={f.sort} aria-label="Sort by" className={select}>
            <option value="name">Sort: name A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="stock_asc">Stock: low to high</option>
            <option value="stock_desc">Stock: high to low</option>
            <option value="updated">Recently updated</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <select name="status" defaultValue={f.status} aria-label="Status" className={select}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select name="brand" defaultValue={f.brand} aria-label="Brand" className={select}>
            <option value="">All brands</option>
            {(brands ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={f.category} aria-label="Category" className={select}>
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="pet" defaultValue={f.pet} aria-label="Pet type" className={select}>
            <option value="">All pets</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="dog_cat">Dog &amp; cat</option>
            <option value="small_pet">Small pet</option>
          </select>
          <select name="stock" defaultValue={f.stock} aria-label="Stock" className={select}>
            <option value="">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock (≤{LOW_STOCK})</option>
            <option value="out">Out of stock</option>
          </select>
          <select name="photo" defaultValue={f.photo} aria-label="Photos" className={select}>
            <option value="">Any photo</option>
            <option value="none">No photo</option>
            <option value="has">Has photo</option>
          </select>
          <select name="review" defaultValue={f.review} aria-label="Needs review" className={select}>
            <option value="">Any review state</option>
            <option value="yes">Needs review</option>
            <option value="no">Reviewed</option>
          </select>
          <select name="price" defaultValue={f.price} aria-label="Price" className={select}>
            <option value="">Any price</option>
            <option value="zero">Price missing (RM0)</option>
          </select>
          <button type="submit" className={btnPrimary}>
            Apply
          </button>
          {filtered && (
            <Link href="/admin/products" className={btnSecondary}>
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {error && (
        <Notice tone="bad">Couldn&apos;t load products: {error.message}</Notice>
      )}

      {pageRows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-ink-2">
          {filtered ? (
            <>
              No products match these filters.{" "}
              <Link href="/admin/products" className="font-semibold text-terracotta-deep underline">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              No products yet. Use{" "}
              <Link href="/admin/import" className="font-semibold text-terracotta-deep underline">
                Import &amp; export
              </Link>{" "}
              to load your Excel catalogue.
            </>
          )}
        </p>
      ) : (
        // Keyed by filter + page so selection and unsaved edits reset when the list changes underneath them.
        <ProductTable
          key={href(page)}
          rows={pageRows}
          allIds={rows.map((r) => r.id)}
          brands={brands ?? []}
          categories={categories ?? []}
        />
      )}

      {lastPage > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href(page - 1)} className={btnSecondary}>
              Previous
            </Link>
          )}
          <span className="text-ink-2">
            Page {page} of {lastPage}
          </span>
          {page < lastPage && (
            <Link href={href(page + 1)} className={btnSecondary}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
