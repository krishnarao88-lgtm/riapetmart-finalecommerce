import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeXml, feedDescription, productDescription, productFeedXml, productTitle, type FeedItem } from "../src/lib/seo.ts";

const item: FeedItem = {
  id: "v1",
  groupId: null,
  title: `Tom & Jerry's <"Best"> Treats`,
  description: "Chicken & liver",
  link: "https://riapetmart.com/shop/treats?a=1&b=2",
  image: "https://example.com/a.png",
  price: 12.3,
  salePrice: null,
  inStock: true,
  brand: "Tom & Co",
  gtin: null,
};

test("escapeXml escapes the five XML special characters", () => {
  assert.equal(escapeXml(`& < > " '`), "&amp; &lt; &gt; &quot; &apos;");
});

test("productFeedXml writes escaped Merchant Center items", () => {
  const xml = productFeedXml({ title: "Shop", link: "https://riapetmart.com", description: "Pets" }, [
    item,
    { ...item, id: "v2", groupId: "p1", inStock: false, salePrice: 10.46, gtin: "9556123456789" },
  ]);
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<title>Tom &amp; Jerry&apos;s &lt;&quot;Best&quot;&gt; Treats<\/title>/);
  assert.match(xml, /<link>https:\/\/riapetmart\.com\/shop\/treats\?a=1&amp;b=2<\/link>/);
  assert.match(xml, /<g:price>12\.30 MYR<\/g:price>/);
  assert.match(xml, /<g:sale_price>10\.46 MYR<\/g:sale_price>/);
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.match(xml, /<g:availability>out_of_stock<\/g:availability>/);
  assert.match(xml, /<g:gtin>9556123456789<\/g:gtin>/);
  assert.match(xml, /<g:item_group_id>p1<\/g:item_group_id>/);
  assert.equal(xml.match(/<item>/g)?.length, 2);
  assert.equal(xml.match(/<g:gtin>/g)?.length, 1, "no empty gtin tag when there is no barcode");
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/, "no bare ampersands leak through");
});

test("productTitle keeps the price tail only when the full title fits in 60 characters", () => {
  assert.equal(productTitle("IQ DOG LAMB 1KG"), "IQ Dog Lamb 1kg – Price in Malaysia");
  assert.equal(productTitle("CATSOME KITCHEN CHICKEN WITH SALMON GRAVY 80G"), "Catsome Kitchen Chicken with Salmon Gravy 80g");
});

test("productDescription mentions the price and delivery options", () => {
  const text = productDescription("ALPS CHUNKY SALMON 415GM", 6.5);
  assert.match(text, /^Alps Chunky Salmon 415g, from RM\s?6\.50\. /);
  assert.match(text, /Klang Valley/);
  assert.match(text, /Rawang/);
  assert.ok(text.length <= 160);
  assert.doesNotMatch(productDescription("ALPS CHUNKY SALMON 415GM", null), /from/);
});

test("feedDescription drops sodium nitrite (Google policy) and keeps the rest of the list tidy", () => {
  assert.equal(feedDescription("Vitamins (A, B, D, E), Calcium Carbonate, Sodium Nitrite. For dogs."), "Vitamins (A, B, D, E), Calcium Carbonate. For dogs.");
  assert.equal(feedDescription("calcium carbonate, and sodium nitrite."), "calcium carbonate.");
  assert.equal(feedDescription("Gels, Salt and Sodium Nitrite, Oligosaccharide"), "Gels, Oligosaccharide");
  assert.equal(feedDescription("Chicken & liver"), "Chicken & liver");
});
