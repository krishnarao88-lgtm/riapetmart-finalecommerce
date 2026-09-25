import type { Metadata } from "next";
import Link from "next/link";
import { BulkPhotoUpload, type PhotoTarget } from "@/components/admin/bulk-photo-upload";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Bulk photo upload", robots: { index: false } };

type Row = {
  id: string;
  name: string;
  slug: string;
  source_ref: string | null;
  variants: { sku: string; legacy_sku: string | null }[];
  product_images: { id: string }[];
};

export default async function BulkPhotosPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, source_ref, variants(sku, legacy_sku), product_images(id)")
    .order("name")
    .limit(2000);

  const products: PhotoTarget[] = ((data ?? []) as unknown as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    photos: p.product_images.length,
    keys: [p.slug, p.source_ref, ...p.variants.flatMap((v) => [v.sku, v.legacy_sku ?? ""])]
      .filter((k): k is string => Boolean(k))
      .map((k) => k.toLowerCase()),
  }));
  const withoutPhoto = products.filter((p) => p.photos === 0).length;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div>
        <Link href="/admin/products" className="text-sm font-semibold underline">
          ← Products &amp; stock
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Bulk photo upload</h1>
        <p className="text-sm text-ink-2">
          {withoutPhoto} of {products.length} products have no photo yet.{" "}
          <Link href="/admin/products?photo=none" className="underline">
            See which ones
          </Link>
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-[var(--radius-chunk)] border-2 border-ink bg-bad-bg p-4 text-bad-fg">
          Couldn&apos;t load products: {error.message}
        </p>
      ) : (
        <BulkPhotoUpload products={products} />
      )}
    </div>
  );
}
