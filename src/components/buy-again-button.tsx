"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useCart, type CartLine } from "@/lib/cart-context";

export function BuyAgainButton({ lines, skipped }: { lines: CartLine[]; skipped: string[] }) {
  const { add, openCart } = useCart();
  const [done, setDone] = useState(false);

  return (
    <div className="grid justify-items-start gap-1">
      <button
        type="button"
        disabled={lines.length === 0}
        onClick={() => {
          for (const { qty, ...line } of lines) add(line, qty);
          setDone(true);
          openCart();
        }}
        className="btn-bubble bg-terracotta px-4 py-2 text-sm text-cream disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCcw className="size-4" aria-hidden />
        {lines.length === 0 ? "No longer available" : done ? "Added to cart" : "Buy again"}
      </button>
      {skipped.length > 0 && (
        <p className="text-xs text-choc-2">
          {lines.length === 0 ? "None of these items can be ordered right now." : `Not available right now, so not added: ${skipped.join(", ")}.`}
        </p>
      )}
    </div>
  );
}
