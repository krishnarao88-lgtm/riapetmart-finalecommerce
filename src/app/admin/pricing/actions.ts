"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { CARD_FEE } from "@/lib/pricing";

/** Never approve a price that leaves less than this margin after the card fee at full price. */
const FLOOR = 0.05;

export async function decidePriceSuggestion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";

  const { data: s } = await supabase
    .from("price_suggestions")
    .select("variant_id, suggested_price, status, variants(variant_costs(cost_price))")
    .eq("id", id)
    .single();
  if (!s || s.status !== "pending") return;

  if (approve) {
    const cost = Number(
      (s.variants as unknown as { variant_costs: { cost_price: number } | null } | null)?.variant_costs?.cost_price ?? 0,
    );
    const price = Number(s.suggested_price);
    if (cost > 0 && price * (1 - CARD_FEE) - cost < price * FLOOR) redirect("/admin/pricing?error=floor");
    const { error } = await supabase.from("variants").update({ price }).eq("id", s.variant_id);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("price_suggestions")
    .update({ status: approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/", "layout");
}
