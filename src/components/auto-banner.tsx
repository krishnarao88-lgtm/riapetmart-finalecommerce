"use client";

import { Tag, Timer, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useNow } from "@/components/deal-strip";
import { formatMyr } from "@/lib/pricing";
import { lalamoveDelivery, SAME_DAY_CUTOFF_HOUR } from "@/lib/shipping/lalamove-rules";

type Props = {
  clearance: { count: number; best: number } | null;
  freeMin: number | null;
  freeCap: number | null;
};
type Slide = { href: string; Icon: typeof Truck; text: string };

/** Minutes left before today's 1pm same-day cut-off (Malaysia time), or null once it has passed. */
function minutesToCutoff(now: number) {
  if (!lalamoveDelivery(new Date(now)).sameDay) return null;
  const my = new Date(now + 8 * 3_600_000);
  return (SAME_DAY_CUTOFF_HOUR - my.getUTCHours()) * 60 - my.getUTCMinutes();
}

function slidesAt(now: number, { clearance, freeMin, freeCap }: Props): Slide[] {
  const mins = minutesToCutoff(now);
  const hours = mins === null ? 0 : Math.floor(mins / 60);
  const slides: Slide[] = [
    {
      href: "/shop",
      Icon: Truck,
      text:
        mins !== null
          ? `Order in ${hours ? `${hours}h ` : ""}${mins % 60}m: delivered today in Selangor & KL, or delivery fee back`
          : `Order now: ${lalamoveDelivery(new Date(now)).short.toLowerCase()} in Selangor & KL`,
    },
  ];
  if (clearance) {
    slides.push({
      href: "/shop?deal=short-dated",
      Icon: Timer,
      text: `${clearance.count} clearance deal${clearance.count === 1 ? "" : "s"}: up to ${Math.round(clearance.best * 100)}% off, best-before soon`,
    });
  }
  if (freeMin) {
    slides.push({
      href: "/shop",
      Icon: Tag,
      text: `Free delivery on orders over ${formatMyr(freeMin)}${freeCap ? ` (up to ${formatMyr(freeCap)} off)` : ""}`,
    });
  }
  return slides;
}

/**
 * Site-wide strip when no holiday sale is running: rotates every 6 seconds through offers that are true
 * right now (same-day countdown, live clearance count, free delivery). Hovering or focusing holds it.
 */
export function AutoBanner(props: Props) {
  const now = useNow(true);
  const [held, setHeld] = useState<number | null>(null);
  if (now === null) return <div className="h-11 bg-choc sm:h-9" aria-hidden />; // holds the space before the clock starts

  const slides = slidesAt(now, props);
  const index = held ?? Math.floor(now / 6000) % slides.length;
  const slide = slides[index % slides.length];
  const hold = () => setHeld(index);
  const release = () => setHeld(null);

  return (
    <Link
      href={slide.href}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
      className="flex h-11 items-center sm:h-9 justify-center gap-2 bg-choc px-4 py-1.5 text-center text-xs font-bold text-cream hover:bg-rust sm:text-sm"
    >
      <slide.Icon className="size-4 shrink-0 text-peach" aria-hidden />
      <span className="line-clamp-2">{slide.text}</span>
    </Link>
  );
}
