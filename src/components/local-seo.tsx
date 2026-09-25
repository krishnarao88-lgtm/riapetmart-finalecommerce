import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

const links = [
  { href: "/shop?pet=cat", label: "Shop cat food" },
  { href: "/shop?pet=dog", label: "Shop dog food" },
  { href: "/cat-hotel", label: "Book the Cat Hotel" },
];

/** Who we are and where, in the words local shoppers search with (EN, BM, 中文). Facts come from site.ts. */
export function LocalSeo() {
  const a = site.address;
  return (
    <section aria-labelledby="local-heading" className="mx-auto max-w-6xl px-4 pb-14">
      <div className="grid gap-6 rounded-3xl card-soft bg-surface p-6 sm:p-8 md:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-3">
          <h2 id="local-heading" className="font-bubble text-2xl font-extrabold text-choc">
            Your pet shop in Rawang &amp; Bukit Beruntung
          </h2>
          <p className="text-choc-2">
            {site.name} is at {a.street}, {a.postcode} {a.city}. Order cat food, dog food and treats online for same-day
            delivery across Selangor, Kuala Lumpur and Putrajaya, courier delivery anywhere in Malaysia, or free pickup
            at the shop. Prefer to chat? Order on WhatsApp.
          </p>
          <p className="text-choc-2">
            At the shop you&apos;ll also find pet grooming, our Cat Hotel, and our panel clinic, All Animal Health
            Clinic. Open {site.hours.days}, {site.hours.opens}–{site.hours.closes}.
          </p>
          <p lang="ms" className="text-sm text-choc-2">
            Kedai haiwan peliharaan di Rawang: makanan kucing, makanan anjing, pasir kucing dan barang keperluan
            haiwan, dengan penghantaran pada hari yang sama di Selangor.
          </p>
          <p lang="zh" className="text-sm text-choc-2">
            Rawang 宠物店：猫粮、狗粮、猫砂和宠物用品，雪兰莪当日送达。
          </p>
        </div>

        <ul className="grid content-start gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between rounded-2xl border border-choc/20 px-4 py-3 font-bold text-choc hover:border-terracotta"
              >
                {link.label}
                <ArrowRight className="size-4 text-rust" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-choc/20 px-4 py-3 font-bold text-choc hover:border-terracotta"
            >
              Order on WhatsApp
              <ArrowRight className="size-4 text-rust" aria-hidden />
            </a>
          </li>
          <li>
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-choc/20 px-4 py-3 font-bold text-choc hover:border-terracotta"
            >
              Get directions
              <ArrowRight className="size-4 text-rust" aria-hidden />
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
