import "server-only";
import { getValidAccessToken, isConnected, saveTokens, type OAuthTokens } from "@/lib/integration-tokens";
import { MY_STATE_CODES } from "@/lib/my-states";
import { site } from "@/lib/site";

const API_BASE = "https://api.easyparcel.com/open_api/2026-06";
const TOKEN_URL = "https://api.easyparcel.com/oauth/token";

async function refreshToken(refreshToken: string) {
  const clientId = process.env.EASYPARCEL_CLIENT_ID;
  const clientSecret = process.env.EASYPARCEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EasyParcel credentials are not set");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    // EasyParcel's token docs list redirect_uri on refresh too; it must match the one registered for the app.
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: `${site.url}/api/easyparcel/callback`,
    }),
  });
  const body = (await res.json().catch(() => null)) as Partial<OAuthTokens> | null;
  // An error can come back as JSON without a token; never save that (it used to crash quotes with "Invalid time value").
  if (!res.ok || !body?.access_token || !Number.isFinite(Number(body.expires_in))) {
    console.error("EasyParcel token refresh failed:", res.status, JSON.stringify(body)?.slice(0, 300));
    return null;
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? refreshToken, // keep the old one if EasyParcel doesn't rotate it
    expires_in: Number(body.expires_in),
  };
}

/** Exchanges a one-time OAuth authorization code for tokens (used only by the callback route). */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientId = process.env.EASYPARCEL_CLIENT_ID;
  const clientSecret = process.env.EASYPARCEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EasyParcel credentials are not set");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`EasyParcel token exchange failed: ${res.status} ${await res.text()}`);
  await saveTokens("easyparcel", (await res.json()) as OAuthTokens);
}

/**
 * EasyParcel picks sandbox or live from the account that authorised the OAuth connection (same URLs and
 * client id for both). Sandbox bookings get fake "EPSAMPLE…" waybills; Admin lets those orders be booked again.
 */
export function isSandboxAwb(awbNumber: string | null | undefined) {
  return !!awbNumber?.startsWith("EPSAMPLE");
}

export async function isEasyParcelConnected(): Promise<boolean> {
  return isConnected("easyparcel");
}

type EasyParcelQuotation = {
  courier: { courier_name: string; service_id: string };
  pricing: { total_amount: number; currency: string };
};
type EasyParcelResponse = {
  data?: { status: string; quotations?: EasyParcelQuotation[] }[];
};

export async function getEasyParcelQuote(
  receiverPostcode: string,
  receiverState: string,
  weightKg: number,
): Promise<{ price: number; courierName: string; serviceId: string } | null> {
  const token = await getValidAccessToken("easyparcel", refreshToken);
  if (!token) return null;

  const receiverCode = MY_STATE_CODES[receiverState];
  if (!receiverCode) return null;

  const res = await fetch(`${API_BASE}/shipment/quotations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      shipment: [
        {
          sender: { postcode: "48300", subdivision_code: MY_STATE_CODES.Selangor, country: "MY" },
          receiver: { postcode: receiverPostcode, subdivision_code: receiverCode, country: "MY" },
          weight: weightKg,
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`EasyParcel quote failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const data = (await res.json()) as EasyParcelResponse;
  const quotations = data.data?.[0]?.quotations ?? [];
  const cheapest = [...quotations].sort((a, b) => a.pricing.total_amount - b.pricing.total_amount)[0];
  return cheapest
    ? { price: cheapest.pricing.total_amount, courierName: cheapest.courier.courier_name, serviceId: cheapest.courier.service_id }
    : null;
}

type ListedShipment = { shipment_number?: string; awb_number?: string; shipment_status_code?: number | string; shipment_status?: string };

/** The account's shipments from the last 90 days (newest first, up to 250), or null if EasyParcel didn't answer. */
async function listShipments(token: string): Promise<ListedShipment[] | null> {
  const res = await fetch(`${API_BASE}/shipment/list`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 250, date_from: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10) }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) {
    if (res) console.error(`EasyParcel shipment list failed: ${res.status} ${await res.text()}`);
    return null;
  }
  return ((await res.json()) as { data?: ListedShipment[] }).data ?? [];
}

/**
 * Cancels a booked shipment (only possible before the courier has processed it). EasyParcel refunds the
 * shipping charge to the EasyParcel wallet. Throws a readable message when EasyParcel refuses.
 */
