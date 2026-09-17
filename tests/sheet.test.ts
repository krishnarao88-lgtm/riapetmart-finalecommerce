import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCsv, splitCsvLine, toCsv } from "../src/lib/sheet.ts";

test("quoted cells keep their commas, quotes and newlines", () => {
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
  assert.deepEqual(splitCsvLine('"say ""hi""",2'), ['say "hi"', "2"]);
  assert.deepEqual(splitCsvLine("a,,c"), ["a", "", "c"]);
});

test("headers are normalised and blank lines ignored", () => {
  const rows = parseCsv("Product Name,SKU,Sale Price\nALPS CHUNKY LAMB,RPM-1,4.80\n\nKITCAT TUNA,RPM-2,4.90\n");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { product_name: "ALPS CHUNKY LAMB", sku: "RPM-1", sale_price: "4.80" });
  assert.equal(rows[1].sku, "RPM-2");
});

test("a description containing a comma and a line break survives the round trip", () => {
  const description = 'Ingredients: chicken, rice\nFeed twice daily. Say "meow"';
  const csv = toCsv(["product_name", "description"], [["KITCAT TUNA", description]]);
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].description, description);
});
