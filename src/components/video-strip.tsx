"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type StripVideo = { src: string; poster?: string; caption: string; cta: string; href: string };

// Homepage videos (vertical 9:16 MP4s in /public/videos). Empty list = the section doesn't render.
export const HOME_VIDEOS: StripVideo[] = [];

/** One muted, looping clip that only downloads and plays while it's on screen (keeps the homepage fast). */
function Clip({ v }: { v: StripVideo }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduce) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <li className="w-[220px] shrink-0 snap-start sm:w-[240px]">
      <div className="overflow-hidden rounded-3xl card-soft bg-choc">
        <video
          ref={ref}
          src={v.src}
          poster={v.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={v.caption}
          className="aspect-[9/16] w-full object-cover"
        />
      </div>
      <p className="mt-2 text-sm font-semibold text-choc">{v.caption}</p>
      <Link href={v.href} className="text-sm font-bold text-rust underline">
        {v.cta} →
      </Link>
    </li>
  );
}

export function VideoStrip() {
  if (HOME_VIDEOS.length === 0) return null;
  return (
    <section aria-labelledby="video-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <h2 id="video-heading" className="font-bubble text-2xl font-extrabold text-choc">
        See how Ria Pet Mart works
      </h2>
      <ul className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
        {HOME_VIDEOS.map((v) => (
          <Clip key={v.src} v={v} />
        ))}
      </ul>
    </section>
  );
}
