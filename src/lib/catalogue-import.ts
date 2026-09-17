// Relative import (not the @ alias) so `node --test` can load this file directly.
import { priceFromMargin } from "./pricing.ts";

/** One spreadsheet row = one variant. Products are grouped by source_ref, or by name + pack size. */
export type RawRow = Record<string, unknown>;

export type ParsedVariant = {
  sku: string;
  title: string;
  unitMultiplier: number;
  price: number;
  cost: number | null;
  margin: number | null;
  stock: number;
  expiry: string | null;
  batchNo: string | null;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
};

export type ParsedProduct = {
  key: string;
  sourceRef: string | null;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  petType: "dog" | "cat" | "small_pet" | "dog_cat";
  sizeDisplay: string | null;
  description: string | null;
  ingredients: string | null;
  usage: string | null;
  status: "draft" | "published" | "archived";
  isRegulated: boolean;
  needsReview: boolean;
  reviewNotes: string | null;
  variants: ParsedVariant[];
};

export type RowIssue = { row: number; field: string; message: string };

export type ParseResult = {
  products: ParsedProduct[];
  issues: RowIssue[];
  variantCount: number;
};

export const TEMPLATE_COLUMNS = [
  "source_ref",
  "product_name",
  "brand",
  "category",
  "pet_type",
  "size_display",
  "sku",
  "variant_title",
  "unit_multiplier",
  "cost_price",
  "sale_price",
  "margin_percent",
  "stock_qty",
  "expiry_date",
  "batch_no",
  "weight_grams",
  "length_mm",
  "width_mm",
  "height_mm",
  "description",
  "ingredients",
  "usage",
  "status",
  "is_regulated",
  "needs_review",
  "review_notes",
] as const;

const PET_TYPES: Record<string, ParsedProduct["petType"]> = {
  dog: "dog",
  dogs: "dog",
  cat: "cat",
  cats: "cat",
  both: "dog_cat",
  "dog and cat": "dog_cat",
  "cat and dog": "dog_cat",
  "both dog and cat": "dog_cat",
  dog_cat: "dog_cat",
  "small animals": "small_pet",
  "small animal": "small_pet",
  "small pet": "small_pet",
  "small pets": "small_pet",
  small_pet: "small_pet",
  rabbit: "small_pet",
  hamster: "small_pet",
};

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return null;
  const cleaned = String(value).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function int(value: unknown): number | null {
  const parsed = money(value);
  return parsed === null ? null : Math.trunc(parsed);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Accepts Excel dates, ISO (2027-09-14) and Malaysian day-first text (14/9/2027). */
export function parseExpiry(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = text.slice(0, 10);
    return Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) ? "invalid" : iso;
  }
  const dayFirst = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    const day = Number(d);
    const month = Number(m);
    if (month < 1 || month > 12 || day < 1 || day > 31) return "invalid";
    const iso = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const check = new Date(`${iso}T00:00:00Z`);
    return check.getUTCDate() === day ? iso : "invalid";
  }
  // Month-year only ("Sept 2027") gives no day: treat as missing rather than wrong.
  if (/^[a-z]{3,9}\.?\s+\d{4}$/i.test(text)) return null;
  return "invalid";
}

function truthy(value: unknown): boolean {
  const text = str(value)?.toLowerCase();
  return text === "yes" || text === "true" || text === "1" || text === "y";
}

/**
 * Validates and groups rows. Rows with a blocking problem are reported and skipped;
 * everything else is returned ready to save.
 */
