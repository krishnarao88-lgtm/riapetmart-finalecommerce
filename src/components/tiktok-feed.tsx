import { getLatestTikTokVideos } from "@/lib/tiktok";

/** Latest real videos from the connected TikTok account — renders nothing until connected. */
export async function TikTokFeed() {
  const videos = await getLatestTikTokVideos(6).catch(() => []);
  if (videos.length === 0) return null;

  return (
    <section aria-labelledby="tiktok-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <h2 id="tiktok-heading" className="font-bubble text-2xl font-extrabold text-choc">
        Follow us on TikTok
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {videos.map((v) => (
          <li key={v.id}>
            <a
              href={v.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-2xl card-soft transition-transform hover:-translate-y-0.5"
            >
              <div className="aspect-[9/16] w-full bg-peach/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.cover_image_url}
                  alt={v.title || "Ria Pet Mart TikTok video"}
                  className="size-full object-cover"
                />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
