"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/catalogue-import";
import { MAX_MARGIN, priceFromMargin } from "@/lib/pricing";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
function num(f: FormData, k: string) {
  const raw = text(f, k);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * One size (variant) with its price, cost and opening stock. SKU and barcode are filled in by the database
 * trigger (standard BRAND-PPP-VV code). Returns an error message, or null when saved.
 */
async function insertSize(supabase: SupabaseClient, productId: string, f: FormData, sort: number) {
  const title = text(f, "size_title") ?? "Single unit";
  const cost = num(f, "cost_price");
  const marginPct = num(f, "margin");
  const typed = num(f, "price");
  const qty = num(f, "quantity");
  if ([cost, marginPct, typed, qty].some((n) => Number.isNaN(n))) return "Numbers only in cost, margin, price and quantity.";
  const margin = marginPct === null ? null : marginPct / 100;
  if (margin !== null && (margin < 0 || margin >= MAX_MARGIN)) return `Margin must be between 0% and ${MAX_MARGIN * 100}%.`;
  // A typed selling price wins; otherwise work it out from cost + margin (card fee included).
  const price = typed ?? (cost !== null && margin !== null ? priceFromMargin(cost, margin) : null);
  if (price === null || price <= 0) return "Enter a selling price, or a cost price and margin.";
  if (qty !== null && (qty < 0 || !Number.isInteger(qty))) return "Stock quantity must be a whole number.";

  const { data: variant, error } = await supabase
    .from("variants")
    .insert({ product_id: productId, title, price, sort, weight_grams: num(f, "weight_grams") || null })
    .select("id")
    .single();
  if (error || !variant) return `Size: ${error?.message ?? "not saved"}`;

  if (cost !== null) {
    const { error: e } = await supabase.from("variant_costs").insert({ variant_id: variant.id, cost_price: cost, margin });
    if (e) return `Cost price: ${e.message}`;
  }
  if (qty) {
    const { error: e } = await supabase
      .from("stock_batches")
      .insert({ variant_id: variant.id, quantity: qty, expiry_date: text(f, "expiry_date"), batch_no: text(f, "batch_no") });
    if (e) return `Stock: ${e.message}`;
  }
  return null;
}

/** Admin → Products → Add product. Always starts as a draft so nothing half-finished reaches the shop. */
export async function createProduct(f: FormData) {
  const { supabase } = await requireAdmin();
  const name = text(f, "name");
  const fail = (msg: string): never => redirect(`/admin/products/new?error=${encodeURIComponent(msg)}`);
  if (!name) fail("Product name is required.");

  let brandId: string | null = null;
  const brand = text(f, "brand");
  if (brand) {
    const { data, error } = await supabase
      .from("brands")
      .upsert({ name: brand, slug: slugify(brand) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !data) fail(`Brand: ${error?.message ?? "not saved"}`);
    brandId = data!.id;
  }

  // Unique web address: "royal-canin-kitten", then "-2", "-3"… if taken.
  const base = slugify(name!) || "product";
  const { data: taken } = await supabase.from("products").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      brand_id: brandId,
      category_id: text(f, "category_id"),
      pet_type: text(f, "pet_type") ?? "dog_cat",
      size_display: text(f, "size_display"),
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !product) fail(`Product: ${error?.message ?? "not saved"}`);

  const sizeError = await insertSize(supabase, product!.id, f, 0);
  // The product exists either way; open it so the owner can fix the size there instead of re-typing everything.
  redirect(`/admin/products/${product!.id}?${sizeError ? `error=${encodeURIComponent(sizeError)}` : "created=1"}`);
}

/** Edit page → "Add another size". */
export async function addSize(f: FormData) {
  const { supabase } = await requireAdmin();
  const productId = String(f.get("product_id"));
  const { count } = await supabase.from("variants").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const err = await insertSize(supabase, productId, f, count ?? 0);
  redirect(`/admin/products/${productId}?${err ? `error=${encodeURIComponent(err)}` : "sized=1"}`);
}
