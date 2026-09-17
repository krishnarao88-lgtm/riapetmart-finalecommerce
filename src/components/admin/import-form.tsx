"use client";

import { CheckCircle2, Upload } from "lucide-react";
import { useActionState } from "react";
import { importCatalogue } from "@/app/admin/import/actions";
import { formatMyr } from "@/lib/pricing";

export function ImportForm() {
  const [state, action, pending] = useActionState(importCatalogue, null);
  const preview = state && "mode" in state ? state : null;
  const error = state && "error" in state ? state.error : undefined;

  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
        <label className="grid gap-2 text-sm font-semibold" htmlFor="file">
          Excel (.xlsx) or CSV file
          <span className="text-xs font-normal text-ink-3">
            One row per variant. Download the template below to see the column headings.
          </span>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="min-h-11 rounded-xl border-2 border-line bg-ground px-3 py-2 font-normal"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="mode"
            value="preview"
            disabled={pending}
            className="btn-chunk bg-sunshine text-sm disabled:opacity-60"
          >
            <Upload className="size-5" aria-hidden />
            {pending ? "Reading…" : "Check the file"}
          </button>
          {preview?.mode === "preview" && preview.productCount > 0 && (
            <button
              type="submit"
              name="mode"
              value="apply"
              disabled={pending}
              className="btn-chunk bg-tangerine text-sm disabled:opacity-60"
            >
              Import {preview.productCount} products
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm font-semibold text-bad-fg">
            {error}
          </p>
        )}
      </form>

      {preview && (
        <div className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
          {preview.mode === "applied" ? (
            <p role="status" className="flex items-center gap-2 font-semibold text-ok-fg">
              <CheckCircle2 className="size-5" aria-hidden /> {preview.message}
            </p>
          ) : (
            <p className="font-semibold">
              {preview.fileName}: {preview.rowCount} rows read.
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Products", preview.productCount],
              ["Variants", preview.variantCount],
              ["Rows with problems", preview.issues.length],
              ["Rows read", preview.rowCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-sunk p-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-3">{label}</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          {preview.issues.length > 0 && (
            <div className="grid gap-2">
              <h3 className="font-semibold text-bad-fg">
                These rows will be skipped. Fix them in the file and upload again.
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-xl border-2 border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-sunk text-left text-xs uppercase tracking-widest text-ink-3">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Column</th>
                      <th className="p-2">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.issues.map((issue, i) => (
                      <tr key={`${issue.row}-${issue.field}-${i}`} className="border-t border-line">
                        <td className="p-2 tabular-nums">{issue.row}</td>
                        <td className="p-2 font-mono text-xs">{issue.field}</td>
                        <td className="p-2">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.sample.length > 0 && preview.mode === "preview" && (
            <div className="grid gap-2">
              <h3 className="font-semibold">First few products</h3>
              <div className="overflow-x-auto rounded-xl border-2 border-line">
                <table className="w-full min-w-xl text-sm">
                  <thead className="bg-sunk text-left text-xs uppercase tracking-widest text-ink-3">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2">Variants</th>
                      <th className="p-2">First price</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">Nearest expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row) => (
                      <tr key={row.name} className="border-t border-line">
                        <td className="p-2">{row.name}</td>
                        <td className="p-2 tabular-nums">{row.variants}</td>
                        <td className="p-2 tabular-nums">{formatMyr(row.price)}</td>
                        <td className="p-2 tabular-nums">{row.stock}</td>
                        <td className="p-2 tabular-nums">{row.expiry ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
