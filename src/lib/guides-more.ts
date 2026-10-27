import type { Guide } from "./guides.ts";

// Guides written for what Malaysians search (Google Trends MY + Search Console, Oct 2026). General care information
// only: every health topic tells owners when to see a vet, and none of it is a diagnosis.
export const moreGuides: Guide[] = [
  {
    slug: "makanan-kucing-murah",
    title: "Makanan Kucing Murah di Malaysia: Beg Besar 7–15kg, Harga Sekilo",
    description:
      "Makanan kucing murah tapi berkualiti: senarai beg besar 7kg ke atas paling jimat ikut harga sekilo, dikemas kini ikut stok. Hantar hari sama sekitar Rawang, Selangor & KL.",
    intro:
      "Ada ramai kucing di rumah, atau kucing makan banyak? Beli beg besar ialah cara paling mudah untuk jimat. Senarai di bawah menunjukkan makanan kucing kering 7kg ke atas yang ada stok di Ria Pet Mart, disusun ikut harga sekilo (paling murah dahulu). Harga dan stok dikemas kini secara automatik.",
    table: { pet: "cat", minKg: 7, maxPerKg: 20 },
    sections: [
      {
        heading: "Kira harga sekilo, bukan harga beg",
        body: "Beg 7–15kg nampak mahal, tapi harga sekilo selalunya lebih rendah daripada beg 1.5–2kg. Bahagikan harga beg dengan berat (contoh: RM68 ÷ 8kg = RM8.50 sekilo) untuk bandingkan dengan adil.",
      },
      {
        heading: "Murah tapi masih sesuai untuk kucing",
        body: "Pilih makanan lengkap (complete food) untuk peringkat umur kucing anda: kitten atau adult. Kucing perlu taurine, jadi pastikan ia tersenarai dalam ramuan. Letakkan air bersih sentiasa, terutama kalau kucing makan makanan kering sahaja.",
      },
      {
        heading: "Simpan beg besar supaya kekal rangup",
        body: "Lepas buka, pindahkan ke bekas kedap udara dan simpan di tempat sejuk dan kering. Makanan yang lembap atau berbau kurang disukai kucing. Ikut tarikh luput pada beg. Kami tunjukkan tarikh 'best before' untuk setiap produk sebelum anda beli.",
      },
      {
        heading: "Tukar makanan perlahan-lahan",
        body: "Kucing cerewet dengan perubahan. Campur makanan baru sedikit demi sedikit selama kira-kira 7 hari supaya perut tidak terganggu dan kucing tidak mogok makan.",
      },
    ],
    faq: [
      {
        q: "Makanan kucing apa yang paling murah di Ria Pet Mart?",
        a: "Senarai di atas menunjukkan beg 7kg ke atas yang ada stok, disusun ikut harga sekilo. Ia dikemas kini secara automatik bila harga atau stok berubah.",
      },
      {
        q: "Beg 8kg boleh tahan berapa lama untuk seekor kucing?",
        a: "Ikut panduan pemakanan pada beg. Kucing dewasa biasanya makan sekitar 50–70 gram makanan kering sehari, jadi beg 8kg boleh tahan beberapa bulan untuk seekor kucing, atau lebih cepat habis kalau ada ramai kucing.",
      },
      {
        q: "Boleh hantar beg besar ke rumah?",
        a: "Boleh. Lalamove hari yang sama sekitar Rawang, Selangor dan KL (pesan sebelum 1 petang, Isnin–Sabtu), kurier ke seluruh Malaysia, atau ambil percuma di kedai kami di Bandar Bukit Beruntung.",
      },
    ],
    shopLinks: [
      { label: "Semua makanan kucing kering", href: "/shop?pet=cat&category=dry-food" },
      { label: "Makanan kucing basah", href: "/shop?pet=cat&category=wet-food" },
      { label: "Clearance (harga istimewa)", href: "/shop?deal=short-dated" },
    ],
  },
  {
    slug: "makanan-anjing-murah",
    title: "Makanan Anjing Murah di Malaysia: Beg Besar 15–20kg, Harga Sekilo",
    description:
      "Makanan anjing murah tapi berkualiti: senarai beg besar 15–20kg paling jimat ikut harga sekilo, dikemas kini ikut stok. Hantar hari sama sekitar Rawang, Selangor & KL.",
    intro:
      "Cara paling mudah untuk jimat makanan anjing ialah beli beg besar. Senarai di bawah menunjukkan makanan anjing kering 10kg ke atas yang ada stok di Ria Pet Mart, disusun ikut harga sekilo (paling murah dahulu). Harga dan stok dikemas kini secara automatik.",
    table: { pet: "dog", minKg: 10 },
    sections: [
      {
        heading: "Kira harga sekilo, bukan harga beg",
        body: "Beg 15–20kg nampak mahal, tapi harga sekilo selalunya jauh lebih rendah daripada beg 2–4kg jenama yang sama. Bahagikan harga beg dengan berat (contoh: RM90 ÷ 15kg = RM6 sekilo) untuk bandingkan dengan adil.",
      },
      {
        heading: "Murah tapi masih berkhasiat",
        body: "Semak bahan pertama dalam senarai ramuan (contoh: lamb, salmon, chicken) dan pastikan makanan itu untuk peringkat umur anjing anda: puppy atau adult. Makanan lengkap (complete food) sudah cukup untuk keperluan harian anjing dewasa yang sihat.",
      },
      {
        heading: "Simpan beg besar supaya tak rosak",
        body: "Lepas buka, simpan dalam bekas kedap udara di tempat sejuk dan kering, jauh dari cahaya matahari. Ikut tarikh luput pada beg. Kami tunjukkan tarikh 'best before' untuk setiap produk sebelum anda beli.",
      },
      {
        heading: "Tukar makanan perlahan-lahan",
        body: "Kalau tukar jenama, campur makanan baru sedikit demi sedikit selama kira-kira 7 hari supaya perut anjing tidak terganggu.",
      },
    ],
    faq: [
      {
        q: "Makanan anjing apa yang paling murah di Ria Pet Mart?",
        a: "Senarai di atas menunjukkan beg 10kg ke atas yang ada stok, disusun ikut harga sekilo. Ia dikemas kini secara automatik bila harga atau stok berubah.",
      },
      {
        q: "Beg 15kg boleh tahan berapa lama?",
        a: "Bergantung pada berat anjing. Ikut panduan pemakanan pada beg: anjing dewasa sederhana biasanya makan beberapa ratus gram sehari, jadi beg 15kg selalunya tahan lebih sebulan.",
      },
      {
        q: "Boleh hantar beg besar ke rumah?",
        a: "Boleh. Lalamove hari yang sama sekitar Rawang, Selangor dan KL (pesan sebelum 1 petang, Isnin–Sabtu), kurier ke seluruh Malaysia, atau ambil percuma di kedai kami di Bandar Bukit Beruntung.",
      },
    ],
    shopLinks: [
      { label: "Semua makanan anjing kering", href: "/shop?pet=dog&category=dry-food" },
      { label: "Clearance (harga istimewa)", href: "/shop?deal=short-dated" },
    ],
  },
  {
    slug: "why-cat-not-eating",
    title: "Kucing Tak Mahu Makan? Why Your Cat Isn't Eating and What to Do",
    description:
      "Kucing tak mahu makan? Common reasons a cat stops eating, simple things to try at home, and when it's time to see a vet.",
    intro:
      "A cat that skips one meal is usually fine, but cats should not go without food for long. Here's how to tell a fussy day from a problem, and what to try first.",
    sections: [
      {
        heading: "When to call a vet straight away",
        body: "Take your cat to a vet the same day if it hasn't eaten for more than 24 hours, or if not eating comes with vomiting, diarrhoea, hiding, drooling, a swollen belly, or straining in the litter box. Cats that stop eating can become seriously ill quickly, so it's better to check early.",
      },
      {
        heading: "Common everyday reasons",
        body: "A new food, a dirty bowl, food left out too long, stress (moving house, a new pet, visitors), hot weather, or a recent vaccination can all put a cat off its food for a short time. Dental pain is another common reason, especially in older cats: watch for chewing on one side or dropping food.",
      },
      {
        heading: "Things to try at home",
        body: "Offer a strong-smelling wet food at room temperature. Use a clean, shallow bowl in a quiet spot away from the litter box. If you're changing food, mix the new one in slowly over about 7 days. Keep fresh water available, and don't force-feed.",
      },
      {
        heading: "Kenapa kucing tak makan? (Ringkasan)",
        body: "Kucing boleh hilang selera kerana tukar makanan, stres, cuaca panas atau sakit gigi. Cuba makanan basah yang berbau kuat pada suhu bilik. Jika kucing tidak makan lebih dari 24 jam, atau muntah dan lemah, bawa segera ke klinik haiwan.",
      },
    ],
    shopLinks: [
      { label: "Shop wet cat food", href: "/shop?pet=cat&category=wet-food" },
      { label: "Find a vet near you", href: "/vets" },
    ],
  },
  {
    slug: "dog-itchy-skin-hair-loss",
    title: "Anjing Gatal & Bulu Gugur: Itchy Skin and Hair Loss in Dogs",
    description:
      "Why dogs scratch and lose fur in Malaysia's heat and humidity: fleas, ticks, allergies, and skin infections, plus what helps and when to see a vet.",
    intro:
      "Scratching, licking and patches of missing fur are some of the most common dog problems in Malaysia, where heat and humidity help fleas, ticks and skin infections thrive.",
    sections: [
      {
        heading: "Check for fleas and ticks first",
        body: "Part the fur along the back, neck and base of the tail. Small dark specks (flea dirt) or ticks attached to the skin are a common cause of itching. Monthly flea and tick protection for every dog in the home stops them coming back.",
      },
      {
        heading: "Other common causes",
        body: "Food or environmental allergies, damp skin that stays wet after bathing or rain, fungal infections, and mites can all cause itching and hair loss. Red, smelly, crusty or oozing skin needs a vet to find the cause; some conditions spread to other pets.",
      },
      {
        heading: "What helps at home",
        body: "Dry your dog thoroughly after baths and rain, wash bedding weekly, and use a shampoo made for dogs. A complete diet with omega fatty acids supports skin and coat. Don't use human creams or medicines on your dog.",
      },
      {
        heading: "Ringkasan dalam Bahasa Melayu",
        body: "Anjing gatal dan bulu gugur selalunya disebabkan kutu, caplak, alahan atau jangkitan kulat. Periksa kutu dahulu dan beri perlindungan kutu setiap bulan. Jika kulit merah, berbau atau berkudis, bawa anjing ke klinik haiwan.",
      },
    ],
    shopLinks: [
      { label: "Flea & tick protection (NexGard)", href: "/flea-tick" },
      { label: "Shop dog grooming & shampoo", href: "/shop?pet=dog&category=grooming-cleaning" },
      { label: "Find a vet near you", href: "/vets" },
    ],
  },
  {
    slug: "ubat-kutu-kucing-anjing",
    title: "Ubat Kutu Kucing & Anjing: Panduan Kutu dan Caplak di Malaysia",
    description:
      "Ubat kutu kucing dan anjing: cara kenal kutu dan caplak, kenapa perlindungan bulanan penting, dan cara pilih saiz ikut berat haiwan.",
    intro:
      "Kutu dan caplak hidup sepanjang tahun dalam cuaca panas dan lembap Malaysia. Perlindungan setiap bulan lebih mudah daripada merawat serangan kutu di rumah.",
    sections: [
      {
        heading: "Tanda haiwan anda ada kutu",
        body: "Garu dan gigit badan berulang kali, bintik hitam kecil pada bulu (najis kutu), bulu gugur di pangkal ekor, atau caplak yang melekat di telinga dan celah jari. Kutu juga boleh hidup dalam tilam dan karpet.",
      },
      {
        heading: "Pilih saiz ikut berat, bukan anggaran",
        body: "Timbang haiwan anda dahulu dan pilih saiz yang betul untuk beratnya hari ini. Satu tablet atau satu dos untuk satu haiwan sahaja. Jangan potong atau kongsi tablet, dan jangan beri produk anjing kepada kucing.",
      },
      {
        heading: "Flea and tick protection in English",
        body: "Fleas and ticks are active all year in Malaysia. Weigh your pet, choose the product size for their weight, give one dose per pet each month, and treat every pet in the home. Ask a vet first for pets that are pregnant, very young, old or unwell.",
      },
    ],
    shopLinks: [
      { label: "NexGard size picker (by weight)", href: "/flea-tick" },
      { label: "Klinik haiwan berdekatan", href: "/vets" },
    ],
  },
  {
    slug: "when-to-take-pet-to-vet",
    title: "When to Take Your Pet to a Vet (Bila Perlu ke Klinik Haiwan)",
    description:
      "Signs your cat or dog needs a vet today, what can wait for a routine visit, and how to find a klinik haiwan near you in Rawang and Bukit Beruntung.",
    intro:
      "Knowing when to go to the vet saves worry and, sometimes, your pet's life. Here's a simple way to decide between \"go now\", \"book this week\" and \"keep an eye on it\".",
    sections: [
      {
        heading: "Go now (emergency)",
        body: "Trouble breathing, collapse or seizures, heavy bleeding, being hit by a vehicle, eating poison or medicine, repeated vomiting, a swollen hard belly, or (in male cats especially) straining in the litter box with little or no urine.",
      },
      {
        heading: "Book a visit this week",
        body: "Not eating for a day, ongoing diarrhoea, limping, itchy or smelly skin, ear scratching or head shaking, weight loss, or drinking much more than usual.",
      },
      {
        heading: "Routine visits",
        body: "Vaccinations, deworming, a yearly health check, and advice before neutering. Regular visits catch problems early, especially for pets over about 7 years old.",
      },
      {
        heading: "Klinik haiwan di Bukit Beruntung",
        body: "Our partner clinic, Animal Health Clinic (Klinik Kesihatan Haiwan), is in Seksyen BB7, Bukit Beruntung, open Monday to Saturday, 9:30am to 6pm. For other areas, our vet finder opens Google Maps with clinics near you.",
      },
    ],
    shopLinks: [
      { label: "Our partner clinic & vets near you", href: "/vets" },
      { label: "Flea & tick protection", href: "/flea-tick" },
    ],
  },
];
