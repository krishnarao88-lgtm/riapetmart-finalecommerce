"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

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
  };
  const { error } = id
    ? await supabase.from("promotions").update(row).eq("id", id)
    : await supabase.from("promotions").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: id ? "Sale updated." : "Sale added." };
}

export async function deletePromotion(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(form, "id");
  if (!UUID.test(id)) return;
  await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}
