import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { ShopChrome } from "@/components/shop-chrome";
import { whatsappLink } from "@/lib/site";

export default function NotFound() {
  return (
    <ShopChrome>
      <div className="mx-auto grid max-w-xl justify-items-start gap-5 px-4 py-20">
        <p className="rounded-full bg-peach px-3 py-1 text-sm font-bold text-rust">
          404
        </p>
        <h1 className="font-bubble text-4xl font-extrabold tracking-tight text-choc">
          This page wandered off
        </h1>
        <p className="text-choc-2">
          The link may be old, or this part of the shop is still being built.
          Try the shop, or ask us on WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-bubble bg-terracotta text-cream">
            Back to home
          </Link>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-bubble bg-cream text-choc"
          >
            <MessageCircle className="size-5" aria-hidden /> WhatsApp us
          </a>
        </div>
      </div>
    </ShopChrome>
  );
}
