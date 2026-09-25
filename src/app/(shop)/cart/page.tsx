import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { getWelcomeOffer } from "@/lib/welcome-offer";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const [delivery, offer] = await Promise.all([getDeliverySettings(), getWelcomeOffer()]);
  return (
    <CartView
      freeDeliveryMin={freeDeliveryMin(delivery)}
      freeDeliveryCap={freeDeliveryCap(delivery)}
      pickupEnabled={delivery.pickup_enabled !== false}
      codesStack={offer.stack_with_discounts}
    />
  );
}
