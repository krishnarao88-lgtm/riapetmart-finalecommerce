import type { Metadata } from "next";
import Link from "next/link";
import { SizeFields } from "@/components/admin/size-fields";
import { requireAdmin } from "@/lib/auth";
import { createProduct } from "../create-actions";

export const metadata: Metadata = { title: "Add product", robots: { index: false } };

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal";
const label = "grid gap-1 text-sm font-semibold";

export default async function NewProduct({ searchParams }: PageProps<"/admin/products/new">) {
  const { supabase } = await requireAdmin();
  const { error } = (await searchParams) as { error?: string };
  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("name").order("name"),
    supabase.from("categories").select("id, name").order("sort").order("name"),
  ]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <Link href="/admin/products" className="text-sm text-ink-2 underline">
          ← All products
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Add a product</h1>
        <p className="text-sm text-ink-2">
          It&apos;s saved as a <strong>draft</strong> (hidden from shoppers). Next you&apos;ll add photos, description and
          more sizes, then set it to Published. Adding lots at once?{" "}
          <Link href="/admin/import" className="underline">
            Use the Excel import
          </Link>
          .
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">
          {error}
        </p>
      )}

      <form action={createProduct} className="grid gap-5 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
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
            Size shown on the card <span className="font-normal text-ink-2">(optional)</span>
            <input name="size_display" placeholder="e.g. 2kg" className={field} />
          </label>
        </div>

        <fieldset className="grid gap-3 border-t border-line pt-4">
          <legend className="font-bold">First size, price &amp; stock</legend>
          <SizeFields />
        </fieldset>

        <button type="submit" className="btn-chunk w-fit bg-sunshine">
          Save draft &amp; add photos →
        </button>
      </form>
    </div>
  );
}
