"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { type BulkResult, type GridEdit, saveGridEdits } from "@/app/admin/products/bulk-actions";
import type { AdminProductRow, AdminVariant } from "@/components/admin/product-table";

type Field = "title" | "price" | "stock" | "sku" | "barcode" | "weightGrams";

function original(v: AdminVariant, field: Field): string {
  const value = v[field];
  return value === null || value === undefined ? "" : String(value);
}

/** Turns typed cells into a validated change list, or an error message naming the bad cell. */
function toEdits(rows: AdminProductRow[], cells: Record<string, Partial<Record<Field, string>>>): GridEdit[] | string {
  const variants = new Map(rows.flatMap((r) => r.variants.map((v) => [v.id, { v, product: r.name }] as const)));
  const edits: GridEdit[] = [];
  for (const [variantId, changed] of Object.entries(cells)) {
    const found = variants.get(variantId);
    if (!found) continue;
    const { v, product } = found;
    const edit: GridEdit = { variantId };
    for (const [field, raw] of Object.entries(changed) as [Field, string][]) {
      if (raw === original(v, field)) continue;
      const value = raw.trim();
      if (field === "title") {
        if (!value) return `${product}: variant name can't be empty.`;
        edit.title = value;
      } else if (field === "price") {
        const n = Number(value);
        if (!value || !Number.isFinite(n) || n < 0) return `${product}: price must be 0 or more.`;
        edit.price = n;
      } else if (field === "stock") {
        const n = Number(value);
        if (!value || !Number.isInteger(n) || n < 0) return `${product}: stock must be a whole number, 0 or more.`;
        edit.stock = n;
      } else if (field === "weightGrams") {
        const n = Number(value);
        if (value && (!Number.isInteger(n) || n <= 0)) return `${product}: weight must be whole grams.`;
        edit.weightGrams = value ? n : null;
      } else if (field === "sku") {
        if (!value) return `${product}: SKU can't be empty.`;
        edit.sku = value;
      } else {
        edit.barcode = value || null;
      }
    }
    if (Object.keys(edit).length > 1) edits.push(edit);
  }
  return edits;
}

const COLUMNS = [
  ["title", "text", "Variant name"],
  ["price", "decimal", "Price"],
  ["stock", "numeric", "Stock"],
  ["sku", "text", "SKU"],
  ["barcode", "numeric", "Barcode"],
  ["weightGrams", "numeric", "Weight"],
] as const;

export function QuickEdit({ rows }: { rows: AdminProductRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cells, setCells] = useState<Record<string, Partial<Record<Field, string>>>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BulkResult | null>(null);

  const variantById = new Map(rows.flatMap((r) => r.variants.map((v) => [v.id, v] as const)));
  const statusById = new Map(rows.map((r) => [r.id, r.status]));
  const changedCells = Object.entries(cells).reduce((n, [id, fields]) => {
    const v = variantById.get(id);
    return v ? n + Object.entries(fields).filter(([f, val]) => val !== original(v, f as Field)).length : n;
  }, 0);
  const changedStatuses = Object.entries(statuses).filter(([id, s]) => s !== statusById.get(id));
  const dirty = changedCells + changedStatuses.length;

  // Warn before leaving the page with unsaved typing.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function cell(v: AdminVariant, field: Field) {
    return cells[v.id]?.[field] ?? original(v, field);
  }

  function setCell(variantId: string, field: Field, value: string) {
    setCells((prev) => ({ ...prev, [variantId]: { ...prev[variantId], [field]: value } }));
  }

  function discard() {
    setCells({});
    setStatuses({});
    setResult(null);
  }

  function save() {
    const edits = toEdits(rows, cells);
    if (typeof edits === "string") {
      setResult({ error: edits });
      return;
    }
    const statusEdits = changedStatuses.map(([productId, status]) => ({ productId, status }));
    startTransition(async () => {
      const res = await saveGridEdits(edits, statusEdits);
      setResult(res);
      if (res.ok) {
        setCells({});
        setStatuses({});
        router.refresh();
      }
    });
  }

  const input = "min-h-9 w-full rounded-lg border-2 px-2 text-sm";
  const tone = (changed: boolean) => (changed ? "border-tangerine bg-sunshine/30" : "border-line bg-ground");

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-[var(--radius-chunk)] border-2 border-ink bg-surface">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b-2 border-line text-left text-xs uppercase tracking-widest text-ink-3">
              <th className="p-2">Product</th>
              <th className="w-44 p-2">Variant name</th>
              <th className="w-28 p-2">Price (RM)</th>
              <th className="w-24 p-2">Stock</th>
              <th className="w-44 p-2">SKU</th>
              <th className="w-40 p-2">Barcode</th>
              <th className="w-24 p-2">Weight (g)</th>
              <th className="w-32 p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) =>
              row.variants.map((v, i) => (
                <tr key={v.id} className={i === row.variants.length - 1 ? "border-b border-line" : ""}>
                  {i === 0 && (
                    <td rowSpan={row.variants.length} className="p-2 align-top font-semibold">
                      {row.name}
                    </td>
                  )}
                  {COLUMNS.map(([field, mode, label]) => (
                    <td key={field} className="p-1.5">
                      <input
                        value={cell(v, field)}
                        onChange={(event) => setCell(v.id, field, event.target.value)}
                        inputMode={mode}
                        aria-label={`${label} for ${row.name} ${v.title}`}
                        className={`${input} ${field === "title" ? "" : "tabular-nums"} ${tone(cell(v, field) !== original(v, field))}`}
                      />
                    </td>
                  ))}
                  {i === 0 && (
                    <td rowSpan={row.variants.length} className="p-1.5 align-top">
                      <select
                        value={statuses[row.id] ?? row.status}
                        onChange={(event) => setStatuses((prev) => ({ ...prev, [row.id]: event.target.value }))}
                        aria-label={`Status for ${row.name}`}
                        className={`${input} ${tone((statuses[row.id] ?? row.status) !== row.status)}`}
                      >
                        <option value="published">published</option>
                        <option value="draft">draft</option>
                        <option value="archived">archived</option>
                      </select>
                    </td>
                  )}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <strong className="text-sm">
            {dirty ? `${dirty} unsaved ${dirty === 1 ? "change" : "changes"}` : "No changes yet"}
          </strong>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="btn-chunk bg-grape text-sm text-surface disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || pending}
            className="btn-chunk bg-surface text-sm disabled:opacity-50"
          >
            Discard
          </button>
          <p className="text-sm" aria-live="polite">
            {result?.error && (
              <span role="alert" className="font-semibold text-bad-fg">
                {result.error}
              </span>
            )}
            {result?.ok && <span className="font-semibold text-ok-fg">{result.ok}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
