"use client";

import { Trash2, Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteProductImage, uploadProductImage } from "@/app/admin/products/actions";
import { shrinkFormImages } from "@/lib/shrink-image";

export type ProductImage = { id: string; path: string; alt: string };

const MAX_FILES = 6;

// Pending covers the in-browser resize too, not just the upload itself.
function UploadButton({ uploading }: { uploading: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || uploading;
  return (
    <button type="submit" disabled={busy} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
      <Upload className="size-4" aria-hidden />
      {busy ? "Uploading…" : "Upload photos"}
    </button>
  );
}

export function ProductImages({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: ProductImage[];
}) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadProductImage, null);
  const [deleteState, deleteAction] = useActionState(deleteProductImage, null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-3">
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image) => (
            <li key={image.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.path}
                alt={image.alt}
                className="size-24 rounded-xl border-2 border-line object-cover"
              />
              <form action={deleteAction} className="absolute -right-2 -top-2">
                <input type="hidden" name="product_id" value={productId} />
                <input type="hidden" name="image_id" value={image.id} />
                <input type="hidden" name="image_path" value={image.path} />
                <button
                  type="submit"
                  className="grid size-7 place-items-center rounded-full bg-bad-bg text-bad-fg shadow"
                  aria-label={`Remove image ${image.alt}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          setPrepareError(null);
          if (formData.getAll("file").length > MAX_FILES) {
            setPrepareError(`Choose up to ${MAX_FILES} photos at a time.`);
            return;
          }
          try {
            await shrinkFormImages(formData);
          } catch (err) {
            setPrepareError(err instanceof Error ? err.message : "Couldn't prepare that photo. Try another one.");
            return;
          }
          uploadAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="product_name" value={productName} />
        <input type="file" name="file" accept="image/*" multiple required className="text-sm" />
        <UploadButton uploading={uploading} />
        {uploadState?.ok && <span className="text-sm font-semibold text-ok-fg">{uploadState.ok}</span>}
        {uploadState?.error && <span className="text-sm font-semibold text-bad-fg">{uploadState.error}</span>}
        {prepareError && <span className="text-sm font-semibold text-bad-fg">{prepareError}</span>}
        {deleteState?.error && <span className="text-sm font-semibold text-bad-fg">{deleteState.error}</span>}
      </form>
    </div>
  );
}
