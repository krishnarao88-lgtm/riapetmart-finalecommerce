import assert from "node:assert/strict";
import { test } from "node:test";
import { maskBuyer, parseMarketplaceReviews } from "../src/lib/marketplace-reviews.ts";

test("TikTok export: one review per order+listing, rating-only kept, dates read as Malaysia time", () => {
  const rows = [
    { rating: "5", review_text: "", review_date: "2026-07-10 05:33:17", order_id: "58477", product_id: "1733", sku_id: "a" },
    { rating: "5", review_text: "Freshness: Good", review_date: "2026-07-10 05:33:17", order_id: "58477", product_id: "1733", sku_id: "b" },
    { rating: "4", review_text: "", review_date: "2026-05-14 15:02:32", order_id: "58396", product_id: "1729", sku_id: "c" },
    { rating: "x", review_text: "junk", review_date: "", order_id: "1", product_id: "1", sku_id: "d" },
  ];
  const { reviews, skipped } = parseMarketplaceReviews(rows, "tiktok");
  assert.equal(skipped, 1);
  assert.equal(reviews.length, 2);
  assert.equal(reviews[0].body, "Freshness: Good");
  assert.equal(reviews[0].reviewedAt, "2026-07-09T21:33:17.000Z");
  assert.equal(reviews[0].buyer, "TikTok Shop buyer");
});

test("Shopee-style headers and usernames are masked", () => {
  const { reviews } = parseMarketplaceReviews(
    [{ "Order SN": "260920H2FTJ2QK", "Product Name": "Skin Heal Herbal Pet Spray 100ml", Username: "farhanadhira", "Rating Star": 5, Comment: "Good" }],
    "shopee",
  );
  assert.equal(reviews[0].listingId, "Skin Heal Herbal Pet Spray 100ml");
  assert.equal(reviews[0].buyer, "fa******ra");
  assert.equal(maskBuyer("@L*****9"), "L*****9");
});
