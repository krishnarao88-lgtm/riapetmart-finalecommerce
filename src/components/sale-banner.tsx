import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { SaleCountdown } from "@/components/sale-countdown";
import { getRunningPromotions, getUpcomingPromotion } from "@/lib/promotions-server";

const pct = (d: number) => `${Math.round(d * 100)}% off`;
const SCOPE: Record<string, string> = { all: "everything", house: "our own brands", brand: "selected brands", category: "selected items" };

/**
 * Site-wide strip for approved holiday sales: counts down to the real end while a sale runs, and to the
 * real start in the week before one begins. Renders nothing otherwise.
 */
export async function SaleBanner() {
  const { promos } = await getRunningPromotions();
  const sale = [...promos].sort((a, b) => b.discount - a.discount)[0];
  const upcoming = sale ? null : await getUpcomingPromotion();
  if (!sale && !upcoming) return null;

  const strip = "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm font-bold";
  if (sale) {
    return (
      <Link href="/shop?deal=sale" className={`${strip} bg-terracotta text-cream hover:bg-rust`}>
        <span className="inline-flex items-center gap-2">
          <PartyPopper className="size-4 shrink-0 motion-safe:animate-bounce" aria-hidden />
          {sale.banner ?? `${sale.name}: ${pct(sale.discount)}`}
        </span>
        <SaleCountdown target={`${sale.ends_on}T23:59:59+08:00`} label="Ends in" />
      </Link>
    );
  }
  return (
    <div className={`${strip} bg-choc text-cream`}>
      <span className="inline-flex items-center gap-2">
        <PartyPopper className="size-4 shrink-0" aria-hidden />
        {upcoming!.name} is coming: {pct(upcoming!.discount)} {SCOPE[upcoming!.scope] ?? "selected items"}
      </span>
      <SaleCountdown target={`${upcoming!.starts_on}T00:00:00+08:00`} label="Starts in" />
    </div>
  );
}
