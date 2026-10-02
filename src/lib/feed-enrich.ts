import { titleCase } from "./seo.ts";

// Google Shopping matches searches like "dog wet food 415g" against the title, so the feed title carries
// pet + food type when the product name doesn't already say it. The website keeps the plain product name.

const PET_WORD: Record<string, { word: string; already: RegExp }> = {
  dog: { word: "Dog", already: /\b(dog|puppy|puppies)s?\b/i },
  cat: { word: "Cat", already: /\b(cat|kitten)s?\b/i },
};
const FOOD_NOUN: Record<string, string> = { "Wet Food": "Wet Food", "Dry Food": "Dry Food", Treats: "Treats" };

/** "WANPY DOG CANNED SALMON 375G" + dog/Wet Food → "Wanpy Dog Canned Salmon Wet Food 375g". */
export function feedTitle(name: string, petType: string | null, category: string | null): string {
  const title = titleCase(name);
  const pet = petType ? PET_WORD[petType] : undefined;
  const noun = category ? FOOD_NOUN[category] : undefined;
  const words = [
    pet && !pet.already.test(title) ? pet.word : null,
    noun && !title.toLowerCase().includes(noun.toLowerCase()) ? noun : null,
  ].filter(Boolean);
  let result = title;
  if (words.length) {
    const phrase = words.join(" ");
    const size = title.match(/\s\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?\s?(?:g|kg|ml|L)\b/);
    result = size?.index !== undefined ? `${title.slice(0, size.index)} ${phrase}${title.slice(size.index)}` : `${title} ${phrase}`;
  }
  if (petType === "dog_cat" && !PET_WORD.dog.already.test(result) && !PET_WORD.cat.already.test(result)) {
    result += " for Dogs & Cats";
  }
  return result;
}

const ROOT = "Animals & Pet Supplies > Pet Supplies";
const PET_CATEGORY: Record<string, string> = {
  "dog:Wet Food": `${ROOT} > Dog Supplies > Dog Food`,
  "dog:Dry Food": `${ROOT} > Dog Supplies > Dog Food`,
  "dog:Treats": `${ROOT} > Dog Supplies > Dog Treats`,
  "cat:Wet Food": `${ROOT} > Cat Supplies > Cat Food`,
  "cat:Dry Food": `${ROOT} > Cat Supplies > Cat Food`,
  "cat:Treats": `${ROOT} > Cat Supplies > Cat Treats`,
  "small_pet:Small Animal Food": `${ROOT} > Small Animal Supplies > Small Animal Food`,
};
const ANY_PET_CATEGORY: Record<string, string> = {
  Supplements: `${ROOT} > Pet Vitamins & Supplements`,
  "Grooming & Cleaning": `${ROOT} > Pet Grooming Supplies`,
};

/** Google's own taxonomy path; null when we're not sure (Google then guesses, as it does today). */
export function googleCategory(petType: string | null, category: string | null): string | null {
  if (!category) return null;
  return PET_CATEGORY[`${petType}:${category}`] ?? ANY_PET_CATEGORY[category] ?? null;
}

const PET_LABEL: Record<string, string> = { dog: "Dog", cat: "Cat", dog_cat: "Dog & Cat", small_pet: "Small Pet" };

/** Our own shop path, e.g. "Cat > Wet Food". */
export function productType(petType: string | null, category: string | null): string | null {
  const pet = petType ? PET_LABEL[petType] : null;
  return [pet, category].filter(Boolean).join(" > ") || null;
}

// Health-claim highlights ("Nephroprotective", "Advanced CKD") invite Google's health-claims review; keep them off.
const NO_HIGHLIGHTS = new Set(["Supplements", "Pet Health / Medication"]);

export function feedHighlights(highlights: string[] | null, category: string | null): string[] {
  if (!highlights || (category && NO_HIGHLIGHTS.has(category))) return [];
  return highlights.map((h) => h.trim()).filter((h) => h.length >= 2 && h.length <= 150).slice(0, 10);
}

// How Malaysians search for the same thing in Malay (from Google's Malaysian search suggestions).
const MALAY: Record<string, string> = {
  "cat:Wet Food": "makanan kucing basah",
  "cat:Dry Food": "makanan kucing kering",
  "cat:Treats": "snek kucing",
  "dog:Wet Food": "makanan anjing basah",
  "dog:Dry Food": "makanan anjing kering",
  "dog:Treats": "snek anjing",
  "cat:Supplements": "vitamin kucing",
  "dog:Supplements": "vitamin anjing",
  "dog_cat:Supplements": "vitamin kucing dan anjing",
  "cat:Pet Health / Medication": "ubat kutu kucing",
  "dog:Pet Health / Medication": "ubat kutu anjing",
  "dog_cat:Grooming & Cleaning": "syampu kucing dan anjing",
  "small_pet:Small Animal Food": "makanan hamster",
};

/**
 * Search wording for a product page, built from its pet + category so every product gets it without hand-typing:
 * the title shoppers search ("Alps Chunky Lamb Dog Wet Food 415g"), the Malay phrase, and a keyword list.
 */
export function productSeo(o: { name: string; brand: string | null; petType: string | null; category: string | null; fromPrice: number | null }) {
  const title = feedTitle(o.name, o.petType, o.category);
  const malay = MALAY[`${o.petType}:${o.category}`] ?? null;
  const price = o.fromPrice !== null ? ` From RM${o.fromPrice.toFixed(2)}.` : "";
  const description = `${title}${malay ? ` (${malay})` : ""}.${price} Same-day delivery in the Klang Valley, nationwide courier, or free pickup in Rawang.`;
  const pet = o.petType ? PET_LABEL[o.petType] : null;
  const keywords = [
    title,
    o.brand,
    o.brand && pet ? `${o.brand} ${pet.toLowerCase()} food Malaysia` : null,
    malay,
    o.category && pet ? `${pet.toLowerCase()} ${o.category.toLowerCase()} Malaysia` : null,
    o.category && pet ? `${pet.toLowerCase()} ${o.category.toLowerCase()} Rawang` : null,
    "pet shop Rawang",
  ].filter((k): k is string => !!k);
  return { title, description, keywords: [...new Set(keywords)] };
}

export const DELIVERY_NOTE ="Same-day delivery in the Klang Valley (order by 1pm, Mon–Sat), nationwide courier, or free store pickup in Rawang.";
