export type Guide = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string }[];
  shopLinks: { label: string; href: string }[];
};

export const guides: Guide[] = [
  {
    slug: "choosing-dog-food-malaysia",
    title: "How to Choose the Right Dog Food in Malaysia",
    description:
      "A practical guide to picking dog food by life stage, protein source and wet vs dry — with real options available at Ria Pet Mart.",
    intro:
      "With so many brands on the shelf, picking dog food can feel overwhelming. Here's what actually matters when you're comparing bags and cans.",
    sections: [
      {
        heading: "Match the life stage first",
        body: "Puppy, adult and senior formulas differ mainly in calorie density and calcium/phosphorus ratio. A growing puppy on adult food (or vice versa) isn't dangerous short-term, but the label's life-stage guidance exists for a reason — check it before anything else.",
      },
      {
        heading: "Check the first listed protein",
        body: "Ingredients are listed by weight, so whatever's first — chicken, salmon, lamb — is the biggest single component. If your dog has a known sensitivity, this is the first thing to check on a new bag.",
      },
      {
        heading: "Wet, dry, or both?",
        body: "Dry food is more affordable per meal and better for dental wear; wet food has higher moisture content and is often more palatable for fussy eaters or dogs that don't drink much water. Many owners mix both.",
      },
      {
        heading: "Watch the batch expiry, not just the price",
        body: "A cheaper bag close to its expiry date can still be a good deal — we mark short-dated stock down honestly rather than hiding it. Just plan to use it sooner.",
      },
    ],
    shopLinks: [
      { label: "Shop dog dry food", href: "/shop?pet=dog&category=dry-food" },
      { label: "Shop dog wet food", href: "/shop?pet=dog&category=wet-food" },
      { label: "Shop clearance", href: "/shop?deal=short-dated" },
    ],
  },
  {
    slug: "cat-food-wet-vs-dry",
    title: "Cat Food Guide: Wet vs Dry, and How Much to Feed",
    description:
      "Understand the real differences between wet and dry cat food, and how to work out a feeding amount for your cat.",
    intro:
      "Cats are obligate carnivores with a naturally low thirst drive, which makes the wet-vs-dry decision a bit different from dogs.",
    sections: [
      {
        heading: "Why moisture matters more for cats",
        body: "Wet food is typically 70-80% moisture versus roughly 10% for dry kibble. Cats fed mostly dry food need reliable access to fresh water — a fountain-style bowl can help encourage drinking.",
      },
      {
        heading: "Working out how much to feed",
        body: "Start with the feeding guide on the pack for your cat's weight, then adjust after 2-3 weeks based on body condition — you should be able to feel the ribs without pressing hard, but not see them prominently.",
      },
      {
        heading: "Kitten, adult, or senior",
        body: "Kittens need more calories and protein per kilogram of body weight than adults. Senior cats (roughly 7+) often benefit from formulas with adjusted protein and joint support.",
      },
    ],
    shopLinks: [
      { label: "Shop cat wet food", href: "/shop?pet=cat&category=wet-food" },
      { label: "Shop cat dry food", href: "/shop?pet=cat&category=dry-food" },
      { label: "Shop cat treats", href: "/shop?pet=cat&category=treats" },
    ],
  },
  {
    slug: "choosing-cat-litter",
    title: "Choosing Cat Litter: Clumping, Tofu, and Odour Control",
    description: "A comparison of common cat litter types sold in Malaysia, and how to pick one your cat will actually use.",
    intro:
      "Litter box avoidance is one of the most common cat behaviour complaints — and it's often about the litter itself, not the cat.",
    sections: [
      {
        heading: "Clumping clay litter",
        body: "The most widely available option. Clumps tightly around waste for easy scooping, and tends to be the most affordable per kilogram.",
      },
      {
        heading: "Tofu litter",
        body: "Made from soybean fibre, lighter to carry, and flushable in small amounts in most Malaysian plumbing (check your building's guidance first). A common choice for multi-cat households that want a lighter bag.",
      },
      {
        heading: "If your cat starts avoiding the box",
        body: "Try a finer, unscented litter first — many cats dislike heavily perfumed litter or a sudden texture change. Keep at least one box per cat plus one extra, and scoop daily.",
      },
    ],
    shopLinks: [{ label: "Shop cat litter", href: "/shop?category=cat-litter" }],
  },
];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}
