"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

/** Approve writes the checked text onto the product and stamps it verified; reject just closes it. */
export async function decideInfoCheck(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";

  const { data: check } = await supabase
    .from("product_info_checks")
    .select("product_id, field, proposed_text, source_url, status, products(slug)")
    .eq("id", id)
    .single();
  if (!check || check.status !== "pending") return;

  if (approve) {
    const text = check.proposed_text?.trim() || null;
    const value =
      check.field === "highlights" ? (text ? text.split("\n").map((s: string) => s.trim()).filter(Boolean) : []) : text;
    const { error } = await supabase
      .from("products")
      .update({
        [check.field]: value,
        info_verified_at: new Date().toISOString().slice(0, 10),
        info_source: check.source_url,
      })
      .eq("id", check.product_id);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("product_info_checks")
    .update({ status: approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);

  const slug = (check.products as unknown as { slug: string } | null)?.slug;
  revalidatePath("/admin/info-check");
  if (slug) revalidatePath(`/shop/${slug}`);
}
