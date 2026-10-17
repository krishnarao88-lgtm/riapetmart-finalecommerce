import { CheckCircle2, Mail, Share2, Truck, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Panel } from "@/components/admin/dashboard-parts";
import { btnPrimary, btnSecondary, Notice, PageHeader, pageWrap } from "@/components/admin/form-parts";
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

  const status = (on: boolean) =>
    on ? (
      <CheckCircle2 className="size-5 shrink-0 text-ok-fg" aria-label="Connected" />
    ) : (
      <XCircle className="size-5 shrink-0 text-bad-fg" aria-label="Not connected" />
    );
  const row = "flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream/60 p-3";

  return (
    <div className={pageWrap}>
      <PageHeader title="Settings" description="These take effect immediately, with no new deployment needed." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Carrier connections" Icon={Truck}>
          {easyparcel === "connected" && <Notice tone="ok">EasyParcel connected.</Notice>}
          {easyparcel === "error" && <Notice tone="bad">Couldn&apos;t connect EasyParcel. Try again.</Notice>}
          <div className={row}>
            <span className="flex items-center gap-2 font-semibold text-choc">
              {status(connected)}
              EasyParcel (nationwide courier rates)
            </span>
            <a href="/api/oauth/start?provider=easyparcel" className={connected ? btnSecondary : btnPrimary}>
              {connected ? "Reconnect" : "Connect EasyParcel"}
            </a>
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <CheckCircle2 className="size-4 shrink-0 text-ok-fg" aria-hidden />
            Lalamove (same-day quotes) — connected via API key, no login needed.
          </p>
        </Panel>

        <Panel title="Social connections" Icon={Share2}>
          {tiktok === "connected" && <Notice tone="ok">TikTok connected.</Notice>}
          {tiktok === "error" && (
            <Notice tone="bad">
              Couldn&apos;t connect TikTok. Try again once the app is approved (or added as a sandbox target user).
            </Notice>
          )}
          <div className={row}>
            <span className="flex items-center gap-2 font-semibold text-choc">
              {status(tiktokConnected)}
              TikTok (latest videos on homepage)
            </span>
            <a href="/api/oauth/start?provider=tiktok" className={tiktokConnected ? btnSecondary : btnPrimary}>
              {tiktokConnected ? "Reconnect" : "Connect TikTok"}
            </a>
          </div>
          {instagram === "connected" && <Notice tone="ok">Instagram connected.</Notice>}
          {instagram === "error" && (
            <Notice tone="bad">
              Couldn&apos;t connect Instagram. It must be a Business or Creator account, and the app&apos;s redirect URL
              must be https://www.riapetmart.com/api/instagram/callback.
            </Notice>
          )}
          <div className={row}>
            <span className="flex items-center gap-2 font-semibold text-choc">
              {status(instagramConnected)}
              Instagram (latest posts on homepage)
            </span>
            <a href="/api/oauth/start?provider=instagram" className={instagramConnected ? btnSecondary : btnPrimary}>
              {instagramConnected ? "Reconnect" : "Connect Instagram"}
            </a>
          </div>
        </Panel>
      </div>

      <SettingsForm values={values} />

      <Panel id="emailtest" title="Test customer emails" Icon={Mail}>
        <p className="max-w-[75ch] text-sm text-ink-2">
          Sends one of every customer email (order confirmed, on its way, Cat Hotel, welcome code, referral, cart
          reminder, restock, review request) with sample details, to your own sign-in email only. Subjects start with
          [TEST]. Sign-up and password-reset emails come from the login service: test those by using &ldquo;Forgot your
          password?&rdquo; on the customer log-in page.
        </p>
        {emailtest?.startsWith("sent-") && (
          <Notice tone="ok">Sent {emailtest.slice(5)} test emails. Check your inbox (and spam).</Notice>
        )}
        {emailtest?.startsWith("failed-") && (
          <Notice tone="bad">{emailtest.slice(7)} emails failed to send. Check the Resend setup.</Notice>
        )}
        <form action={sendTestEmails}>
          <button type="submit" className={btnSecondary}>
            <Mail className="size-4" aria-hidden /> Send me test emails
          </button>
        </form>
      </Panel>
    </div>
  );
}
