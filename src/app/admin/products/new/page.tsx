import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { btnPrimary, inputCls, labelCls, Notice, pageWrap } from "@/components/admin/form-parts";
import { SizeFields } from "@/components/admin/size-fields";
import { requireAdmin } from "@/lib/auth";
import { createProduct } from "../create-actions";

export const metadata: Metadata = { title: "Add product", robots: { index: false } };

const field = inputCls;
const label = labelCls;

export default async function NewProduct({ searchParams }: PageProps<"/admin/products/new">) {
  const { supabase } = await requireAdmin();
  const { error } = (await searchParams) as { error?: string };
  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("name").order("name"),
    supabase.from("categories").select("id, name").order("sort").order("name"),
  ]);

  return (
    <div className={pageWrap}>
      <div className="grid w-full max-w-3xl gap-5">
      <div className="grid gap-1">
        <Link href="/admin/products" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ink-2 hover:text-terracotta-deep">
          <ArrowLeft className="size-4" aria-hidden /> All products
        </Link>
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Add a product</h1>
        <p className="text-sm text-ink-2">
          It&apos;s saved as a <strong>draft</strong> (hidden from shoppers). Next you&apos;ll add photos, description and
          more sizes, then set it to Published. Adding lots at once?{" "}
          <Link href="/admin/import" className="font-semibold text-terracotta-deep underline">
            Use the Excel import
          </Link>
          .
        </p>
      </div>

      {error && (
        <Notice tone="bad">{error}</Notice>
      )}

      <form action={createProduct} className="grid gap-5 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Product name *
            <input name="name" required placeholder="e.g. Royal Canin Kitten 2kg" className={field} />
          </label>
          <label className={label}>
            Brand
            <input name="brand" list="brand-list" placeholder="Pick or type a new brand" className={field} />
            <datalist id="brand-list">
              {(brands ?? []).map((b) => (
                <option key={b.name} value={b.name} />
              ))}
            </datalist>
          </label>
          <label className={label}>
            Category
            <select name="category_id" className={field} defaultValue="">
              <option value="">— choose —</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            For
            <select name="pet_type" className={field} defaultValue="cat">
              <option value="cat">Cats</option>
              <option value="dog">Dogs</option>
              <option value="dog_cat">Dogs &amp; cats</option>
              <option value="small_pet">Small pets</option>
            </select>
          </label>
          <label className={label}>
            Size shown on the card <span className="font-normal text-ink-3">(optional)</span>
            <input name="size_display" placeholder="e.g. 2kg" className={field} />
          </label>
        </div>

        <fieldset className="grid gap-3 border-t border-line pt-4">
          <legend className="font-bubble text-lg font-extrabold text-choc">First size, price &amp; stock</legend>
          <SizeFields />
        </fieldset>

        <button type="submit" className={`${btnPrimary} w-fit`}>
          Save draft &amp; add photos →
        </button>
      </form>
      </div>
    </div>
  );
}
