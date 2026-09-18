"""One-off: turn the owner's two working workbooks into the admin import file (CSV).

    python3 scripts/workbook_to_import.py <content.xlsx> <pricing.xlsx> [out.csv]

Cost, price and expiry come from the pricing master when it lists the product; the
content workbook supplies names, variants, descriptions and review flags.
Needs openpyxl (pip install openpyxl) because these files are not readable by exceljs.
"""

from __future__ import annotations

import csv
import re
import sys
from datetime import date, datetime

import openpyxl

HEADER = [
    "source_ref", "product_name", "brand", "category", "pet_type", "size_display", "sku",
    "variant_title", "unit_multiplier", "cost_price", "sale_price", "margin_percent", "stock_qty",
    "expiry_date", "batch_no", "weight_grams", "length_mm", "width_mm", "height_mm", "description",
    "ingredients", "usage", "status", "is_regulated", "needs_review", "review_notes",
]

PET = {
    "dog": "Dog", "cat": "Cat", "both": "Both", "both dog and cat": "Both",
    "cat and dog": "Both", "small animals": "Small pets",
}

JUNK = re.compile(r"still learning and can'?t help|i can'?t help with that", re.I)


def sheet_rows(path: str, sheet_name: str) -> list[dict]:
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book[sheet_name]
    rows = sheet.iter_rows(values_only=True)
    header = [str(c).strip() if c is not None else "" for c in next(rows)]
    out = []
    for row in rows:
        if not any(c not in (None, "") for c in row):
            continue
        out.append({key: row[i] for i, key in enumerate(header) if key and i < len(row)})
    book.close()
    return out


def clean(value) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text or text.lower() == "none":
        return ""
    return "" if JUNK.search(text) else text


def number(value):
    """Excel stored some prices as dates; convert those back to the number they were."""
    if value in (None, ""):
        return None
    if isinstance(value, (datetime, date)):
        moment = value if isinstance(value, datetime) else datetime(value.year, value.month, value.day)
        epoch = datetime(1899, 12, 31) if moment < datetime(1900, 3, 1) else datetime(1899, 12, 30)
        return round((moment - epoch).total_seconds() / 86400, 2)
    try:
        return float(re.sub(r"[^\d.-]", "", str(value)))
    except ValueError:
        return None


def iso_date(value) -> str:
    if isinstance(value, (datetime, date)):
        return (value.date() if isinstance(value, datetime) else value).isoformat()
    text = str(value or "").strip()
    day_first = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", text)
    if day_first:
        d, m, y = day_first.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return text[:10]
    return ""


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    content_path, pricing_path = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else "ria-pet-mart-import.csv"

    products = sheet_rows(content_path, "Product_Import_Master")
    variants = sheet_rows(content_path, "Variants_Bundles")
    batches = sheet_rows(content_path, "Inventory_Batches")
    generated = sheet_rows(content_path, "Generated_Product_Info")
    pricing = sheet_rows(pricing_path, "Pricing Master")

    price_by_name = {clean(r.get("Product Name")).upper(): r for r in pricing}
    gen_by_ref = {r.get("Import ID"): r for r in generated}
    batch_by_variant = {r.get("Variant ID"): r for r in batches}
    variants_by_ref: dict[str, list[dict]] = {}
    for variant in variants:
        variants_by_ref.setdefault(variant.get("Import ID"), []).append(variant)

    rows, skipped = [], 0
    for product in products:
        ref = product.get("Import ID")
        name = clean(product.get("Product Name"))
        if not ref or not name:
            skipped += 1
            continue

        gen = gen_by_ref.get(ref, {})
        money = price_by_name.get(name.upper(), {})

        unit_cost = number(money.get("Cost (RM)"))
        if unit_cost is None:
            unit_cost = number(product.get("Cost Price (Backend Only)"))
        unit_price = number(money.get("Current RRP (RM)"))
        if unit_price is None:
            unit_price = number(product.get("Sale Price")) or number(gen.get("Sale Price"))
        if unit_price is None:
            skipped += 1
            continue

        expiry = iso_date(money.get("Expiry Date") or product.get("Expiry Date"))
        weight_kg = number(product.get("Actual Weight KG"))
        length_mm = round((number(product.get("Length CM")) or 0) * 10) or ""
        width_mm = round((number(product.get("Width CM")) or 0) * 10) or ""
        height_mm = round((number(product.get("Height CM")) or 0) * 10) or ""

        flags = clean(product.get("Cleaning Flags"))
        regulated = bool(re.search(r"yes|true", str(product.get("Compliance Review Required") or ""), re.I))
        notes = " · ".join(
            part for part in [
                clean(gen.get("Admin Notes")),
                f"flags: {flags}" if flags else "",
                "" if expiry else "expiry date missing",
                "" if length_mm else "box size missing: courier price needs a manual quote",
            ] if part
        )

        product_variants = variants_by_ref.get(ref) or [
            {"Variant ID": f"{ref}-V1", "Selling Option": "Single unit", "Unit Multiplier": 1}
        ]

        for variant in product_variants:
            multiplier = int(number(variant.get("Unit Multiplier")) or 1) or 1
            batch = batch_by_variant.get(variant.get("Variant ID"), {})
            variant_expiry = iso_date(batch.get("Expiry Date")) or expiry
            bundle_note = "bundle price is unit price x quantity: set your own bundle price" if multiplier > 1 else ""
            description = clean(gen.get("Final Storefront Description")) or clean(product.get("Storefront Description"))

            rows.append([
                ref,
                name,
                clean(product.get("Brand")),
                clean(product.get("Store Category")),
                PET.get(clean(product.get("Pet Type")).lower(), clean(product.get("Pet Type")) or "Both"),
                clean(product.get("Size Display")),
                clean(variant.get("Variant ID")),
                clean(variant.get("Selling Option")) or "Single unit",
                multiplier,
                "" if unit_cost is None else round(unit_cost * multiplier, 2),
                round(unit_price * multiplier, 2),
                "",
                int(number(batch.get("Quantity On Hand")) or 0),
                variant_expiry,
                "IMPORT",
                round(weight_kg * multiplier * 1000) if weight_kg else "",
                length_mm if multiplier == 1 else "",
                width_mm if multiplier == 1 else "",
                height_mm if multiplier == 1 else "",
                clean(gen.get("Final Storefront Description")) or clean(product.get("Storefront Description")),
                clean(gen.get("Final Ingredients / Composition")) or clean(product.get("Ingredients / Composition")),
                clean(gen.get("Final Dosage / Usage")) or clean(product.get("Dosage / Usage")),
                "draft",
                "yes" if regulated else "no",
                # Flag only what a person must actually check, so the flag stays meaningful.
                "yes" if (regulated or not variant_expiry or not description or not length_mm) else "no",
                " · ".join(p for p in [notes, bundle_note] if p),
            ])

    with open(out_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        writer.writerows(rows)

    with_cost = sum(1 for r in rows if r[9] != "")
    with_expiry = sum(1 for r in rows if r[13] != "")
    print(
        f"{out_path}: {len(rows)} variant rows from {len({r[0] for r in rows})} products "
        f"({with_cost} with cost, {with_expiry} with expiry, {skipped} product rows skipped)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
