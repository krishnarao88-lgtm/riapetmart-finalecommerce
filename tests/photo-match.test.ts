import assert from "node:assert/strict";
import { test } from "node:test";
import { nameKeys } from "../src/lib/photo-match.ts";

test("photo file names give exact and numbered-suffix-free keys", () => {
  assert.deepEqual(nameKeys("RPM-PDF-0133.jpg"), ["rpm-pdf-0133"]);
  assert.deepEqual(nameKeys("RPM-PDF-0133-2.JPG"), ["rpm-pdf-0133-2", "rpm-pdf-0133"]);
  assert.deepEqual(nameKeys("royal-canin-kitten-2-kg_3.webp"), ["royal-canin-kitten-2-kg_3", "royal-canin-kitten-2-kg"]);
  assert.deepEqual(nameKeys("Aniamor Liver Care (2).png"), ["aniamor liver care (2)", "aniamor liver care"]);
  // A SKU ending in a variant number still matches exactly first.
  assert.deepEqual(nameKeys("SCRAPE-20260924-NG-001-V1.jpg"), ["scrape-20260924-ng-001-v1"]);
});
