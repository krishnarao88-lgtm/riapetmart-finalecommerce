import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { getWelcomeOffer } from "@/lib/welcome-offer";
import { getFreeGifts, shortDate } from "@/lib/free-gift";
import { createPublicClient } from "@/lib/supabase/public";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const [delivery, offer, gift] = await Promise.all([
    getDeliverySettings(),
    getWelcomeOffer(),
    getFreeGifts(createPublicClient()).catch(() => null),
  ]);
  const cat = gift?.cat;
  const dog = gift?.dog;
  // The cart doesn't know pet types client-side, so the note states the rule checkout applies.
  const giftNote =
    cat && dog
      ? `FREE gift added to your order (RM0, while stock lasts): an ${cat.label} (best before ${shortDate(cat.bestBefore)}) if your cart has cat items, or a ${dog.label} for dog-only orders.`
      : cat
        ? `FREE ${cat.label} added to your order (RM0, best before ${shortDate(cat.bestBefore)}). While stock lasts.`
        : dog
          ? `FREE ${dog.label} added to dog-food orders (RM0). While stock lasts.`
          : null;
  return (
    <CartView
      freeDeliveryMin={freeDeliveryMin(delivery)}
      freeDeliveryCap={freeDeliveryCap(delivery)}
      pickupEnabled={delivery.pickup_enabled !== false}
      codesStack={offer.stack_with_discounts}
      giftNote={giftNote}
    />
  );
}
