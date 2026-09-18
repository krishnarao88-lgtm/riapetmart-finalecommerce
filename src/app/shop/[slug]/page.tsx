import { PawPrint } from "lucide-react";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { discountedPrice, getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, ingredients, usage, size_display, pet_type, is_regulated, brands(name), categories(name), product_images(path, alt, sort), variants(id, title, price, sort, stock_batches(expiry_date))",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .single(),
    supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
  ]);

  if (!product) notFound();

  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort - b.sort);
  const rawVariants = [...(product.variants ?? [])].sort((a, b) => a.sort - b.sort);
  const variants = rawVariants.map((v) => {
    const nearest = v.stock_batches.map((b) => b.expiry_date).filter(Boolean).sort()[0] ?? null;
    const badge = getExpiryBadge(nearest, expirySettings);
    const price = badge?.kind === "short-dated" ? discountedPrice(v.price, badge.discount) : v.price;
    return { id: v.id, title: v.title, price, originalPrice: v.price, badge };
  });
  const image = images[0] ?? null;
  const brand = (product.brands as unknown as { name: string }[])?.[0]?.name;
  const category = (product.categories as unknown as { name: string }[])?.[0]?.name;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-choc bg-peach/40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.path} alt={image.alt ?? product.name} className="size-full rounded-3xl object-cover" />
          ) : (
            <PawPrint className="size-16 text-rust/50" aria-hidden />
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-rust">
            {brand && <span>{brand}</span>}
            {category && <span>· {category}</span>}
          </div>
          <h1 className="font-bubble text-2xl font-extrabold text-choc">{product.name}</h1>
          {product.size_display && <p className="text-choc-2">{product.size_display}</p>}

          {variants.some((v) => v.badge?.kind === "short-dated") && (
            <span className="w-fit rounded-full bg-rust px-3 py-1 text-xs font-bold text-cream">
              Short-dated — discount applied at checkout
            </span>
          )}

          <div className="mt-2 rounded-2xl border-2 border-choc bg-cream p-4">
            <AddToCart
              productSlug={slug}
              productName={product.name}
              image={image?.path ?? null}
              variants={variants}
            />
          </div>

          {product.is_regulated && (
            <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              This is a regulated pet-health product. Follow the label and consult a vet if unsure.
            </p>
          )}

          {product.description && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Description</h2>
              <p className="text-sm text-choc-2">{product.description}</p>
            </section>
          )}
          {product.ingredients && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Ingredients</h2>
              <p className="text-sm text-choc-2">{product.ingredients}</p>
            </section>
          )}
          {product.usage && (
            <section className="grid gap-1">
              <h2 className="font-bold text-choc">Usage</h2>
              <p className="text-sm text-choc-2">{product.usage}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
