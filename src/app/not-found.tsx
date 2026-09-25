import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { ShopChrome } from "@/components/shop-chrome";
import { whatsappLink } from "@/lib/site";

export default function NotFound() {
  return (
    <ShopChrome>
      <div className="mx-auto grid max-w-xl justify-items-start gap-5 px-4 py-20">
        <p className="rounded-full border-2 border-ink bg-sunshine px-3 py-1 text-sm font-bold">
          404
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          This page wandered off
        </h1>
        <p className="text-ink-2">
          The link may be old, or this part of the shop is still being built.
          Try the shop, or ask us on WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-chunk bg-tangerine">
            Back to home
          </Link>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-chunk bg-surface"
          >
            <MessageCircle className="size-5" aria-hidden /> WhatsApp us
          </a>
        </div>
      </div>
    </ShopChrome>
  );
}
