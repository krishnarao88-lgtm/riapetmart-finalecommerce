// Every customer email's wording, in one place. The routes that send them and Admin → Settings → "Send me
// test emails" both build from here, so a test email is exactly what customers get.
import type { EmailContent } from "@/lib/email-template";
import { formatMyr } from "@/lib/pricing";
import { site, whatsappLink } from "@/lib/site";

export type Email = { subject: string; content: EmailContent; marketing?: boolean };
type Line = { name: string; title: string; qty: number; price?: number };

export function orderConfirmed(o: { ref: string; pickup: boolean; lines: EmailContent["lines"]; total: number }): Email {
  return {
    subject: `Order confirmed ${o.ref} — ${site.name}`,
    content: {
      preheader: `Thanks! Your order ${o.ref} is confirmed.`,
      heading: `Thanks for your order. ${o.ref} is confirmed`,
      paragraphs: [
        o.pickup
          ? "We're getting your order ready. We'll message you on WhatsApp as soon as it's ready to collect."
          : "We're packing your order now. We'll send delivery updates on WhatsApp and by email.",
      ],
      lines: o.lines,
      total: formatMyr(o.total),
      cta: { label: "Continue shopping", url: `${site.url}/shop` },
      note: `Questions about this order? Just reply to this email or WhatsApp us with your order number ${o.ref}.`,
    },
  };
}

export function referralReward(code: string): Email {
  return {
    subject: `Your friend just ordered, here's 10% off — ${site.name}`,
    content: {
      preheader: "A thank-you for sharing: 10% off your next order.",
      heading: "Thanks for sharing us with a friend",
      paragraphs: ["Your friend just placed their first order. As a thank-you, here's 10% off your next one."],
      code,
      cta: { label: "Shop now", url: `${site.url}/shop` },
      note: "Enter the code at the payment step. It works once.",
    },
  };
}

export function onItsWay(ref: string, trackUrl: string): Email {
  return {
    subject: `Your order ${ref} is on its way — ${site.name}`,
    content: {
      preheader: "A Lalamove rider is heading your way. Track it live.",
      heading: "Your order is on its way",
      paragraphs: [`We've booked a Lalamove rider for order ${ref}. You can follow the rider live on the map.`],
      cta: { label: "Track your delivery", url: trackUrl },
      note: "The rider may call you on arrival. Please keep your phone nearby.",
    },
  };
}

export function catHotelRequest(b: { customerName: string; petLabel: string; checkIn: string; checkOut: string; notes?: string }): Email {
  return {
    subject: `Cat Hotel request received — ${site.name}`,
    content: {
      preheader: `Your stay request for ${b.checkIn} to ${b.checkOut} is with us.`,
      heading: `Thanks, ${b.customerName}. We've got your request`,
      paragraphs: [
        "Here's what you asked for. This is a request, not a confirmed reservation yet: we'll contact you on WhatsApp shortly to confirm availability and the rate.",
      ],
      lines: [
        { name: "Guests", detail: b.petLabel },
        { name: "Check-in", detail: b.checkIn },
        { name: "Check-out", detail: b.checkOut },
        ...(b.notes ? [{ name: "Notes", detail: b.notes }] : []),
      ],
      cta: {
        label: "Chat with us on WhatsApp",
        url: whatsappLink(`Hi ${site.name}, about my Cat Hotel request for ${b.checkIn} to ${b.checkOut}.`),
      },
      note: "Need to change the dates? Just reply to this email.",
    },
  };
}

export function welcomeCode(percent: number, code: string): Email {
  return {
    subject: `Your ${percent}% welcome code — ${site.name}`,
    content: {
      preheader: `Here's ${percent}% off your first order.`,
      heading: `Welcome to ${site.name}`,
      paragraphs: [
        `Thanks for joining us. Here's ${percent}% off your first order: food, treats, litter and care for your pets, with same-day delivery around Rawang, Selangor and KL.`,
      ],
      code,
      cta: { label: "Start shopping", url: `${site.url}/shop` },
      note: "Enter the code at the payment step. It works once.",
    },
  };
}

export function abandonedCart(items: Required<Line>[], subtotal: number): Email {
  return {
    subject: `Your cart is saved — ${site.name}`,
    marketing: true,
    content: {
      preheader: "Your items are still waiting in your cart.",
      heading: "You left a few things in your cart",
      paragraphs: ["We've saved your cart so you can pick up where you left off."],
      lines: items.map((it) => ({ name: it.name, detail: `${it.title} × ${it.qty}`, amount: formatMyr(it.price * it.qty) })),
      total: formatMyr(subtotal),
      cta: { label: "Return to your cart", url: `${site.url}/cart` },
      note: "Need help choosing? Reply to this email or WhatsApp us and we'll help.",
    },
  };
}

export function restockReminder(items: Line[]): Email {
  return {
    subject: `Time to restock? — ${site.name}`,
    marketing: true,
    content: {
      preheader: "It's been about a month since your last order.",
      heading: "Running low on anything?",
      paragraphs: [
        "It's been about a month since your last order, which is usually when food and litter start running out. Here's what you had last time:",
      ],
      lines: items.map((it) => ({ name: it.name, detail: `${it.title} × ${it.qty}` })),
      cta: { label: "Reorder now", url: `${site.url}/shop` },
      note: "Prefer to order on WhatsApp? Reply to this email or message us and we'll sort it.",
    },
  };
}

export function reviewRequest(link: string): Email {
  return {
    subject: `How was your order? — ${site.name}`,
    marketing: true,
    content: {
      preheader: "A quick review helps other pet owners choose.",
      heading: "How is your pet enjoying it?",
      paragraphs: [
        "We hope your last order went down well. If you have a minute, an honest review helps other pet owners in Malaysia choose the right food and care.",
      ],
      cta: { label: "Write a quick review", url: link },
      note: "It takes about a minute. Thank you!",
    },
  };
}
