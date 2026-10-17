import { BadgeCheck, Check, Clock, MessageSquareQuote, Trash2, X } from "lucide-react";
import type { Metadata } from "next";
import { ImportReviews } from "@/components/admin/import-reviews";
import { actionBtn, CountTile, EmptyState, PageHeader, Pill, TONE } from "@/components/admin/list-parts";
import { requireAdmin } from "@/lib/auth";
import { Stars } from "@/components/stars";
import { reviewImageUrl } from "@/lib/reviews";
import { deleteReview, moderateReview } from "../actions";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

type Review = {
  id: string;
  customer_name: string;
  source: "website" | "tiktok" | "shopee";
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  order_id: string | null;
  review_images: { path: string }[];
};

const SOURCE_LABEL = { website: "Website", tiktok: "TikTok Shop", shopee: "Shopee" } as const;

const statusTone = { pending: "warn", approved: "ok", rejected: "bad" } as const satisfies Record<Review["status"], keyof typeof TONE>;

export default async function AdminReviewsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: emailRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, customer_name, rating, body, status, created_at, order_id, source, review_images(path)")
      .order("created_at", { ascending: false }),
    supabase.rpc("admin_review_emails"),
  ]);
  const all = (data ?? []) as unknown as Review[];
  const emails = new Map(((emailRows ?? []) as { id: string; customer_email: string | null }[]).map((e) => [e.id, e.customer_email]));
  // Star-only marketplace ratings count toward the average but have nothing to moderate.
  const reviews = all.filter((r) => r.source === "website" || r.body.trim());
  const bySource = (s: Review["source"]) => all.filter((r) => r.source === s).length;
  const count = (s: Review["status"]) => reviews.filter((r) => r.status === s).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <PageHeader title="Reviews" sub="Approve reviews to publish them on the storefront. Never edit or invent review text." />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CountTile label="Waiting for you" value={count("pending")} note="Pending approval" Icon={Clock} chip={TONE.warn} />
        <CountTile label="Approved" value={count("approved")} note="Live on the storefront" Icon={Check} chip={TONE.ok} />
        <CountTile label="Rejected" value={count("rejected")} note="Hidden from customers" Icon={X} chip={TONE.bad} />
      </ul>

      <ImportReviews />
      <p className="text-sm text-ink-2">
        On file: {bySource("website")} from this website, {bySource("tiktok")} from TikTok Shop, {bySource("shopee")} from
        Shopee. Star-only ratings are counted in the average but not listed below.
      </p>

      {reviews.length === 0 ? (
        <EmptyState Icon={MessageSquareQuote}>No reviews yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} className="text-terracotta-deep" />
                  <span className="text-sm font-bold tabular-nums text-choc">{r.rating}/5</span>
                </div>
                <Pill tone={statusTone[r.status]}>{r.status}</Pill>
              </div>
              <p className="text-sm leading-relaxed text-choc">{r.body}</p>
              {r.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.review_images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.path}
                      src={reviewImageUrl(img.path)}
                      alt="Photo submitted with this review"
                      className="size-20 rounded-xl border border-line object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                <span className="font-semibold text-choc">{r.customer_name}</span>
                {emails.get(r.id) && <span className="break-all">{emails.get(r.id)}</span>}
                <span>{new Date(r.created_at).toLocaleDateString("en-MY")}</span>
                {r.source !== "website" && <Pill tone="muted">{SOURCE_LABEL[r.source]}</Pill>}
                {r.order_id && <Pill tone="ok"><BadgeCheck className="size-3.5" aria-hidden />Verified purchase</Pill>}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {r.status === "pending" && (
                  <>
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit" className={actionBtn.yes}>
                        <Check className="size-4" aria-hidden /> Approve
                      </button>
                    </form>
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className={actionBtn.no}>
                        <X className="size-4" aria-hidden /> Reject
                      </button>
                    </form>
                  </>
                )}
                <form action={deleteReview} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={actionBtn.no}>
                    <Trash2 className="size-4" aria-hidden /> Delete
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
