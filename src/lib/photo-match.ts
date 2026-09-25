/**
 * Lookup keys for a photo's file name, used to match bulk-uploaded photos to products by SKU,
 * slug or source ref. "RPM-PDF-0133-2.jpg" → ["rpm-pdf-0133-2", "rpm-pdf-0133"]: the exact name
 * first (a SKU can itself end in -V1), then without a trailing -2 / _2 / " 2" / (2) photo number.
 */
export function nameKeys(fileName: string): string[] {
  const base = fileName.replace(/\.[^.]+$/, "").trim().toLowerCase();
  const stripped = base.replace(/\s*(?:[-_ ]\d{1,2}|\(\d{1,2}\))$/, "");
  return stripped === base ? [base] : [base, stripped];
}
