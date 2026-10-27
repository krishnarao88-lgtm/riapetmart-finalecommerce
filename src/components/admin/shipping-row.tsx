"use client";

import { ScanBarcode } from "lucide-react";
import { useState, useTransition } from "react";
import { saveVariantShipping } from "@/app/admin/products/shipping/actions";
import { isInternalCode, isValidGtin } from "@/lib/gtin";
import { BarcodeScanner } from "./barcode-scanner";
import { btnPrimary, btnSecondary, inputCls } from "./form-parts";

export type ShippingVariant = {
  id: string;
  product: string;
  title: string;
  sku: string;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  barcode: string | null;
};

const cm = (mm: number | null) => (mm == null ? "" : String(mm / 10));
const toMm = (v: string) => (v.trim() ? Math.round(Number(v) * 10) : null);
const toInt = (v: string) => (v.trim() ? Number(v) : null);

/** Advice only: odd codes can still be saved (some packs carry store or regional codes). */
export function barcodeWarning(code: string): string | null {
  if (!code) return null;
  if (!/^\d+$/.test(code)) return "Digits only.";
  if (isInternalCode(code)) return "Shop-made code: Google ignores it. Scan the maker's barcode on the pack.";
  if (!isValidGtin(code)) return "Check digit doesn't match. Re-scan or check the number.";
  return null;
}

/** Moves focus to the next row's barcode box, so a USB/Bluetooth scanner can run down the list. */
function focusNextBarcode(current: HTMLInputElement | null) {
  const all = [...document.querySelectorAll<HTMLInputElement>("input[data-barcode]")];
  const next = all[all.indexOf(current!) + 1];
  next?.focus();
  next?.select();
}

export function ShippingRow({ v }: { v: ShippingVariant }) {
  const [weight, setWeight] = useState(v.weightGrams == null ? "" : String(v.weightGrams));
  const [dims, setDims] = useState([cm(v.lengthMm), cm(v.widthMm), cm(v.heightMm)]);
  const [barcode, setBarcode] = useState(v.barcode ?? "");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const name = `${v.product} (${v.title})`;
  const warning = barcodeWarning(barcode.trim());

  function save(input?: HTMLInputElement | null) {
    setResult(null);
    start(async () => {
      const [lengthMm, widthMm, heightMm] = dims.map(toMm);
      const res = await saveVariantShipping({ id: v.id, weightGrams: toInt(weight), lengthMm, widthMm, heightMm, barcode });
      setResult(res);
      if (res.ok && input) focusNextBarcode(input);
    });
  }

  const field = "grid content-start gap-1 text-xs font-semibold text-ink-2";
  return (
    <li className="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-chunk)]">
      <div className="min-w-0">
        <p className="font-bold text-choc">{v.product}</p>
        <p className="text-sm text-ink-2">
          {v.title} <span className="text-ink-3">· {v.sku}</span>
        </p>
      </div>
      <form
        className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4 lg:grid-cols-[7rem_repeat(3,5.5rem)_minmax(12rem,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className={field}>
          Weight (g)
          <input className={inputCls} inputMode="numeric" type="number" min={1} max={100000} step={1} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        {(["Length", "Width", "Height"] as const).map((dim, i) => (
          <label key={dim} className={field}>
            {dim} (cm)
            <input
              className={inputCls}
              inputMode="decimal"
              type="number"
              min={0.1}
              max={200}
              step={0.1}
              value={dims[i]}
              onChange={(e) => setDims((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
        <div className="col-span-2 grid gap-1 sm:col-span-4 lg:col-span-1">
          <label className={field} htmlFor={`bc-${v.id}`}>Barcode</label>
          <div className="flex gap-2">
            <input
              id={`bc-${v.id}`}
              data-barcode
              className={inputCls}
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              value={barcode}
              aria-describedby={warning ? `bcw-${v.id}` : undefined}
              onChange={(e) => setBarcode(e.target.value.replace(/\s/g, ""))}
              onKeyDown={(e) => {
                // Hand-held scanners type the digits then Enter: save this row and move on.
                if (e.key === "Enter") {
                  e.preventDefault();
                  save(e.currentTarget);
                }
              }}
            />
            <button type="button" className={`${btnSecondary} shrink-0`} onClick={() => setScanning(true)} aria-label={`Scan barcode for ${name}`}>
              <ScanBarcode className="size-4" aria-hidden />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>
          {warning && (
            <p id={`bcw-${v.id}`} className="text-xs font-semibold text-warn-fg">{warning}</p>
          )}
        </div>
        <div className="col-span-2 grid gap-1 sm:col-span-4 lg:col-span-1">
          <button type="submit" disabled={pending} className={btnPrimary} aria-label={`Save ${name}`}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      <p role={result?.error ? "alert" : "status"} className={`-mt-3 text-sm font-semibold ${result?.error ? "text-bad-fg" : "text-ok-fg"}`}>
        {result?.error ?? result?.ok}
      </p>
      {scanning && (
        <BarcodeScanner
          label={name}
          onClose={() => setScanning(false)}
          onResult={(code) => {
            setBarcode(code);
            setScanning(false);
          }}
        />
      )}
    </li>
  );
}
