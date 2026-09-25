import "server-only";
import { getVariantStock } from "@/components/product-card";
import { type CareProduct, suggestHouse } from "@/lib/care-needs";
import { getHouseProducts } from "@/lib/house-products";
import { withPromos } from "@/lib/promotions-server";
import { searchTerm } from "@/lib/shop-search";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Tools the shopping assistant can call. Everything returned comes from the live database;
// the model is told to recommend only what these return.

export type AssistantProduct = {
  name: string;
  url: string;
  image: string | null;
  price_from: number;
  sale: string | null;
  in_stock: boolean;
  own_brand: boolean;
  for_pets: string;
  highlights: string[];
};

type Row = CareProduct & {
  slug: string;
  size_display: string | null;
  brands: { name: string; is_house_brand: boolean } | null;
  product_images: { path: string; sort: number }[];
  variants: { id: string; price: number }[];
  promo?: { label: string; discount: number } | null;
};

const PET: Record<string, string> = { dog: "dogs", cat: "cats", dog_cat: "dogs and cats", small_pet: "small pets" };

function toResult(p: Row, inStock: boolean): AssistantProduct {
  const prices = p.variants.map((v) => Number(v.price)).filter((n) => n > 0);
  return {
    name: p.name,
    url: `/shop/${p.slug}`,
    image: [...p.product_images].sort((a, b) => a.sort - b.sort)[0]?.path ?? null,
    price_from: prices.length ? Math.min(...prices) : 0,
    sale: p.promo?.label ?? null,
    in_stock: inStock,
    own_brand: p.house,
    for_pets: PET[p.pet_type] ?? p.pet_type,
    highlights: p.highlights ?? [],
  };
}

/** Keyword search over published products, best matches first, plus own-brand products that pair with them. */
export async function searchProducts(keywords: string[], pet?: string) {
  const words = keywords.map((k) => searchTerm(k)).filter((k) => k.length >= 2).slice(0, 5);
  if (!words.length) return { products: [], own_brand_pairings: [] };

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, slug, name, description, pet_type, highlights, size_display, brand_id, category_id, brands(name, is_house_brand), product_images(path, sort), variants(id, price)",
    )
    .eq("status", "published")
    .or(words.flatMap((w) => [`name.ilike.%${w}%`, `description.ilike.%${w}%`]).join(","))
    .limit(60);
  if (pet === "dog" || pet === "cat") query = query.in("pet_type", [pet, "dog_cat"]);
  const { data } = await query;

  const rows = (await withPromos((data ?? []) as unknown as (Row & { description: string | null })[])).map((p) => ({
    ...p,
    house: p.brands?.is_house_brand === true,
  }));
  const score = (p: (typeof rows)[number]) => {
    const text = `${p.name} ${(p.highlights ?? []).join(" ")}`.toLowerCase();
    const body = (p.description ?? "").toLowerCase();
    return words.reduce((s, w) => s + (text.includes(w.toLowerCase()) ? 3 : body.includes(w.toLowerCase()) ? 1 : 0), 0);
  };
  const top = rows.sort((a, b) => score(b) - score(a)).slice(0, 6);
  const stock = await getVariantStock(supabase, top.flatMap((p) => p.variants.map((v) => v.id)));
  const inStock = (p: Row) => !stock || p.variants.some((v) => (stock.get(v.id)?.available ?? 0) > 0);

  const { products: house } = await getHouseProducts(supabase);
  const pairings = suggestHouse(top.slice(0, 3), house as unknown as Row[], 2);

  return {
    products: top.map((p) => toResult(p, inStock(p))),
    own_brand_pairings: pairings.map((p) => toResult(p, true)),
  };
}

/** Order status for a customer who knows both the order number (first 8 characters) and their email. */
export async function orderStatus(orderNumber: string, email: string) {
  const code = orderNumber.replace(/^#/, "").trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(code) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { found: false, reason: "Ask for the 8-character order number (e.g. #1A2B3C4D) and the email used at checkout." };
  }
  const { data } = await createServiceClient()
    .from("orders")
    .select("id, created_at, status, fulfilment_status, shipping_method, total, easyparcel_tracking_url, easyparcel_awb_number")
    .eq("customer_email", mail)
    .order("created_at", { ascending: false })
    .limit(50);
  const order = (data ?? []).find((o) => String(o.id).startsWith(code));
  // Same answer for "wrong email" and "no such order", so the tool can't be used to probe emails.
  if (!order) return { found: false, reason: "No order matches that number and email." };
  return {
    found: true,
    order_number: `#${code.toUpperCase()}`,
    placed_on: String(order.created_at).slice(0, 10),
    payment: order.status,
    progress: order.fulfilment_status,
    delivery_method: order.shipping_method,
    total_myr: Number(order.total),
    tracking_url: order.easyparcel_tracking_url,
    tracking_number: order.easyparcel_awb_number,
  };
}

export const SHOP_FACTS = `Shop: ${site.name}, ${site.address.street}, ${site.address.city}. Open Monday–Saturday 10:00–19:00, closed Sunday. WhatsApp ${site.phone}.
Delivery: same-day Lalamove in the Klang Valley, courier (EasyParcel) nationwide, or free pickup at the shop.
Returns & refunds: unopened, unused items can be returned or exchanged within 7 days with the order confirmation. Opened food, treats and health products are final sale unless defective or expired on arrival. Wrong, damaged or defective items are replaced or refunded in full. Returns start on WhatsApp.
Payment: FPX online banking, cards, Apple Pay and Google Pay.
Own brands: Aniamor (vet-grade supplements), Robust (natural treats) and Phyto Specialities (herbal syrups), all DVS approved. An own-brand item is 10% off when bought together with a matching product (e.g. a medicated shampoo plus Aniamor Skin & Coat Syrup). Short-dated stock is discounted. Customers get the single best discount; they never stack.`;
