import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const API_BASE = "https://api.easyparcel.com/open_api/2026-06";
const TOKEN_URL = "https://api.easyparcel.com/oauth/token";

// ISO 3166-2:MY subdivision codes, keyed by the state names already used
// throughout this project (site.ts, admin settings' same_day_states, etc).
export const MY_STATE_CODES: Record<string, string> = {
  Johor: "MY-01",
  Kedah: "MY-02",
  Kelantan: "MY-03",
  Melaka: "MY-04",
  "Negeri Sembilan": "MY-05",
  Pahang: "MY-06",
  "Pulau Pinang": "MY-07",
  Penang: "MY-07",
  Perak: "MY-08",
  Perlis: "MY-09",
  Selangor: "MY-10",
  Terengganu: "MY-11",
  Sabah: "MY-12",
  Sarawak: "MY-13",
  "Kuala Lumpur": "MY-14",
  Labuan: "MY-15",
  Putrajaya: "MY-16",
};

async function refreshToken(refreshToken: string) {
  const clientId = process.env.EASYPARCEL_CLIENT_ID;
  const clientSecret = process.env.EASYPARCEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("EasyParcel credentials are not set");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
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
  const tokens = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };

  const supabase = createServiceClient();
  await supabase.from("integration_tokens").upsert({
    provider: "easyparcel",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function getValidAccessToken(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("integration_tokens").select("*").eq("provider", "easyparcel").single();
  if (!data) return null;

  const expiresInMs = data.expires_at ? new Date(data.expires_at).getTime() - Date.now() : 0;
  if (expiresInMs > 60_000) return data.access_token;
  if (!data.refresh_token) return null;

  const refreshed = await refreshToken(data.refresh_token);
  if (!refreshed) return null;
  await supabase.from("integration_tokens").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("provider", "easyparcel");
  return refreshed.access_token;
}

export async function isEasyParcelConnected(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("integration_tokens").select("provider").eq("provider", "easyparcel").single();
  return !!data;
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
  const token = await getValidAccessToken();
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
  const token = await getValidAccessToken();
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
            phone_number: receiver.phone,
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
        errors?: string[];
      }[];
    }[];
  };

  if (!res.ok) throw new Error(`EasyParcel booking request failed: ${res.status} ${JSON.stringify(body)}`);

  const order = body.data?.[0];
  const shipment = order?.shipments?.[0];
  if (!order || !shipment || shipment.status !== "success") {
    throw new Error(shipment?.errors?.join(", ") ?? body.message ?? "EasyParcel booking failed");
  }

  return {
    orderNumber: order.order_details.order_number,
    awbNumber: shipment.awb_number,
    awbUrl: shipment.awb_url,
    trackingUrl: shipment.tracking_url,
    courierName: shipment.courier,
  };
}
