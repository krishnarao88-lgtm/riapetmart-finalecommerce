// Pairs products by the care need they serve (skin, joints, urinary…), read from each product's name
// and highlight chips. Drives "Complete the care" suggestions and the own-brand bundle discount.

const NEEDS: [string, RegExp][] = [
  ["skin", /skin|coat|\bfur\b|fung|dandruff|hair loss|shedding|allerg|itch|mange|wound|derm/],
  ["joint", /joint|\bbones?\b|\bhip\b|mobility|glucosamine|ortho|arthrit/],
  ["urinary", /urinary|\buti\b|crystal|bladder|uteri/],
  ["kidney", /kidney|renal|nephro/],
  ["digestion", /digest|\bgut\b|probiotic|prebiotic|diarrh|stool|hairball|tummy/],
  ["liver", /liver|hepat|milk thistle|detox/],
  ["immunity", /immun|wellness|herbal|vitality/],
  ["dental", /dental|teeth|\bgums?\b|breath|tartar|plaque/],
  ["hydration", /electrolyte|hydrat/],
  ["respiratory", /kennel cough|cough|\bcold\b|fever|bronch/],
  ["blood", /platelet|anaemia|anemia|bone marrow/],
  ["parvo", /parvo/],
  ["brain", /brain|cognitive|nerve|neuro|behaviou?r/],
];

export type CareProduct = {
  id: string;
  name: string;
  highlights: string[] | null;
  pet_type: string;
  house: boolean;
};

export function careNeeds(p: Pick<CareProduct, "name" | "highlights">): Set<string> {
  const text = [p.name, ...(p.highlights ?? [])].join(" ").toLowerCase();
  return new Set(NEEDS.filter(([, re]) => re.test(text)).map(([need]) => need));
}

/** A dog product pairs with dog or dog-and-cat products, and so on. Small pets only pair with small pets. */
export function petsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a === "small_pet" || b === "small_pet") return false;
  return a === "dog_cat" || b === "dog_cat";
}

function shareNeed(a: CareProduct, b: CareProduct): number {
  const na = careNeeds(a);
  return [...careNeeds(b)].filter((n) => na.has(n)).length;
}

/**
 * Own-brand products in the cart that earn the bundle discount: each needs a different,
 * non-own-brand product in the same cart serving the same need for the same pet.
 */
export function bundleEligible(cart: CareProduct[]): Set<string> {
  const others = cart.filter((p) => !p.house);
  return new Set(
    cart
      .filter((p) => p.house && others.some((o) => o.id !== p.id && petsMatch(o.pet_type, p.pet_type) && shareNeed(o, p) > 0))
      .map((p) => p.id),
  );
}

// Plain food and treats name no health need, so they pair with the everyday care for that pet instead.
// Only for suggestions: the bundle discount still needs a real shared need (bundleEligible).
const EVERYDAY: Record<string, string[]> = {
  cat: ["urinary", "skin", "digestion"],
  dog: ["skin", "joint", "dental"],
  dog_cat: ["skin", "digestion"],
};

function suggestionNeeds(p: CareProduct): Set<string> {
  const needs = careNeeds(p);
  return needs.size ? needs : new Set(EVERYDAY[p.pet_type] ?? []);
}

/** Own-brand products that serve the same needs as `forProducts`, best match first (exact pet preferred). */
export function suggestHouse<T extends CareProduct>(forProducts: CareProduct[], house: T[], limit = 3): T[] {
  const taken = new Set(forProducts.map((p) => p.id));
  return house
    .filter((h) => !taken.has(h.id))
    .map((h) => {
      const hNeeds = careNeeds(h);
      const score = forProducts.reduce((s, p) => {
        if (!petsMatch(p.pet_type, h.pet_type)) return s;
        const shared = [...suggestionNeeds(p)].filter((n) => hNeeds.has(n)).length;
        return shared ? s + shared * 2 + (p.pet_type === h.pet_type ? 1 : 0) : s;
      }, 0);
      return { h, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.h.name.localeCompare(b.h.name))
    .slice(0, limit)
    .map((x) => x.h);
}

/** Shopper-facing names for the needs the homepage "Shop by need" tiles link to (/shop?need=…). */
export const NEED_LABELS: Record<string, string> = {
  skin: "Skin & coat",
  joint: "Joints & mobility",
  urinary: "Urinary care",
  kidney: "Kidney care",
  digestion: "Digestion & gut",
  liver: "Liver care",
  immunity: "Immunity",
  dental: "Teeth & gums",
  hydration: "Hydration",
};
