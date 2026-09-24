import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { isValidSignature, parseWebhook, verifyChallenge } from "../src/lib/whatsapp.ts";

test("verifyChallenge echoes the challenge only for a matching subscribe request", () => {
  const ok = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "secret", "hub.challenge": "123" });
  assert.equal(verifyChallenge(ok, "secret"), "123");
  assert.equal(verifyChallenge(ok, "other"), null);
  assert.equal(verifyChallenge(ok, undefined), null);
  const wrongMode = new URLSearchParams({ "hub.mode": "unsubscribe", "hub.verify_token": "secret", "hub.challenge": "123" });
  assert.equal(verifyChallenge(wrongMode, "secret"), null);
});

test("isValidSignature accepts Meta's sha256 HMAC and rejects anything else", () => {
  const body = '{"entry":[]}';
  const sig = "sha256=" + createHmac("sha256", "appsecret").update(body).digest("hex");
  assert.equal(isValidSignature(body, sig, "appsecret"), true);
  assert.equal(isValidSignature(body + " ", sig, "appsecret"), false);
  assert.equal(isValidSignature(body, sig, "wrong"), false);
  assert.equal(isValidSignature(body, null, "appsecret"), false);
  assert.equal(isValidSignature(body, sig, undefined), false);
  assert.equal(isValidSignature(body, "sha256=abc", "appsecret"), false);
});

test("parseWebhook extracts messages with sender names, and statuses", () => {
  const { messages, statuses } = parseWebhook({
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: "60123456789", profile: { name: "Aina" } }],
              messages: [{ id: "wamid.1", from: "60123456789", type: "text", text: { body: "Hi, got Royal Canin?" } }],
              statuses: [{ id: "wamid.0", status: "delivered", recipient_id: "60123456789" }],
            },
          },
        ],
      },
    ],
  });
  assert.deepEqual(messages, [
    { id: "wamid.1", from: "60123456789", name: "Aina", type: "text", text: "Hi, got Royal Canin?" },
  ]);
  assert.deepEqual(statuses, [{ id: "wamid.0", status: "delivered", recipient: "60123456789" }]);
  assert.deepEqual(parseWebhook({}), { messages: [], statuses: [] });
});
