"use client";

import { CreditCard, Loader2, Lock, MapPinned, Truck } from "lucide-react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { useCart } from "@/lib/cart-context";
import { MY_STATES } from "@/lib/my-states";
import { formatMyr } from "@/lib/pricing";
import { site, whatsappLink } from "@/lib/site";
import { track } from "@/lib/track";
import { CartSuggestions, LinePrice, usePricedCart } from "./cart-extras";

type ShippingOption = {
  method: "pickup" | "lalamove" | "easyparcel";
  label: string;
  price: number;
  serviceId?: string;
  expires?: number;
  sig?: string;
};

const PICKUP: ShippingOption = { method: "pickup", label: "Free store pickup (Bukit Beruntung, Rawang)", price: 0 };
const MY_MOBILE = /^(?:\+?60|0)1\d{8,9}$/;
const DETAILS_KEY = "riapetmart:checkout";
const EMPTY_ADDRESS = { addressLine: "", city: "", postcode: "", state: "Selangor" };
const optionClass =
  "flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-choc/30 px-3 py-2 has-[:checked]:border-terracotta has-[:checked]:bg-peach/30";

export function CartView({ freeDeliveryMin, pickupEnabled }: { freeDeliveryMin: number | null; pickupEnabled: boolean }) {
  const { lines, subtotal: localSubtotal, setQty, remove } = useCart();
  // Server prices once they arrive (bundle / short-dated discounts); the cart's own sum until then.
  const priced = usePricedCart(lines);
  const subtotal = priced?.subtotal ?? localSubtotal;
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [remembered, setRemembered] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "null");
      if (!saved) return;
      // localStorage only exists after mount, so pre-filling has to happen in an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(String(saved.name ?? ""));
      setPhone(String(saved.phone ?? ""));
      setEmail(String(saved.email ?? ""));
      setAddress({ ...EMPTY_ADDRESS, ...saved.address });
      setRemembered(true);
    } catch {
      // corrupt or blocked storage: start with empty fields
    }
  }, []);

  function forgetDetails() {
    try {
      localStorage.removeItem(DETAILS_KEY);
    } catch {}
    setName("");
    setPhone("");
    setEmail("");
    setAddress(EMPTY_ADDRESS);
    setRemembered(false);
  }

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
  // A delivery quote is priced for one exact cart and address; any change drops it so it gets re-quoted.
  const quoteKey = JSON.stringify([lines.map((l) => [l.variantId, l.qty]), address]);
  const [quote, setQuote] = useState<{ key: string; options: ShippingOption[] } | null>(null);
  const [selected, setSelected] = useState<{ key: string; option: ShippingOption } | null>(null);
  const shippingOptions = quote?.key === quoteKey ? quote.options : null;
  const selectedShipping =
    selected && (selected.option.method === "pickup" || selected.key === quoteKey) ? selected.option : null;

  const phoneOk = MY_MOBILE.test(phone.replace(/[\s-]/g, ""));
  const detailsMissing = !name.trim()
    ? "Enter your name to continue"
    : !phoneOk
      ? "Enter your mobile number to continue"
      : null;

  async function getShippingOptions() {
    const key = quoteKey;
    setQuoting(true);
    setQuoteError(null);
    setQuote(null);
    if (selected?.option.method !== "pickup") setSelected(null);
    try {
      const res = await fetch("/api/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          ...address,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.options) throw new Error(data.error ?? "Could not get delivery options");
      setQuote({ key, options: data.options });
      setSelected({ key, option: data.options[0] });
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
    track(
      "begin_checkout",
      lines.map((l) => ({
        item_id: l.variantId,
        item_name: l.productName,
        item_variant: l.variantTitle,
        price: l.price,
        quantity: l.qty,
      })),
    );
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          shipping: selectedShipping?.method === "pickup" ? { method: "pickup" } : { ...selectedShipping, ...address },
          customerName: name,
          customerPhone: phone,
          email,
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
      try {
        localStorage.setItem(DETAILS_KEY, JSON.stringify({ name, phone, email, address }));
      } catch {}
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

      {freeDeliveryMin !== null && (
        <div className="mt-4 rounded-2xl bg-peach/40 px-4 py-3">
          <FreeShippingProgress subtotal={subtotal} threshold={freeDeliveryMin} />
        </div>
      )}

      <ul className="mt-6 grid gap-3">
        {lines.map((l) => (
          <li
            key={l.variantId}
            className="flex items-center gap-3 rounded-2xl card-soft bg-surface p-3"
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
              <LinePrice fallback={l.price} priced={priced?.items.get(l.variantId)} />
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

      <CartSuggestions suggestions={priced?.suggestions ?? []} />

      <div className="mt-6 grid gap-3 rounded-2xl card-soft bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-choc">Your details</h2>
          {remembered && (
            <button type="button" onClick={forgetDetails} className="text-sm text-choc-2 underline hover:text-choc">
              Not you? Clear
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
            className="min-w-0 rounded-xl border border-choc/40 px-3 py-2"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile / WhatsApp (01X-XXX XXXX)"
            autoComplete="tel"
            required
            aria-invalid={phone !== "" && !phoneOk}
            className="min-w-0 rounded-xl border border-choc/40 px-3 py-2"
          />
        </div>
        {phone !== "" && !phoneOk && (
          <p className="text-sm font-medium text-bad-fg">Use a Malaysian mobile number, e.g. 012-345 6789.</p>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => trackCart(email)}
          placeholder="you@example.com"
          className="rounded-xl border border-choc/40 px-3 py-2"
        />
        <p className="text-xs text-choc-2">
          Your name and phone go straight onto the delivery label — no need to re-enter them for us. Email is for
          your order confirmation and a reminder if you don&apos;t finish checkout.
        </p>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl card-soft bg-surface p-4">
        <h2 className="flex items-center gap-2 font-bold text-choc">
          <MapPinned className="size-5 text-rust" aria-hidden />
          {pickupEnabled ? "Pickup or delivery" : "Delivery address"}
        </h2>
        {pickupEnabled && (
          <>
            <label className={optionClass}>
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="shipping"
                  checked={selectedShipping?.method === "pickup"}
                  onChange={() => setSelected({ key: quoteKey, option: PICKUP })}
                />
                {PICKUP.label}
              </span>
              <span className="font-bold">Free</span>
            </label>
            <p className="text-sm font-semibold text-choc-2">Or deliver to your address:</p>
          </>
        )}
        <input
          value={address.addressLine}
          onChange={(e) => setAddress((a) => ({ ...a, addressLine: e.target.value }))}
          placeholder="Address line"
          className="rounded-xl border border-choc/40 px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            placeholder="City"
            className="rounded-xl border border-choc/40 px-3 py-2"
          />
          <input
            value={address.postcode}
            onChange={(e) => setAddress((a) => ({ ...a, postcode: e.target.value }))}
            placeholder="Postcode"
            className="rounded-xl border border-choc/40 px-3 py-2"
          />
        </div>
        <select
          value={address.state}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
          className="rounded-xl border border-choc/40 px-3 py-2"
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
              <label key={opt.method} className={optionClass}>
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedShipping?.method === opt.method}
                    onChange={() => setSelected({ key: quoteKey, option: opt })}
                  />
                  {opt.label}
                </span>
                <span className="font-bold">{opt.price > 0 ? formatMyr(opt.price) : "Free"}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="mt-4 grid gap-1 rounded-2xl card-soft bg-cream p-4">
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
        disabled={paying || !selectedShipping || detailsMissing !== null}
        className="btn-bubble mt-4 flex w-full items-center justify-center bg-terracotta px-6 py-3 text-cream disabled:opacity-60"
      >
        <CreditCard className="size-5" aria-hidden />
        {paying
          ? "Redirecting to payment…"
          : !selectedShipping
            ? "Choose pickup or delivery to continue"
            : (detailsMissing ?? "Pay now")}
      </button>
      {payError && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-bad-fg">
          {payError}
        </p>
      )}
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-choc-2">
        <span className="inline-flex items-center gap-1 font-semibold text-choc">
          <Lock className="size-3.5" aria-hidden /> Secured by Stripe
        </span>
        <span aria-hidden>·</span>
        <span>Card · FPX</span>
        <span aria-hidden>·</span>
        <Link href="/returns" className="underline hover:text-choc">
          Returns &amp; refunds
        </Link>
        <span aria-hidden>·</span>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="underline hover:text-choc">
          Need help? WhatsApp us
        </a>
      </p>

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
    </div>
  );
}