export async function cancelEasyParcelShipment(awbNumber: string, awbUrl: string | null, remark: string) {
  const token = await getValidAccessToken("easyparcel", refreshToken);
  if (!token) throw new Error("EasyParcel is not connected");
  // The cancel call needs the ES-YYMM-XXXXX shipment number: look it up by waybill, else read it off the label link.
  const listed = (await listShipments(token))?.find((s) => s.awb_number === awbNumber)?.shipment_number;
  const shipmentNumber = listed ?? awbUrl?.match(/(ES-\d{4}-[A-Z0-9]+)/)?.[1];
  if (!shipmentNumber) throw new Error("Couldn't find this shipment in EasyParcel. Cancel it in the EasyParcel app instead.");

  const res = await fetch(`${API_BASE}/shipment/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancel_list: [{ shipment_number: shipmentNumber, remark: remark.slice(0, 200) || "Cancelled by shop" }] }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { message?: string; data?: { status?: string; message?: string }[] };
  const result = body.data?.[0];
  // EasyParcel answers 200 even when the cancel failed, so check the per-shipment result.
  if (!res.ok || result?.status !== "success") {
    console.error("EasyParcel cancel rejected:", JSON.stringify(body));
    throw new Error(result?.message ?? body.message ?? "EasyParcel couldn't cancel this shipment");
  }
}

export type TrackingResult = { awb_number: string; latest_shipment_status_code: number; latest_tracking_status: string };

/**
 * Current status for our waybills, straight from EasyParcel (the source of truth for Admin). The shipment
 * list carries the account-side status (a shipment cancelled in EasyParcel shows code 0 there); the courier's
 * tracking feed doesn't, so it's only used for waybills the list didn't return.
 */
export async function getTrackingStatuses(awbNumbers: string[]): Promise<TrackingResult[]> {
  if (awbNumbers.length === 0) return [];
  const token = await getValidAccessToken("easyparcel", refreshToken);
  if (!token) return [];
  const wanted = new Set(awbNumbers);
  const fromList: TrackingResult[] = [];
  for (const s of (await listShipments(token)) ?? []) {
    if (s.awb_number && wanted.has(s.awb_number) && s.shipment_status_code !== undefined) {
      fromList.push({ awb_number: s.awb_number, latest_shipment_status_code: Number(s.shipment_status_code), latest_tracking_status: s.shipment_status ?? "" });
    }
  }
  const missing = awbNumbers.filter((a) => !fromList.some((r) => r.awb_number === a));
  if (missing.length === 0) return fromList;

  const res = await fetch(`${API_BASE}/shipment/tracking_status`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ awb_numbers: missing.slice(0, 100) }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) {
    if (res) console.error(`EasyParcel tracking failed: ${res.status} ${await res.text()}`);
    return fromList;
  }
  const body = (await res.json()) as { data?: { results?: (TrackingResult & { status: string })[] } };
  return [
    ...fromList,
    ...(body.data?.results ?? []).filter((r) => r.status === "success" && typeof r.latest_shipment_status_code === "number"),
  ];
}

type SubmitOrderReceiver = {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  postcode: string;
  state: string;
};

type SubmitOrderResult = {
  orderNumber: string;
  awbNumber: string | null;
  awbUrl: string | null;
  trackingUrl: string | null;
  courierName: string;
};

/** Actually books the shipment with EasyParcel — this deducts from the account's real balance. */
export async function submitEasyParcelOrder(
  serviceId: string,
  weightKg: number,
  receiver: SubmitOrderReceiver,
  reference: string,
): Promise<SubmitOrderResult> {
  const token = await getValidAccessToken("easyparcel", refreshToken);
  if (!token) throw new Error("EasyParcel is not connected");

  const receiverCode = MY_STATE_CODES[receiver.state];
  if (!receiverCode) throw new Error(`Unknown state: ${receiver.state}`);

  const collectionDate = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE}/shipment/submit_orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      shipment: [
        {
          reference,
          service_id: serviceId,
          collection_date: collectionDate,
          weight: weightKg,
          // ponytail: real parcel dimensions aren't tracked per order; a small-parcel
          // default works for this shop's typical items, revisit if bulky items ship.
          height: 15,
          length: 20,
          width: 15,
          item: [{ content: "Pet supplies", weight: weightKg, height: 15, length: 20, width: 15, currency_code: "MYR", value: 1, quantity: 1 }],
          sender: {
            name: "Ria Pet Mart",
            phone_number_country_code: "MY",
            phone_number: "196112848",
            address_1: "57, Jalan Jenjarum 3B, Bandar Bukit Beruntung",
            postcode: "48300",
            city: "Rawang",
            subdivision_code: MY_STATE_CODES.Selangor,
            country_code: "MY",
          },
          receiver: {
            name: receiver.name,
            phone_number_country_code: "MY",
            // National number without the country code, like the sender's: +60 14-646 2194 → 146462194.
            phone_number: receiver.phone.replace(/\D/g, "").replace(/^60/, "").replace(/^0/, ""),
            address_1: receiver.addressLine,
            postcode: receiver.postcode,
            city: receiver.city,
            subdivision_code: receiverCode,
            country_code: "MY",
          },
          feature: { email_tracking: true, whatsapp_tracking: true },
        },
      ],
    }),
  });

  const body = (await res.json()) as {
    status_code: number;
    message: string;
    data?: {
      order_details: { order_number: string };
      shipments: {
        status: string;
        courier: string;
        awb_number: string | null;
        awb_url: string | null;
        tracking_url: string | null;
        errors?: unknown[];
      }[];
    }[];
  };

  if (!res.ok) throw new Error(`EasyParcel booking request failed: ${res.status} ${JSON.stringify(body)}`);

  const order = body.data?.[0];
  const shipment = order?.shipments?.[0];
  if (!order || !shipment || shipment.status !== "success") {
    // Errors can be strings or objects ({ field, message }): show them as readable text, never "[object Object]".
    const errors = (shipment?.errors ?? []).map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
    console.error("EasyParcel booking rejected:", JSON.stringify(body));
    throw new Error(errors.length ? errors.join("; ") : (body.message ?? "EasyParcel booking failed"));
  }

  return {
    orderNumber: order.order_details.order_number,
    awbNumber: shipment.awb_number,
    awbUrl: shipment.awb_url,
    trackingUrl: shipment.tracking_url,
    courierName: shipment.courier,
  };
}
