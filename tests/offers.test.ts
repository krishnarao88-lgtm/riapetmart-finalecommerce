import assert from "node:assert/strict";
import { test } from "node:test";
import { marginAfterDiscount, MIN_OFFER_MARGIN } from "../src/lib/offers.ts";
import { promoFor, type Promotion } from "../src/lib/promotions.ts";

test("margin after discount uses the worst size, and needs every cost", () => {
  // Aniamor Skin & Coat Syrup: cost 21, price 24.90 → 10% off leaves ~6%, under the floor.
  const m = marginAfterDiscount([{ price: 24.9, cost: 21 }], 0.1)!;
  assert.ok(m < MIN_OFFER_MARGIN && m > 0.06 && m < 0.07);
  assert.equal(marginAfterDiscount([{ price: 24.9, cost: null }], 0.1), null);
  assert.equal(marginAfterDiscount([{ price: 0, cost: null }, { price: 45, cost: 30 }], 0.1)?.toFixed(3), "0.259");
});

test("products excluded at approval never get the sale", () => {
  const sale: Promotion = {
    id: "s", name: "Raya", starts_on: "2027-03-03", ends_on: "2027-03-13", discount: 0.1, scope: "house",
    brand_id: null, category_id: null, banner: null, excluded_product_ids: ["thin"],
  };
  assert.equal(promoFor({ id: "thin", brand_id: null, category_id: null, house: true }, [sale], "2027-03-05"), null);
  assert.equal(promoFor({ id: "ok", brand_id: null, category_id: null, house: true }, [sale], "2027-03-05")?.id, "s");
});
