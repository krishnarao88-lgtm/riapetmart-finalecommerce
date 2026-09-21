import { NextResponse } from "next/server";
import { getLalamoveQuote } from "@/lib/shipping/lalamove";
import { getEasyParcelQuote } from "@/lib/shipping/easyparcel";
import { createClient } from "@/lib/supabase/server";

type ShippingOption = { method: "pickup" | "lalamove" | "easyparcel"; label: string; price: number };

const FREE_SHIPPING_THRESHOLD = 150;

export async function POST(req: Request) {
  const { lines, addressLine, city, postcode, state, subtotal } = (await req.json()) as {
    lines: { variantId: string; qty: number }[];
    addressLine: string;
    city: string;
    postcode: string;
    state: string;
    subtotal?: number;
  };
  const freeDelivery = (subtotal ?? 0) >= FREE_SHIPPING_THRESHOLD;

  if (!addressLine || !postcode || !state) {
    return NextResponse.json({ error: "Missing delivery address" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: variants }, { data: settingsRow }] = await Promise.all([
    supabase.from("variants").select("id, weight_grams").in("id", lines.map((l) => l.variantId)),
    supabase.from("settings").select("value").eq("key", "delivery").single(),
  ]);

  const qtyByVariant = new Map(lines.map((l) => [l.variantId, l.qty]));
  const totalGrams = (variants ?? []).reduce(
    (sum, v) => sum + (v.weight_grams ?? 500) * (qtyByVariant.get(v.id) ?? 1),
    0,
  );
  const weightKg = Math.max(0.5, totalGrams / 1000);

  const delivery = (settingsRow?.value ?? {}) as {
    pickup_enabled?: boolean;
    same_day_states?: string[];
    lalamove_enabled?: boolean;
    easyparcel_enabled?: boolean;
  };

  const options: ShippingOption[] = [];
  const isSameDayZone = delivery.same_day_states?.includes(state) ?? false;
  const fullAddress = `${addressLine}, ${city}, ${postcode} ${state}, Malaysia`;

  try {
    if (isSameDayZone && delivery.lalamove_enabled !== false) {
      const quote = await getLalamoveQuote(fullAddress, weightKg);
      if (quote) {
        options.push({
          method: "lalamove",
          label: freeDelivery ? "Same-day delivery (Lalamove) — free over RM150" : "Same-day delivery (Lalamove)",
          price: freeDelivery ? 0 : quote.price,
        });
      }
    } else if (delivery.easyparcel_enabled !== false) {
      const quote = await getEasyParcelQuote(postcode, state, weightKg);
      if (quote) {
        options.push({
          method: "easyparcel",
          label: freeDelivery ? `Courier — ${quote.courierName} — free over RM150` : `Courier — ${quote.courierName}`,
          price: freeDelivery ? 0 : quote.price,
        });
      }
    }
  } catch (err) {
    console.error("Shipping quote failed:", err);
  }

  if (delivery.pickup_enabled !== false) {
    options.push({ method: "pickup", label: "Free store pickup (Bukit Beruntung, Rawang)", price: 0 });
  }

  if (options.length === 0) {
    return NextResponse.json({ error: "No delivery option available for this address" }, { status: 422 });
  }
  return NextResponse.json({ options });
}
