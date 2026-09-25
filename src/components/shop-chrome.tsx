import { ActivityToast } from "@/components/activity-toast";
import { AssistantWidget } from "@/components/assistant-widget";
import { CartDrawer } from "@/components/cart-drawer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { SaleBanner } from "@/components/sale-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WelcomePopup } from "@/components/welcome-popup";
import { CartProvider } from "@/lib/cart-context";
import { freeDeliveryMin, getDeliverySettings } from "@/lib/delivery-settings";

/** Storefront frame: header, footer, cart and shopper helpers. Admin pages have their own frame. */
export async function ShopChrome({ children }: { children: React.ReactNode }) {
  const delivery = await getDeliverySettings();
  return (
    <CartProvider>
      <SaleBanner />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <WelcomePopup />
      <FloatingWhatsApp />
      <ActivityToast />
      {process.env.ANTHROPIC_API_KEY && <AssistantWidget />}
      <CartDrawer freeDeliveryMin={freeDeliveryMin(delivery)} />
    </CartProvider>
  );
}
