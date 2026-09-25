"use client";

import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { uploadProductImage } from "@/app/admin/products/actions";
import { nameKeys } from "@/lib/photo-match";
import { shrinkImage } from "@/lib/shrink-image";

export type PhotoTarget = { id: string; name: string; keys: string[]; photos: number };

type Item = { file: File; url: string; productId: string; state: "ready" | "done" | "error"; message?: string };

const MAX_FILES = 60;

export function BulkPhotoUpload({ products }: { products: PhotoTarget[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const urls = useRef<string[]>([]);

  const byKey = new Map(products.flatMap((p) => p.keys.map((k) => [k, p.id] as const)));
  const byId = new Map(products.map((p) => [p.id, p]));

  // Free the preview images when the page closes.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function choose(files: File[]) {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    setError(files.length > MAX_FILES ? `Only the first ${MAX_FILES} photos were added. Upload the rest after.` : null);
    const next = files.slice(0, MAX_FILES).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      productId: nameKeys(file.name).map((k) => byKey.get(k)).find(Boolean) ?? "",
      state: "ready" as const,
    }));
    urls.current = next.map((i) => i.url);
    setItems(next);
  }

  function upload() {
    startTransition(async () => {
      for (const [index, item] of items.entries()) {
        if (item.state === "done" || !item.productId) continue;
        const product = byId.get(item.productId);
        if (!product) continue;
        let next: Partial<Item>;
        try {
          const form = new FormData();
          form.set("product_id", product.id);
          form.set("product_name", product.name);
          form.set("file", await shrinkImage(item.file, { product: true }));
          const result = await uploadProductImage(null, form);
          next = result?.error ? { state: "error", message: result.error } : { state: "done" };
        } catch (err) {
          next = { state: "error", message: err instanceof Error ? err.message : "Upload failed." };
        }
        setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));
      }
      router.refresh();
    });
  }

  const matched = items.filter((i) => i.productId && i.state !== "done").length;
  const done = items.filter((i) => i.state === "done").length;
  const skipped = items.length - matched - done;

  return (
    <div className="grid gap-4">
      <label className="grid cursor-pointer place-items-center gap-2 rounded-[var(--radius-chunk)] border-2 border-dashed border-ink bg-surface p-8 text-center">
        <Upload className="size-8 text-ink-3" aria-hidden />
        <span className="font-semibold">Choose photos, or drop them on the button below</span>
        <span className="max-w-xl text-sm text-ink-2">
          Name each file after the product&apos;s SKU (e.g. RPM-PDF-0133.jpg) or web address (e.g.
          royal-canin-kitten-2-kg.jpg). Add -2, -3 for extra photos of the same product. Anything that doesn&apos;t
          match, you can pick by hand.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={pending}
          className="max-w-full text-sm"
          onChange={(event) => {
            choose([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </label>

      {error && (
        <p role="alert" className="font-semibold text-bad-fg">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-chunk)] border-2 border-ink bg-surface">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b-2 border-line text-left text-xs uppercase tracking-widest text-ink-3">
                  <th className="p-3">Photo</th>
                  <th className="p-3">File</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = byId.get(item.productId);
                  return (
                    <tr key={item.url} className="border-b border-line last:border-0">
                      <td className="p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" className="size-14 rounded-lg border-2 border-line object-cover" />
                      </td>
                      <td className="max-w-48 break-all p-3">{item.file.name}</td>
                      <td className="p-3">
                        <select
                          value={item.productId}
                          disabled={item.state === "done" || pending}
                          onChange={(event) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === index ? { ...it, productId: event.target.value, state: "ready" } : it,
                              ),
                            )
                          }
                          aria-label={`Product for ${item.file.name}`}
                          className={`min-h-10 w-full max-w-sm rounded-xl border-2 bg-ground px-2 ${item.productId ? "border-line" : "border-tangerine"}`}
                        >
                          <option value="">Skip this photo</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {product && product.photos > 0 && item.state === "ready" && (
                          <span className="mt-1 block text-xs text-ink-3">
                            Already has {product.photos} {product.photos === 1 ? "photo" : "photos"}; this one is
                            added after them.
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.state === "done" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-ok-fg">
                            <CheckCircle2 className="size-4" aria-hidden /> Uploaded
                          </span>
                        ) : item.state === "error" ? (
                          <span className="font-semibold text-bad-fg">{item.message}</span>
                        ) : item.productId ? (
                          <span className="font-semibold text-ok-fg">Matched</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-warn-fg">
                            <CircleAlert className="size-4" aria-hidden /> No match, pick one
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={upload}
              disabled={!matched || pending}
              className="btn-chunk bg-grape text-sm text-surface disabled:opacity-50"
            >
              {pending ? "Uploading…" : `Upload ${matched} ${matched === 1 ? "photo" : "photos"}`}
            </button>
            <span className="text-sm text-ink-2" aria-live="polite">
              {done > 0 && `${done} uploaded. `}
              {skipped > 0 && `${skipped} skipped or failed.`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