export function parseCatalogue(rows: RawRow[]): ParseResult {
  const issues: RowIssue[] = [];
  const byKey = new Map<string, ParsedProduct>();
  const seenSkus = new Map<string, number>();
  let variantCount = 0;

  rows.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for the header, +1 for 1-based rows
    const name = str(raw.product_name);
    const sku = str(raw.sku);
    const sourceRef = str(raw.source_ref);

    if (!name) {
      issues.push({ row: rowNumber, field: "product_name", message: "Product name is required." });
      return;
    }
    if (!sku) {
      issues.push({ row: rowNumber, field: "sku", message: "SKU is required, and must be unique." });
      return;
    }
    const duplicate = seenSkus.get(sku.toLowerCase());
    if (duplicate) {
      issues.push({ row: rowNumber, field: "sku", message: `SKU ${sku} is already used on row ${duplicate}.` });
      return;
    }
    seenSkus.set(sku.toLowerCase(), rowNumber);

    const petRaw = str(raw.pet_type)?.toLowerCase() ?? "";
    const petType = PET_TYPES[petRaw];
    if (!petType) {
      issues.push({
        row: rowNumber,
        field: "pet_type",
        message: `“${str(raw.pet_type) ?? "(empty)"}” isn't a pet type. Use Dog, Cat, Small pets or Both.`,
      });
      return;
    }

    const cost = money(raw.cost_price);
    const marginPercent = money(raw.margin_percent);
    const margin = marginPercent === null ? null : marginPercent / 100;
    let price = money(raw.sale_price);

    if (price === null && cost !== null && margin !== null && margin >= 0 && margin < 0.95) {
      price = priceFromMargin(cost, margin);
    }
    if (price === null) {
      issues.push({
        row: rowNumber,
        field: "sale_price",
        message: "Needs a sale price, or a cost price plus margin to work one out.",
      });
      return;
    }
    if (price < 0 || (cost !== null && cost < 0)) {
      issues.push({ row: rowNumber, field: "sale_price", message: "Prices can't be negative." });
      return;
    }

    const expiry = parseExpiry(raw.expiry_date);
    if (expiry === "invalid") {
      issues.push({
        row: rowNumber,
        field: "expiry_date",
        message: `Couldn't read the date “${String(raw.expiry_date)}”. Use 14/9/2027 or 2027-09-14.`,
      });
      return;
    }

    const stock = int(raw.stock_qty) ?? 0;
    if (stock < 0) {
      issues.push({ row: rowNumber, field: "stock_qty", message: "Stock can't be negative." });
      return;
    }

    const unitMultiplier = int(raw.unit_multiplier) ?? 1;
    if (unitMultiplier < 1) {
      issues.push({ row: rowNumber, field: "unit_multiplier", message: "Units per pack must be 1 or more." });
      return;
    }

    const sizeDisplay = str(raw.size_display);
    const key = sourceRef ?? `${name.toLowerCase()}|${sizeDisplay?.toLowerCase() ?? ""}`;
    const statusRaw = str(raw.status)?.toLowerCase();
    const status: ParsedProduct["status"] =
      statusRaw === "published" || statusRaw === "archived" ? statusRaw : "draft";

    let product = byKey.get(key);
    if (!product) {
      const withSize =
        sizeDisplay && !name.toLowerCase().includes(sizeDisplay.toLowerCase()) ? `${name} ${sizeDisplay}` : name;
      product = {
        key,
        sourceRef,
        name,
        slug: slugify(withSize),
        brand: str(raw.brand),
        category: str(raw.category),
        petType,
        sizeDisplay,
        description: str(raw.description),
        ingredients: str(raw.ingredients),
        usage: str(raw.usage),
        status,
        isRegulated: truthy(raw.is_regulated),
        needsReview: truthy(raw.needs_review),
        reviewNotes: str(raw.review_notes),
        variants: [],
      };
      byKey.set(key, product);
    }

    product.variants.push({
      sku,
      title: str(raw.variant_title) ?? "Single unit",
      unitMultiplier,
      price,
      cost,
      margin,
      stock,
      expiry,
      batchNo: str(raw.batch_no),
      weightGrams: int(raw.weight_grams),
      lengthMm: int(raw.length_mm),
      widthMm: int(raw.width_mm),
      heightMm: int(raw.height_mm),
    });
    variantCount += 1;
  });

  // Slugs must be unique in the database; disambiguate collisions inside this file.
  const usedSlugs = new Set<string>();
  for (const product of byKey.values()) {
    const base = product.slug || slugify(product.name) || "product";
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    product.slug = slug;
  }

  return { products: [...byKey.values()], issues, variantCount };
}
