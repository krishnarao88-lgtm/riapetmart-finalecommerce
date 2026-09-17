"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { whatsappLink } from "@/lib/site";

const words = ["Happy", "pets,", "delivered", "today."];
const spring = { type: "spring", stiffness: 260, damping: 22 } as const;

export function Hero() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden border-b-2 border-ink bg-tangerine">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:items-center md:py-20">
          <div className="grid gap-6">
            <p className="w-fit rounded-full border-2 border-ink bg-surface px-3 py-1 text-xs font-bold uppercase tracking-widest">
              Rawang · Klang Valley · Nationwide
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {words.map((word, i) => (
                <motion.span
                  key={word}
                  className="mr-[0.22em] inline-block"
                  initial={{ y: 28, rotate: -3 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{ ...spring, delay: 0.06 * i }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>
            <p className="max-w-md text-lg font-medium text-ink/85">
              Food, treats and care essentials from our neighbourhood shop, with same-day delivery across
              Selangor and KL.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="btn-chunk bg-surface">
                Shop all products <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn-chunk bg-lagoon">
                <MessageCircle className="size-5" aria-hidden /> Ask on WhatsApp
              </a>
            </div>
          </div>

          {/* Colour-block paw stack: stands in for hero photography until Stage 3 images arrive. */}
          <div className="relative mx-auto aspect-square w-full max-w-sm" aria-hidden>
            {[
              { c: "bg-sunshine", r: -8, x: "0%", y: "6%" },
              { c: "bg-berry", r: 6, x: "18%", y: "20%" },
              { c: "bg-grape", r: -3, x: "8%", y: "36%" },
            ].map((b, i) => (
              <motion.div
                key={b.c}
                className={`absolute size-[62%] rounded-[2rem] border-2 border-ink ${b.c} shadow-[6px_6px_0_0_var(--color-ink)]`}
                style={{ left: b.x, top: b.y }}
                initial={{ rotate: 0, scale: 0.9 }}
                animate={{ rotate: b.r, scale: 1 }}
                transition={{ ...spring, delay: 0.15 + 0.08 * i }}
                whileHover={{ rotate: b.r * -1, y: -6 }}
              />
            ))}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
