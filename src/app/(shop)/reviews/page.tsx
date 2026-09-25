import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Stars } from "@/components/stars";
import { reviewImageUrl, verifiedLabel } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "What Malaysian pet parents say about Ria Pet Mart — real, moderated customer reviews.",
};

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  body: string;
  created_at: string;
  order_id: string | null;
  source: string;
  review_images: { path: string }[];
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: allRatings }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, customer_name, rating, body, created_at, order_id, source, review_images(path)")
      .eq("status", "approved")
      .neq("body", "")
      .order("created_at", { ascending: false })
      .limit(100),
    // Every approved rating, star-only ones included, so the average isn't cherry-picked.
    supabase.from("reviews").select("rating").eq("status", "approved"),
  ]);
  const reviews = (data ?? []) as unknown as Review[];
  const ratings = (allRatings ?? []).map((r) => r.rating as number);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-bubble text-3xl font-extrabold text-choc">Customer reviews</h1>
          <p className="text-sm text-choc-2">Real reviews from Malaysian pet parents who shop with us.</p>
        </div>
        <Link href="/reviews/new" className="btn-bubble bg-terracotta text-cream">
          Write a review
        </Link>
      </div>

      {ratings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl card-soft bg-peach/40 p-4">
          <span className="font-bubble text-4xl font-extrabold text-choc">{average.toFixed(1)}</span>
          <div className="grid gap-0.5">
            <Stars rating={Math.round(average)} className="text-terracotta" />
            <span className="text-sm text-choc-2">
              from {ratings.length} verified ratings on our website, TikTok Shop and Shopee
            </span>
          </div>
        </div>
      )}

      {submitted && (
        <p className="rounded-xl border-2 border-ok-fg bg-ok-bg px-3 py-2 text-sm text-ok-fg">
          Thanks! Your review is in — it&apos;ll appear here once we&apos;ve read it.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-2xl card-soft bg-surface p-6 text-choc-2">
          No reviews yet — be the first to share your experience.
        </p>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-2xl card-soft bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={r.rating} className="text-terracotta" />
                <span className="text-xs text-choc-2">
                  {new Date(r.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </span>
              </div>
              <p className="text-sm text-choc">{r.body}</p>
              {r.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.review_images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.path}
                      src={reviewImageUrl(img.path)}
                      alt="Photo submitted with this review"
                      className="size-20 rounded-xl card-soft object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="flex items-center gap-1 text-xs font-semibold text-choc-2">
                {r.customer_name}
                {verifiedLabel(r.source, r.order_id) && (
                  <span className="inline-flex items-center gap-0.5 text-ok-fg">
                    <BadgeCheck className="size-3.5" aria-hidden /> {verifiedLabel(r.source, r.order_id)}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
