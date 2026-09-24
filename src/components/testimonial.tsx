import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { reviewImageUrl } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  body: string;
  order_id: string | null;
  review_images: { path: string }[];
};

/** Real approved reviews only, up to 6 latest — renders nothing until at least one exists. */
export async function Testimonial() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, body, order_id, review_images(path)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);
  const reviews = (data ?? []) as unknown as Review[];
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-center justify-between">
        <h2 id="reviews-heading" className="font-bubble text-2xl font-extrabold text-choc">
          What pet parents say
        </h2>
        <Link href="/reviews" className="text-sm font-bold text-rust underline">
          See all reviews
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <li key={r.id} className="grid gap-2 rounded-2xl border-2 border-choc bg-peach/40 p-5">
            <Stars rating={r.rating} className="text-terracotta" />
            <p className="line-clamp-4 text-sm text-choc">&ldquo;{r.body}&rdquo;</p>
            {r.review_images.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.review_images.slice(0, 3).map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.path}
                    src={reviewImageUrl(img.path)}
                    alt="Photo submitted with this review"
                    className="size-12 rounded-lg border border-choc/40 object-cover"
                  />
                ))}
              </div>
            )}
            <p className="flex items-center gap-1 text-xs font-bold text-choc-2">
              {r.customer_name}
              {r.order_id && (
                <span className="inline-flex items-center gap-0.5 text-ok-fg">
                  <BadgeCheck className="size-3.5" aria-hidden /> Verified
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
