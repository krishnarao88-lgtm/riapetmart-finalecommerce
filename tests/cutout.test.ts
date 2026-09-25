import assert from "node:assert/strict";
import { test } from "node:test";
import { removeWhiteBackground, visibleBounds } from "../src/lib/cutout.ts";

function image(w: number, h: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}
const alpha = (px: { data: Uint8ClampedArray; width: number }, x: number, y: number) => px.data[(y * px.width + x) * 4 + 3];

test("white background goes, white inside the product stays", () => {
  // 20x20 white photo, red box 5..14, with a white "label" pixel inside the box at (9,9).
  const px = image(20, 20, (x, y) => {
    const inBox = x >= 5 && x <= 14 && y >= 5 && y <= 14;
    if (inBox && !(x === 9 && y === 9)) return [200, 30, 30, 255];
    return [255, 255, 255, 255];
  });
  assert.equal(removeWhiteBackground(px), true);
  assert.equal(alpha(px, 0, 0), 0);
  assert.equal(alpha(px, 4, 10), 0);
  assert.equal(alpha(px, 10, 10), 255);
  assert.equal(alpha(px, 9, 9), 255);
  assert.deepEqual(visibleBounds(px), { x: 5, y: 5, w: 10, h: 10 });
});

test("photos not on white are left alone", () => {
  const px = image(10, 10, () => [120, 90, 60, 255]);
  assert.equal(removeWhiteBackground(px), false);
  assert.equal(alpha(px, 0, 0), 255);
});

test("already-transparent cutouts are left alone", () => {
  const px = image(10, 10, (x) => (x > 3 && x < 6 ? [200, 30, 30, 255] : [0, 0, 0, 0]));
  assert.equal(removeWhiteBackground(px), false);
});

test("a hairline detached from the product doesn't widen the frame", () => {
  const px = image(40, 40, (x, y) => {
    if (y === 2 && x >= 5 && x <= 34) return [120, 120, 120, 255]; // stray line
    if (y >= 8 && y <= 35 && x >= 10 && x <= 29) return [200, 30, 30, 255]; // product
    return [0, 0, 0, 0];
  });
  assert.deepEqual(visibleBounds(px), { x: 10, y: 8, w: 20, h: 28 });
});
