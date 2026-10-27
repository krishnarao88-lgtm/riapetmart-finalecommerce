// Product weights are the net contents on the label. Couriers reweigh the real parcel (steel cans, bags, the box)
// and EasyParcel deducts any difference from the balance, so quotes and bookings declare the packed weight.
// ponytail: flat packaging factors; switch to a per-variant gross weight if surcharges still show up.

const CAN_FACTOR = 1.2; // wet food: steel cans, trays and pouches add ~15–25%
const BAG_FACTOR = 1.05; // dry food, treats, bottles
const BOX_GRAMS = 300; // carton + wrap

/** Packed grams for one cart line; unknown weights count as 500g each, as before. */
export function lineGrams(netGrams: number | null, qty: number, category: string | null | undefined): number {
  return (netGrams ?? 500) * qty * (category === "Wet Food" ? CAN_FACTOR : BAG_FACTOR);
}

/** Volumetric grams couriers bill for a line: L×W×H cm / 5000 kg, i.e. mm³ / 5000 g. 0 unless all three sizes are set. */
export function lineVolumetricGrams(
  lengthMm: number | null,
  widthMm: number | null,
  heightMm: number | null,
  qty: number,
): number {
  return lengthMm && widthMm && heightMm ? ((lengthMm * widthMm * heightMm) / 5000) * qty : 0;
}

/** Declared parcel weight in kg: lines + box, rounded up to 100g, never under 0.5kg.
 *  Couriers bill max(actual, volumetric), so a higher volumetric weight wins. */
export function parcelKg(lineGramsTotal: number, volumetricGrams = 0): number {
  return Math.max(0.5, Math.ceil((lineGramsTotal + BOX_GRAMS) / 100) / 10, Math.ceil(volumetricGrams / 100) / 10);
}

/** Lalamove Malaysia limits: motorcycle up to 10kg (40cm box), car up to 40kg. Heavier goes by courier. */
export function lalamoveVehicle(kg: number): "MOTORCYCLE" | "CAR" | null {
  if (kg <= 10) return "MOTORCYCLE";
  if (kg <= 40) return "CAR";
  return null;
}
