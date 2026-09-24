// Browser-only. Phone photos and PNG exports are often 2–8 MB, far over the server-action
// body limit, so photos are resized and re-encoded before they leave the browser.

const MAX_SIDE = 1600;
const QUALITY = 0.85;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Scales a photo down to MAX_SIDE on its longest edge and re-encodes it as WebP (or JPEG). */
export async function shrinkImage(file: File): Promise<File> {
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

  // WebP keeps transparent PNG backgrounds. Browsers that can't encode it get JPEG on white.
  let blob = await toBlob(canvas, "image/webp");
  if (blob?.type !== "image/webp") {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await toBlob(canvas, "image/jpeg");
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
export async function shrinkFormImages(formData: FormData, maxTotalBytes = 3.5 * 1024 * 1024) {
  const keys = new Set<string>();
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) keys.add(key);
  }

  let total = 0;
  for (const key of keys) {
    const values = formData.getAll(key);
    formData.delete(key);
    for (const value of values) {
      const next = value instanceof File && value.size > 0 ? await shrinkImage(value) : value;
      if (next instanceof File) total += next.size;
      formData.append(key, next);
    }
  }

  if (total > maxTotalBytes) {
    throw new Error("Those photos are too big to send together. Upload fewer at a time.");
  }
}
