import type { Metadata } from "next";
import Link from "next/link";
import { getVariantStock } from "@/components/product-card";
import { FleaTickPicker, type FleaTickOption } from "@/components/flea-tick-picker";
import { faqJsonLd } from "@/lib/seo";
import { whatsappLink } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "NexGard Malaysia: Price & Size by Weight",
  description:
    "NexGard for dogs and NexGard COMBO for cats in Malaysia. Pick the right size by weight, see today's price, and get it delivered same day in Selangor & KL. Ubat kutu kucing & anjing.",
  alternates: { canonical: "/flea-tick" },
};

// Malaysian pack weight ranges (owner, 2 Oct 2026), mapped to our product pages. A dog exactly on a boundary
// (4, 10, 25 kg) takes the smaller pack: `min` is exclusive, `max` inclusive.
const BANDS: Omit<FleaTickOption, "name" | "price" | "tabletPrice" | "inStock">[] = [
  { pet: "dog", min: 1.99, max: 4, band: "2–4 kg", slug: "nexgard-chewables-2-4-kg" },
  { pet: "dog", min: 4, max: 10, band: "4–10 kg", slug: "nexgard-chewables-4-1-10-kg" },
  { pet: "dog", min: 10, max: 25, band: "10–25 kg", slug: "nexgard-chewables-10-25-kg" },
  { pet: "dog", min: 25, max: 50, band: "25–50 kg", slug: "nexgard-chewables-25-50-kg" },
  { pet: "cat", min: 0, max: 2.5, band: "up to 2.5 kg", slug: "nexgard-combo-small" },
  { pet: "cat", min: 2.5, max: 7.5, band: "2.5–7.5 kg", slug: "nexgard-combo-large" },
];

const FAQS = [
  {
    q: "How much is NexGard in Malaysia?",
    a: "Prices depend on your pet's weight band. The size picker on this page shows today's price for each pack at Ria Pet Mart, with same-day delivery in Selangor and KL.",
  },
  {
    q: "How often do I give NexGard?",
    a: "Once a month, one chewable per dog. A box of 6 lasts one dog about six months, or buy single tablets month by month. Each tablet is for one dog only: don't split or share it. On the product page, tap “Remind me on WhatsApp” and we'll message you before the next dose is due.",
  },
  {
    q: "Can I give my dog's NexGard to my cat?",
    a: "No. Dog and cat products are different: cats use NexGard COMBO, a spot-on made for cats. Never give a dog flea or tick product to a cat.",
  },
  {
    q: "Ubat kutu kucing dan anjing yang sesuai?",
    a: "Pilih ikut berat badan haiwan anda dan ikut label pada pek. NexGard untuk anjing, NexGard COMBO untuk kucing. Jika ragu-ragu, tanya doktor haiwan.",
  },
];

export default async function FleaTickPage() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select("slug, name, variants(id, title, price, sort)")
    .eq("status", "published")
    .in("slug", BANDS.map((b) => b.slug));
  const rows = (data ?? []) as { slug: string; name: string; variants: { id: string; title: string; price: number; sort: number }[] }[];
  const stock = await getVariantStock(supabase, rows.flatMap((r) => r.variants.map((v) => v.id)));
  const options: FleaTickOption[] = BANDS.flatMap((b) => {
    const row = rows.find((r) => r.slug === b.slug);
    if (!row) return [];
    const variants = [...row.variants].sort((x, y) => x.sort - y.sort);
    const tablet = variants.find((v) => /tablet/i.test(v.title) && !/box/i.test(v.title));
    const pack = variants.find((v) => v !== tablet) ?? variants[0];
    return [
      {
        ...b,
        name: row.name,
        price: pack ? Number(pack.price) : null,
        tabletPrice: tablet ? Number(tablet.price) : null,
        inStock: row.variants.some((v) => (stock?.get(v.id)?.available ?? 0) > 0),
      },
    ];
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }} />
      <header className="grid gap-3">
        <h1 className="font-bubble text-3xl font-extrabold text-choc sm:text-4xl">Flea &amp; tick protection: NexGard</h1>
        <p className="text-lg text-choc-2">
          Monthly flea and tick protection for dogs (NexGard chewables) and cats (NexGard COMBO spot-on). Tell us your
          pet&apos;s weight and we&apos;ll show the right size and today&apos;s price. Genuine stock from our shop in
          Rawang, delivered today in Selangor &amp; KL when you order by 1pm (Mon–Sat).
        </p>
      </header>

      <FleaTickPicker options={options} />

      <section className="grid gap-3">
        <h2 className="font-bubble text-2xl font-extrabold text-choc">All sizes</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/shop/${o.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl card-soft bg-cream px-4 py-3 hover:bg-peach/40"
              >
                <span className="grid">
                  <span className="font-semibold text-choc">
                    {o.pet === "dog" ? "Dog" : "Cat"} · {o.band}
                  </span>
                  <span className="text-xs text-choc-2">{o.inStock ? "In stock" : "Out of stock"}</span>
                </span>
                {o.price !== null && <span className="font-bold text-choc">RM {o.price.toFixed(2)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="font-bubble text-2xl font-extrabold text-choc">Questions</h2>
        {FAQS.map((f) => (
          <details key={f.q} className="rounded-xl card-soft bg-cream px-4 py-3">
            <summary className="cursor-pointer font-semibold text-choc">{f.q}</summary>
            <p className="mt-2 text-choc-2">{f.a}</p>
          </details>
        ))}
      </section>

      <p className="rounded-2xl bg-peach/30 p-4 text-sm text-choc-2">
        Scratching a lot, bald patches, or a tick you can&apos;t remove? Talk to a vet:{" "}
        <Link href="/vets" className="font-semibold underline">
          find a vet near you
        </Link>
        . Not sure which size?{" "}
        <a
          href={whatsappLink("Hi Ria Pet Mart, which NexGard size should I get?")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          WhatsApp us
        </a>
        .
      </p>
    </div>
  );
}
