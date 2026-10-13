"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * Instagram's official post embeds (real post, caption and play button), for when the Instagram API isn't connected.
 * embed.js loads only once the section scrolls into view, so it costs nothing on first paint.
 */
export function InstagramEmbeds({ urls }: { urls: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (window.instgrm) return window.instgrm.Embeds.process();
        const s = document.createElement("script");
        s.src = "https://www.instagram.com/embed.js";
        s.async = true;
        document.body.appendChild(s);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
      {urls.map((url) => (
        <div key={url} className="w-[326px] shrink-0 snap-start">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{ margin: 0, minWidth: 326, width: "100%" }}
          >
            <a href={url} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm font-semibold text-rust underline">
              View this post on Instagram
            </a>
          </blockquote>
        </div>
      ))}
    </div>
  );
}
