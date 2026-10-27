"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// Called straight from each row (not via <form>), so every argument is untrusted and checked here.

export type ShippingEdit = {
  id: string;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  barcode: string;
};
export type ShippingResult = { ok?: string; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const intIn = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export async function saveVariantShipping(edit: ShippingEdit): Promise<ShippingResult> {
  const { supabase } = await requireAdmin();
  if (!edit || !UUID.test(String(edit.id))) return { error: "This row couldn't be matched. Refresh and try again." };
  if (edit.weightGrams !== null && !intIn(edit.weightGrams, 1, 100000)) {
    return { error: "Weight must be whole grams, 1 to 100,000." };
  }
  for (const d of [edit.lengthMm, edit.widthMm, edit.heightMm]) {
    if (d !== null && !intIn(d, 1, 2000)) return { error: "Box sizes must be 0.1 to 200 cm." };
  }
  const barcode = String(edit.barcode ?? "").trim();
  if (barcode && !/^\d{8,14}$/.test(barcode)) return { error: "Barcode must be 8 to 14 digits, or left empty." };

  const { error } = await supabase
    .from("variants")
    .update({
      weight_grams: edit.weightGrams,
      length_mm: edit.lengthMm,
      width_mm: edit.widthMm,
      height_mm: edit.heightMm,
      barcode: barcode || null,
    })
    .eq("id", edit.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/products/shipping");
  return { ok: "Saved" };
}
