"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { saveProduct } from "@/app/admin/products/actions";
import { btnPrimary, checkCls, hintCls, inputCls, labelCls, Notice } from "@/components/admin/form-parts";

export type ProductFields = {
  id: string;
  name: string;
  status: string;
  pet_type: string;
  size_display: string | null;
  description: string | null;
  ingredients: string | null;
  usage: string | null;
  highlights: string[] | null;
  is_regulated: boolean;
  is_dvs_approved: boolean;
  needs_review: boolean;
  review_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

const field = inputCls;

export function ProductForm({ product }: { product: ProductFields }) {
  const [state, action, pending] = useActionState(saveProduct, null);

  return (
    <form action={action} aria-labelledby="details-h" className="grid gap-5 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
      <input type="hidden" name="id" value={product.id} />
      <h2 id="details-h" className="flex items-center gap-2 font-bubble text-lg font-extrabold text-choc">
        <span className="grid size-8 place-items-center rounded-lg bg-peach/50 text-rust">
          <FileText className="size-[18px]" aria-hidden />
        </span>
        Product details
      </h2>

      <label className={labelCls} htmlFor="name">
        Product name
        <input id="name" name="name" defaultValue={product.name} required className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelCls} htmlFor="status">
          Status
          <select id="status" name="status" defaultValue={product.status} className={field}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className={labelCls} htmlFor="pet_type">
          For which pet
          <select id="pet_type" name="pet_type" defaultValue={product.pet_type} className={field}>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="small_pet">Small pets</option>
            <option value="dog_cat">Dogs &amp; cats</option>
          </select>
        </label>
        <label className={labelCls} htmlFor="size_display">
          Pack size shown
          <input
            id="size_display"
            name="size_display"
            defaultValue={product.size_display ?? ""}
            placeholder="415G"
            className={field}
          />
        </label>
      </div>

      <label className={labelCls} htmlFor="description">
        Description
        <textarea id="description" name="description" rows={4} defaultValue={product.description ?? ""} className={`${field} py-2`} />
      </label>

      <label className={labelCls} htmlFor="highlights">
        Highlights
        <input
          id="highlights"
          name="highlights"
          defaultValue={(product.highlights ?? []).join(", ")}
          placeholder="Liver support, Detox, Hepatic care"
          className={field}
        />
        <span className={hintCls}>Short benefits, separated by commas. Shown as chips on the shop.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls} htmlFor="ingredients">
          Ingredients
          <textarea id="ingredients" name="ingredients" rows={3} defaultValue={product.ingredients ?? ""} className={`${field} py-2`} />
        </label>
        <label className={labelCls} htmlFor="usage">
          Feeding / usage (one line each; start with Dogs: or Cats: for an icon)
          <textarea id="usage" name="usage" rows={4} defaultValue={product.usage ?? ""} className={`${field} py-2`} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls} htmlFor="seo_title">
          Google title
          <input id="seo_title" name="seo_title" defaultValue={product.seo_title ?? ""} className={field} />
        </label>
        <label className={labelCls} htmlFor="seo_description">
          Google description
          <input id="seo_description" name="seo_description" defaultValue={product.seo_description ?? ""} className={field} />
        </label>
      </div>

      <div className="grid gap-2">
        <label className={checkCls}>
          <input type="checkbox" name="is_regulated" defaultChecked={product.is_regulated} className="size-5 shrink-0 accent-terracotta-deep" />
          Regulated product (medication or veterinary)
        </label>
        <label className={checkCls}>
          <input type="checkbox" name="is_dvs_approved" defaultChecked={product.is_dvs_approved} className="size-5 shrink-0 accent-terracotta-deep" />
          DVS Malaysia approved (shows a badge on the shop)
        </label>
        <label className={checkCls}>
          <input type="checkbox" name="needs_review" defaultChecked={product.needs_review} className="size-5 shrink-0 accent-terracotta-deep" />
          Still needs review
        </label>
        {product.review_notes && (
          <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-fg">Import notes: {product.review_notes}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save product"}
        </button>
        {state?.ok && <Notice tone="ok">{state.ok}</Notice>}
        {state?.error && <Notice tone="bad">{state.error}</Notice>}
      </div>
    </form>
  );
}
