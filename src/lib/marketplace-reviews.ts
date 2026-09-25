// Turns a TikTok Shop or Shopee seller-centre review export into review rows. Column names differ
// between the two (and between export versions), so columns are found by keyword, not position.
import type { RawRow } from "./catalogue-import.ts";

export type MarketplaceSource = "tiktok" | "shopee";
export type MarketplaceReview = {
  rating: number;
  body: string;
  reviewedAt: string | null;
  orderRef: string;
  listingId: string; // the marketplace's own product id or name
  buyer: string;
};

const COLUMNS = {
  rating: [/^rating$/, /star/, /rating/],
  body: [/review_?text/, /comment/, /content/, /review/],
  date: [/date/, /time/],
  order: [/order/],
  listing: [/product_?id/, /product/, /item/],
  buyer: [/user/, /buyer/],
};

function pick(row: RawRow, patterns: RegExp[]): string {
  const keys = Object.keys(row);
  for (const p of patterns) {
    const key = keys.find((k) => p.test(k.toLowerCase().trim()));
    if (key !== undefined && row[key] != null) return String(row[key]).trim();
  }
  return "";
}

/** "farhanadhira" -> "fa******ra": the name stays recognisable to the buyer, not to everyone else. */
export function maskBuyer(name: string): string {
  const n = name.replace(/^@/, "").trim();
  if (!n || n.includes("*")) return n;
  if (n.length <= 4) return `${n[0]}***`;
  return `${n.slice(0, 2)}${"*".repeat(Math.min(6, n.length - 4))}${n.slice(-2)}`;
}

export function parseMarketplaceReviews(rows: RawRow[], source: MarketplaceSource) {
  const seen = new Map<string, MarketplaceReview>();
  let skipped = 0;
  for (const row of rows) {
    const rating = Number(pick(row, COLUMNS.rating));
    const orderRef = pick(row, COLUMNS.order);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !orderRef) {
      skipped++;
      continue;
    }
    const body = pick(row, COLUMNS.body);
    const listingId = pick(row, COLUMNS.listing);
    const rawDate = pick(row, COLUMNS.date);
    const date = rawDate ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(rawDate) ? rawDate : `${rawDate.replace(" ", "T")}+08:00`) : null;
    const buyer = maskBuyer(pick(row, COLUMNS.buyer)) || (source === "tiktok" ? "TikTok Shop buyer" : "Shopee buyer");
    // An order that bought several flavours of one listing repeats the same review once per SKU.
    const key = `${orderRef}|${listingId}`;
    const prev = seen.get(key);
    if (!prev || (!prev.body && body)) {
      seen.set(key, { rating, body, reviewedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null, orderRef, listingId, buyer });
    }
  }
  return { reviews: [...seen.values()], skipped };
}
