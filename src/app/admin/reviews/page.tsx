import { Star, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { supabaseUrl } from "@/lib/site";
import { deleteReview, moderateReview } from "../actions";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

const reviewImageUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/review-images/${path}`;

type Review = {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  order_id: string | null;
  review_images: { path: string }[];
};

const statusStyle: Record<Review["status"], string> = {
  pending: "bg-warn-bg text-warn-fg",
  approved: "bg-ok-bg text-ok-fg",
  rejected: "bg-bad-bg text-bad-fg",
};

export default async function AdminReviewsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("reviews")
    .select("id, customer_name, customer_email, rating, body, status, created_at, order_id, review_images(path)")
    .order("created_at", { ascending: false });
  const reviews = (data ?? []) as unknown as Review[];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <AdminNav current="/admin/reviews" />
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Reviews</h1>
        <p className="text-ink-2">Approve reviews to publish them on the storefront. Never edit or invent review text.</p>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">No reviews yet.</p>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-grape">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4" fill={i < r.rating ? "currentColor" : "none"} aria-hidden />
                  ))}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[r.status]}`}>{r.status}</span>
              </div>
              <p className="text-sm">{r.body}</p>
              {r.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.review_images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.path}
                      src={reviewImageUrl(img.path)}
                      alt="Photo submitted with this review"
                      className="size-20 rounded-xl border-2 border-line object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs text-ink-2">
                {r.customer_name} · {r.customer_email} · {new Date(r.created_at).toLocaleDateString("en-MY")}
                {r.order_id && " · Verified purchase"}
              </p>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && (
                  <>
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className="min-h-9 rounded-full bg-ok-bg px-3 text-sm font-semibold text-ok-fg">
                        Approve
                      </button>
                    </form>
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="min-h-9 rounded-full bg-bad-bg px-3 text-sm font-semibold text-bad-fg">
                        Reject
                      </button>
                    </form>
                  </>
                )}
                <form action={deleteReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="flex min-h-9 items-center gap-1 rounded-full border-2 border-bad-fg px-3 text-sm font-semibold text-bad-fg"
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
