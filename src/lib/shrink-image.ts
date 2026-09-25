// Browser-only. Phone photos and PNG exports are often 2–8 MB, far over the server-action
// body limit, so photos are resized and re-encoded before they leave the browser.

import { removeWhiteBackground, visibleBounds } from "./cutout";

const MAX_SIDE = 1600;
const PRODUCT_SIDE = 1000; // product photos: square, product centred with 12% breathing room
const PRODUCT_FILL = 0.76;
const QUALITY = 0.85;
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Cuts a product out of a white background and centres it on a transparent square. */
function productFrame(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d", { willReadFrequently: true })!;
  const px = ctx.getImageData(0, 0, source.width, source.height);
  const cut = removeWhiteBackground(px);
  const hasClear = cut || px.data.some((v, i) => i % 4 === 3 && v < 16);
  if (!hasClear) return source; // a lifestyle photo, not a packshot: keep it as shot
  ctx.putImageData(px, 0, 0);
  const box = visibleBounds(px);
  if (!box) return source;

  const out = document.createElement("canvas");
  out.width = out.height = PRODUCT_SIDE;
  const scale = (PRODUCT_SIDE * PRODUCT_FILL) / Math.max(box.w, box.h);
  const w = box.w * scale;
  const h = box.h * scale;
  out.getContext("2d")!.drawImage(source, box.x, box.y, box.w, box.h, (PRODUCT_SIDE - w) / 2, (PRODUCT_SIDE - h) / 2, w, h);
  return out;
}

/**
 * Scales a photo down to MAX_SIDE on its longest edge and re-encodes it as WebP (or JPEG).
 * `product: true` also removes a white background and frames the product on a square.
 */
export async function shrinkImage(file: File, { product = false } = {}): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${file.name} couldn't be read as a photo. Save it as JPG or PNG and try again.`);
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare photos for upload.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const final = product ? productFrame(canvas) : canvas;
  const finalCtx = final.getContext("2d")!;

  // WebP keeps transparent PNG backgrounds. Browsers that can't encode it get JPEG on white.
  let blob = await toBlob(final, "image/webp");
  if (blob?.type !== "image/webp") {
    finalCtx.globalCompositeOperation = "destination-over";
    finalCtx.fillStyle = "#ffffff";
    finalCtx.fillRect(0, 0, final.width, final.height);
    blob = await toBlob(final, "image/jpeg");
  }
  if (!blob) throw new Error(`${file.name} couldn't be prepared for upload.`);

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]*$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

/**
 * Shrinks every photo in a form's data in place. Throws a message fit to show the
 * user when a photo can't be read or the batch is still too big to send at once.
 */
export async function shrinkFormImages(formData: FormData, options: { product?: boolean } = {}) {
  const keys = new Set<string>();
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) keys.add(key);
  }

  let total = 0;
  for (const key of keys) {
    const values = formData.getAll(key);
    formData.delete(key);
    for (const value of values) {
      const next = value instanceof File && value.size > 0 ? await shrinkImage(value, options) : value;
      if (next instanceof File) total += next.size;
      formData.append(key, next);
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    throw new Error("Those photos are too big to send together. Upload fewer at a time.");
  }
}
