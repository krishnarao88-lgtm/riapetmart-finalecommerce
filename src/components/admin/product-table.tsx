"use client";

import { AlertTriangle, Camera, ImageOff, Pencil, Table } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadProductImage } from "@/app/admin/products/actions";
import { BulkBar, type Option } from "@/components/admin/bulk-bar";
import { pillCls, StatusPill } from "@/components/admin/form-parts";
import { QuickEdit } from "@/components/admin/quick-edit";
import { formatPercent } from "@/lib/pricing";
import { shrinkImage } from "@/lib/shrink-image";

export const LOW_STOCK = 5;

export type AdminVariant = {
  id: string;
  sku: string;
  title: string;
  price: number;
  barcode: string | null;
  weightGrams: number | null;
  stock: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  status: string;
  needsReview: boolean;
  isRegulated: boolean;
  sizeDisplay: string | null;
  brand: string | null;
  image: string | null;
  stock: number;
  nearestExpiry: string | undefined;
  priceLabel: string;
  margin: number | null;
  variants: AdminVariant[];
};

function StockCell({ stock }: { stock: number }) {
  if (stock === 0) return <span className={`${pillCls} bg-bad-bg text-bad-fg`}>Out of stock</span>;
  if (stock <= LOW_STOCK) return <span className={`${pillCls} bg-warn-bg text-warn-fg`}>{stock} (low)</span>;
  return <span className={`${pillCls} bg-ok-bg text-ok-fg`}>{stock}</span>;
}

/** Camera button on each row: pick photos, they're shrunk in the browser and attached to that product. */
function RowPhotoButton({ row }: { row: AdminProductRow }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <label
      className="relative grid size-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-line bg-cream"
      title={error ?? (row.image ? "Add another photo" : "Add a photo")}
    >
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" className="size-full object-cover" />
      ) : (
        <ImageOff className="size-5 text-ink-3" aria-hidden />
      )}
      <span className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-tl-md bg-surface">
        <Camera className={`size-3 ${busy ? "animate-pulse" : ""}`} aria-hidden />
      </span>
      <span className="sr-only">Add photo to {row.name}</span>
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])].slice(0, 6);
          event.target.value = "";
          if (!files.length) return;
          startTransition(async () => {
            setError(null);
            for (const file of files) {
              try {
                const form = new FormData();
                form.set("product_id", row.id);
                form.set("product_name", row.name);
                form.set("file", await shrinkImage(file));
                const result = await uploadProductImage(null, form);
                if (result?.error) throw new Error(result.error);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
                break;
              }
            }
            router.refresh();
          });
        }}
      />
    </label>
  );
}

