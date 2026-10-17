import type { Metadata } from "next";
import { CalendarPlus, CalendarRange, History, Package } from "lucide-react";
import { Panel } from "@/components/admin/dashboard-parts";
import { btnDanger, PageHeader, pageWrap } from "@/components/admin/form-parts";
import { BundleOfferRow, type BundleOfferRowData } from "@/components/admin/bundle-offer-row";
import { PromotionForm, type PromotionRow } from "@/components/admin/promotion-form";
import { requireAdmin } from "@/lib/auth";
import { todayInKL } from "@/lib/kl-time";
import { marginAfterDiscount, MIN_OFFER_MARGIN } from "@/lib/offers";
import { formatMyr } from "@/lib/pricing";
import { isRunning } from "@/lib/promotions";
import { deletePromotion } from "./actions";

export const metadata: Metadata = { title: "Offers & sales", robots: { index: false } };

function fmt(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PromotionsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: brands }, { data: categories }, { data: houseRows }, { data: offerRows }, { data: names }] =
    await Promise.all([
      supabase.from("promotions").select("*").order("starts_on"),
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("sort"),
      supabase
        .from("products")
        .select("id, name, brands!inner(is_house_brand), variants(price, variant_costs(cost_price))")
        .eq("brands.is_house_brand", true)
        .order("name"),
      supabase.from("bundle_offers").select("product_id, discount, approved"),
      supabase.from("products").select("id, name"),
    ]);
  const nameOf = new Map((names ?? []).map((n) => [n.id as string, n.name as string]));
  const offerOf = new Map((offerRows ?? []).map((o) => [o.product_id as string, o]));
  type HouseRow = {
    id: string;
    name: string;
    variants: { price: number; variant_costs: { cost_price: number } | null }[];
  };
  const bundleRows: BundleOfferRowData[] = ((houseRows ?? []) as unknown as HouseRow[]).map((p) => {
    const offer = offerOf.get(p.id);
    const discount = offer ? Number(offer.discount) : 0.1;
    const sizes = p.variants.map((v) => ({
      price: Number(v.price),
      cost: v.variant_costs ? Number(v.variant_costs.cost_price) : null,
    }));
    const priced = sizes.filter((v) => v.price > 0);
    const range = (vals: number[]) =>
      vals.length
        ? Math.min(...vals) === Math.max(...vals)
          ? formatMyr(vals[0])
          : `${formatMyr(Math.min(...vals))}–${formatMyr(Math.max(...vals))}`
        : "—";
    return {
      productId: p.id,
      name: p.name,
      priceLabel: range(priced.map((v) => v.price)),
      costLabel: range(priced.flatMap((v) => (v.cost == null ? [] : [v.cost]))),
      percent: Math.round(discount * 1000) / 10,
      approved: offer?.approved === true,
      marginAfter: marginAfterDiscount(sizes, discount),
    };
  });
  const today = todayInKL();
  const promos = ((data ?? []) as PromotionRow[]).map((p) => ({ ...p, discount: Number(p.discount) }));
  const upcoming = promos.filter((p) => p.ends_on >= today);
  const past = promos.filter((p) => p.ends_on < today);

  return (
    <div className={pageWrap}>
      <PageHeader
        title="Offers & sales"
        description={
          <span className="block max-w-[90ch]">
            Nothing is discounted until you approve it here. Every approval is checked against a{" "}
            {Math.round(MIN_OFFER_MARGIN * 100)}% minimum margin (using your cost prices). Customers always get the
            single best discount (sale, short-dated or bundle), never more than one. Approved sales switch on and off by
            themselves on their dates (Malaysia time); Raya dates follow the moon sighting, so check them each year.
          </span>
        }
      />

      <Panel id="bundles" title="Bundle offers (own brands)" Icon={Package}>
        <div>
          <p className="text-sm text-ink-2">
            Discount on an own-brand product when it&apos;s bought together with a matching product (e.g. Conaseb
            shampoo + Aniamor Skin &amp; Coat Syrup). &ldquo;Margin after&rdquo; is the lowest across its sizes.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-cream/70">
              <tr className="border-b border-line text-left text-xs font-bold text-ink-2">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Bundle discount</th>
                <th className="p-3">Margin after</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bundleRows.map((r) => (
                <BundleOfferRow key={r.productId} row={r} floor={MIN_OFFER_MARGIN} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel id="add-sale" title="Add a holiday sale" Icon={CalendarPlus}>
        <PromotionForm brands={brands ?? []} categories={categories ?? []} />
      </Panel>

      <Panel id="upcoming" title="Holiday sales: running and upcoming" Icon={CalendarRange}>
        {upcoming.length === 0 && <p className="text-sm text-ink-2">Nothing scheduled.</p>}
        {upcoming.map((p) => (
          <details
            key={p.id}
            className="group rounded-xl border border-line bg-ground p-4 open:bg-surface open:ring-1 open:ring-peach"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <strong className="font-bubble font-extrabold text-choc">{p.name}</strong>
              <span className="text-sm text-ink-2">
                {fmt(p.starts_on)} – {fmt(p.ends_on)} · {Math.round(p.discount * 100)}% off
              </span>
              {!p.is_active ? (
                <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-warn-fg">
                  Pending approval
                </span>
              ) : isRunning(p, today) ? (
                <span className="rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-bold text-ok-fg">Running now</span>
              ) : null}
            </summary>
            <div className="mt-4 grid gap-3">
              {p.is_active && (p.excluded_product_ids ?? []).length > 0 && (
                <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-fg">
                  Left out to protect margin (or no cost price):{" "}
                  {(p.excluded_product_ids ?? []).map((id) => nameOf.get(id) ?? "removed product").join(", ")}
                </p>
              )}
              <PromotionForm promo={p} brands={brands ?? []} categories={categories ?? []} />
              <form action={deletePromotion}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className={btnDanger}>
                  Delete this sale
                </button>
              </form>
            </div>
          </details>
        ))}
      </Panel>

      {past.length > 0 && (
        <Panel id="past" title="Past" Icon={History}>
          <ul className="grid gap-1 text-sm text-ink-2">
            {past.map((p) => (
              <li key={p.id}>
                {p.name}: {fmt(p.starts_on)} – {fmt(p.ends_on)}, {Math.round(p.discount * 100)}% off
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
