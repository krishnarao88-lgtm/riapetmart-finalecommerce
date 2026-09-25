import assert from "node:assert/strict";
import { test } from "node:test";
import { renderEmail } from "../src/lib/email-template.ts";

test("renderEmail escapes customer input and keeps a text twin", () => {
  const { html, text } = renderEmail({
    preheader: "p",
    heading: "Hi <Tom>",
    paragraphs: ['Cat "Milo" & co'],
    lines: [{ name: "Food", detail: "2 kg", amount: "RM10.00" }],
    total: "RM10.00",
    cta: { label: "Shop", url: "https://riapetmart.com/shop?a=1&b=2" },
  });
  assert.ok(html.includes("Hi &lt;Tom&gt;"));
  assert.ok(html.includes("Cat &quot;Milo&quot; &amp; co"));
  assert.ok(html.includes("shop?a=1&amp;b=2"));
  assert.ok(!html.includes("<Tom>"));
  assert.ok(text.includes("- Food (2 kg)  RM10.00"));
  assert.ok(text.includes("Total: RM10.00"));
});
