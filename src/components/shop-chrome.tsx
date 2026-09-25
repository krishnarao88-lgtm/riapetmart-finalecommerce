import { ActivityToast } from "@/components/activity-toast";
import { AssistantWidget } from "@/components/assistant-widget";
import { CartDrawer } from "@/components/cart-drawer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { SaleBanner } from "@/components/sale-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WelcomePopup } from "@/components/welcome-popup";
import { CartProvider } from "@/lib/cart-context";
import { freeDeliveryCap, freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";
import { getWelcomeOffer } from "@/lib/welcome-offer";

/** Storefront frame: header, footer, cart and shopper helpers. Admin pages have their own frame. */
export async function ShopChrome({ children }: { children: React.ReactNode }) {
  const [delivery, offer] = await Promise.all([getDeliverySettings(), getWelcomeOffer()]);
  return (
    <CartProvider>
      <SaleBanner />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {offer.enabled && <WelcomePopup percent={offer.percent} delaySeconds={offer.delay_seconds} />}
      <FloatingWhatsApp />
      <ActivityToast />
      {process.env.ANTHROPIC_API_KEY && <AssistantWidget />}
      <CartDrawer freeDeliveryMin={freeDeliveryMin(delivery)} freeDeliveryCap={freeDeliveryCap(delivery)} />
    </CartProvider>
  );
}
