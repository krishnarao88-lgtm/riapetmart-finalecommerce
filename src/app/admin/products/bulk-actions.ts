"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { MAX_MARGIN, priceFromMargin } from "@/lib/pricing";

// Called straight from the products table (not via <form>), so every argument is untrusted
// input and is checked here before it reaches the database.

export type BulkResult = { ok?: string; error?: string };

export type BulkOp =
  | { kind: "status"; value: string }
  | { kind: "brand" | "category"; value: string | null }
  | { kind: "pet_type"; value: string }
  | { kind: "is_regulated" | "needs_review" | "is_dvs_approved"; value: boolean }
  | { kind: "price"; mode: string; value: number }
  | { kind: "stock"; mode: string; value: number; expiry: string | null }
  | { kind: "delete"; confirm: string };

export type GridEdit = {
  variantId: string;
  price?: number;
  stock?: number;
  sku?: string;
  barcode?: string | null;
  weightGrams?: number | null;
};
export type StatusEdit = { productId: string; status: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IDS = 1000;
const CHUNK = 100; // keeps .in() filters well inside URL length limits
const STATUSES = ["published", "draft", "archived"];
const PET_TYPES = ["dog", "cat", "small_pet", "dog_cat"];

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

function validIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS) return null;
  return ids.every((id) => typeof id === "string" && UUID.test(id)) ? [...new Set(ids as string[])] : null;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  price: number;
  is_active: boolean;
  variant_costs: { cost_price: number } | null;
};

async function loadVariants(supabase: Supabase, productIds: string[]) {
  const rows: VariantRow[] = [];
  for (const part of chunks(productIds)) {
    const { data, error } = await supabase
      .from("variants")
      .select("id, product_id, sku, title, price, is_active, variant_costs(cost_price)")
      .in("product_id", part);
    if (error) throw new Error(error.message);
    rows.push(...(data as unknown as VariantRow[]));
  }
  return rows;
}

/** Products that can't go live: no active size with a price. RM0 sizes are hidden from shoppers until priced. */
function unpublishable(productIds: string[], variants: VariantRow[]) {
  return new Set(
    productIds.filter((id) => {
      const active = variants.filter((v) => v.product_id === id && v.is_active);
      return !active.some((v) => Number(v.price) > 0);
    }),
  );
}

async function updateProducts(supabase: Supabase, ids: string[], patch: Record<string, unknown>) {
  for (const part of chunks(ids)) {
    const { error } = await supabase.from("products").update(patch).in("id", part);
    if (error) throw new Error(error.message);
  }
}

async function setStatus(supabase: Supabase, ids: string[], status: string) {
  let blocked = new Set<string>();
  if (status === "published") blocked = unpublishable(ids, await loadVariants(supabase, ids));
  const allowed = ids.filter((id) => !blocked.has(id));
  if (allowed.length) await updateProducts(supabase, allowed, { status });
  return { changed: allowed.length, blocked: blocked.size };
}

function newPrice(variant: VariantRow, mode: string, value: number): number | null {
  const price = Number(variant.price);
  if (mode === "set") return round2(value);
  if (mode === "percent") return round2(price * (1 + value / 100));
  if (mode === "amount") return round2(price + value);
  if (mode === "margin") {
    const cost = variant.variant_costs?.cost_price;
    return cost == null ? null : priceFromMargin(Number(cost), value / 100);
  }
  return null;
}

