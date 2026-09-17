import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { BatchEditor, type Batch } from "@/components/admin/batch-editor";
import { ProductForm, type ProductFields } from "@/components/admin/product-form";
import { VariantPricingRow } from "@/components/admin/variant-pricing-row";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };

type Loaded = ProductFields & {
  brands: { name: string } | null;
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

export default async function EditProduct({ params }: PageProps<"/admin/products/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const { data } = await supabase
    .from("products")
    .select(
      "id, name, status, pet_type, size_display, description, ingredients, usage, is_regulated, needs_review, review_notes, seo_title, seo_description, brands(name), variants(id, sku, title, price, sort, variant_costs(cost_price, margin), stock_batches(id, quantity, expiry_date, batch_no, received_at))",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();
  const product = data as unknown as Loaded;
  const variants = [...product.variants].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <AdminNav current="/admin/products" />

      <div className="grid gap-1">
        <Link href="/admin/products" className="text-sm text-ink-2 underline">
          ← All products
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{product.name}</h1>
        {product.brands?.name && <p className="text-sm text-ink-2">{product.brands.name}</p>}
      </div>

      <ProductForm product={product} />

      <section aria-labelledby="pricing-heading" className="grid gap-4">
        <h2 id="pricing-heading" className="font-display text-2xl font-extrabold tracking-tight">
          Pricing &amp; stock per variant
        </h2>
        {variants.length === 0 && (
          <p className="rounded-[var(--radius-chunk)] border-2 border-line bg-surface p-5 text-ink-2">
            This product has no variants yet. The Excel import creates them from your “Selling Option” column.
          </p>
        )}
        {variants.map((variant) => (
          <div key={variant.id} className="grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-ground p-4">
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
      </section>
    </div>
  );
}
