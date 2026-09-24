import "server-only";
import { getValidAccessToken, isConnected, saveTokens, type OAuthTokens } from "@/lib/integration-tokens";
import { MY_STATE_CODES } from "@/lib/my-states";

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
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<OAuthTokens>;
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
