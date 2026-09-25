"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/admin/settings/actions";

export type SettingsValues = {
  freshMinDays: number;
  shortDays: number;
  shortDiscount: number;
  deepDays: number;
  deepDiscount: number;
  defaultMargin: number;
  roundUpSen: number;
  lalamove: boolean;
  easyparcel: boolean;
  pickup: boolean;
  freeDeliveryMin: number | null;
  freeDeliveryCap: number | null;
  welcomeEnabled: boolean;
  welcomePercent: number;
  welcomeDelay: number;
};

const field = "min-h-11 w-full rounded-xl border-2 border-line bg-ground px-3 font-normal tabular-nums";
const card = "grid gap-4 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5";

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(saveSettings, null);

  return (
    <form action={action} className="grid gap-5">
      <section className={card} aria-labelledby="expiry-heading">
        <h2 id="expiry-heading" className="font-display text-xl font-extrabold">
          Expiry badges &amp; short-dated discounts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold" htmlFor="short_days">
            Short-dated when days left are under
            <input id="short_days" name="short_days" type="number" min="1" max="365" defaultValue={values.shortDays} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="short_discount">
            Discount at that point (%)
            <input id="short_discount" name="short_discount" type="number" min="0" max="90" defaultValue={values.shortDiscount} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="deep_days">
            Optional second tier: under days (0 = off)
            <input id="deep_days" name="deep_days" type="number" min="0" max="365" defaultValue={values.deepDays} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="deep_discount">
            Second-tier discount (%)
            <input id="deep_discount" name="deep_discount" type="number" min="0" max="90" defaultValue={values.deepDiscount} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="fresh_min_days">
            “Fresh stock” badge from days left
            <input id="fresh_min_days" name="fresh_min_days" type="number" min="2" max="1000" defaultValue={values.freshMinDays} className={field} />
          </label>
        </div>
        <p className="text-sm text-ink-2">
          Anything already expired is hidden from the shop and blocked at checkout, whatever these settings say.
        </p>
      </section>

      <section className={card} aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="font-display text-xl font-extrabold">
          Pricing defaults
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold" htmlFor="default_margin">
            Default margin for new products (%)
            <input id="default_margin" name="default_margin" type="number" min="0" max="94" defaultValue={values.defaultMargin} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="round_up_sen">
            Round prices up to the next (sen)
            <input id="round_up_sen" name="round_up_sen" type="number" min="1" max="100" defaultValue={values.roundUpSen} className={field} />
          </label>
        </div>
      </section>

      <section className={card} aria-labelledby="welcome-heading">
        <h2 id="welcome-heading" className="font-display text-xl font-extrabold">
          Sign-up offer
        </h2>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="welcome_enabled" defaultChecked={values.welcomeEnabled} className="size-5" />
          Offer a discount code for signing up (pop-up and homepage banner)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold" htmlFor="welcome_percent">
            Discount on the first order (%)
            <input id="welcome_percent" name="welcome_percent" type="number" min="1" max="50" defaultValue={values.welcomePercent} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="welcome_delay">
            Pop up after (seconds, 0 = never pop up)
            <input id="welcome_delay" name="welcome_delay" type="number" min="0" max="600" defaultValue={values.welcomeDelay} className={field} />
          </label>
        </div>
        <p className="text-sm text-ink-2">
          The code is used at card payment, on top of any clearance, bundle or sale price, so keep it modest. Codes already
          sent keep their old percentage.
        </p>
      </section>

      <section className={card} aria-labelledby="delivery-heading">
        <h2 id="delivery-heading" className="font-display text-xl font-extrabold">
          Delivery
        </h2>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="lalamove_enabled" defaultChecked={values.lalamove} className="size-5" />
          Lalamove same-day (Selangor, KL, Putrajaya)
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="easyparcel_enabled" defaultChecked={values.easyparcel} className="size-5" />
          EasyParcel couriers (cheapest option shown)
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="pickup_enabled" defaultChecked={values.pickup} className="size-5" />
          Free store pickup in Rawang
        </label>
        <label className="grid max-w-xs gap-1 text-sm font-semibold" htmlFor="free_delivery_min">
          Free delivery over (RM, blank = off)
          <input
            id="free_delivery_min"
            name="free_delivery_min"
            type="number"
            min="0"
            step="1"
            defaultValue={values.freeDeliveryMin ?? ""}
            className={field}
          />
        </label>
        <label className="grid max-w-xs gap-1 text-sm font-semibold" htmlFor="free_delivery_cap">
          We pay up to (RM, blank = all of it)
          <input
            id="free_delivery_cap"
            name="free_delivery_cap"
            type="number"
            min="0"
            step="1"
            defaultValue={values.freeDeliveryCap ?? ""}
            className={field}
          />
          <span className="font-normal text-ink-2">
            On free-delivery orders the customer pays anything above this, so heavy or far orders don&apos;t cost you.
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-chunk bg-tangerine text-sm disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-semibold text-ok-fg">{state.ok}</span>}
        {state?.error && <span role="alert" className="text-sm font-semibold text-bad-fg">{state.error}</span>}
      </div>
    </form>
  );
}