async function applyPrice(supabase: Supabase, ids: string[], mode: string, value: number): Promise<BulkResult> {
  if (!["set", "percent", "amount", "margin"].includes(mode)) return { error: "Unknown price change." };
  if (mode === "set" && value < 0) return { error: "Price can't be negative." };
  if (mode === "percent" && value <= -100) return { error: "A cut of 100% or more would make the price RM0." };
  if (mode === "margin" && (value < 0 || value >= MAX_MARGIN * 100)) {
    return { error: `Margin must be between 0% and ${MAX_MARGIN * 100}%.` };
  }

  const variants = await loadVariants(supabase, ids);
  const updates = variants
    .map((v) => ({ v, price: newPrice(v, mode, value) }))
    .filter((u): u is { v: VariantRow; price: number } => u.price !== null && u.price >= 0);
  const skipped = variants.length - updates.length;

  // Upsert on id updates many rows with different prices in one call; the other columns are unchanged.
  const payload = updates.map(({ v, price }) => ({ id: v.id, product_id: v.product_id, sku: v.sku, title: v.title, price }));
  for (const part of chunks(payload)) {
    const { error } = await supabase.from("variants").upsert(part, { onConflict: "id" });
    if (error) return { error: error.message };
  }
  if (mode === "margin") {
    for (const part of chunks(updates.map(({ v }) => v.id))) {
      const { error } = await supabase.from("variant_costs").update({ margin: value / 100 }).in("variant_id", part);
      if (error) return { error: error.message };
    }
  }

  const why = mode === "margin" ? "no cost price" : "price would go below RM0";
  return { ok: `Repriced ${updates.length} variants.${skipped ? ` Skipped ${skipped} (${why}).` : ""}` };
}

async function applyStock(
  supabase: Supabase,
  ids: string[],
  mode: string,
  value: number,
  expiry: string | null,
): Promise<BulkResult> {
  if (mode !== "set" && mode !== "add") return { error: "Unknown stock change." };
  if (!Number.isInteger(value) || value < 0 || value > 100000) return { error: "Stock must be a whole number, 0 or more." };
  if (expiry !== null && !DATE.test(expiry)) return { error: "Expiry must be a date." };

  const variants = await loadVariants(supabase, ids);
  const items = variants.map((v) => ({ variant_id: v.id, quantity: value, expiry_date: expiry }));
  const { error } = await supabase.rpc("admin_set_stock", { p_items: items, p_mode: mode });
  if (error) return { error: error.message };
  return { ok: `${mode === "set" ? "Set" : "Added"} stock ${value} on ${items.length} variants.` };
}

async function deleteProducts(supabase: Supabase, ids: string[], confirm: string): Promise<BulkResult> {
  if (confirm.trim() !== `DELETE ${ids.length}`) return { error: `Type DELETE ${ids.length} to confirm.` };

  // Photos live in storage as well as the table; clear both so no orphan files are left behind.
  for (const part of chunks(ids)) {
    const { data } = await supabase.from("product_images").select("path").in("product_id", part);
    const paths = (data ?? [])
      .map((row) => String(row.path).split("/storage/v1/object/public/product-images/")[1])
      .filter((p): p is string => Boolean(p));
    if (paths.length) await supabase.storage.from("product-images").remove(paths);
    const { error } = await supabase.from("products").delete().in("id", part);
    if (error) return { error: error.message };
  }
  return { ok: `Deleted ${ids.length} products.` };
}

