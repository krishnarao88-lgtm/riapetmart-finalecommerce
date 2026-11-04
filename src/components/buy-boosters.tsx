import { PackageCheck, Star, Store, TicketPercent, Truck } from "lucide-react";
import { bulkSavings, courierWindow } from "@/lib/buy-boosters";
import { lalamoveDelivery } from "@/lib/shipping/lalamove-rules";
import { createPublicClient } from "@/lib/supabase/public";
import { getWelcomeOffer } from "@/lib/welcome-offer";

/** Real review stars (website + imported marketplace reviews) shown next to the product name. */
export async function RatingLine({ productId }: { productId: string }) {
  const { data } = await createPublicClient()
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "approved");
  const rated = (data ?? []).map((r) => r.rating as number | null).filter((n): n is number => typeof n === "number");
  if (!rated.length) return null;
  const avg = Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;
  return (
    <a href="#product-reviews-heading" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-choc hover:underline">
      <span className="flex text-amber-500" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`size-4 ${i <= Math.round(avg) ? "fill-current" : ""}`} />
        ))}
      </span>
      {avg.toFixed(1)} · {data!.length} review{data!.length === 1 ? "" : "s"}
    </a>
  );
}

/**
 * Under the price, as in high-converting shops: the bulk saving, the welcome offer and when it arrives.
 * Every figure is real — prices, the owner's welcome-offer setting and the delivery cut-offs.
 */
export async function BuyBoosters({ variants }: { variants: { id: string; title: string; price: number }[] }) {
  const offer = await getWelcomeOffer();
  const savings = bulkSavings(variants);
  const best = [...savings].sort((a, b) => b[1] - a[1])[0];
  const bestTitle = best && variants.find((v) => v.id === best[0])?.title;
  const lala = lalamoveDelivery();

  return (
    <div className="grid gap-2">
      {best && bestTitle && (
        <p className="flex w-fit items-center gap-2 rounded-xl bg-ok-bg px-3 py-2 text-sm font-semibold text-ok-fg">
          <PackageCheck className="size-4 shrink-0" aria-hidden />
          Buy bigger, save {best[1]}% per unit with the {bestTitle}
        </p>
      )}
      {offer.enabled && (
        <p className="flex w-fit items-center gap-2 rounded-xl bg-peach/50 px-3 py-2 text-sm font-semibold text-rust">
          <TicketPercent className="size-4 shrink-0" aria-hidden />
          New here? {offer.percent}% off your first order. Your code is in the cart.
        </p>
      )}
      <ol className="grid gap-1.5 rounded-2xl border border-line bg-surface p-3 text-sm text-choc">
        <li className="flex items-start gap-2">
          <Truck className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
          <span>
            <strong>{lala.sameDay ? "Arrives today" : lala.short.replace("Lalamove delivery ", "").replace(/[()]/g, "")}</strong> by
            Lalamove around Rawang, Selangor & KL{lala.sameDay ? " (order by 1pm)" : ""}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <PackageCheck className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
          <span>
            Courier anywhere in Malaysia: usually <strong>{courierWindow()}</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Store className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
          <span>
            <strong>Free pickup</strong> at our Bukit Beruntung shop, Mon–Sat 10am–7pm
          </span>
        </li>
      </ol>
    </div>
  );
}
