import { site, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Privacy policy",
  description: "How Ria Pet Mart collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Privacy policy</h1>
      <p className="mt-2 text-sm text-choc-2">Last updated: 24 September 2026</p>

      <div className="mt-6 grid gap-4 text-choc-2">
        <p>
          {site.name} (&quot;we&quot;, &quot;us&quot;) runs this website and our shop in {site.address.city},{" "}
          {site.address.state}. This policy explains what personal data we collect, why, and your rights under
          Malaysia&apos;s Personal Data Protection Act 2010.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, email, phone number and delivery address when you place an order or send an enquiry.</li>
          <li>Your order history and the items you add to your cart.</li>
          <li>Your email address if you sign up for our newsletter.</li>
          <li>Messages you send us on WhatsApp, including your WhatsApp name and number.</li>
          <li>Basic browsing data (pages visited, device and browser) through cookies, if analytics is enabled.</li>
        </ul>
        <p>We never see or store your full card details. Payments are handled securely by Stripe.</p>

        <h2 className="font-bubble text-xl font-bold text-choc">How we use it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To process, deliver and support your orders.</li>
          <li>To reply to your questions and send order and delivery updates by email or WhatsApp.</li>
          <li>To remind you about items left in your cart, or when it may be time to restock.</li>
          <li>To send offers and news, only if you signed up. You can unsubscribe at any time.</li>
          <li>To understand how our website is used and improve it.</li>
        </ul>

        <h2 className="font-bubble text-xl font-bold text-choc">Who we share it with</h2>
        <p>
          We don&apos;t sell your data. We only share it with services that help us run the shop: Stripe
          (payments), delivery couriers, Supabase (secure data storage), Resend (email), Meta/WhatsApp
          (messaging), and Google and Meta analytics tools. We may also share data where the law requires it.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">How long we keep it</h2>
        <p>
          We keep order records for as long as needed for accounting and legal purposes, and other data only
          as long as it&apos;s useful for the reasons above.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Your rights</h2>
        <p>
          You can ask to see, correct or delete your personal data, or stop marketing messages at any time.
          Just contact us using the details below.
        </p>

        <h2 className="font-bubble text-xl font-bold text-choc">Contact us</h2>
        <p>
          {site.name}, {site.address.street}, {site.address.postcode} {site.address.city}, {site.address.state}
          <br />
          Email: <a href={`mailto:${site.email}`} className="underline">{site.email}</a> · Phone/WhatsApp:{" "}
          {site.phone}
        </p>
      </div>

      <a
        href={whatsappLink("Hi Ria Pet Mart, I have a question about my personal data.")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream"
      >
        Ask us on WhatsApp
      </a>
    </div>
  );
}
