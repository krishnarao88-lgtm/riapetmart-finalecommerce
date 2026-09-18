import "server-only";
import { createHmac } from "node:crypto";
import { geocodeAddress } from "@/lib/geocode";
import { site } from "@/lib/site";

const BASE_URL = process.env.LALAMOVE_SANDBOX === "false"
  ? "https://rest.lalamove.com"
  : "https://rest.sandbox.lalamove.com";

function sign(method: string, path: string, body: string, timestamp: string, secret: string): string {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return createHmac("sha256", secret).update(raw).digest("hex");
}

async function lalamoveRequest(path: string, body: unknown) {
  const key = process.env.LALAMOVE_API_KEY;
  const secret = process.env.LALAMOVE_API_SECRET;
  if (!key || !secret) throw new Error("Lalamove credentials are not set");

  const bodyStr = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const signature = sign("POST", path, bodyStr, timestamp, secret);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `hmac ${key}:${timestamp}:${signature}`,
      Market: "MY",
      "Request-ID": crypto.randomUUID(),
      "Content-Type": "application/json",
    },
    body: bodyStr,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getLalamoveQuote(
  dropoffAddress: string,
  weightKg: number,
): Promise<{ price: number; currency: string } | null> {
  const dropoff = await geocodeAddress(dropoffAddress);
  if (!dropoff) return null;

  const data = await lalamoveRequest("/v3/quotations", {
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
  });

  const total = data?.data?.priceBreakdown?.total;
  if (!total) return null;
  return { price: Number(total), currency: data.data.priceBreakdown.currency ?? "MYR" };
}
