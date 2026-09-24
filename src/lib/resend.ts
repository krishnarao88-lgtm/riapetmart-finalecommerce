import "server-only";
import { Resend } from "resend";
import { site } from "@/lib/site";

// Fixed verified domain: deriving it from site.url breaks sending on preview deployments.
export const FROM = `${site.name} <orders@riapetmart.com>`;

let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  client = new Resend(key);
  return client;
}
