"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/site";

/** z-30 keeps it under the sticky header (z-40) and cart drawer (z-50); the welcome popup is a top-layer <dialog>. */
export function FloatingWhatsApp() {
  if (usePathname().startsWith("/admin")) return null;
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Ria Pet Mart on WhatsApp"
      className="fixed bottom-[calc(1rem+var(--sticky-bar,0px)+env(safe-area-inset-bottom))] transition-[bottom] duration-300 right-[calc(1rem+env(safe-area-inset-right))] z-30 grid size-14 place-items-center rounded-full border-2 border-choc bg-terracotta text-cream shadow-[3px_3px_0_0_var(--color-choc)] transition-transform hover:-translate-y-0.5 print:hidden"
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  );
}
