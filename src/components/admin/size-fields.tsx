const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal";
const label = "grid gap-1 text-sm font-semibold";

/** Size, price, cost and opening stock: shared by "Add product" and "Add another size". */
export function SizeFields() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={label}>
        Size / option name
        <input name="size_title" placeholder="e.g. 1.5kg bag, Single can, Carton of 24" className={field} />
      </label>
      <label className={label}>
        Weight in grams <span className="font-normal text-ink-2">(for delivery quotes)</span>
        <input name="weight_grams" type="number" min="0" step="1" placeholder="1500" className={field} />
      </label>
      <label className={label}>
        Cost price (RM)
        <input name="cost_price" type="number" min="0" step="0.01" placeholder="What you pay the supplier" className={field} />
      </label>
      <label className={label}>
        Margin % <span className="font-normal text-ink-2">(price is worked out, 3% card fee included)</span>
        <input name="margin" type="number" min="0" max="94" step="0.1" placeholder="20" className={field} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Or type the selling price (RM) <span className="font-normal text-ink-2">(overrides margin)</span>
        <input name="price" type="number" min="0.01" step="0.01" className={field} />
      </label>
      <label className={label}>
        Stock quantity
        <input name="quantity" type="number" min="0" step="1" placeholder="0" className={field} />
      </label>
      <label className={label}>
        Best-before date
        <input name="expiry_date" type="date" className={field} />
      </label>
      <label className={label}>
        Batch no. <span className="font-normal text-ink-2">(optional)</span>
        <input name="batch_no" className={field} />
      </label>
    </div>
  );
}
