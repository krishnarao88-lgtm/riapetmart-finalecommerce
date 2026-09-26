// Search copy for the shop's landing pages, written around what Malaysian pet owners
// search for (EN, BM, 中文). Keep it true to what the shop sells and offers: pages for
// categories with no live products are noindexed until products are published.

import { formatMyr } from "./pricing.ts";

export type Faq = { q: string; a: string };

export type LandingSeo = {
  /** Page <title> before the " · Ria Pet Mart" suffix. Keep under ~50 characters. */
  title: string;
  /** Meta description. Keep under 160 characters. */
  description: string;
  h1: string;
  intro: string;
  /** Other ways people search for this, shown as a small "also searched as" line. */
  alsoSearched: string[];
  faqs: Faq[];
  guide?: { slug: string; label: string };
};

export const categorySeo: Record<string, LandingSeo> = {
  "wet-food": {
    title: "Wet Cat Food & Dog Food Malaysia – Pouches & Cans",
    description:
      "Wet cat food pouches, cans and kitten food, plus wet dog food. Same-day delivery in Selangor & KL from our Rawang pet shop.",
    h1: "Wet cat food & dog food",
    intro:
      "Wet food adds water to your pet's diet, which helps cats that don't drink much and fussy eaters who prefer real meat in gravy. Choose pouches and cans for cats, kittens and dogs, and mix them with dry food. Delivered same-day in Selangor and KL, or pick up free at our Rawang shop.",
    alsoSearched: ["wet cat food pouch", "wet dog food", "makanan kucing basah", "湿猫粮", "猫罐头"],
    faqs: [
      {
        q: "Is wet or dry food better for my cat?",
        a: "Many owners feed both: wet food for water and taste, dry food for convenience and value. When you add wet food, reduce the dry portion so your cat doesn't overeat.",
      },
      {
        q: "My cat is not eating. What can I try?",
        a: "Try a strong-smelling wet food, served at room temperature. A cat that hasn't eaten for more than a day needs a vet, because loss of appetite can be a sign of illness.",
      },
    ],
    guide: { slug: "cat-food-wet-vs-dry", label: "Cat food guide: wet vs dry" },
  },
  "dry-food": {
    title: "Dry Cat Food & Dog Food Malaysia – Kitten to Adult",
    description:
      "Dry cat food and dog food, from 1.5 kg packs to 18 kg bags: kitten, puppy, indoor, hairball and grain-free recipes. Same-day delivery from Rawang.",
    h1: "Dry cat food & dog food",
    intro:
      "Our best-selling range: dry cat food and dog food for every life stage, from kitten and puppy food to adult and indoor recipes, grain-free options and big-value bags up to 18 kg. Not sure which one suits your pet? WhatsApp us and we'll help you choose.",
    alsoSearched: ["cat food Malaysia", "dog food Malaysia", "makanan kucing", "makanan anjing", "猫粮", "狗粮"],
    faqs: [
      {
        q: "What is the best food for indoor or sterilised cats?",
        a: "Indoor and sterilised cats usually burn fewer calories. Look for recipes labelled indoor, sterilised or weight control, and measure each meal.",
      },
      {
        q: "Which food suits a dog with a sensitive stomach?",
        a: "Choose a recipe with one main protein and few ingredients, such as a lamb and rice or grain-free formula, and switch over 7 to 10 days. If diarrhoea or vomiting lasts more than a day or two, see a vet.",
      },
      {
        q: "What helps with cat hairballs?",
        a: "Hairball-control recipes add fibre to help swallowed hair pass through, and regular brushing means less hair is swallowed. A cat that retches often without bringing anything up should see a vet.",
      },
      {
        q: "Do you sell big bags of dog food?",
        a: "Yes. Many of our dog foods come in 13.5 to 18 kg bags, with free delivery on orders over RM150 or free pickup at our Rawang shop.",
      },
    ],
    guide: { slug: "choosing-dog-food-malaysia", label: "How to choose the right dog food" },
  },
  treats: {
    title: "Cat Treats & Dog Treats Malaysia",
    description:
      "Cat treats and dog treats for training, rewards and everyday snacks. Same-day delivery in Selangor & KL, or free pickup at our Rawang pet shop.",
    h1: "Cat treats & dog treats",
    intro:
      "Treats for training, rewards and everyday bonding. Keep treats to about 10% of your pet's daily calories so meals stay balanced. Ask us on WhatsApp about dental chews in our Rawang shop.",
    alsoSearched: ["cat treats Malaysia", "dog treats Malaysia", "snek kucing", "snek anjing", "猫零食", "狗零食"],
    faqs: [
      {
        q: "What helps with a dog's bad breath?",
        a: "Dental chews and regular brushing help reduce the plaque that causes bad breath. Bad breath that doesn't go away can mean dental disease, so ask a vet to check your dog's teeth.",
      },
      {
        q: "What are functional dog treats?",
        a: "Treats with added ingredients for joints, skin and coat, or teeth. They still count towards daily calories, so check the daily limit on the pack.",
      },
    ],
  },
  supplements: {
    title: "Pet Supplements Malaysia – Joint, Skin & Gut",
    description:
      "Dog and cat supplements for joints, skin and coat, digestion and urinary health. Ask our Rawang team or WhatsApp us for advice.",
    h1: "Dog & cat supplements",
    intro:
      "Supplements can support older dogs' joints, a healthier skin and coat, digestion and urinary health. They work alongside a good diet, not instead of a vet: if your pet is limping, scratching a lot or straining to pee, see a vet first.",
    alsoSearched: ["dog joint supplement", "dog probiotics", "vitamin kucing", "vitamin anjing", "猫咪营养品", "狗狗营养品"],
    faqs: [
      {
        q: "What helps a dog with joint pain or weak back legs?",
        a: "Joint supplements with glucosamine, chondroitin or omega-3 are commonly used to support ageing joints. Weak back legs can also be a sign of injury or illness, so see a vet before starting a supplement.",
      },
      {
        q: "What helps a dog with itchy skin, scratching or hair loss?",
        a: "Omega-3 skin and coat supplements and a good diet support coat condition. Constant scratching or bald patches are often caused by fleas, mites or allergies, which need a vet's diagnosis.",
      },
      {
        q: "Do probiotics help a dog with diarrhoea?",
        a: "Probiotics can support gut health and are often used after a stomach upset. For diarrhoea with blood, vomiting, or lasting more than a day, see a vet.",
      },
      {
        q: "What helps with cat urinary problems?",
        a: "Urinary-care food and supplements support urinary health. A cat straining to pee, or peeing blood, is an emergency: go to a vet straight away.",
      },
    ],
  },
  "cat-litter": {
    title: "Cat Litter Malaysia – Tofu, Bentonite & Clumping",
    description:
      "Tofu cat litter, bentonite and clumping cat litter with low dust and odour control. Order online or pick up at our Rawang pet shop.",
    h1: "Cat litter",
    intro:
      "Tofu cat litter is low in dust and can be flushed in small amounts (check the pack), which suits flats and cats with sensitive noses. Bentonite clay clumps hard and copes well with Malaysia's humidity. Choose by what matters most to you: dust, odour control or price.",
    alsoSearched: ["tofu cat litter", "pasir kucing", "pasir kucing tofu", "猫砂", "豆腐猫砂"],
    faqs: [
      {
        q: "Tofu or bentonite cat litter: which is better?",
        a: "Tofu litter is lighter, low-dust and partly flushable. Bentonite clumps harder, lasts well in humid weather and usually costs less per kilo. Many owners with several cats prefer bentonite; owners in flats often prefer tofu.",
      },
      {
        q: "How do I control litter box odour?",
        a: "Scoop every day, keep the litter about 5 to 7 cm deep, wash the box weekly, and use an odour-control litter or a litter deodoriser.",
      },
    ],
    guide: { slug: "choosing-cat-litter", label: "Choosing cat litter: clumping, tofu and odour control" },
  },
  "grooming-cleaning": {
    title: "Pet Grooming Supplies Malaysia – Shampoo & Brushes",
    description:
      "Dog and cat shampoo, grooming brushes, flea combs and pet hair removers. Pet grooming service also available at our Rawang shop.",
    h1: "Grooming & cleaning",
    intro:
      "Regular brushing and the right shampoo keep coats healthy and cut down shedding at home. For a full groom, our Rawang shop also offers pet grooming. WhatsApp us for rates and slots.",
    alsoSearched: ["dog shampoo", "cat grooming brush", "pet grooming Rawang", "syampu kucing", "宠物美容用品"],
    faqs: [
      {
        q: "How can I control my pet's shedding?",
        a: "Brush a few times a week, bathe with a pet shampoo (never human shampoo), and feed a diet rich in omega fatty acids. Sudden heavy hair loss should be checked by a vet.",
      },
    ],
  },
  "pet-health-medication": {
    title: "Flea, Tick & Deworming Treatment Malaysia",
    description:
      "Flea and tick treatment and deworming for cats and dogs, with advice from our panel clinic, All Animal Health Clinic, in Rawang.",
    h1: "Flea, tick & deworming",
    intro:
      "Fleas and ticks cause itching and can spread disease, and worms are common in kittens and puppies. Choose a treatment for your pet's species and weight, and never use a dog product on a cat. Our panel clinic, All Animal Health Clinic, can advise.",
    alsoSearched: ["cat flea treatment", "dog ticks treatment", "ubat kutu kucing", "ubat kutu anjing", "猫咪驱虫药", "狗狗驱虫药"],
    faqs: [
      {
        q: "How do I get rid of fleas on my cat?",
        a: "Use a cat flea treatment at the right dose for your cat's weight, treat every pet in the home, and wash bedding. Never use dog flea products on cats, because some are toxic to them.",
      },
      {
        q: "How often should I deworm my pet?",
        a: "Follow the product label or your vet's advice. Kittens and puppies need deworming more often than adult pets.",
      },
    ],
  },
  "pet-supplies": {
    title: "Pet Supplies Malaysia – Toys, Carriers & Beds",
    description:
      "Cat toys, scratching posts, pet carriers, beds, harnesses and puppy pee pads. Shop at Ria Pet Mart Rawang or order on WhatsApp.",
    h1: "Pet supplies",
    intro:
      "Everyday supplies for cats and dogs: toys, scratching posts, carriers, beds, harnesses, puppy training pads and more. Our Rawang shop has the full range, so WhatsApp us to check what's in stock.",
    alsoSearched: ["pet supplies Rawang", "barang keperluan kucing", "barang keperluan anjing", "马来西亚宠物用品"],
    faqs: [
      {
        q: "Do you deliver pet supplies?",
        a: "Yes. Same-day delivery in Selangor, KL and Putrajaya, courier delivery nationwide, and free delivery on orders over RM150. You can also pick up free at our Rawang shop.",
      },
    ],
  },
  "small-animal-food": {
    title: "Small Pet Food Malaysia – Rabbit & Hamster",
    description:
      "Food for rabbits, hamsters and other small pets. Same-day delivery in Selangor & KL, or free pickup at our Rawang pet shop.",
    h1: "Small pet food",
    intro: "Food for rabbits, hamsters, guinea pigs and other small pets, with same-day delivery in Selangor and KL.",
    alsoSearched: ["rabbit food Malaysia", "makanan arnab", "makanan hamster"],
    faqs: [],
  },
};

