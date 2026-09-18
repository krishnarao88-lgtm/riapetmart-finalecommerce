import { NextResponse } from "next/server";
import { getLalamoveQuote } from "@/lib/shipping/lalamove";
import { getEasyParcelQuote } from "@/lib/shipping/easyparcel";
import { createClient } from "@/lib/supabase/server";

type ShippingOption = { method: "pickup" | "lalamove" | "easyparcel"; label: string; price: number };

export async function POST(req: Request) {
  const { lines, addressLine, city, postcode, state } = (await req.json()) as {
    lines: { variantId: string; qty: number }[];
    addressLine: string;
    city: string;
    postcode: string;
    state: string;
  };

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
  // TEMP DEBUG: surfaced in the response while wiring up carrier credentials.
  // Remove this field once Lalamove/EasyParcel are confirmed working.
  let debug: string | undefined;

  try {
    if (isSameDayZone && delivery.lalamove_enabled !== false) {
      const quote = await getLalamoveQuote(fullAddress, weightKg);
      if (quote) options.push({ method: "lalamove", label: "Same-day delivery (Lalamove)", price: quote.price });
      else debug = "lalamove: no quote returned";
    } else if (delivery.easyparcel_enabled !== false) {
      const quote = await getEasyParcelQuote(postcode, state, weightKg);
      if (quote) options.push({ method: "easyparcel", label: `Courier — ${quote.courierName}`, price: quote.price });
      else debug = "easyparcel: no quote returned";
    }
  } catch (err) {
    debug = `carrier error: ${err instanceof Error ? err.message : String(err)}`;
  }

  if (delivery.pickup_enabled !== false) {
    options.push({ method: "pickup", label: "Free store pickup (Bukit Beruntung, Rawang)", price: 0 });
  }

  if (options.length === 0) {
    return NextResponse.json({ error: "No delivery option available for this address", debug }, { status: 422 });
  }
  return NextResponse.json({ options, debug });
}
