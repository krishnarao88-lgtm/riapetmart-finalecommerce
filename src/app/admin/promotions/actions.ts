"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { marginAfterDiscount, MIN_OFFER_MARGIN } from "@/lib/offers";

export type PromoState = { ok?: string; error?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCOPES = ["house", "all", "brand", "category"];

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function savePromotion(_prev: PromoState, form: FormData): Promise<PromoState> {
  const { supabase } = await requireAdmin();
  const id = field(form, "id");
  const name = field(form, "name");
  const starts = field(form, "starts_on");
  const ends = field(form, "ends_on");
  const percent = Number(field(form, "percent"));
  const scope = field(form, "scope");
  const brandId = field(form, "brand_id");
  const categoryId = field(form, "category_id");

  if (!name) return { error: "Give the sale a name." };
  if (!DATE.test(starts) || !DATE.test(ends) || ends < starts) return { error: "Choose a start date and an end date on or after it." };
  if (!Number.isFinite(percent) || percent <= 0 || percent > 50) return { error: "Discount must be between 1% and 50%." };
  if (!SCOPES.includes(scope)) return { error: "Choose what the sale covers." };
  if (scope === "brand" && !UUID.test(brandId)) return { error: "Choose the brand." };
  if (scope === "category" && !UUID.test(categoryId)) return { error: "Choose the category." };
  if (id && !UUID.test(id)) return { error: "Unknown sale." };

  const row = {
    name,
    starts_on: starts,
    ends_on: ends,
    discount: Math.round(percent * 10) / 1000,
    scope,
    brand_id: scope === "brand" ? brandId : null,
    category_id: scope === "category" ? categoryId : null,
    banner: field(form, "banner") || null,
    is_active: form.get("is_active") === "on",
    excluded_product_ids: [] as string[],
  };
  // Approving a sale locks in which products it may discount: anything it would push under the
  // margin floor (or with no cost price) is left out.
  if (row.is_active) {
    row.excluded_product_ids = await exclusionsFor(supabase, scope, row.brand_id, row.category_id, row.discount);
  }
  const { error } = id
    ? await supabase.from("promotions").update(row).eq("id", id)
    : await supabase.from("promotions").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  const left = row.excluded_product_ids.length;
  return {
    ok: row.is_active
      ? `Approved.${left ? ` ${left} product${left === 1 ? "" : "s"} left out to protect margin (see list).` : ""}`
      : "Saved, not live (pending approval).",
  };
}

export async function deletePromotion(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(form, "id");
  if (!UUID.test(id)) return;
  await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}

type PricedProduct = { id: string; name: string; variants: { price: number; variant_costs: { cost_price: number } | null }[] };

function margin(p: PricedProduct, discount: number) {
  return marginAfterDiscount(
    p.variants.map((v) => ({ price: Number(v.price), cost: v.variant_costs ? Number(v.variant_costs.cost_price) : null })),
    discount,
  );
}

/** Save an own-brand bundle offer; approving it is refused if any size would fall under the margin floor. */
export async function saveBundleOffer(_prev: PromoState, form: FormData): Promise<PromoState> {
  const { supabase } = await requireAdmin();
  const productId = field(form, "product_id");
  const percent = Number(field(form, "percent"));
  const intent = field(form, "intent");
  if (!UUID.test(productId)) return { error: "Unknown product." };
  if (!Number.isFinite(percent) || percent <= 0 || percent > 50) return { error: "Discount must be between 1% and 50%." };
  const discount = Math.round(percent * 10) / 1000;
  const approve = intent === "approve";

  if (approve) {
    const { data } = await supabase
      .from("products")
      .select("id, name, variants(price, variant_costs(cost_price))")
      .eq("id", productId)
      .single();
    const m = data ? margin(data as unknown as PricedProduct, discount) : null;
    if (m === null) return { error: "Set a cost price on every size first, so the margin can be checked." };
    if (m < MIN_OFFER_MARGIN) {
      return {
        error: `At ${percent}% off the margin would be ${Math.round(m * 100)}%, under the ${Math.round(MIN_OFFER_MARGIN * 100)}% floor. Lower the discount.`,
      };
    }
  }

  const { error } = await supabase.from("bundle_offers").upsert({
    product_id: productId,
    discount,
    approved: approve,
    approved_at: approve ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: approve ? `Approved: ${percent}% off when bought together.` : "Saved, not live (pending approval)." };
}

/** Products a sale covers that it would push under the margin floor, or whose cost is unknown. */
async function exclusionsFor(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  scope: string,
  brandId: string | null,
  categoryId: string | null,
  discount: number,
): Promise<string[]> {
  let query = supabase.from("products").select("id, name, brand_id, category_id, brands(is_house_brand), variants(price, variant_costs(cost_price))");
  if (scope === "brand" && brandId) query = query.eq("brand_id", brandId);
  if (scope === "category" && categoryId) query = query.eq("category_id", categoryId);
  const { data } = await query;
  type Row = PricedProduct & { brands: { is_house_brand: boolean } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((p) => scope !== "house" || p.brands?.is_house_brand)
    .filter((p) => {
      const m = margin(p, discount);
      return m === null || m < MIN_OFFER_MARGIN;
    })
    .map((p) => p.id);
}
