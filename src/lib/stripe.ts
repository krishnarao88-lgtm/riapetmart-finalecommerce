import Stripe from "stripe";

// Lazy singleton: Next.js evaluates route module config at build time, before
// env vars for the target deployment necessarily exist, so this must not
// throw on import — only when a request actually needs a Stripe call.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key);
  return client;
}
