import { freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const delivery = await getDeliverySettings();
  return <CartView freeDeliveryMin={freeDeliveryMin(delivery)} pickupEnabled={delivery.pickup_enabled !== false} />;
}
