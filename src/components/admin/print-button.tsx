"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-chunk bg-tangerine text-sm">
      <Printer className="size-4" aria-hidden />
      Print
    </button>
  );
}