export const petSeo: Record<string, LandingSeo> = {
  cat: {
    title: "Cat Food & Cat Supplies Malaysia",
    description:
      "Cat food, kitten food, wet food pouches and treats. Same-day delivery in Selangor & KL from our pet shop in Rawang, Bukit Beruntung.",
    h1: "Everything for your cat",
    intro:
      "Dry and wet cat food for kittens, adults and indoor cats, plus treats. Same-day delivery in Selangor, KL and Putrajaya, or free pickup at our Rawang shop.",
    alsoSearched: ["cat food Malaysia", "kitten food", "makanan kucing", "makanan kucing murah", "猫粮", "猫零食"],
    faqs: [
      {
        q: "What is the best food for a kitten?",
        a: "Choose a food labelled for kittens. It has more protein and energy for growth. Most cats switch to adult food at around 12 months.",
      },
      {
        q: "How can I help my cat gain weight?",
        a: "Feed a high-protein or kitten recipe in small, frequent meals. Weight loss without a clear reason should be checked by a vet.",
      },
    ],
    guide: { slug: "cat-food-wet-vs-dry", label: "Cat food guide: wet vs dry" },
  },
  dog: {
    title: "Dog Food & Dog Supplies Malaysia",
    description:
      "Dog food and puppy food from small packs to 18 kg bags, plus treats. Same-day delivery in Selangor & KL from our Rawang pet shop.",
    h1: "Everything for your dog",
    intro:
      "Dry and wet dog food for puppies, adults and every breed size, grain-free options and big-value bags, plus treats. Same-day delivery in Selangor, KL and Putrajaya, or free pickup at our Rawang shop.",
    alsoSearched: ["dog food Malaysia", "puppy food", "makanan anjing", "makanan anjing murah", "狗粮", "狗零食"],
    faqs: [
      {
        q: "What is the best food for a puppy?",
        a: "A food labelled for puppies, with a kibble size that suits your dog's adult size. Large breeds grow for longer and do best on a large-breed puppy food.",
      },
      {
        q: "What should senior or small-breed dogs eat?",
        a: "Senior recipes are lower in calories and often add joint support. Small-breed recipes have smaller kibble and more energy per bite. Keep older dogs lean, as extra weight is hard on their joints.",
      },
      {
        q: "How can I help my dog gain weight?",
        a: "Feed a higher-calorie recipe in an extra daily meal. If the weight loss was sudden, check with a vet first.",
      },
    ],
    guide: { slug: "choosing-dog-food-malaysia", label: "How to choose the right dog food" },
  },
  small_pet: {
    title: "Small Pet Food Malaysia – Rabbit & Hamster",
    description:
      "Food for rabbits, hamsters and other small pets. Same-day delivery in Selangor & KL, or free pickup at our Rawang pet shop.",
    h1: "Everything for small pets",
    intro: "Food for rabbits, hamsters, guinea pigs and other small pets, with same-day delivery in Selangor and KL.",
    alsoSearched: ["rabbit food Malaysia", "makanan arnab", "makanan hamster"],
    faqs: [],
  },
};

