import assert from "node:assert/strict";
import { test } from "node:test";
import { feedHighlights, feedTitle, googleCategory, productSeo, productType } from "../src/lib/feed-enrich.ts";
import { localInventoryXml, productFeedXml } from "../src/lib/seo.ts";

test("local inventory feed: shelf stock per store, same-day pickup only when in stock", () => {
  const base = { groupId: null, title: "T", description: "D", link: "https://x/p", image: "https://x/i.png", brand: null, gtin: null };
  const xml = localInventoryXml("RPM01", [
    { ...base, id: "v1", price: 12.3, salePrice: 10, inStock: true },
    { ...base, id: "v2", price: 5, salePrice: null, inStock: false },
  ]);
  assert.equal(xml.match(/<g:store_code>RPM01<\/g:store_code>/g)?.length, 2);
  assert.match(xml, /<g:id>v1<\/g:id><g:availability>in_stock<\/g:availability><g:price>12\.30 MYR<\/g:price><g:sale_price>10\.00 MYR<\/g:sale_price><g:pickup_method>buy<\/g:pickup_method><g:pickup_sla>same day<\/g:pickup_sla>/);
  assert.match(xml, /<g:id>v2<\/g:id><g:availability>out_of_stock<\/g:availability><g:price>5\.00 MYR<\/g:price><\/item>/);
});

test("feed titles gain the pet + food words shoppers search for, before the size", () => {
  assert.equal(feedTitle("WANPY DOG CANNED SALMON 375G", "dog", "Wet Food"), "Wanpy Dog Canned Salmon Wet Food 375g");
  assert.equal(feedTitle("ALPS CHUNKY LAMB 415GM", "dog", "Wet Food"), "Alps Chunky Lamb Dog Wet Food 415g");
  assert.equal(feedTitle("WANPY VENISON JERKY 100G", "dog", "Treats"), "Wanpy Venison Jerky Dog Treats 100g");
  assert.equal(
    feedTitle("WANPY GRAIN FREE COMPLETE FOOD CHICKEN KITTEN 1.5KG", "cat", "Dry Food"),
    "Wanpy Grain Free Complete Food Chicken Kitten Dry Food 1.5kg",
  );
  assert.equal(feedTitle("Conaseb AntiFungal Pet Shampoo 200ml", "dog_cat", "Grooming & Cleaning"), "Conaseb AntiFungal Pet Shampoo 200ml for Dogs & Cats");
  assert.equal(feedTitle("NexGard Chewables 4.1–10 kg (1x6 Chewable)", "dog", "Pet Health / Medication"), "NexGard Chewables Dog 4.1–10 kg (1x6 Chewable)");
});

test("Google category and our product type come from pet + category", () => {
  assert.match(googleCategory("cat", "Wet Food") ?? "", /Cat Supplies > Cat Food$/);
  assert.match(googleCategory("dog", "Treats") ?? "", /Dog Supplies > Dog Treats$/);
  assert.match(googleCategory("dog_cat", "Supplements") ?? "", /Pet Vitamins & Supplements$/);
  assert.equal(googleCategory("dog", "Pet Health / Medication"), null);
  assert.equal(productType("cat", "Wet Food"), "Cat > Wet Food");
  assert.equal(productType(null, null), null);
});

test("highlights go out for food, never health claims", () => {
  assert.deepEqual(feedHighlights(["Taurine", " Grain free ", "x"], "Wet Food"), ["Taurine", "Grain free"]);
  assert.deepEqual(feedHighlights(["Advanced CKD"], "Supplements"), []);
  assert.deepEqual(feedHighlights(null, "Wet Food"), []);
});

test("feed XML carries the new tags", () => {
  const xml = productFeedXml({ title: "S", link: "https://x", description: "d" }, [
    {
      id: "v1", groupId: null, title: "T", description: "D", link: "https://x/p", image: "https://x/i.png", price: 1,
      salePrice: null, inStock: true, brand: null, gtin: null,
      googleCategory: "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Food", productType: "Cat > Wet Food", highlights: ["Taurine", "Grain free"],
    },
  ]);
  assert.match(xml, /<g:google_product_category>Animals &amp; Pet Supplies &gt; Pet Supplies &gt; Cat Supplies &gt; Cat Food<\/g:google_product_category>/);
  assert.match(xml, /<g:product_type>Cat &gt; Wet Food<\/g:product_type>/);
  assert.equal(xml.match(/<g:product_highlight>/g)?.length, 2);
});

test("product page SEO: searchable title, Malay phrase and keywords from pet + category", () => {
  const seo = productSeo({ name: "ALPS CHUNKY LAMB 415GM", brand: "Alps", petType: "dog", category: "Wet Food", fromPrice: 4.8 });
  assert.equal(seo.title, "Alps Chunky Lamb Dog Wet Food 415g");
  assert.match(seo.description, /^Alps Chunky Lamb Dog Wet Food 415g \(makanan anjing basah\)\. From RM4\.80\. Same-day delivery/);
  assert.ok(seo.keywords.includes("makanan anjing basah"));
  assert.ok(seo.keywords.includes("Alps dog food Malaysia"));
  assert.ok(seo.keywords.includes("dog wet food Rawang"));
  const plain = productSeo({ name: "Mystery Item", brand: null, petType: null, category: null, fromPrice: null });
  assert.equal(plain.title, "Mystery Item");
  assert.deepEqual(plain.keywords, ["Mystery Item", "pet shop Rawang"]);
});
