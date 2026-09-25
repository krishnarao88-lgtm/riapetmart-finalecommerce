import type { Metadata } from "next";
import { ShrinkImagesForm } from "@/components/shrink-images-form";
import { submitReview } from "../actions";

export const metadata: Metadata = { title: "Write a review" };

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string; product?: string; error?: string }>;
}) {
  const { order, email, product, error } = await searchParams;
  const locked = Boolean(order && email);

  return (
    <div className="mx-auto grid max-w-lg gap-6 px-4 py-10">
      <div className="grid gap-1">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Write a review</h1>
        <p className="text-sm text-choc-2">
          Tell other Malaysian pet parents about your experience with Ria Pet Mart — the good and the honest.
        </p>
      </div>

      {error === "image" && (
        <p className="rounded-xl border-2 border-bad-fg bg-bad-bg px-3 py-2 text-sm text-bad-fg">
          Each photo must be an image under 5MB.
        </p>
      )}
      {error && error !== "image" && (
        <p className="rounded-xl border-2 border-bad-fg bg-bad-bg px-3 py-2 text-sm text-bad-fg">
          Please fill in your name, email, a rating and a short review.
        </p>
      )}

      <ShrinkImagesForm action={submitReview} className="grid gap-4 rounded-2xl card-soft bg-surface p-5">
        {order && <input type="hidden" name="order_id" value={order} />}
        {product && <input type="hidden" name="product_id" value={product} />}

        <label className="grid gap-1 text-sm font-semibold text-choc">
          Your name
          <input
            name="name"
            required
            className="rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-choc">
          Email
          <input
            type="email"
            name="email"
            required
            readOnly={locked}
            defaultValue={email}
            className="rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc read-only:opacity-70"
          />
        </label>

        <fieldset className="grid gap-1 text-sm font-semibold text-choc">
          <legend className="mb-1">Rating</legend>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-1 font-normal">
                <input type="radio" name="rating" value={n} required defaultChecked={n === 5} />
                {n}★
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1 text-sm font-semibold text-choc">
          Your review
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            placeholder="How was the food quality, delivery, or service?"
            className="rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-choc">
          Photos (optional, up to 4)
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="rounded-xl border-2 border-dashed border-choc bg-cream px-3 py-2 text-sm font-normal text-choc"
          />
        </label>

        <button type="submit" className="btn-bubble bg-terracotta text-cream">
          Submit review
        </button>
        <p className="text-xs text-choc-2">
          We read every review before it goes live, so it may take a day or two to appear.
        </p>
      </ShrinkImagesForm>
    </div>
  );
}
