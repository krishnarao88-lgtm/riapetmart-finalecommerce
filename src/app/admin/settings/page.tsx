import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { SettingsForm, type SettingsValues } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { isEasyParcelConnected } from "@/lib/shipping/easyparcel";
import { isInstagramConnected } from "@/lib/instagram";
import { isTikTokConnected } from "@/lib/tiktok";
import { toWelcomeOffer } from "@/lib/welcome-offer";
import { sendTestEmails } from "./actions";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

type Tier = { max_days: number; discount: number };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ easyparcel?: string; tiktok?: string; instagram?: string; emailtest?: string }>;
}) {
  const { easyparcel, tiktok, instagram, emailtest } = await searchParams;
  const { supabase } = await requireAdmin();
  const connected = await isEasyParcelConnected().catch(() => false);
  const tiktokConnected = await isTikTokConnected().catch(() => false);
  const instagramConnected = await isInstagramConnected().catch(() => false);
  const { data } = await supabase.from("settings").select("key, value");
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value as Record<string, unknown>]));

  const expiry = byKey.get("expiry_badges") ?? {};
  const pricing = byKey.get("pricing") ?? {};
  const delivery = byKey.get("delivery") ?? {};
  const tiers = (expiry.short_dated as Tier[] | undefined) ?? [{ max_days: 90, discount: 0.15 }];
  const sorted = [...tiers].sort((a, b) => b.max_days - a.max_days);
  const first = sorted[0] ?? { max_days: 90, discount: 0.15 };
  const second = sorted[1];

  const welcome = toWelcomeOffer(byKey.get("welcome_offer"));
  const values: SettingsValues = {
    welcomeEnabled: welcome.enabled,
    welcomePercent: welcome.percent,
    welcomeDelay: welcome.delay_seconds,
    welcomeStack: welcome.stack_with_discounts,
    freshMinDays: Number(expiry.fresh_min_days ?? 181),
    shortDays: first.max_days,
    shortDiscount: Math.round(first.discount * 100),
    deepDays: second?.max_days ?? 0,
    deepDiscount: second ? Math.round(second.discount * 100) : 0,
    defaultMargin: Math.round(Number(pricing.default_margin ?? 0.25) * 100),
    roundUpSen: Math.round(Number(pricing.round_up_to ?? 0.1) * 100),
    lalamove: delivery.lalamove_enabled !== false,
    easyparcel: delivery.easyparcel_enabled !== false,
    pickup: delivery.pickup_enabled !== false,
    freeDeliveryMin:
      delivery.free_delivery_min === null || delivery.free_delivery_min === undefined
        ? null
        : Number(delivery.free_delivery_min),
    freeDeliveryCap:
      delivery.free_delivery_cap === null || delivery.free_delivery_cap === undefined
        ? null
        : Number(delivery.free_delivery_cap),
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink-2">These take effect immediately, with no new deployment needed.</p>
      </div>
      <div className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
        <h2 className="font-display text-xl font-extrabold">Carrier connections</h2>
        {easyparcel === "connected" && (
          <p className="rounded-xl bg-ok-bg px-3 py-2 text-sm font-medium text-ok-fg">EasyParcel connected.</p>
        )}
        {easyparcel === "error" && (
          <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">
            Couldn&apos;t connect EasyParcel. Try again.
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            {connected ? (
              <CheckCircle2 className="size-5 text-ok-fg" aria-hidden />
            ) : (
              <XCircle className="size-5 text-bad-fg" aria-hidden />
            )}
            EasyParcel (nationwide courier rates)
          </span>
          <a href="/api/oauth/start?provider=easyparcel" className="btn-chunk bg-tangerine px-4 py-2 text-sm">
            {connected ? "Reconnect" : "Connect EasyParcel"}
          </a>
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <CheckCircle2 className="size-4 text-ok-fg" aria-hidden />
          Lalamove (same-day quotes) — connected via API key, no login needed.
        </p>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
        <h2 className="font-display text-xl font-extrabold">Social connections</h2>
        {tiktok === "connected" && (
          <p className="rounded-xl bg-ok-bg px-3 py-2 text-sm font-medium text-ok-fg">TikTok connected.</p>
        )}
        {tiktok === "error" && (
          <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">
            Couldn&apos;t connect TikTok. Try again once the app is approved (or added as a sandbox target user).
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            {tiktokConnected ? (
              <CheckCircle2 className="size-5 text-ok-fg" aria-hidden />
            ) : (
              <XCircle className="size-5 text-bad-fg" aria-hidden />
            )}
            TikTok (latest videos on homepage)
          </span>
          <a href="/api/oauth/start?provider=tiktok" className="btn-chunk bg-tangerine px-4 py-2 text-sm">
            {tiktokConnected ? "Reconnect" : "Connect TikTok"}
          </a>
        </div>
        {instagram === "connected" && (
          <p className="rounded-xl bg-ok-bg px-3 py-2 text-sm font-medium text-ok-fg">Instagram connected.</p>
        )}
        {instagram === "error" && (
          <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">
            Couldn&apos;t connect Instagram. It must be a Business or Creator account, and the app&apos;s redirect URL
            must be https://www.riapetmart.com/api/instagram/callback.
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            {instagramConnected ? (
              <CheckCircle2 className="size-5 text-ok-fg" aria-hidden />
            ) : (
              <XCircle className="size-5 text-bad-fg" aria-hidden />
            )}
            Instagram (latest posts on homepage)
          </span>
          <a href="/api/oauth/start?provider=instagram" className="btn-chunk bg-tangerine px-4 py-2 text-sm">
            {instagramConnected ? "Reconnect" : "Connect Instagram"}
          </a>
        </div>
      </div>

      <SettingsForm values={values} />

      <section className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5" aria-labelledby="emailtest-heading">
        <h2 id="emailtest-heading" className="font-display text-xl font-extrabold">
          Test customer emails
        </h2>
        <p className="text-sm text-ink-2">
          Sends one of every customer email (order confirmed, on its way, Cat Hotel, welcome code, referral, cart
          reminder, restock, review request) with sample details, to your own sign-in email only. Subjects start with
          [TEST]. Sign-up and password-reset emails come from the login service: test those by using &ldquo;Forgot your
          password?&rdquo; on the customer log-in page.
        </p>
        {emailtest?.startsWith("sent-") && (
          <p className="text-sm font-semibold text-ok-fg">Sent {emailtest.slice(5)} test emails. Check your inbox (and spam).</p>
        )}
        {emailtest?.startsWith("failed-") && (
          <p className="text-sm font-semibold text-bad-fg">{emailtest.slice(7)} emails failed to send. Check the Resend setup.</p>
        )}
        <form action={sendTestEmails}>
          <button type="submit" className="btn-chunk bg-tangerine px-4 py-2 text-sm">
            Send me test emails
          </button>
        </form>
      </section>
    </div>
  );
}
