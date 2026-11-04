// Honest selling badges for product cards and pages (owner, 4 Nov 2026): every number comes from real prices,
// stock or the delivery rules, never invented urgency.

type V = { id: string; title: string; price: number };

const COUNT = /(\d+)\s*(?:x\s*)?(units?|pouch(?:es)?|cans?|tablets?|chewables?|trays?|dog tray|pcs|sachets?)\b/i;
const KG = /(\d+(?:\.\d+)?)\s*kg\b/i;

/** How many units a size option holds ("24 Unit - 1 Carton" → 24, "Box (6 Tablets)" → 6, "15 kg" → 15 kg). */
export function unitsOf(title: string): { n: number; kind: "count" | "kg" } | null {
  const kg = title.match(KG);
  if (kg) return { n: Number(kg[1]), kind: "kg" };
  const c = title.match(COUNT);
  return c ? { n: Number(c[1]), kind: "count" } : null;
}

/**
 * Saving per unit of each bigger pack against the dearest per-unit option of the same kind (cans vs cans,
 * kg vs kg). Only savings of 3% or more are kept; returns variant id → whole-percent saving.
 */
export function bulkSavings(variants: V[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const kind of ["count", "kg"] as const) {
    const rows = variants
      .map((v) => ({ v, u: unitsOf(v.title) }))
      .filter((r): r is { v: V; u: { n: number; kind: "count" | "kg" } } => !!r.u && r.u.kind === kind && r.u.n > 0 && r.v.price > 0)
      .map((r) => ({ id: r.v.id, per: r.v.price / r.u.n }));
    if (rows.length < 2) continue;
    const dearest = Math.max(...rows.map((r) => r.per));
    for (const r of rows) {
      const pct = Math.round((1 - r.per / dearest) * 100);
      if (pct >= 3) out.set(r.id, pct);
    }
  }
  return out;
}

const DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Usual courier window: 2–4 shop days after today, skipping Sundays, as dates like "Fri 7 Nov – Tue 11 Nov". */
export function courierWindow(now = new Date()) {
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  let t = now.getTime() + 8 * 3_600_000; // Malaysia time, read through UTC fields
  const days: number[] = [];
  while (days.length < 4) {
    t += DAY;
    if (new Date(t).getUTCDay() !== 0) days.push(t);
  }
  return `${fmt(days[1])} – ${fmt(days[3])}`;
}
