import PDFDocument from "pdfkit";
import { requireAdmin } from "@/lib/auth";
import { TEMPLATE_COLUMNS } from "@/lib/catalogue-import";
import { formatMyr, marginFromPrice } from "@/lib/pricing";
import { toCsv, toXlsx } from "@/lib/sheet";

export const runtime = "nodejs";

type ExportRow = {
  source_ref: string | null;
  name: string;
  size_display: string | null;
  pet_type: string;
  status: string;
  description: string | null;
  ingredients: string | null;
  usage: string | null;
  is_regulated: boolean;
  needs_review: boolean;
  review_notes: string | null;
  brands: { name: string } | null;
  categories: { name: string } | null;
  variants: {
    sku: string;
    title: string;
    unit_multiplier: number;
    price: number;
    weight_grams: number | null;
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    variant_costs: { cost_price: number; margin: number | null } | null;
    stock_batches: { quantity: number; expiry_date: string | null; batch_no: string | null }[];
  }[];
};

function flatten(rows: ExportRow[]) {
  return rows.flatMap((p) =>
    p.variants.map((v) => {
      const live = v.stock_batches.filter((b) => b.quantity > 0);
      const stock = live.reduce((sum, b) => sum + b.quantity, 0);
      const expiry = live
        .map((b) => b.expiry_date)
        .filter((d): d is string => Boolean(d))
        .sort()[0];
      const cost = v.variant_costs ? Number(v.variant_costs.cost_price) : null;
      const margin =
        v.variant_costs?.margin != null
          ? Number(v.variant_costs.margin)
          : cost === null
            ? null
            : marginFromPrice(cost, Number(v.price));
      return [
        p.source_ref,
        p.name,
        p.brands?.name ?? null,
        p.categories?.name ?? null,
        p.pet_type,
        p.size_display,
        v.sku,
        v.title,
        v.unit_multiplier,
        cost,
        Number(v.price),
        margin === null ? null : Math.round(margin * 1000) / 10,
        stock,
        expiry ?? null,
        live[0]?.batch_no ?? null,
        v.weight_grams,
        v.length_mm,
        v.width_mm,
        v.height_mm,
        p.description,
        p.ingredients,
        p.usage,
        p.status,
        p.is_regulated ? "yes" : "no",
        p.needs_review ? "yes" : "no",
        p.review_notes,
      ] as (string | number | null)[];
    }),
  );
}

async function priceListPdf(rows: ExportRow[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.fontSize(18).text("Ria Pet Mart price list");
  doc.fontSize(9).fillColor("#55506f").text(`Generated ${new Date().toISOString().slice(0, 10)} · prices in MYR`);
  doc.moveDown(0.8).fillColor("#1e1b3a");

  for (const product of rows) {
    if (doc.y > 760) doc.addPage();
    doc.fontSize(11).text(`${product.name}${product.size_display ? ` · ${product.size_display}` : ""}`);
    for (const variant of product.variants) {
      const stock = variant.stock_batches.reduce((sum, b) => sum + b.quantity, 0);
      const expiry = variant.stock_batches
        .filter((b) => b.quantity > 0)
        .map((b) => b.expiry_date)
        .filter((d): d is string => Boolean(d))
        .sort()[0];
      doc
        .fontSize(9)
        .fillColor("#55506f")
        .text(
          `   ${variant.title} · ${variant.sku} · ${formatMyr(Number(variant.price))} · stock ${stock}${
            expiry ? ` · best before ${expiry}` : ""
          }`,
        )
        .fillColor("#1e1b3a");
    }
    doc.moveDown(0.4);
  }

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "xlsx";
  const templateOnly = url.searchParams.get("template") === "1";
  const stamp = new Date().toISOString().slice(0, 10);
  const header = [...TEMPLATE_COLUMNS];

  if (templateOnly) {
    const buffer = await toXlsx("Template", header, []);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="ria-pet-mart-import-template.xlsx"',
      },
    });
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "source_ref, name, size_display, pet_type, status, description, ingredients, usage, is_regulated, needs_review, review_notes, brands(name), categories(name), variants(sku, title, unit_multiplier, price, weight_grams, length_mm, width_mm, height_mm, variant_costs(cost_price, margin), stock_batches(quantity, expiry_date, batch_no))",
    )
    .order("name");

  if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
  const rows = (data ?? []) as unknown as ExportRow[];

  if (format === "csv") {
    return new Response(toCsv(header, flatten(rows)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ria-pet-mart-products-${stamp}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await priceListPdf(rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ria-pet-mart-price-list-${stamp}.pdf"`,
      },
    });
  }

  const buffer = await toXlsx("Products", header, flatten(rows));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ria-pet-mart-products-${stamp}.xlsx"`,
    },
  });
}
