import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAttribution, sourceLabel } from "../src/lib/attribution.ts";

test("sourceLabel names the channel an owner recognises", () => {
  assert.equal(sourceLabel(null), "Direct / unknown");
  assert.equal(sourceLabel({ fbclid: "abc" }), "Meta ad");
  assert.equal(sourceLabel({ utm_source: "facebook", utm_medium: "paid", utm_campaign: "clearance" }), "Meta ad · clearance");
  assert.equal(sourceLabel({ ref: "l.instagram.com" }), "Facebook / Instagram");
  assert.equal(sourceLabel({ ttclid: "x" }), "TikTok ad");
  assert.equal(sourceLabel({ gclid: "x" }), "Google ad");
  assert.equal(sourceLabel({ ref: "www.google.com" }), "Google search");
  assert.equal(sourceLabel({ utm_source: "whatsapp" }), "WhatsApp");
  assert.equal(sourceLabel({ ref: "shopee.com.my" }), "Shopee");
  assert.equal(sourceLabel({ utm_source: "digital-flyer" }), "digital-flyer"); // "ig" inside a word isn't Instagram
});

test("cleanAttribution keeps known short strings only", () => {
  const out = cleanAttribution(
    { utm_source: "  fb ", evil: "<script>", fbclid: "a".repeat(500), at: "1790000000000", gclid: 42 },
    { ip: "1.2.3.4", ua: null },
  );
  assert.deepEqual(Object.keys(out!).sort(), ["at", "fbclid", "ip", "utm_source"]);
  assert.equal(out!.utm_source, "fb");
  assert.equal(out!.fbclid!.length, 200);
  assert.equal(out!.at, 1790000000000);
  assert.equal(cleanAttribution("nonsense"), null);
});
