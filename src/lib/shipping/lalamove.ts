import "server-only";
import { createHmac } from "node:crypto";
import { geocodeAddress } from "@/lib/geocode";
import { site } from "@/lib/site";
import { toE164MY } from "./lalamove-rules";

const BASE_URL = process.env.LALAMOVE_SANDBOX === "false"
  ? "https://rest.lalamove.com"
  : "https://rest.sandbox.lalamove.com";

function sign(method: string, path: string, body: string, timestamp: string, secret: string): string {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return createHmac("sha256", secret).update(raw).digest("hex");
}

async function lalamoveRequest(method: "GET" | "POST", path: string, body?: unknown) {
  const key = process.env.LALAMOVE_API_KEY;
  const secret = process.env.LALAMOVE_API_SECRET;
  if (!key || !secret) throw new Error("Lalamove credentials are not set");

  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const timestamp = Date.now().toString();
  const signature = sign(method, path, bodyStr, timestamp, secret);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `hmac ${key}:${timestamp}:${signature}`,
      Market: "MY",
      "Request-ID": crypto.randomUUID(),
      "Content-Type": "application/json",
    },
    body: bodyStr || undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.errors?.[0]?.message ?? json?.errors?.[0]?.id ?? res.statusText;
    throw new Error(`Lalamove ${res.status}: ${detail}`);
  }
  return json;
}

function quotationBody(dropoff: { lat: string; lng: string }, dropoffAddress: string, weightKg: number) {
  return {
    data: {
      serviceType: "MOTORCYCLE",
      language: "en_MY",
      stops: [
        {
          coordinates: { lat: String(site.geo.lat), lng: String(site.geo.lng) },
          address: `${site.address.street}, ${site.address.city}, ${site.address.postcode} ${site.address.state}`,
        },
        { coordinates: dropoff, address: dropoffAddress },
      ],
      item: { quantity: "1", weight: weightKg <= 3 ? "LESS_THAN_3_KG" : "3_TO_10_KG", categories: ["OTHERS"] },
    },
  };
}

/** Quotes and books a rider in one go (quotes expire after 5 minutes, so never reuse the checkout quote). */
export async function bookLalamoveOrder(opts: {
  dropoffAddress: string;
  weightKg: number;
  recipientName: string;
  recipientPhone: string;
  remarks: string;
  orderRef: string;
}): Promise<{ orderId: string; shareLink: string | null; status: string; price: string }> {
  const dropoff = await geocodeAddress(opts.dropoffAddress);
  if (!dropoff) throw new Error("Couldn't locate the delivery address on the map.");
  const quote = (await lalamoveRequest("POST", "/v3/quotations", quotationBody(dropoff, opts.dropoffAddress, opts.weightKg))).data;
  const [pickupStop, dropoffStop] = quote.stops;

  const order = (
    await lalamoveRequest("POST", "/v3/orders", {
      data: {
        quotationId: quote.quotationId,
        sender: { stopId: pickupStop.stopId, name: site.name, phone: toE164MY(site.phone) },
        recipients: [{ stopId: dropoffStop.stopId, name: opts.recipientName, phone: opts.recipientPhone, remarks: opts.remarks }],
        isPODEnabled: true,
        metadata: { orderRef: opts.orderRef },
      },
    })
  ).data;
  return { orderId: order.orderId, shareLink: order.shareLink ?? null, status: order.status, price: order.priceBreakdown?.total };
}

/** Authoritative order state straight from Lalamove (used to verify webhook calls). */
export async function getLalamoveOrder(orderId: string): Promise<{ status: string; shareLink: string | null }> {
  const data = (await lalamoveRequest("GET", `/v3/orders/${encodeURIComponent(orderId)}`)).data;
  return { status: data.status, shareLink: data.shareLink ?? null };
}

export async function getLalamoveQuote(
  dropoffAddress: string,
  weightKg: number,
): Promise<{ price: number; currency: string } | null> {
  const dropoff = await geocodeAddress(dropoffAddress);
  if (!dropoff) return null;

  const data = await lalamoveRequest("POST", "/v3/quotations", quotationBody(dropoff, dropoffAddress, weightKg)).catch(() => null);

  const total = data?.data?.priceBreakdown?.total;
  if (!total) return null;
  return { price: Number(total), currency: data.data.priceBreakdown.currency ?? "MYR" };
}
