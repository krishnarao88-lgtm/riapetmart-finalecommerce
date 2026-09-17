"use client";

import { useActionState } from "react";
import { saveProduct } from "@/app/admin/products/actions";

export type ProductFields = {
  id: string;
  name: string;
  status: string;
  pet_type: string;
  size_display: string | null;
  description: string | null;
  ingredients: string | null;
  usage: string | null;
  is_regulated: boolean;
  needs_review: boolean;
  review_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal";

export function ProductForm({ product }: { product: ProductFields }) {
  const [state, action, pending] = useActionState(saveProduct, null);

  return (
    <form action={action} className="grid gap-5 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
      <input type="hidden" name="id" value={product.id} />

      <label className="grid gap-1 text-sm font-semibold" htmlFor="name">
        Product name
        <input id="name" name="name" defaultValue={product.name} required className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="status">
          Status
          <select id="status" name="status" defaultValue={product.status} className={field}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="pet_type">
          For which pet
          <select id="pet_type" name="pet_type" defaultValue={product.pet_type} className={field}>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="small_pet">Small pets</option>
            <option value="dog_cat">Dogs &amp; cats</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="size_display">
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

      <label className="grid gap-1 text-sm font-semibold" htmlFor="description">
        Description
        <textarea id="description" name="description" rows={4} defaultValue={product.description ?? ""} className={`${field} py-2`} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="ingredients">
          Ingredients
          <textarea id="ingredients" name="ingredients" rows={3} defaultValue={product.ingredients ?? ""} className={`${field} py-2`} />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="usage">
          Feeding / usage
          <textarea id="usage" name="usage" rows={3} defaultValue={product.usage ?? ""} className={`${field} py-2`} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="seo_title">
          Google title
          <input id="seo_title" name="seo_title" defaultValue={product.seo_title ?? ""} className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="seo_description">
          Google description
          <input id="seo_description" name="seo_description" defaultValue={product.seo_description ?? ""} className={field} />
        </label>
      </div>

      <div className="grid gap-3">
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="is_regulated" defaultChecked={product.is_regulated} className="size-5" />
          Regulated product (medication or veterinary)
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="needs_review" defaultChecked={product.needs_review} className="size-5" />
          Still needs review
        </label>
        {product.review_notes && (
          <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-fg">Import notes: {product.review_notes}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Saving…" : "Save product"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-semibold text-ok-fg">{state.ok}</span>}
        {state?.error && <span role="alert" className="text-sm font-semibold text-bad-fg">{state.error}</span>}
      </div>
    </form>
  );
}
