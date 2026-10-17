"use client";

import { useActionState } from "react";
import { BadgePercent, CalendarClock, Gift, Truck } from "lucide-react";
import { saveSettings } from "@/app/admin/settings/actions";
import { Panel } from "@/components/admin/dashboard-parts";
import { btnPrimary, checkCls, hintCls, inputCls, labelCls, Notice } from "@/components/admin/form-parts";

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
  welcomeStack: boolean;
};

const field = inputCls;

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(saveSettings, null);

  return (
    <form action={action} className="grid gap-5">
      <Panel id="expiry" title="Expiry badges & short-dated discounts" Icon={CalendarClock}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls} htmlFor="short_days">
            Short-dated when days left are under
            <input id="short_days" name="short_days" type="number" min="1" max="365" defaultValue={values.shortDays} className={field} />
          </label>
          <label className={labelCls} htmlFor="short_discount">
            Discount at that point (%)
            <input id="short_discount" name="short_discount" type="number" min="0" max="90" defaultValue={values.shortDiscount} className={field} />
          </label>
          <label className={labelCls} htmlFor="deep_days">
            Optional second tier: under days (0 = off)
            <input id="deep_days" name="deep_days" type="number" min="0" max="365" defaultValue={values.deepDays} className={field} />
          </label>
          <label className={labelCls} htmlFor="deep_discount">
            Second-tier discount (%)
            <input id="deep_discount" name="deep_discount" type="number" min="0" max="90" defaultValue={values.deepDiscount} className={field} />
          </label>
          <label className={labelCls} htmlFor="fresh_min_days">
            “Fresh stock” badge from days left
            <input id="fresh_min_days" name="fresh_min_days" type="number" min="2" max="1000" defaultValue={values.freshMinDays} className={field} />
          </label>
        </div>
        <p className="text-sm text-ink-3">
          Anything already expired is hidden from the shop and blocked at checkout, whatever these settings say.
        </p>
      </Panel>

      <Panel id="pricing" title="Pricing defaults" Icon={BadgePercent}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls} htmlFor="default_margin">
            Default margin for new products (%)
            <input id="default_margin" name="default_margin" type="number" min="0" max="94" defaultValue={values.defaultMargin} className={field} />
          </label>
          <label className={labelCls} htmlFor="round_up_sen">
            Round prices up to the next (sen)
            <input id="round_up_sen" name="round_up_sen" type="number" min="1" max="100" defaultValue={values.roundUpSen} className={field} />
          </label>
        </div>
      </Panel>

      <Panel id="welcome" title="Sign-up offer" Icon={Gift}>
        <label className={checkCls}>
          <input type="checkbox" name="welcome_enabled" defaultChecked={values.welcomeEnabled} className="size-5 shrink-0 accent-terracotta-deep" />
          Offer a discount code for signing up (pop-up and homepage banner)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls} htmlFor="welcome_percent">
            Discount on the first order (%)
            <input id="welcome_percent" name="welcome_percent" type="number" min="1" max="50" defaultValue={values.welcomePercent} className={field} />
          </label>
          <label className={labelCls} htmlFor="welcome_delay">
            Pop up after (seconds, 0 = never pop up)
            <input id="welcome_delay" name="welcome_delay" type="number" min="0" max="600" defaultValue={values.welcomeDelay} className={field} />
          </label>
        </div>
        <label className={checkCls}>
          <input type="checkbox" name="welcome_stack" defaultChecked={values.welcomeStack} className="size-5 shrink-0 accent-terracotta-deep" />
          Let promo codes be used on clearance, bundle and sale prices too
        </label>
        <p className="text-sm text-ink-3">
          Leave that unticked to stop codes stacking on discounts, which is what sells items below cost (see Finance).
          Codes already sent keep their old percentage.
        </p>
      </Panel>

      <Panel id="delivery" title="Delivery" Icon={Truck}>
        <label className={checkCls}>
          <input type="checkbox" name="lalamove_enabled" defaultChecked={values.lalamove} className="size-5 shrink-0 accent-terracotta-deep" />
          Lalamove same-day (Selangor, KL, Putrajaya)
        </label>
        <label className={checkCls}>
          <input type="checkbox" name="easyparcel_enabled" defaultChecked={values.easyparcel} className="size-5 shrink-0 accent-terracotta-deep" />
          EasyParcel couriers (cheapest option shown)
        </label>
        <label className={checkCls}>
          <input type="checkbox" name="pickup_enabled" defaultChecked={values.pickup} className="size-5 shrink-0 accent-terracotta-deep" />
          Free store pickup in Rawang
        </label>
        <label className={`${labelCls} max-w-xs`} htmlFor="free_delivery_min">
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
        <label className={`${labelCls} max-w-xs`} htmlFor="free_delivery_cap">
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
          <span className={hintCls}>
            On free-delivery orders the customer pays anything above this, so heavy or far orders don&apos;t cost you.
          </span>
        </label>
      </Panel>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-chunk)] backdrop-blur-sm">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state?.ok && <Notice tone="ok">{state.ok}</Notice>}
        {state?.error && <Notice tone="bad">{state.error}</Notice>}
      </div>
    </form>
  );
}
