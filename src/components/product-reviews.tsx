import { BadgeCheck, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { verifiedLabel } from "@/lib/reviews";
import { createPublicClient } from "@/lib/supabase/public";

type Review = { id: string; customer_name: string; rating: number | null; body: string; order_id: string | null; source: string };

/** Approved written reviews for one product, from the website and our marketplace stores. Renders nothing if none. */
export async function ProductReviews({ productId }: { productId: string }) {
  const { data, count } = await createPublicClient()
    .from("reviews")
    .select("id, customer_name, rating, body, order_id, source", { count: "exact" })
    .eq("product_id", productId)
    .eq("status", "approved")
    .neq("body", "")
    .order("created_at", { ascending: false })
    .limit(6);
  const reviews = (data ?? []) as Review[];
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="product-reviews-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="product-reviews-heading" className="flex items-center gap-2 font-bubble text-xl font-extrabold text-choc">
          <MessageSquareQuote className="size-5 text-rust" aria-hidden /> What buyers say
          <span className="text-sm font-semibold text-choc-2">({count ?? reviews.length})</span>
        </h2>
        <Link href="/reviews" className="text-sm font-bold text-rust underline">
          All reviews
        </Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <li key={r.id} className="grid content-start gap-2 rounded-2xl card-soft bg-surface p-4">
            <Stars rating={r.rating} className="text-terracotta" />
            <p className="text-sm text-choc">{r.body}</p>
            <p className="flex flex-wrap items-center gap-1 text-xs font-semibold text-choc-2">
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
    </section>
  );
}