export async function bulkUpdateProducts(rawIds: string[], op: BulkOp): Promise<BulkResult> {
  const { supabase } = await requireAdmin();
  const ids = validIds(rawIds);
  if (!ids) return { error: `Select between 1 and ${MAX_IDS} products.` };
  if (!op || typeof op !== "object") return { error: "Choose an action." };

  try {
    let result: BulkResult;
    switch (op.kind) {
      case "status": {
        if (!STATUSES.includes(op.value)) return { error: "Unknown status." };
        const { changed, blocked } = await setStatus(supabase, ids, op.value);
        result = {
          ok: `${changed} set to ${op.value}.${blocked ? ` ${blocked} not published: no size has a price yet.` : ""}`,
        };
        break;
      }
      case "brand":
      case "category": {
        if (op.value !== null && !UUID.test(op.value)) return { error: `Unknown ${op.kind}.` };
        await updateProducts(supabase, ids, { [`${op.kind}_id`]: op.value });
        result = { ok: `Updated ${op.kind} on ${ids.length} products.` };
        break;
      }
      case "pet_type":
        if (!PET_TYPES.includes(op.value)) return { error: "Unknown pet type." };
        await updateProducts(supabase, ids, { pet_type: op.value });
        result = { ok: `Updated pet type on ${ids.length} products.` };
        break;
      case "is_regulated":
      case "needs_review":
      case "is_dvs_approved":
        if (typeof op.value !== "boolean") return { error: "Choose on or off." };
        await updateProducts(supabase, ids, { [op.kind]: op.value });
        result = { ok: `Updated ${ids.length} products.` };
        break;
      case "price":
        if (!Number.isFinite(op.value)) return { error: "Enter a number." };
        result = await applyPrice(supabase, ids, op.mode, op.value);
        break;
      case "stock":
        result = await applyStock(supabase, ids, op.mode, op.value, op.expiry || null);
        break;
      case "delete":
        result = await deleteProducts(supabase, ids, String(op.confirm ?? ""));
        break;
      default:
        return { error: "Unknown action." };
    }
    revalidatePath("/admin/products");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Saves the quick-edit grid: only the cells that changed are sent. */
export async function saveGridEdits(edits: GridEdit[], statuses: StatusEdit[]): Promise<BulkResult> {
  const { supabase } = await requireAdmin();
  if (!Array.isArray(edits) || !Array.isArray(statuses) || edits.length + statuses.length > 2000) {
    return { error: "Too many changes at once. Save in smaller steps." };
  }

  for (const e of edits) {
    if (!e || !UUID.test(String(e.variantId))) return { error: "A row couldn't be matched. Refresh and try again." };
    if (e.price !== undefined && (!Number.isFinite(e.price) || e.price < 0)) return { error: "Prices must be 0 or more." };
    if (e.stock !== undefined && (!Number.isInteger(e.stock) || e.stock < 0)) {
      return { error: "Stock must be a whole number, 0 or more." };
    }
    if (e.sku !== undefined && !String(e.sku).trim()) return { error: "SKU can't be empty." };
    if (e.weightGrams != null && (!Number.isInteger(e.weightGrams) || e.weightGrams <= 0)) {
      return { error: "Weight must be whole grams, more than 0." };
    }
  }
  for (const s of statuses) {
    if (!s || !UUID.test(String(s.productId)) || !STATUSES.includes(s.status)) return { error: "Unknown status." };
  }

  try {
    let fields = 0;
    for (const e of edits) {
      const patch: Record<string, unknown> = {};
      if (e.price !== undefined) patch.price = round2(e.price);
      if (e.sku !== undefined) patch.sku = String(e.sku).trim();
      if (e.barcode !== undefined) patch.barcode = e.barcode ? String(e.barcode).trim() : null;
      if (e.weightGrams !== undefined) patch.weight_grams = e.weightGrams;
      if (Object.keys(patch).length === 0) continue;
      const { error } = await supabase.from("variants").update(patch).eq("id", e.variantId);
      if (error) return { error: error.code === "23505" ? `SKU ${patch.sku} is already used.` : error.message };
      fields += 1;
    }

    const stockItems = edits
      .filter((e) => e.stock !== undefined)
      .map((e) => ({ variant_id: e.variantId, quantity: e.stock }));
    if (stockItems.length) {
      const { error } = await supabase.rpc("admin_set_stock", { p_items: stockItems, p_mode: "set" });
      if (error) return { error: error.message };
    }

    let blocked = 0;
    for (const status of STATUSES) {
      const ids = statuses.filter((s) => s.status === status).map((s) => s.productId);
      if (ids.length) blocked += (await setStatus(supabase, ids, status)).blocked;
    }

    revalidatePath("/admin/products");
    const saved = fields + stockItems.length + statuses.length - blocked;
    return {
      ok: `Saved ${saved} changes.${blocked ? ` ${blocked} not published: no size has a price yet.` : ""}`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
