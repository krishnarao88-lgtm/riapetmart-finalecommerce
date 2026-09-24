"use client";

import { CreditCard, Loader2, MapPinned, Truck } from "lucide-react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { useCart } from "@/lib/cart-context";
import { formatMyr } from "@/lib/pricing";
import { site, whatsappLink } from "@/lib/site";

const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Pulau Pinang", "Perak", "Perlis", "Selangor", "Terengganu", "Sabah",
  "Sarawak", "Kuala Lumpur", "Labuan", "Putrajaya",
];

type ShippingOption = {
  method: "pickup" | "lalamove" | "easyparcel";
  label: string;
  price: number;
  serviceId?: string;
};

export default function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({ addressLine: "", city: "", postcode: "", state: "Selangor" });

  function trackCart(currentEmail: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) return;
    fetch("/api/cart-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentEmail,
        items: lines.map((l) => ({ name: l.productName, title: l.variantTitle, qty: l.qty, price: l.price })),
        subtotal,
      }),
    }).catch(() => {});
  }
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  async function getShippingOptions() {
    setQuoting(true);
    setQuoteError(null);
    setShippingOptions(null);
    setSelectedShipping(null);
    try {
      const res = await fetch("/api/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          subtotal,
          ...address,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.options) throw new Error(data.error ?? "Could not get delivery options");
      setShippingOptions(data.options);
      setSelectedShipping(data.options[0]);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Could not get delivery options");
    } finally {
      setQuoting(false);
    }
  }

  async function payNow() {
    setPaying(true);
    setPayError(null);
    trackCart(email);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          shipping: selectedShipping ? { ...selectedShipping, ...address } : undefined,
          referralCode: (() => {
            try {
              return localStorage.getItem("riapetmart:ref") ?? undefined;
            } catch {
              return undefined;
            }
          })(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Checkout failed");
      setPaying(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto size-12 text-rust/50" aria-hidden />
        <h1 className="mt-4 font-bubble text-2xl font-extrabold text-choc">Your cart is empty</h1>
        <p className="mt-2 text-choc-2">Add some treats, food or supplies to get started.</p>
        <Link href="/shop" className="btn-bubble mt-6 inline-flex bg-terracotta px-6 py-3 text-cream">
          Shop all
        </Link>
      </div>
    );
  }

  const orderText = [
    `Hi ${site.name}, I'd like to order:`,
    ...lines.map((l) => `- ${l.productName} (${l.variantTitle}) x${l.qty} — ${formatMyr(l.price * l.qty)}`),
    `Subtotal: ${formatMyr(subtotal)}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-bubble text-3xl font-extrabold text-choc">Your cart</h1>

      <div className="mt-4 rounded-2xl bg-peach/40 px-4 py-3">
        <FreeShippingProgress subtotal={subtotal} />
      </div>

      <ul className="mt-6 grid gap-3">
        {lines.map((l) => (
          <li
            key={l.variantId}
            className="flex items-center gap-3 rounded-2xl border-2 border-choc bg-surface p-3"
          >
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-peach/40">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="size-full rounded-xl object-cover" />
              ) : (
                <ShoppingBag className="size-6 text-rust/50" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${l.productSlug}`} className="line-clamp-1 font-bold text-choc">
                {l.productName}
              </Link>
              <p className="text-sm text-choc-2">{l.variantTitle}</p>
              <p className="font-bold text-choc">{formatMyr(l.price)}</p>
            </div>
            <div className="flex items-center rounded-full border-2 border-choc">
              <button
                type="button"
                onClick={() => setQty(l.variantId, l.qty - 1)}
                className="grid size-9 place-items-center"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="min-w-6 text-center font-bold tabular-nums">{l.qty}</span>
              <button
                type="button"
                onClick={() => setQty(l.variantId, l.qty + 1)}
                className="grid size-9 place-items-center"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(l.variantId)}
              className="grid size-9 place-items-center text-rust"
              aria-label={`Remove ${l.productName}`}
            >
              <Trash2 className="size-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 rounded-2xl border-2 border-choc bg-surface p-4">
        <h2 className="font-bold text-choc">Your email</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => trackCart(email)}
          placeholder="you@example.com"
          className="rounded-xl border-2 border-choc/40 px-3 py-2"
        />
        <p className="text-xs text-choc-2">For your order confirmation and a reminder if you don&apos;t finish checkout.</p>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border-2 border-choc bg-surface p-4">
        <h2 className="flex items-center gap-2 font-bold text-choc">
          <MapPinned className="size-5 text-rust" aria-hidden />
          Delivery address
        </h2>
        <input
          value={address.addressLine}
          onChange={(e) => setAddress((a) => ({ ...a, addressLine: e.target.value }))}
          placeholder="Address line"
          className="rounded-xl border-2 border-choc/40 px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            placeholder="City"
            className="rounded-xl border-2 border-choc/40 px-3 py-2"
          />
          <input
            value={address.postcode}
            onChange={(e) => setAddress((a) => ({ ...a, postcode: e.target.value }))}
            placeholder="Postcode"
            className="rounded-xl border-2 border-choc/40 px-3 py-2"
          />
        </div>
        <select
          value={address.state}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
          className="rounded-xl border-2 border-choc/40 px-3 py-2"
        >
          {MY_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={getShippingOptions}
          disabled={quoting || !address.addressLine || !address.postcode}
          className="btn-bubble bg-choc px-6 py-2.5 text-cream disabled:opacity-60"
        >
          {quoting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Truck className="size-4" aria-hidden />}
          {quoting ? "Getting delivery options…" : "Get delivery options"}
        </button>
        {quoteError && <p className="text-sm font-medium text-bad-fg">{quoteError}</p>}

        {shippingOptions && (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-choc-2">Choose delivery</legend>
            {shippingOptions.map((opt) => (
              <label
                key={opt.method}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border-2 border-choc/30 px-3 py-2 has-[:checked]:border-terracotta has-[:checked]:bg-peach/30"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedShipping?.method === opt.method}
                    onChange={() => setSelectedShipping(opt)}
                  />
                  {opt.label}
                </span>
                <span className="font-bold">{opt.price > 0 ? formatMyr(opt.price) : "Free"}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="mt-4 grid gap-1 rounded-2xl border-2 border-choc bg-cream p-4">
        <div className="flex items-center justify-between text-choc-2">
          <span>Subtotal</span>
          <span>{formatMyr(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-choc-2">
          <span>Delivery</span>
          <span>{selectedShipping ? (selectedShipping.price > 0 ? formatMyr(selectedShipping.price) : "Free") : "—"}</span>
        </div>
        <div className="flex items-center justify-between border-t border-choc/20 pt-1 font-bold text-choc">
          <span>Total</span>
          <span className="text-xl">{formatMyr(subtotal + (selectedShipping?.price ?? 0))}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={payNow}
        disabled={paying || !selectedShipping}
        className="btn-bubble mt-4 flex w-full items-center justify-center bg-terracotta px-6 py-3 text-cream disabled:opacity-60"
      >
        <CreditCard className="size-5" aria-hidden />
        {paying ? "Redirecting to payment…" : selectedShipping ? "Pay by card or FPX" : "Choose delivery to continue"}
      </button>
      {payError && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-bad-fg">
          {payError}
        </p>
      )}

      <p className="mt-4 text-center text-sm text-choc-2">or</p>

      <a
        href={whatsappLink(orderText)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-bubble mt-2 flex w-full items-center justify-center bg-surface px-6 py-3 text-choc"
      >
        Order via WhatsApp
      </a>
      <p className="mt-2 text-center text-sm text-choc-2">
        Prefer to arrange delivery and pay directly? We&apos;ll confirm on WhatsApp instead.
      </p>
      <p className="mt-4 text-center text-xs text-choc-2">
        🔒 Secured by Stripe · <Link href="/returns" className="underline hover:text-choc">Returns & refunds</Link>
      </p>
    </div>
  );
}
