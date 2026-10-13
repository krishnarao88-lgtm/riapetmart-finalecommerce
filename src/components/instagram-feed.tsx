import { Play } from "lucide-react";
import { InstagramEmbeds } from "@/components/instagram-embeds";
import { getLatestInstagramPosts } from "@/lib/instagram";
import { site } from "@/lib/site";

// Latest posts on @riapetmart_express (13 Oct 2026). Swap these links to feature different posts or new Reels.
const FEATURED_POSTS = [
  "https://www.instagram.com/reel/DeCbuSnz60t/",
  "https://www.instagram.com/p/DcrwAx4EXH7/",
  "https://www.instagram.com/p/Dcn_rFelVpd/",
  "https://www.instagram.com/p/DcnPj5TEUPa/",
  "https://www.instagram.com/p/DckxsWlFR2s/",
];

/** Latest real posts and Reels from the connected Instagram account. Renders nothing until connected. */
export async function InstagramFeed() {
  const posts = (await getLatestInstagramPosts(6).catch(() => [])).filter((p) => p.thumbnail_url ?? p.media_url);
  if (posts.length === 0) {
    // Not connected to the Instagram API: show the latest 5 posts through Instagram's own embed instead.
    return (
      <section aria-labelledby="instagram-heading" className="mx-auto max-w-6xl px-4 pt-10">
        <h2 id="instagram-heading" className="font-bubble text-2xl font-extrabold text-choc">
          Follow us on Instagram{" "}
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="text-base text-rust underline">
            @riapetmart_express
          </a>
        </h2>
        <InstagramEmbeds urls={FEATURED_POSTS} />
      </section>
    );
  }

  return (
    <section aria-labelledby="instagram-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <h2 id="instagram-heading" className="font-bubble text-2xl font-extrabold text-choc">
        Follow us on Instagram
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
        {posts.map((p) => (
          <li key={p.id}>
            <a
              href={p.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl card-soft transition-transform hover:-translate-y-0.5"
            >
              <div className="aspect-square w-full bg-peach/40">
                {/* Instagram's CDN links expire, so they're loaded as-is rather than through the image optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.media_type === "VIDEO" ? (p.thumbnail_url ?? p.media_url) : p.media_url}
                  alt={p.caption?.slice(0, 120) || "Ria Pet Mart on Instagram"}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
              {p.media_type === "VIDEO" && (
                <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-choc/70 text-cream">
                  <Play className="size-4 fill-current" aria-hidden />
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
