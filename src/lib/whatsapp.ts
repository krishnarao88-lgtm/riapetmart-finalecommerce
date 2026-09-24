import { createHmac, timingSafeEqual } from "node:crypto";

// Meta's webhook verification handshake: echo hub.challenge only when the token matches ours.
export function verifyChallenge(params: URLSearchParams, expectedToken: string | undefined): string | null {
  if (!expectedToken) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  if (params.get("hub.verify_token") !== expectedToken) return null;
  return params.get("hub.challenge");
}

// Meta signs each POST body with the app secret: header is "sha256=<hex hmac>".
export function isValidSignature(body: string, header: string | null, appSecret: string | undefined): boolean {
  if (!header || !appSecret || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(body).digest("hex"));
  const received = Buffer.from(header.slice("sha256=".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export type IncomingMessage = { from: string; name: string | null; type: string; text: string | null; id: string };
export type StatusUpdate = { id: string; status: string; recipient: string };

type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: { id: string; from: string; type: string; text?: { body?: string } }[];
        statuses?: { id: string; status: string; recipient_id: string }[];
      };
    }[];
  }[];
};

// Flattens a webhook payload into the customer messages and delivery statuses it carries.
export function parseWebhook(payload: WebhookPayload): { messages: IncomingMessage[]; statuses: StatusUpdate[] } {
  const messages: IncomingMessage[] = [];
  const statuses: StatusUpdate[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]));
      for (const m of value.messages ?? []) {
        messages.push({ id: m.id, from: m.from, name: names.get(m.from) ?? null, type: m.type, text: m.text?.body ?? null });
      }
      for (const s of value.statuses ?? []) {
        statuses.push({ id: s.id, status: s.status, recipient: s.recipient_id });
      }
    }
  }
  return { messages, statuses };
}
