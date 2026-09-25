"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { MAX_MARGIN } from "@/lib/pricing";

export type SettingsState = { ok?: string; error?: string } | null;

function int(form: FormData, key: string, fallback: number): number {
  const value = Number(String(form.get(key) ?? "").trim());
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase } = await requireAdmin();

  const freshMinDays = int(formData, "fresh_min_days", 181);
  const shortDays = int(formData, "short_days", 90);
  const shortDiscount = int(formData, "short_discount", 15);
  const deepDays = int(formData, "deep_days", 0);
  const deepDiscount = int(formData, "deep_discount", 0);
  const defaultMargin = int(formData, "default_margin", 25);
  const roundUpSen = int(formData, "round_up_sen", 10);
  const freeMin = String(formData.get("free_delivery_min") ?? "").trim();
  const freeCap = String(formData.get("free_delivery_cap") ?? "").trim();

  if (shortDays < 1 || shortDays > 365) return { error: "Short-dated days must be between 1 and 365." };
  if (shortDiscount < 0 || shortDiscount > 90) return { error: "Discounts must be between 0% and 90%." };
  if (deepDays > 0 && deepDays >= shortDays) {
    return { error: "The second tier must use fewer days than the first." };
  }
  if (deepDiscount < 0 || deepDiscount > 90) return { error: "Discounts must be between 0% and 90%." };
  if (freshMinDays <= shortDays) return { error: "“Fresh stock” must start after the short-dated window." };
  if (defaultMargin < 0 || defaultMargin >= MAX_MARGIN * 100) return { error: "Default margin is out of range." };
  if (freeCap !== "" && !(Number(freeCap) >= 0)) return { error: "“We pay up to” must be 0 or more." };
  if (roundUpSen < 1 || roundUpSen > 100) return { error: "Rounding must be between 1 and 100 sen." };

  const tiers = [{ max_days: shortDays, discount: shortDiscount / 100 }];
  if (deepDays > 0) tiers.unshift({ max_days: deepDays, discount: deepDiscount / 100 });

  const rows = [
    { key: "expiry_badges", value: { fresh_min_days: freshMinDays, short_dated: tiers } },
    { key: "pricing", value: { round_up_to: roundUpSen / 100, default_margin: defaultMargin / 100 } },
    {
      key: "delivery",
      value: {
        same_day_states: ["Selangor", "Kuala Lumpur", "Putrajaya"],
        lalamove_enabled: formData.get("lalamove_enabled") === "on",
        easyparcel_enabled: formData.get("easyparcel_enabled") === "on",
        pickup_enabled: formData.get("pickup_enabled") === "on",
        free_delivery_min: freeMin === "" ? null : Number(freeMin),
        free_delivery_cap: freeCap === "" ? null : Number(freeCap),
      },
    },
  ];

  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  revalidatePath("/admin/settings");
  updateTag("delivery-settings");
  return error ? { error: error.message } : { ok: "Settings saved. They apply straight away." };
}
