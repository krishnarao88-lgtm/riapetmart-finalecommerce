import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanProductText, textBlocks } from "../src/lib/product-text.ts";

test("cleanProductText drops CRLF, extra blank lines and a repeated heading", () => {
  assert.equal(cleanProductText("Ingredients of Flyworm Tablet\r\n\r\n\r\n1. Chirata:  \r\nGood"), "1. Chirata:\nGood");
  assert.equal(cleanProductText(null), "");
});

test("numbered points become titled items", () => {
  const b = textBlocks("1. Chirata (Swertia chirata):\r\nDigestive health: helps digestion.\r\n\r\n2. Kamila:\r\nSkin health.");
  assert.deepEqual(b[0], { kind: "item", title: "Chirata (Swertia chirata)", text: "Digestive health: helps digestion." });
  assert.equal(b[1].kind, "item");
});

test("long ingredient lines become a list, trailing prose stays a paragraph", () => {
  const b = textBlocks("Soy bean meal, Tapioca flour, Wheat bran, Corn, Fish meal (12%, dried), Tallow, Rice. Features single protein.");
  assert.deepEqual(b[0], {
    kind: "list",
    items: ["Soy bean meal", "Tapioca flour", "Wheat bran", "Corn", "Fish meal (12%, dried)", "Tallow", "Rice"],
  });
  assert.deepEqual(b[1], { kind: "para", text: "Features single protein." });
});

test("ordinary prose stays a paragraph", () => {
  const text = "Cereals, meat and meat derivatives (min 4.1% Lamb), vegetables origin sub-products, oils and fats, vitamins substances. Hard and crunchy kibble helps to strengthen teeth.";
  assert.equal(textBlocks(text)[0].kind, "para");
});
