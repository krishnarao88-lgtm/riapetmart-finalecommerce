"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_ROUND_UP, MAX_MARGIN, priceFromMargin } from "@/lib/pricing";

function num(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function text(form: FormData, key: string): string | null {
  const raw = String(form.get(key) ?? "").trim();
  return raw ? raw : null;
}

export type ActionState = { ok?: string; error?: string } | null;

export async function saveProduct(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("products")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      status: String(formData.get("status") ?? "draft"),
      pet_type: String(formData.get("pet_type") ?? "dog_cat"),
      size_display: text(formData, "size_display"),
      description: text(formData, "description"),
      ingredients: text(formData, "ingredients"),
      usage: text(formData, "usage"),
      is_regulated: formData.get("is_regulated") === "on",
      needs_review: formData.get("needs_review") === "on",
      seo_title: text(formData, "seo_title"),
      seo_description: text(formData, "seo_description"),
    })
    .eq("id", id);

  revalidatePath(`/admin/products/${id}`);
  return error ? { error: error.message } : { ok: "Product saved." };
}

/** Saves cost, margin and selling price for one variant. Price wins if it was typed by hand. */
export async function saveVariantPricing(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const variantId = String(formData.get("variant_id"));
  const productId = String(formData.get("product_id"));
  const cost = num(formData, "cost_price");
  const marginPercent = num(formData, "margin");
  const typedPrice = num(formData, "price");

  const margin = marginPercent === null ? null : marginPercent / 100;
  if (margin !== null && (margin < 0 || margin >= MAX_MARGIN)) {
    return { error: `Margin must be between 0% and ${MAX_MARGIN * 100}%.` };
  }

  const price =
    typedPrice !== null
      ? typedPrice
      : cost !== null && margin !== null
        ? priceFromMargin(cost, margin)
        : null;

  if (price === null || price < 0) return { error: "Enter a price, or a cost price and margin." };

  const { error: priceError } = await supabase.from("variants").update({ price }).eq("id", variantId);
  if (priceError) return { error: priceError.message };

  if (cost !== null) {
    const { error: costError } = await supabase
      .from("variant_costs")
      .upsert({ variant_id: variantId, cost_price: cost, margin }, { onConflict: "variant_id" });
    if (costError) return { error: costError.message };
  }

  revalidatePath(`/admin/products/${productId}`);
  return { ok: "Pricing saved." };
}

export async function addBatch(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const variantId = String(formData.get("variant_id"));
  const productId = String(formData.get("product_id"));
  const quantity = num(formData, "quantity");
  if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) {
    return { error: "Quantity must be a whole number, 0 or more." };
  }

  const { error } = await supabase.from("stock_batches").insert({
    variant_id: variantId,
    quantity,
    expiry_date: text(formData, "expiry_date"),
    batch_no: text(formData, "batch_no"),
  });

  revalidatePath(`/admin/products/${productId}`);
  return error ? { error: error.message } : { ok: "Stock batch added." };
}

export async function deleteBatch(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const { error } = await supabase.from("stock_batches").delete().eq("id", String(formData.get("batch_id")));
  revalidatePath(`/admin/products/${productId}`);
  return error ? { error: error.message } : { ok: "Batch removed." };
}

export async function saveVariantDetails(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const variantId = String(formData.get("variant_id"));
  const productId = String(formData.get("product_id"));
  const title = text(formData, "title");
  const sku = text(formData, "sku");
  if (!title) return { error: "Variant title is required." };

  const { error } = await supabase.from("variants").update({ title, sku }).eq("id", variantId);
  revalidatePath(`/admin/products/${productId}`);
  return error ? { error: error.message } : { ok: "Variant updated." };
}

export async function deleteVariant(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const { error } = await supabase.from("variants").delete().eq("id", String(formData.get("variant_id")));
  revalidatePath(`/admin/products/${productId}`);
  return error ? { error: error.message } : { ok: "Variant deleted." };
}

// The browser shrinks photos before sending (see lib/shrink-image), so these are generous.
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export async function uploadProductImage(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const productName = String(formData.get("product_name") ?? "Product photo");
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose an image file first." };

  const invalid = files.find((f) => !IMAGE_EXTENSIONS[f.type] || f.size > MAX_IMAGE_BYTES);
  if (invalid) return { error: `${invalid.name} must be a JPG, PNG or WebP photo under 3 MB.` };

  // New photos go after the existing ones, so the first photo stays the main one.
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  let sort = count ?? 0;
  let uploaded = 0;
  let error: string | null = null;

  for (const file of files) {
    const path = `${productId}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      error = `${file.name}: ${uploadError.message}`;
      break;
    }

    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    const { error: insertError } = await supabase
      .from("product_images")
      .insert({ product_id: productId, path: publicUrl.publicUrl, alt: productName, sort: sort++ });
    if (insertError) {
      error = insertError.message;
      break;
    }
    uploaded += 1;
  }

  revalidatePath(`/admin/products/${productId}`);
  if (error) return { error: uploaded ? `${uploaded} uploaded, then: ${error}` : error };
  return { ok: uploaded === 1 ? "Image uploaded." : `${uploaded} images uploaded.` };
}

export async function deleteProductImage(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const productId = String(formData.get("product_id"));
  const imageId = String(formData.get("image_id"));
  const publicUrl = String(formData.get("image_path"));

  const storagePath = publicUrl.split("/storage/v1/object/public/product-images/")[1];
  if (storagePath) await supabase.storage.from("product-images").remove([storagePath]);
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  revalidatePath(`/admin/products/${productId}`);
  return error ? { error: error.message } : { ok: "Image removed." };
}

/**
 * Applies one margin to every variant that already has a cost price, for the
 * products matching the current search filter. Products without a cost are skipped.
 */
export async function applyBulkMargin(_prev: ActionState, formData: FormData) {
  const { supabase } = await requireAdmin();
  const marginPercent = num(formData, "bulk_margin");
  const q = text(formData, "q");
  const status = text(formData, "status");
  if (marginPercent === null) return { error: "Enter a margin first." };
  const margin = marginPercent / 100;
  if (margin < 0 || margin >= MAX_MARGIN) {
    return { error: `Margin must be between 0% and ${MAX_MARGIN * 100}%.` };
  }

  let productQuery = supabase.from("products").select("id, variants(id, variant_costs(cost_price))");
  if (q) productQuery = productQuery.ilike("name", `%${q}%`);
  if (status && status !== "all") productQuery = productQuery.eq("status", status);

  const { data, error } = await productQuery;
  if (error) return { error: error.message };

  type Bulk = { id: string; variants: { id: string; variant_costs: { cost_price: number } | null }[] };
  const targets = (data as unknown as Bulk[]).flatMap((p) =>
    p.variants
      .filter((v) => v.variant_costs?.cost_price != null)
      .map((v) => ({ id: v.id, cost: Number(v.variant_costs!.cost_price) })),
  );

  let updated = 0;
  for (const target of targets) {
    const price = priceFromMargin(target.cost, margin, DEFAULT_ROUND_UP);
    const { error: e1 } = await supabase.from("variants").update({ price }).eq("id", target.id);
    const { error: e2 } = await supabase
      .from("variant_costs")
      .update({ margin })
      .eq("variant_id", target.id);
    if (!e1 && !e2) updated += 1;
  }

  revalidatePath("/admin/products");
  const skipped = targets.length === 0 ? " No variants had a cost price yet." : "";
  return { ok: `Repriced ${updated} variants at ${marginPercent}% margin.${skipped}` };
}
