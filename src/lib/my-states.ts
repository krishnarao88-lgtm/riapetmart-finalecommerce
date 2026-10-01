// ISO 3166-2:MY subdivision codes, keyed by the state names used across the site.
export const MY_STATE_CODES: Record<string, string> = {
  Johor: "MY-01",
  Kedah: "MY-02",
  Kelantan: "MY-03",
  Melaka: "MY-04",
  "Negeri Sembilan": "MY-05",
  Pahang: "MY-06",
  "Pulau Pinang": "MY-07",
  Penang: "MY-07",
  Perak: "MY-08",
  Perlis: "MY-09",
  Selangor: "MY-10",
  Terengganu: "MY-11",
  Sabah: "MY-12",
  Sarawak: "MY-13",
  "Kuala Lumpur": "MY-14",
  Labuan: "MY-15",
  Putrajaya: "MY-16",
};

export const MY_STATES = Object.keys(MY_STATE_CODES).filter((s) => s !== "Penang");

// Pos Malaysia postcode ranges (first two digits) → state, so checkout can fill the state in for the shopper.
// The 63–68 block is mostly Selangor (Cyberjaya, Sepang, Ampang, Batu Caves); KL addresses there can still be picked by hand.
const POSTCODE_STATES: [number, number, string][] = [
  [1, 2, "Perlis"],
  [5, 9, "Kedah"],
  [10, 14, "Pulau Pinang"],
  [15, 18, "Kelantan"],
  [20, 24, "Terengganu"],
  [25, 28, "Pahang"],
  [30, 36, "Perak"],
  [39, 39, "Pahang"],
  [40, 48, "Selangor"],
  [49, 49, "Pahang"],
  [50, 60, "Kuala Lumpur"],
  [62, 62, "Putrajaya"],
  [63, 68, "Selangor"],
  [69, 69, "Pahang"],
  [70, 73, "Negeri Sembilan"],
  [75, 78, "Melaka"],
  [79, 86, "Johor"],
  [87, 87, "Labuan"],
  [88, 91, "Sabah"],
  [93, 98, "Sarawak"],
];

/** The state a 5-digit Malaysian postcode belongs to, or null if it isn't a known range. */
export function stateForPostcode(postcode: string): string | null {
  if (!/^\d{5}$/.test(postcode)) return null;
  const prefix = Number(postcode.slice(0, 2));
  return POSTCODE_STATES.find(([from, to]) => prefix >= from && prefix <= to)?.[2] ?? null;
}
