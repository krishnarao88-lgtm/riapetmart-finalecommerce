import { NextResponse } from "next/server";
import { BUNDLE_DISCOUNT, bundleEligible, suggestHouse } from "@/lib/care-needs";
import { parseLines, priceCart } from "@/lib/cart-pricing";
import { discountedPrice } from "@/lib/expiry";
import { getHouseProducts } from "@/lib/house-products";
import { createClient } from "@/lib/supabase/server";

export type CartSuggestion = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  price: number;
  listPrice: number;
  image: string | null;
};

/** Server prices for the cart (the same numbers checkout will charge) plus own-brand pairing suggestions. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const lines = parseLines(body?.lines);
  if (!lines) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

  const supabase = await createClient();
  const cart = await priceCart(supabase, lines);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 409 });

  const { products, stock } = await getHouseProducts(supabase);
  const suggestions: CartSuggestion[] = suggestHouse(cart.care, products, 3).flatMap((p) => {
    const variant = p.variants
      .filter((v) => (stock?.get(v.id)?.available ?? 1) > 0)
      .sort((a, b) => a.price - b.price)[0];
    if (!variant) return [];
    const bundled = bundleEligible([...cart.care, p]).has(p.id);
    return [
      {
        variantId: variant.id,
        productSlug: p.slug,
        productName: p.name,
        variantTitle: variant.title,
        price: bundled ? discountedPrice(variant.price, BUNDLE_DISCOUNT) : variant.price,
        listPrice: variant.price,
        image: p.product_images[0]?.path ?? null,
      },
    ];
  });

  return NextResponse.json({
    items: cart.items.map(({ variant_id, price, list_price, discount, discount_label }) => ({
      variant_id,
      price,
      list_price,
      discount,
      discount_label,
    })),
    subtotal: cart.subtotal,
    suggestions,
  });
}
