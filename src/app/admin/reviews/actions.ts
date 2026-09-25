"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseMarketplaceReviews, type MarketplaceSource } from "@/lib/marketplace-reviews";
import { rowsFromUpload } from "@/lib/sheet";

export type ImportState = { ok?: string; error?: string } | null;

/** Imports a TikTok Shop / Shopee review export. Re-importing the same file adds nothing twice. */
export async function importMarketplaceReviews(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { supabase } = await requireAdmin();
  const source = String(formData.get("source")) as MarketplaceSource;
  const file = formData.get("file");
  if (source !== "tiktok" && source !== "shopee") return { error: "Choose TikTok Shop or Shopee." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the exported CSV or Excel file." };
  if (file.size > 5 * 1024 * 1024) return { error: "That file is over 5 MB. Export a shorter date range." };

  let parsed;
  try {
    parsed = parseMarketplaceReviews(await rowsFromUpload(file), source);
  } catch {
    return { error: "Couldn't read that file. Upload the CSV or Excel file exactly as exported." };
  }
  if (!parsed.reviews.length) return { error: "No reviews found: the file needs rating and order columns." };

  const rows = parsed.reviews.map((r) => ({
    source,
    external_ref: r.orderRef,
    marketplace_product_id: r.listingId || null,
    customer_name: r.buyer,
    rating: r.rating,
    body: r.body,
    status: "approved",
    ...(r.reviewedAt ? { created_at: r.reviewedAt } : {}),
  }));
  const { count, error } = await supabase
    .from("reviews")
    .upsert(rows, { onConflict: "source,external_ref,marketplace_product_id", ignoreDuplicates: true, count: "exact" });
  if (error) return { error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
  const added = count ?? rows.length;
  return {
    ok: `Imported ${added} new review${added === 1 ? "" : "s"} (${rows.length - added} already on file${parsed.skipped ? `, ${parsed.skipped} rows skipped` : ""}).`,
  };
}
