import type { Metadata } from "next";
import { ArrowLeft, Images, Plus, Tags } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/admin/dashboard-parts";
import { btnPrimary, Notice, pageWrap } from "@/components/admin/form-parts";
import { notFound } from "next/navigation";
import { BatchEditor, type Batch } from "@/components/admin/batch-editor";
import { ProductForm, type ProductFields } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { SizeFields } from "@/components/admin/size-fields";
import { VariantPricingRow } from "@/components/admin/variant-pricing-row";
import { addSize } from "../create-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };

type Loaded = ProductFields & {
  brands: { name: string } | null;
  product_images: { id: string; path: string; alt: string }[];
  variants: {
    id: string;
    sku: string;
    title: string;
    price: number;
    sort: number;
    variant_costs: { cost_price: number; margin: number | null } | null;
    stock_batches: Batch[];
  }[];
};

export default async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const { created, sized, error } = (await searchParams) as { created?: string; sized?: string; error?: string };

  const { data } = await supabase
    .from("products")
    .select(
      "id, name, status, pet_type, size_display, description, ingredients, usage, highlights, is_regulated, is_dvs_approved, needs_review, review_notes, seo_title, seo_description, brands(name), product_images(id, path, alt), variants(id, sku, title, price, sort, variant_costs(cost_price, margin), stock_batches(id, quantity, expiry_date, batch_no, received_at))",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();
  const product = data as unknown as Loaded;
  const variants = [...product.variants].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));

  return (
    <div className={pageWrap}>
      <div className="grid gap-1">
        <Link href="/admin/products" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ink-2 hover:text-terracotta-deep">
          <ArrowLeft className="size-4" aria-hidden /> All products
        </Link>
        <h1 className="font-bubble text-3xl font-extrabold text-choc">{product.name}</h1>
        {product.brands?.name && <p className="text-sm text-ink-2">{product.brands.name}</p>}
        {created && (
          <div className="mt-2">
            <Notice tone="ok">Saved as a draft. Add photos and a description, then set Status to Published.</Notice>
          </div>
        )}
        {sized && (
          <div className="mt-2">
            <Notice tone="ok">Size added.</Notice>
          </div>
        )}
        {error && (
          <div className="mt-2">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
      </div>

      <Panel id="images" title="Photos" Icon={Images}>
        <ProductImages productId={product.id} productName={product.name} images={product.product_images} />
      </Panel>

      <ProductForm product={product} />

      <Panel id="pricing" title="Pricing & stock per variant" Icon={Tags}>
        {variants.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-cream/60 p-5 text-ink-2">
            This product has no sizes yet. Add one below.
          </p>
        )}
        {variants.map((variant) => (
          <div key={variant.id} className="grid gap-4 rounded-xl border border-line bg-ground p-4">
            <VariantPricingRow
              productId={product.id}
              variant={{
                id: variant.id,
                sku: variant.sku,
                title: variant.title,
                price: Number(variant.price),
                cost: variant.variant_costs ? Number(variant.variant_costs.cost_price) : null,
                margin: variant.variant_costs?.margin != null ? Number(variant.variant_costs.margin) : null,
              }}
            />
            <BatchEditor
              variantId={variant.id}
              productId={product.id}
              batches={[...variant.stock_batches].sort((a, b) =>
                (a.expiry_date ?? "9999").localeCompare(b.expiry_date ?? "9999"),
              )}
            />
          </div>
        ))}
        <details className="rounded-xl border border-dashed border-line bg-cream/40 p-4" open={variants.length === 0}>
          <summary className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-choc">
            <Plus className="size-4" aria-hidden /> Add another size
          </summary>
          <form action={addSize} className="mt-3 grid gap-3">
            <input type="hidden" name="product_id" value={product.id} />
            <SizeFields />
            <button type="submit" className={`${btnPrimary} w-fit`}>
              Add size
            </button>
          </form>
        </details>
      </Panel>
    </div>
  );
}
