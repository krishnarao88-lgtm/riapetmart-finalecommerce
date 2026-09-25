"use client";

import { useRef } from "react";

/**
 * Sets --mx / --my (-1..1) from the pointer position so hero layers can drift at different depths.
 * Writes CSS variables directly (no React state), throttled to one update per frame.
 */
export function HeroParallax({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const set = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty("--mx", x.toFixed(3));
      ref.current?.style.setProperty("--my", y.toFixed(3));
    });
  };
  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => set(0, 0)}
    >
      {children}
    </div>
  );
}
