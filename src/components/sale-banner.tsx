import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { getRunningPromotions } from "@/lib/promotions-server";

/** Slim site-wide strip while a holiday sale runs; renders nothing otherwise. */
export async function SaleBanner() {
  const { promos } = await getRunningPromotions();
  const sale = [...promos].sort((a, b) => b.discount - a.discount)[0];
  if (!sale) return null;

  return (
    <Link
      href="/shop?deal=sale"
      className="flex items-center justify-center gap-2 bg-terracotta px-4 py-2 text-center text-sm font-bold text-cream hover:bg-rust"
    >
      <PartyPopper className="size-4 shrink-0 motion-safe:animate-bounce" aria-hidden />
      {sale.banner ?? `${sale.name}: ${Math.round(sale.discount * 100)}% off`}
    </Link>
  );
}
