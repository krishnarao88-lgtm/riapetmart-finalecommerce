"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

/**
 * Horizontal shelf for product cards: swipe with snap on phones, arrow buttons on larger screens.
 * Replaces fixed 4-up grids so a row never leaves orphaned cards and a big empty gap.
 */
export function ProductRail({ label, children }: { label: string; children: React.ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => list.current?.scrollBy({ left: dir * list.current.clientWidth * 0.9, behavior: "smooth" });
  const arrow =
    "absolute top-1/3 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border-2 border-choc bg-cream text-choc shadow-[2px_2px_0_0_var(--color-choc)] transition active:scale-95 sm:grid";
  return (
    <div className="relative mt-4">
      <ul
        ref={list}
        aria-label={label}
        className="grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] sm:auto-cols-[44%] lg:auto-cols-[23.6%]"
      >
        {children}
      </ul>
      <button type="button" onClick={() => move(-1)} aria-label={`Scroll ${label} back`} className={`${arrow} -left-4`}>
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button type="button" onClick={() => move(1)} aria-label={`Scroll ${label} forward`} className={`${arrow} -right-4`}>
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
