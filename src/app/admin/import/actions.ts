"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { type ParsedProduct, parseCatalogue, type RowIssue, slugify } from "@/lib/catalogue-import";
import { rowsFromUpload } from "@/lib/sheet";

const IMPORT_BATCH_NO = "IMPORT";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type ImportState =
  | null
  | {
      mode: "preview" | "applied";
      fileName: string;
      productCount: number;
      variantCount: number;
      rowCount: number;
      issues: RowIssue[];
      sample: { name: string; variants: number; price: number; stock: number; expiry: string | null }[];
      message?: string;
      error?: string;
    }
  | { error: string };

function sample(products: ParsedProduct[]) {
  return products.slice(0, 8).map((p) => ({
    name: p.name,
    variants: p.variants.length,
    price: p.variants[0]?.price ?? 0,
    stock: p.variants.reduce((s, v) => s + (v.stock ?? 0), 0),
    expiry: p.variants.map((v) => v.expiry).filter(Boolean).sort()[0] ?? null,
  }));
}

export async function importCatalogue(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");
  const mode = formData.get("mode") === "apply" ? "apply" : "preview";

  if (!(file instanceof File) || file.size === 0) return { error: "Choose an Excel or CSV file first." };
  if (file.size > MAX_FILE_BYTES) return { error: "That file is over 8MB. Split it into two files." };

  let rows;
  try {
    rows = await rowsFromUpload(file);
  } catch {
    return { error: "Couldn't read that file. Save it as .xlsx or .csv and try again." };
  }
  if (rows.length === 0) return { error: "No rows found. The first row must be the column headings." };

  const parsed = parseCatalogue(rows);
  const base = {
    fileName: file.name,
    rowCount: rows.length,
    productCount: parsed.products.length,
    variantCount: parsed.variantCount,
    issues: parsed.issues.slice(0, 100),
    sample: sample(parsed.products),
  };

  if (mode === "preview") return { ...base, mode: "preview" as const };
  if (parsed.products.length === 0) {
    return { ...base, mode: "preview" as const, error: "Nothing importable in that file." };
  }

  // ---- brands & categories ----
  const brandNames = [...new Set(parsed.products.map((p) => p.brand).filter((b): b is string => Boolean(b)))];
  const categoryNames = [...new Set(parsed.products.map((p) => p.category).filter((c): c is string => Boolean(c)))];

  if (brandNames.length) {
    const { error } = await supabase
      .from("brands")
      .upsert(brandNames.map((name) => ({ name, slug: slugify(name) })), { onConflict: "slug" });
    if (error) return { ...base, mode: "preview", error: `Brands: ${error.message}` };
  }
  if (categoryNames.length) {
    const { error } = await supabase
      .from("categories")
      .upsert(categoryNames.map((name) => ({ name, slug: slugify(name) })), { onConflict: "slug" });
    if (error) return { ...base, mode: "preview", error: `Categories: ${error.message}` };
  }

  const [{ data: brandRows }, { data: categoryRows }] = await Promise.all([
    supabase.from("brands").select("id, slug"),
    supabase.from("categories").select("id, slug"),
  ]);
  const brandId = new Map((brandRows ?? []).map((b) => [b.slug, b.id]));
  const categoryId = new Map((categoryRows ?? []).map((c) => [c.slug, c.id]));

  // ---- products ----
  const productPayload = parsed.products.map((p) => ({
    slug: p.slug,
    source_ref: p.sourceRef,
    name: p.name,
    brand_id: p.brand ? (brandId.get(slugify(p.brand)) ?? null) : null,
    category_id: p.category ? (categoryId.get(slugify(p.category)) ?? null) : null,
    pet_type: p.petType,
    size_display: p.sizeDisplay,
    description: p.description,
    ingredients: p.ingredients,
    usage: p.usage,
    status: p.status,
    is_regulated: p.isRegulated,
    needs_review: p.needsReview,
    review_notes: p.reviewNotes,
  }));

  const withRef = productPayload.filter((p) => p.source_ref !== null);
  const withoutRef = productPayload.filter((p) => p.source_ref === null);

  for (const [payload, conflict] of [
    [withRef, "source_ref"],
    [withoutRef, "slug"],
  ] as const) {
    for (let i = 0; i < payload.length; i += 100) {
      const { error } = await supabase
        .from("products")
        .upsert(payload.slice(i, i + 100), { onConflict: conflict });
      if (error) return { ...base, mode: "preview", error: `Products: ${error.message}` };
    }
  }

  const { data: savedProducts, error: readError } = await supabase.from("products").select("id, slug, source_ref");
  if (readError) return { ...base, mode: "preview", error: `Products: ${readError.message}` };
  const idBySlug = new Map((savedProducts ?? []).map((p) => [p.slug, p.id]));
  const idByRef = new Map((savedProducts ?? []).filter((p) => p.source_ref).map((p) => [p.source_ref, p.id]));

  // ---- variants ----
  // Sheets may carry old-style SKUs; the database renames new variants to the standard BRAND-PPP-VV code
  // and keeps the sheet's SKU as legacy_sku, so both spellings resolve to the same variant.
  const { data: existing } = await supabase.from("variants").select("sku, legacy_sku");
  const currentSku = new Map<string, string>();
  for (const v of existing ?? []) {
    currentSku.set(v.sku, v.sku);
    if (v.legacy_sku) currentSku.set(v.legacy_sku, v.sku);
  }
  const variantPayload = parsed.products.flatMap((p) => {
    const productId = (p.sourceRef ? idByRef.get(p.sourceRef) : undefined) ?? idBySlug.get(p.slug);
    if (!productId) return [];
    return p.variants.map((v, index) => ({
      product_id: productId,
      sku: currentSku.get(v.sku) ?? v.sku,
      title: v.title,
      unit_multiplier: v.unitMultiplier,
      price: v.price,
      weight_grams: v.weightGrams,
      length_mm: v.lengthMm,
      width_mm: v.widthMm,
      height_mm: v.heightMm,
      sort: index,
    }));
  });

  for (let i = 0; i < variantPayload.length; i += 200) {
    const { error } = await supabase
      .from("variants")
      .upsert(variantPayload.slice(i, i + 200), { onConflict: "sku" });
    if (error) return { ...base, mode: "preview", error: `Variants: ${error.message}` };
  }

  const { data: savedVariants } = await supabase.from("variants").select("id, sku, legacy_sku");
  const variantId = new Map<string, string>();
  for (const v of savedVariants ?? []) {
    variantId.set(v.sku, v.id);
    if (v.legacy_sku && !variantId.has(v.legacy_sku)) variantId.set(v.legacy_sku, v.id);
  }

  // ---- costs ----
  const costPayload = parsed.products.flatMap((p) =>
    p.variants
      .filter((v) => v.cost !== null && variantId.has(v.sku))
      .map((v) => ({ variant_id: variantId.get(v.sku)!, cost_price: v.cost!, margin: v.margin })),
  );
  for (let i = 0; i < costPayload.length; i += 200) {
    const { error } = await supabase
      .from("variant_costs")
      .upsert(costPayload.slice(i, i + 200), { onConflict: "variant_id" });
    if (error) return { ...base, mode: "preview", error: `Cost prices: ${error.message}` };
  }

  // ---- stock ----
  // stock_qty is the variant's total (what the export writes), so it sets stock rather than adding,
  // and re-importing an export never doubles it. A blank cell leaves that variant's stock alone.
  const stockItems = parsed.products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock !== null && variantId.has(v.sku))
      .map((v) => ({
        variant_id: variantId.get(v.sku)!,
        quantity: v.stock,
        expiry_date: v.expiry,
        batch_no: v.batchNo ?? IMPORT_BATCH_NO,
      })),
  );
  for (let i = 0; i < stockItems.length; i += 1000) {
    const { error } = await supabase.rpc("admin_set_stock", { p_items: stockItems.slice(i, i + 1000), p_mode: "set" });
    if (error) return { ...base, mode: "preview", error: `Stock: ${error.message}` };
  }

  revalidatePath("/admin/products");
  return {
    ...base,
    mode: "applied",
    message: `Imported ${parsed.products.length} products and ${parsed.variantCount} variants. They stay hidden until you publish them.`,
  };
}
