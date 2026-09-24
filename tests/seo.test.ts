import assert from "node:assert/strict";
import { test } from "node:test";
import { categorySeo, faqJsonLd, landingSeo, petSeo, titleCase } from "../src/lib/seo.ts";

test("titleCase turns stored capitals into readable product names", () => {
  assert.equal(titleCase("WANPY GRAIN FREE COMPLETE FOOD SALMON 1.5KG"), "Wanpy Grain Free Complete Food Salmon 1.5kg");
  assert.equal(titleCase("CATSOME KITCHEN CHICKEN WITH SALMON GRAVY 80G"), "Catsome Kitchen Chicken with Salmon Gravy 80g");
  assert.equal(titleCase("ROBUST HEARTY TREATS HIP & JOINT 500G"), "Robust Hearty Treats Hip & Joint 500g");
});

test("titleCase tidies spacing, units and shop abbreviations", () => {
  assert.equal(titleCase("ARISTOCAT PREMIUM PLUS (CHICKEN&TILAPIA ) 80G CAN"), "Aristocat Premium Plus (Chicken & Tilapia) 80g Can");
  assert.equal(titleCase("SNIFFLY CAT CHICKEN PCH 70G"), "Sniffly Cat Chicken Pouch 70g");
  assert.equal(titleCase("SNIFFLY CAT DELIGHT TUNA W SALMON 80G CAN"), "Sniffly Cat Delight Tuna with Salmon 80g Can");
  assert.equal(titleCase("ALPS CHUNKY SALMON 415GM"), "Alps Chunky Salmon 415g");
  assert.equal(titleCase("TOFU LITTER 7L"), "Tofu Litter 7L");
  assert.equal(titleCase("ARISTOCAT-HEALTH CARE - LIVER 70G"), "Aristocat-Health Care - Liver 70g");
});

test("titleCase keeps acronyms and leaves names already typed in mixed case", () => {
  assert.equal(titleCase("IQ DOG LAMB 1KG"), "IQ Dog Lamb 1kg");
  assert.equal(titleCase("CNF CAT FOOD"), "CNF Cat Food");
  assert.equal(titleCase("Royal Canin Kitten 2kg"), "Royal Canin Kitten 2kg");
});

test("every landing page stays within Google's title and description lengths", () => {
  for (const [key, page] of Object.entries({ ...categorySeo, ...petSeo })) {
    assert.ok(page.title.length <= 52, `${key} title is ${page.title.length} chars`);
    assert.ok(page.description.length <= 160, `${key} description is ${page.description.length} chars`);
    assert.ok(page.intro.length > 0 && page.h1.length > 0, `${key} needs an H1 and intro`);
  }
});

test("landingSeo prefers the category over the pet filter", () => {
  assert.equal(landingSeo("dry-food", "cat"), categorySeo["dry-food"]);
  assert.equal(landingSeo(undefined, "dog"), petSeo.dog);
  assert.equal(landingSeo("not-a-category"), null);
});

test("faqJsonLd builds FAQPage structured data", () => {
  const data = faqJsonLd([{ q: "Question?", a: "Answer." }]);
  assert.equal(data["@type"], "FAQPage");
  assert.equal(data.mainEntity[0].acceptedAnswer.text, "Answer.");
});
