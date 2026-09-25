import { Cat, Check, Dog, Rabbit } from "lucide-react";

const PETS: Record<string, { label: string; icon: typeof Dog; tone: string }[]> = {
  dog: [{ label: "Dogs", icon: Dog, tone: "bg-sunshine/30" }],
  cat: [{ label: "Cats", icon: Cat, tone: "bg-lagoon/20" }],
  dog_cat: [
    { label: "Dogs", icon: Dog, tone: "bg-sunshine/30" },
    { label: "Cats", icon: Cat, tone: "bg-lagoon/20" },
  ],
  small_pet: [{ label: "Small pets", icon: Rabbit, tone: "bg-peach/60" }],
};

/** "For dogs / cats" pills plus benefit chips, shared by product cards (compact) and product pages. */
export function ProductTags({
  petType,
  highlights,
  max,
  compact = false,
}: {
  petType?: string | null;
  highlights?: string[] | null;
  max?: number;
  compact?: boolean;
}) {
  const pets = PETS[petType ?? ""] ?? [];
  const tags = (highlights ?? []).slice(0, max);
  if (!pets.length && !tags.length) return null;
  const pill = compact ? "gap-1 px-2 py-0.5 text-[11px]" : "gap-1.5 px-3 py-1 text-xs";
  const icon = compact ? "size-3" : "size-3.5";

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Suitable for and benefits">
      {pets.map(({ label, icon: Icon, tone }) => (
        <li key={label} className={`inline-flex items-center rounded-full font-semibold text-choc ${tone} ${pill}`}>
          <Icon className={icon} aria-hidden /> {label}
        </li>
      ))}
      {tags.map((tag) => (
        <li
          key={tag}
          className={`inline-flex items-center rounded-full border border-rust/30 font-semibold text-rust ${pill}`}
        >
          <Check className={icon} aria-hidden /> {tag}
        </li>
      ))}
    </ul>
  );
}
