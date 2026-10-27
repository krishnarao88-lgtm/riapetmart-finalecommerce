import assert from "node:assert/strict";
import { test } from "node:test";
import { isInternalCode, isValidGtin, upcEToUpcA } from "../src/lib/gtin.ts";

test("GTIN check digits", () => {
  assert.equal(isValidGtin("4006381333931"), true); // EAN-13
  assert.equal(isValidGtin("4006381333932"), false);
  assert.equal(isValidGtin("96385074"), true); // EAN-8
  assert.equal(isValidGtin("036000291452"), true); // UPC-A
  assert.equal(isValidGtin("10012345678902"), true); // GTIN-14
  assert.equal(isValidGtin("12345"), false);
  assert.equal(isValidGtin("40063813339a1"), false);
  assert.equal(isValidGtin("12345678901"), false); // 11 digits is no GTIN length
});

test("shop-made 2… codes are flagged", () => {
  assert.equal(isInternalCode("2000000012345"), true);
  assert.equal(isInternalCode("4006381333931"), false);
  assert.equal(isInternalCode("20000000"), false);
});

test("UPC-E expands to a valid UPC-A", () => {
  assert.equal(upcEToUpcA("04252614"), "042100005264");
  assert.equal(isValidGtin(upcEToUpcA("04252614")!), true);
  assert.equal(upcEToUpcA("01234565"), "012345000065");
  assert.equal(upcEToUpcA("96385074"), null); // EAN-8, not UPC-E
});