export function ProductTable({
  rows,
  allIds,
  brands,
  categories,
}: {
  rows: AdminProductRow[];
  allIds: string[];
  brands: Option[];
  categories: Option[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [mode, setMode] = useState<"list" | "edit">("list");

  const pageIds = rows.map((r) => r.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const targetIds = allMatching ? allIds : [...selected];

  function toggle(id: string) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (pageAllSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
    setAllMatching(false);
  }

  return (
    <div className="grid gap-3 pb-28">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="View" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode("list")}
            aria-pressed={mode === "list"}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold ${mode === "list" ? "bg-choc text-cream" : "text-ink-2 hover:bg-peach/50"}`}
          >
            <Table className="size-4" aria-hidden /> List
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            aria-pressed={mode === "edit"}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold ${mode === "edit" ? "bg-choc text-cream" : "text-ink-2 hover:bg-peach/50"}`}
          >
            <Pencil className="size-4" aria-hidden /> Quick edit
          </button>
        </div>
        {mode === "edit" && (
          <p className="text-sm text-ink-2">Type into the cells, press Tab to move on, then Save changes.</p>
        )}
      </div>

      {mode === "list" && pageAllSelected && allIds.length > pageIds.length && (
        <p className="rounded-xl bg-peach/40 p-3 text-sm text-choc">
          {allMatching ? (
            <>
              All <strong>{allIds.length}</strong> matching products are selected.{" "}
              <button type="button" onClick={clear} className="font-semibold text-choc underline decoration-line underline-offset-2 hover:text-terracotta-deep hover:decoration-terracotta">
                Clear selection
              </button>
            </>
          ) : (
            <>
              All {pageIds.length} on this page are selected.{" "}
              <button type="button" onClick={() => setAllMatching(true)} className="font-semibold text-choc underline decoration-line underline-offset-2 hover:text-terracotta-deep hover:decoration-terracotta">
                Select all {allIds.length} matching products
              </button>
            </>
          )}
        </p>
      )}

      {mode === "edit" ? (
        <QuickEdit rows={rows} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-chunk)]">
          {/* Below md each row stacks into a card: checkbox, product, then a two-column grid of facts. */}
          <table className="w-full text-sm max-md:block md:min-w-3xl">
            <thead className="bg-cream/70 max-md:block">
              <tr className="border-b border-line text-left text-xs font-bold text-ink-2 max-md:flex max-md:items-center">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    onChange={togglePage}
                    aria-label="Select all products on this page"
                    className="size-4"
                  />
                </th>
                <th className="p-3 max-md:pl-0">Product</th>
                <th className="p-3 max-md:hidden">Price</th>
                <th className="p-3 max-md:hidden">Margin</th>
                <th className="p-3 max-md:hidden">Stock</th>
                <th className="p-3 max-md:hidden">Nearest expiry</th>
                <th className="p-3 max-md:hidden">Status</th>
              </tr>
            </thead>
            <tbody className="max-md:block">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-line last:border-0 hover:bg-cream/50 max-md:grid max-md:grid-cols-[1.5rem_1fr_1fr] max-md:gap-x-3 max-md:gap-y-2 max-md:p-3 ${allMatching || selected.has(row.id) ? "bg-peach/25" : ""}`}
                >
                  <td className="p-3 max-md:row-span-4 max-md:p-0 max-md:pt-1">
                    <input
                      type="checkbox"
                      checked={allMatching || selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.name}`}
                      className="size-4"
                    />
                  </td>
                  <td className="p-3 max-md:col-span-2 max-md:p-0">
                    <div className="flex items-center gap-3">
                      <RowPhotoButton row={row} />
                      <div className="min-w-0">
                        <Link href={`/admin/products/${row.id}`} className="font-semibold text-choc underline decoration-line underline-offset-2 hover:text-terracotta-deep hover:decoration-terracotta">
                          {row.name}
                        </Link>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                          {row.brand && <span>{row.brand}</span>}
                          {row.sizeDisplay && <span>{row.sizeDisplay}</span>}
                          <span>
                            {row.variants.length} {row.variants.length === 1 ? "variant" : "variants"}
                          </span>
                          {row.isRegulated && (
                            <span className="rounded-full bg-warn-bg px-2 py-0.5 font-bold text-warn-fg">Regulated</span>
                          )}
                          {row.needsReview && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-bad-bg px-2 py-0.5 font-bold text-bad-fg">
                              <AlertTriangle className="size-3" aria-hidden /> Needs review
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Price" className="p-3 tabular-nums max-md:p-0 max-md:text-xs max-md:before:mr-1.5 max-md:before:text-ink-3 max-md:before:content-[attr(data-label)] font-semibold text-choc">{row.priceLabel}</td>
                  <td data-label="Margin" className="p-3 tabular-nums max-md:p-0 max-md:text-xs max-md:before:mr-1.5 max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">{formatPercent(row.margin)}</td>
                  <td data-label="Stock" className="p-3 tabular-nums max-md:p-0 max-md:text-xs max-md:before:mr-1.5 max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">
                    <StockCell stock={row.stock} />
                  </td>
                  <td data-label="Expiry" className="p-3 tabular-nums max-md:p-0 max-md:text-xs max-md:before:mr-1.5 max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">{row.nearestExpiry ?? "—"}</td>
                  <td data-label="Status" className="p-3 tabular-nums max-md:p-0 max-md:text-xs max-md:before:mr-1.5 max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode === "list" && targetIds.length > 0 && (
        <BulkBar ids={targetIds} brands={brands} categories={categories} onClear={clear} />
      )}
    </div>
  );
}
