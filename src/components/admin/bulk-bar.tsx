"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type BulkOp, type BulkResult, bulkUpdateProducts } from "@/app/admin/products/bulk-actions";

export type Option = { id: string; name: string };

const PET_TYPES = [
  ["dog", "Dog"],
  ["cat", "Cat"],
  ["dog_cat", "Dog & cat"],
  ["small_pet", "Small pet"],
] as const;

// Actions that need a number typed in, and the label/placeholder shown for it.
const NUMBER_INPUT: Record<string, { label: string; placeholder: string; step: string }> = {
  price_set: { label: "New price (RM)", placeholder: "29.90", step: "0.01" },
  price_percent: { label: "Change by % (use - to lower)", placeholder: "10", step: "0.1" },
  price_amount: { label: "Change by RM (use - to lower)", placeholder: "2", step: "0.01" },
  price_margin: { label: "Margin % after card fee (needs a cost price)", placeholder: "25", step: "1" },
  stock_set: { label: "Stock per variant", placeholder: "10", step: "1" },
  stock_add: { label: "Add per variant", placeholder: "10", step: "1" },
};

function buildOp(action: string, value: string, number: string, expiry: string, confirm: string): BulkOp | string {
  const n = Number(number);
  switch (action) {
    case "published":
    case "draft":
    case "archived":
      return { kind: "status", value: action };
    case "brand":
    case "category":
      return { kind: action, value: value || null };
    case "pet_type":
      return value ? { kind: "pet_type", value } : "Choose a pet type.";
    case "regulated_on":
    case "regulated_off":
      return { kind: "is_regulated", value: action === "regulated_on" };
    case "review_on":
    case "review_off":
      return { kind: "needs_review", value: action === "review_on" };
    case "dvs_on":
    case "dvs_off":
      return { kind: "is_dvs_approved", value: action === "dvs_on" };
    case "delete":
      return { kind: "delete", confirm };
  }
  if (!number.trim() || !Number.isFinite(n)) return "Enter a number.";
  if (action.startsWith("price_")) return { kind: "price", mode: action.slice(6), value: n };
  if (action.startsWith("stock_")) return { kind: "stock", mode: action.slice(6), value: n, expiry: expiry || null };
  return "Choose an action.";
}

export function BulkBar({
  ids,
  brands,
  categories,
  onClear,
}: {
  ids: string[];
  brands: Option[];
  categories: Option[];
  onClear: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState("");
  const [value, setValue] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);

  const numberInput = NUMBER_INPUT[action];
  const count = ids.length;

  function apply() {
    const op = buildOp(action, value, number, expiry, confirm);
    if (typeof op === "string") {
      setResult({ error: op });
      return;
    }
    startTransition(async () => {
      const res = await bulkUpdateProducts(ids, op);
      setResult(res);
      if (res.ok) {
        setNumber("");
        setConfirm("");
        if (action === "delete") onClear();
        router.refresh();
      }
    });
  }

  const field = "min-h-11 rounded-xl border-2 border-line bg-ground px-3 text-sm";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
        className="mx-auto flex max-w-6xl flex-wrap items-end gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2 self-center">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="grid size-9 place-items-center rounded-full hover:bg-sunk"
          >
            <X className="size-4" aria-hidden />
          </button>
          <strong className="text-sm">{count} selected</strong>
        </div>

        <label className="grid gap-1 text-xs font-semibold">
          Action
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setValue("");
              setResult(null);
            }}
            className={field}
          >
            <option value="">Choose…</option>
            <optgroup label="Visibility">
              <option value="published">Publish</option>
              <option value="draft">Move to draft (hide)</option>
              <option value="archived">Archive</option>
            </optgroup>
            <optgroup label="Details">
              <option value="brand">Set brand</option>
              <option value="category">Set category</option>
              <option value="pet_type">Set pet type</option>
              <option value="regulated_on">Mark regulated (vet notice)</option>
              <option value="regulated_off">Unmark regulated</option>
              <option value="review_on">Flag needs review</option>
              <option value="review_off">Clear needs review</option>
              <option value="dvs_on">Mark DVS approved</option>
              <option value="dvs_off">Unmark DVS approved</option>
            </optgroup>
            <optgroup label="Price">
              <option value="price_set">Set exact price</option>
              <option value="price_percent">Raise / lower by %</option>
              <option value="price_amount">Raise / lower by RM</option>
              <option value="price_margin">Apply margin</option>
            </optgroup>
            <optgroup label="Stock">
              <option value="stock_set">Set stock quantity</option>
              <option value="stock_add">Add stock (new batch)</option>
            </optgroup>
            <optgroup label="Danger">
              <option value="delete">Delete permanently</option>
            </optgroup>
          </select>
        </label>

        {(action === "brand" || action === "category") && (
          <label className="grid gap-1 text-xs font-semibold">
            {action === "brand" ? "Brand" : "Category"}
            <select value={value} onChange={(event) => setValue(event.target.value)} className={field}>
              <option value="">None</option>
              {(action === "brand" ? brands : categories).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {action === "pet_type" && (
          <label className="grid gap-1 text-xs font-semibold">
            Pet type
            <select value={value} onChange={(event) => setValue(event.target.value)} className={field}>
              <option value="">Choose…</option>
              {PET_TYPES.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        {numberInput && (
          <label className="grid gap-1 text-xs font-semibold">
            {numberInput.label}
            <input
              type="number"
              inputMode="decimal"
              step={numberInput.step}
              min={action === "price_set" || action.startsWith("stock_") ? 0 : undefined}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder={numberInput.placeholder}
              className={`${field} w-40 tabular-nums`}
            />
          </label>
        )}

        {action.startsWith("stock_") && (
          <label className="grid gap-1 text-xs font-semibold">
            Expiry (optional)
            <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className={field} />
          </label>
        )}

        {action === "delete" && (
          <label className="grid gap-1 text-xs font-semibold text-bad-fg">
            Type DELETE {count} to confirm. Archive hides products without losing them.
            <input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder={`DELETE ${count}`}
              autoComplete="off"
              className={`${field} w-48`}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={!action || pending || (action === "delete" && confirm.trim() !== `DELETE ${count}`)}
          className={`btn-chunk text-sm disabled:opacity-50 ${action === "delete" ? "bg-bad-bg text-bad-fg" : "bg-grape text-surface"}`}
        >
          {pending ? "Working…" : "Apply"}
        </button>

        <p className="min-h-5 basis-full text-sm" aria-live="polite">
          {result?.error && (
            <span role="alert" className="font-semibold text-bad-fg">
              {result.error}
            </span>
          )}
          {result?.ok && <span className="font-semibold text-ok-fg">{result.ok}</span>}
        </p>
      </form>
    </div>
  );
}
