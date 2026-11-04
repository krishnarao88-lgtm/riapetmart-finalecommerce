import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { getWelcomeOffer } from "@/lib/welcome-offer";
import { getFreeGift, shortDate } from "@/lib/free-gift";
import { createPublicClient } from "@/lib/supabase/public";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const [delivery, offer, gift] = await Promise.all([
    getDeliverySettings(),
    getWelcomeOffer(),
    getFreeGift(createPublicClient()).catch(() => null),
  ]);
  return (
    <CartView
      freeDeliveryMin={freeDeliveryMin(delivery)}
      freeDeliveryCap={freeDeliveryCap(delivery)}
      pickupEnabled={delivery.pickup_enabled !== false}
      codesStack={offer.stack_with_discounts}
      gift={gift && { label: gift.label, bestBefore: shortDate(gift.bestBefore) }}
    />
  );
}
