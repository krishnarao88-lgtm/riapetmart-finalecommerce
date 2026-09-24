import { RefreshCw, Truck } from "lucide-react";
import { WelcomeOfferButton } from "@/components/welcome-popup";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

/** Real, live offers only — the welcome code is issued per signup, and free delivery shows only when configured. */
export async function PromoBanner() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "delivery").single();
  const freeDeliveryMin = (data?.value as { free_delivery_min?: number | null } | undefined)?.free_delivery_min ?? null;

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-8 sm:grid-cols-[1.3fr_1fr]">
      <WelcomeOfferButton className="grid content-center gap-2 rounded-3xl border-2 border-choc bg-terracotta p-6 text-left text-cream transition-transform hover:-translate-y-0.5">
        <span className="font-bubble text-2xl font-extrabold">New here? Get 10% off your first order</span>
        <span className="text-sm text-cream/90">
          Sign up with your email for your personal code. <span className="font-bold underline">Get my code</span>
        </span>
      </WelcomeOfferButton>

      <div className="grid gap-3">
        {freeDeliveryMin !== null && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-cream px-4 py-3">
            <Truck className="size-6 shrink-0 text-rust" aria-hidden />
            <span className="grid">
              <span className="text-sm font-bold text-choc">Free delivery</span>
              <span className="text-xs text-choc-2">On orders above {formatMyr(Number(freeDeliveryMin))}</span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-cream px-4 py-3">
          <RefreshCw className="size-6 shrink-0 text-rust" aria-hidden />
          <span className="grid">
            <span className="text-sm font-bold text-choc">Never run out</span>
            <span className="text-xs text-choc-2">We&apos;ll email a restock reminder</span>
          </span>
        </div>
      </div>
    </section>
  );
}
