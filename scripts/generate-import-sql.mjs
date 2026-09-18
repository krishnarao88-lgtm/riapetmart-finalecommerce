// One-off: turns a catalogue CSV into the exact SQL the admin importer would run,
// using the SAME parsing module (src/lib/catalogue-import.ts) so behaviour matches
// clicking "Import" in /admin/import exactly. Writes SQL files; run each phase
// (brands+categories, products, variants, costs+batches) via the Supabase SQL tool.
//   node scripts/generate-import-sql.mjs <csv-path> <out-dir>
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseCatalogue, slugify } from "../src/lib/catalogue-import.ts";
import { parseCsv } from "../src/lib/sheet.ts";

const [csvPath, outDir] = process.argv.slice(2);
if (!csvPath || !outDir) {
  console.error("Usage: node scripts/generate-import-sql.mjs <csv-path> <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const { products, issues, variantCount } = parseCatalogue(rows);
if (issues.length > 0) {
  console.error(`${issues.length} rows had issues (should be 0):`, issues.slice(0, 5));
  process.exit(1);
}

const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sqlVal = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : sqlStr(v));

// ---- brands & categories ----
const brandNames = [...new Set(products.map((p) => p.brand).filter(Boolean))];
const categoryNames = [...new Set(products.map((p) => p.category).filter(Boolean))];
const brandId = new Map(brandNames.map((n) => [n, randomUUID()]));
const categoryId = new Map(categoryNames.map((n) => [n, randomUUID()]));

let sql1 = "-- Phase 1: brands & categories\n";
if (brandNames.length) {
  sql1 += `insert into public.brands (id, name, slug) values\n${brandNames
    .map((n) => `  (${sqlStr(brandId.get(n))}, ${sqlStr(n)}, ${sqlStr(slugify(n))})`)
    .join(",\n")}\non conflict (slug) do update set name = excluded.name\nreturning id, slug;\n\n`;
}
if (categoryNames.length) {
  sql1 += `insert into public.categories (id, name, slug) values\n${categoryNames
    .map((n) => `  (${sqlStr(categoryId.get(n))}, ${sqlStr(n)}, ${sqlStr(slugify(n))})`)
    .join(",\n")}\non conflict (slug) do update set name = excluded.name\nreturning id, slug;\n`;
}
writeFileSync(`${outDir}/1-brands-categories.sql`, sql1);

// ---- products (explicit ids so variants can reference them without a lookup) ----
const productId = new Map(products.map((p) => [p.key, randomUUID()]));
const productCols =
  "id, slug, source_ref, name, brand_id, category_id, pet_type, size_display, description, ingredients, usage, status, is_regulated, needs_review, review_notes";
const productRows = products.map((p) =>
  `  (${[
    sqlStr(productId.get(p.key)),
    sqlStr(p.slug),
    sqlVal(p.sourceRef),
    sqlStr(p.name),
    p.brand ? sqlStr(brandId.get(p.brand)) : "null",
    p.category ? sqlStr(categoryId.get(p.category)) : "null",
    sqlStr(p.petType),
    sqlVal(p.sizeDisplay),
    sqlVal(p.description),
    sqlVal(p.ingredients),
    sqlVal(p.usage),
    sqlStr(p.status),
    p.isRegulated,
    p.needsReview,
    sqlVal(p.reviewNotes),
  ].join(", ")})`,
);
let sql2 = `-- Phase 2: products (safe to re-run — upserts by slug)\n`;
for (let i = 0; i < productRows.length; i += 100) {
  sql2 += `insert into public.products (${productCols}) values\n${productRows.slice(i, i + 100).join(",\n")}\n`;
  sql2 += `on conflict (slug) do update set\n  name = excluded.name, brand_id = excluded.brand_id, category_id = excluded.category_id,\n  pet_type = excluded.pet_type, size_display = excluded.size_display, description = excluded.description,\n  ingredients = excluded.ingredients, usage = excluded.usage, is_regulated = excluded.is_regulated,\n  needs_review = excluded.needs_review, review_notes = excluded.review_notes;\n\n`;
}
writeFileSync(`${outDir}/2-products.sql`, sql2);

// ---- variants ----
const variantId = new Map();
const variantRows = [];
for (const p of products) {
  p.variants.forEach((v, index) => {
    const id = randomUUID();
    variantId.set(v.sku, id);
    variantRows.push(
      `  (${[
        sqlStr(id),
        sqlStr(productId.get(p.key)),
        sqlStr(v.sku),
        sqlStr(v.title),
        v.unitMultiplier,
        v.price,
        sqlVal(v.weightGrams),
        sqlVal(v.lengthMm),
        sqlVal(v.widthMm),
        sqlVal(v.heightMm),
        index,
      ].join(", ")})`,
    );
  });
}
const variantCols = "id, product_id, sku, title, unit_multiplier, price, weight_grams, length_mm, width_mm, height_mm, sort";
let sql3 = "-- Phase 3: variants\n";
for (let i = 0; i < variantRows.length; i += 150) {
  sql3 += `insert into public.variants (${variantCols}) values\n${variantRows.slice(i, i + 150).join(",\n")}\n`;
  sql3 += `on conflict (sku) do update set\n  product_id = excluded.product_id, title = excluded.title, unit_multiplier = excluded.unit_multiplier,\n  price = excluded.price, weight_grams = excluded.weight_grams, length_mm = excluded.length_mm,\n  width_mm = excluded.width_mm, height_mm = excluded.height_mm, sort = excluded.sort;\n\n`;
}
writeFileSync(`${outDir}/3-variants.sql`, sql3);

// ---- variant_costs & stock_batches ----
const costRows = [];
const batchRows = [];
for (const p of products) {
  for (const v of p.variants) {
    const vid = variantId.get(v.sku);
    if (v.cost !== null) {
      costRows.push(`  (${sqlStr(vid)}, ${v.cost}, ${v.margin === null ? "null" : v.margin})`);
    }
    if (v.stock > 0 || v.expiry !== null) {
      batchRows.push(`  (${sqlStr(vid)}, ${v.stock}, ${sqlVal(v.expiry)}, ${v.batchNo ? sqlStr(v.batchNo) : "'IMPORT'"})`);
    }
  }
}
let sql4 = "-- Phase 4: costs (admin-only) & stock batches\n";
if (costRows.length) {
  for (let i = 0; i < costRows.length; i += 200) {
    sql4 += `insert into public.variant_costs (variant_id, cost_price, margin) values\n${costRows.slice(i, i + 200).join(",\n")}\n`;
    sql4 += `on conflict (variant_id) do update set cost_price = excluded.cost_price, margin = excluded.margin;\n\n`;
  }
}
if (batchRows.length) {
  // Re-running this script replaces only the batches it created before (batch_no = 'IMPORT'),
  // leaving any batch an admin added by hand untouched — same rule as the production importer.
  sql4 += `delete from public.stock_batches where batch_no = 'IMPORT' and variant_id in (${[...variantId.values()].map(sqlStr).join(", ")});\n\n`;
  for (let i = 0; i < batchRows.length; i += 200) {
    sql4 += `insert into public.stock_batches (variant_id, quantity, expiry_date, batch_no) values\n${batchRows.slice(i, i + 200).join(",\n")};\n\n`;
  }
}
writeFileSync(`${outDir}/4-costs-batches.sql`, sql4);

console.log(
  `${products.length} products, ${variantCount} variants, ${costRows.length} costs, ${batchRows.length} batches -> ${outDir}/{1..4}-*.sql`,
);
