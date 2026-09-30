"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMyr } from "@/lib/pricing";

export type FleaTickOption = {
  pet: "dog" | "cat";
  /** Weight band from the pack in kg: over `min`, up to and including `max`. */
  min: number;
  max: number;
  band: string;
  slug: string;
  name: string;
  price: number | null;
  inStock: boolean;
};

/** "How heavy is your pet?" → the matching NexGard size, with price and stock. */
export function FleaTickPicker({ options }: { options: FleaTickOption[] }) {
  const [pet, setPet] = useState<"dog" | "cat">("dog");
  const [kg, setKg] = useState("");
  const weight = Number(kg);
  const bands = options.filter((o) => o.pet === pet).sort((a, b) => a.min - b.min);
  const lightest = bands[0];
  const heaviest = bands[bands.length - 1];
  const entered = kg !== "" && weight > 0;
  const match = entered ? bands.find((o) => weight > o.min && weight <= o.max) : undefined;
  const tooLight = entered && !!lightest && weight <= lightest.min;
  const tooHeavy = entered && !!heaviest && weight > heaviest.max;

  return (
    <div className="grid gap-4 rounded-3xl card-soft bg-cream p-5">
      <div className="flex gap-2" role="radiogroup" aria-label="Pet">
        {(["dog", "cat"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={pet === p}
            onClick={() => setPet(p)}
            className={`btn-bubble px-5 py-2 ${pet === p ? "bg-rust text-cream" : "bg-surface text-choc"}`}
          >
            {p === "dog" ? "Dog" : "Cat"}
          </button>
        ))}
      </div>
      <label className="grid gap-1 font-semibold text-choc">
        How heavy is your {pet}? (kg)
        <input
          type="number"
          inputMode="decimal"
          min="0.5"
          max="60"
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder={pet === "dog" ? "e.g. 8" : "e.g. 4"}
          className="min-h-12 w-40 rounded-xl border-2 border-line bg-surface px-3 text-lg"
        />
      </label>

      {match && (
        <div className="grid gap-2 rounded-2xl bg-peach/40 p-4">
          <p className="text-sm text-choc-2">
            For a {weight} kg {pet}, the {match.band} pack is the right size:
          </p>
          <p className="font-bubble text-xl font-extrabold text-choc">{match.name}</p>
          <p className="font-semibold text-choc">
            {match.price !== null ? formatMyr(match.price) : ""}
            {match.inStock ? " · in stock" : " · out of stock, WhatsApp us"}
          </p>
          <Link href={`/shop/${match.slug}`} className="btn-bubble w-fit bg-rust px-5 py-2 text-cream">
            View &amp; add to cart →
          </Link>
        </div>
      )}
      {tooLight && (
        <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          That&apos;s below the smallest pack size. Ask a vet what&apos;s safe for very small or young pets.
        </p>
      )}
      {tooHeavy && (
        <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          Over {heaviest.max} kg: WhatsApp us or ask your vet for the right dose.
        </p>
      )}
      <p className="text-xs text-choc-2">
        Weigh your pet and follow the pack label. Between two sizes, or pregnant, very young, old or unwell? Ask a vet
        first. Never give a dog product to a cat.
      </p>
    </div>
  );
}
