"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { toWelcomeOffer } from "@/lib/welcome-offer";

/** Approve fix: promo codes no longer apply when the cart has clearance, bundle or sale prices. */
export async function stopCodeStacking() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("settings").select("value").eq("key", "welcome_offer").maybeSingle();
  const offer = { ...toWelcomeOffer(data?.value), stack_with_discounts: false };
  const { error } = await supabase.from("settings").upsert({ key: "welcome_offer", value: offer }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  updateTag("welcome-offer");
  revalidatePath("/admin/finance");
}

/** Approve fix: raise the listed variants to their suggested safe price. Only ever raises. */
export async function raisePrices(formData: FormData) {
  const { supabase } = await requireAdmin();
  const wanted = formData
    .getAll("raise")
    .map((v) => String(v).split(":"))
    .map(([id, price]) => ({ id, price: Number(price) }))
    .filter((r) => /^[0-9a-f-]{36}$/.test(r.id) && Number.isFinite(r.price) && r.price > 0 && r.price < 100_000);
  if (!wanted.length) return;

  const { data: current } = await supabase.from("variants").select("id, price").in("id", wanted.map((w) => w.id));
  const now = new Map((current ?? []).map((v) => [v.id as string, Number(v.price)]));
  for (const w of wanted) {
    if ((now.get(w.id) ?? Infinity) >= w.price) continue;
    const { error } = await supabase.from("variants").update({ price: w.price }).eq("id", w.id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
}
