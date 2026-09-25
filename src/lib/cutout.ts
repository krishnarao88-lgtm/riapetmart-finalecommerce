// Product photo clean-up, shared by every admin photo upload. Pure pixel maths so it runs in the
// browser (and in tests) with no model or paid API: supplier photos are almost always shot on white.

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

const BG_MIN = 232; // every channel at least this bright…
const BG_SPREAD = 18; // …and close to grey, so pale-coloured packaging isn't mistaken for background
const EDGE_MIN = 200; // near-white fringe pixels next to the background get faded, not cut hard

function isBackground(d: Uint8ClampedArray, i: number) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const lo = Math.min(r, g, b);
  return d[i + 3] > 0 && lo >= BG_MIN && Math.max(r, g, b) - lo <= BG_SPREAD;
}

/**
 * Makes a white background transparent by flood-filling from the photo's edges, so white areas
 * inside the product (labels, lids) stay. Leaves photos alone when they aren't on white or are
 * already transparent. Returns whether anything was removed.
 */
export function removeWhiteBackground({ data, width, height }: Pixels): boolean {
  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);

  let white = 0;
  let clear = 0;
  for (const p of border) {
    if (data[p * 4 + 3] < 16) clear++;
    else if (isBackground(data, p * 4)) white++;
  }
  if (clear > border.length / 2 || white < border.length * 0.6) return false;

  const removed = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  for (const p of border) {
    if (!removed[p] && isBackground(data, p * 4)) {
      removed[p] = 1;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
    for (const n of next) {
      if (n < 0 || n >= removed.length || removed[n] || !isBackground(data, n * 4)) continue;
      removed[n] = 1;
      queue[tail++] = n;
    }
  }

  // White packaging touching a white background floods away with it. Keep everything inside the
  // convex outline of the clearly-coloured pixels (label, print, shading); only outside is removed.
  const span = hullSpans(data, width, height);
  for (let p = 0; p < removed.length; p++) {
    const x = p % width;
    const row = span[(p - x) / width];
    if (removed[p] && row && x >= row[0] && x <= row[1]) removed[p] = 0;
  }

  for (let p = 0; p < removed.length; p++) {
    if (removed[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    // Soften the outline: pale pixels touching the removed background fade with their brightness.
    const x = p % width;
    const touches =
      (x > 0 && removed[p - 1]) || (x < width - 1 && removed[p + 1]) || removed[p - width] || removed[p + width];
    const lo = Math.min(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    if (touches && lo >= EDGE_MIN) {
      data[p * 4 + 3] = Math.round((data[p * 4 + 3] * (255 - lo)) / (255 - EDGE_MIN));
    }
  }
  return true;
}

/** Bounding box of the visible (non-transparent) pixels, or null for an empty image. */
export function visibleBounds({ data, width, height }: Pixels) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Per row, the [left, right] span of the convex hull around clearly non-background pixels. */
function hullSpans(d: Uint8ClampedArray, width: number, height: number): ([number, number] | null)[] {
  const pts: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lo = Math.min(d[i], d[i + 1], d[i + 2]);
      if (d[i + 3] > 16 && (lo < 225 || Math.max(d[i], d[i + 1], d[i + 2]) - lo > 30)) {
        if (l < 0) l = x;
        r = x;
      }
    }
    if (l >= 0) pts.push([l, y], [r, y]);
  }
  const spans: ([number, number] | null)[] = new Array(height).fill(null);
  if (pts.length < 3) return spans;

  // Monotone chain convex hull.
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];

  for (let y = 0; y < height; y++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < hull.length; k++) {
      const [x1, y1] = hull[k];
      const [x2, y2] = hull[(k + 1) % hull.length];
      if ((y < Math.min(y1, y2)) || (y > Math.max(y1, y2))) continue;
      const xs = y1 === y2 ? [x1, x2] : [x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)];
      for (const x of xs) {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
    if (lo <= hi) spans[y] = [Math.floor(lo), Math.ceil(hi)];
  }
  return spans;
}
