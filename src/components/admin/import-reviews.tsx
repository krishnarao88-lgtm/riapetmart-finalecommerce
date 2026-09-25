"use client";

import { useActionState } from "react";
import { importMarketplaceReviews } from "@/app/admin/reviews/actions";

export function ImportReviews() {
  const [state, action, pending] = useActionState(importMarketplaceReviews, null);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      <div className="grid gap-1">
        <h2 className="font-bold">Import marketplace reviews</h2>
        <p className="text-sm text-ink-2">
          Upload the review export from TikTok Shop (Products → Product ratings → Export) or Shopee (Review
          Management → download icon). They go live as verified marketplace purchases. Usernames are partly hidden,
          and uploading the same file again won&apos;t create duplicates.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select name="source" className="min-h-11 rounded-xl border-2 border-line bg-ground px-3" defaultValue="tiktok">
          <option value="tiktok">TikTok Shop</option>
          <option value="shopee">Shopee</option>
        </select>
        <input name="file" type="file" accept=".csv,.xlsx" required className="min-w-0 text-sm" />
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      {state?.ok && <p className="text-sm font-semibold text-ok-fg">{state.ok}</p>}
      {state?.error && <p className="text-sm font-semibold text-bad-fg">{state.error}</p>}
    </form>
  );
}