/** Site-wide keywords (meta keywords is minor for Google, but other engines and tools read it). */
export const siteKeywords = [
  "pet shop Rawang",
  "pet shop Bukit Beruntung",
  "pet supplies Rawang",
  "pet shop Selangor",
  "online pet shop Malaysia",
  "pet food delivery Selangor",
  "same-day pet delivery Rawang",
  "pet shop WhatsApp order",
  "cat food Malaysia",
  "dog food Malaysia",
  "wet cat food",
  "kitten food",
  "puppy food",
  "grain-free dog food",
  "premium cat food Malaysia",
  "cat treats Malaysia",
  "dog treats Malaysia",
  "tofu cat litter Malaysia",
  "dog joint supplement",
  "dog skin and coat supplement",
  "cat hotel Rawang",
  "pet grooming Rawang",
  "kedai haiwan peliharaan",
  "kedai pet Rawang",
  "makanan kucing",
  "makanan anjing",
  "pasir kucing",
  "Rawang 宠物店",
  "马来西亚宠物用品",
  "猫粮",
  "狗粮",
];

export function landingSeo(category?: string, pet?: string): LandingSeo | null {
  if (category && categorySeo[category]) return categorySeo[category];
  if (!category && pet && petSeo[pet]) return petSeo[pet];
  return null;
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const SMALL_WORDS = new Set(["and", "or", "with", "in", "of", "for", "the"]);
const ACRONYMS = new Set(["CNF", "IQ", "DHA", "XS", "XL", "XXL"]);
const ABBREVIATIONS: Record<string, string> = { PCH: "Pouch", W: "with" };

/**
 * Product names are stored in capitals ("SNIFFLY CAT CHICKEN PCH 70G"). Search titles read
 * better, and Google Shopping rejects heavy capitals, so show "Sniffly Cat Chicken Pouch 70g".
 * Names that already use mixed case are left as typed.
 */
export function titleCase(name: string): string {
  const cleaned = name
    .replace(/\s*&\s*/g, " & ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned !== cleaned.toUpperCase()) return cleaned;

  let position = 0;
  return cleaned.replace(/[A-Za-z0-9'.]+/g, (word) => {
    const first = position === 0;
    position += 1;
    const upper = word.toUpperCase();

    const unit = upper.match(/^(\d+(?:\.\d+)?)(KG|GM|GR|G|ML|L|PCS|S|X)$/);
    if (unit) {
      const suffix = unit[2] === "GM" || unit[2] === "GR" ? "g" : unit[2] === "L" ? "L" : unit[2].toLowerCase();
      return unit[1] + suffix;
    }
    if (/\d/.test(word)) return upper;
    if (ABBREVIATIONS[upper] && !first) return ABBREVIATIONS[upper];
    if (ACRONYMS.has(upper) || upper.length === 1) return upper;
    const lower = word.toLowerCase();
    if (!first && SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

/** Product <title> before the layout's " · Ria Pet Mart" suffix; the price tail is dropped when the full title would pass 60 characters. */
export function productTitle(name: string): string {
  const title = titleCase(name);
  const withTail = `${title} – Price in Malaysia`;
  return withTail.length + " · Ria Pet Mart".length <= 60 ? withTail : title;
}

export function productDescription(name: string, fromPrice: number | null): string {
  const price = fromPrice !== null ? `, from ${formatMyr(fromPrice)}` : "";
  return `${titleCase(name)}${price}. Same-day delivery in the Klang Valley or free store pickup in Rawang.`;
}

export type FeedItem = {
  id: string;
  groupId: string | null;
  title: string;
  description: string;
  link: string;
  image: string;
  price: number;
  salePrice: number | null;
  inStock: boolean;
  brand: string | null;
  gtin: string | null;
};

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
export const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

const money = (value: number) => `${value.toFixed(2)} MYR`;

/** Google Merchant Center product feed: RSS 2.0 with the g: namespace. */
/**
 * Google Shopping rejects listings that mention sodium nitrite (it polices sales of the chemical), even when it's
 * only the preservative in a can of dog food. Leave it out of the feed text; product pages keep the full list.
 */
export function feedDescription(text: string): string {
  return text.replace(/(,\s*)?(and\s+)?(salt and\s+)?sodium nitrite/gi, "").replace(/\s{2,}/g, " ").trim();
}

export function productFeedXml(channel: { title: string; link: string; description: string }, items: FeedItem[]): string {
  const tag = (name: string, value: string | null) => (value ? `<${name}>${escapeXml(value)}</${name}>` : "");
  const entries = items.map((i) =>
    [
      "<item>",
      tag("g:id", i.id),
      tag("g:item_group_id", i.groupId),
      tag("title", i.title),
      tag("description", i.description),
      tag("link", i.link),
      tag("g:image_link", i.image),
      tag("g:price", money(i.price)),
      tag("g:sale_price", i.salePrice !== null ? money(i.salePrice) : null),
      tag("g:availability", i.inStock ? "in_stock" : "out_of_stock"),
      tag("g:brand", i.brand),
      tag("g:gtin", i.gtin),
      tag("g:condition", "new"),
      "</item>",
    ].join(""),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    `<channel>${tag("title", channel.title)}${tag("link", channel.link)}${tag("description", channel.description)}`,
    ...entries,
    "</channel>",
    "</rss>",
  ].join("\n");
}
