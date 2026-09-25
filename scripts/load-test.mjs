#!/usr/bin/env node
// Shopper load test: many "customers" at once browse, search, open products and price a cart.
// Read-only on purpose: it never starts checkout, books delivery or creates orders.
//
//   node scripts/load-test.mjs https://<preview-url> [stages]
//   stages = comma list of concurrent shoppers, each held for 30 s (default 10,25,50,100)
//
// Point it at a preview deployment, not the live shop.

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/load-test.mjs https://<preview-url> [10,25,50,100]");
  process.exit(1);
}
const stages = (process.argv[3] ?? "10,25,50,100").split(",").map(Number).filter((n) => n > 0);
const STAGE_MS = 30_000;
// Vercel previews are password-protected. If no real bypass key was given, ask for it.
let bypass = process.env.VERCEL_BYPASS ?? "";
if (/\.vercel\.app$/.test(new URL(base).hostname) && (!bypass || /PASTE|your-|KEY_HERE/i.test(bypass))) {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("This preview is protected. In Vercel: project → Settings → Deployment Protection →");
  console.log("Protection Bypass for Automation. Copy that secret and paste it below.");
  bypass = (await rl.question("Bypass secret: ")).trim();
  rl.close();
}
const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};

const SEARCHES = ["royal canin", "cat food", "kitten", "treats", "litter", "aniamor", "shampoo", "dog food"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Real product links and variant ids come from the shop's own sitemap and product pages.
async function discover() {
  const xml = await (await fetch(`${base}/sitemap.xml`, { headers })).text();
  let products = [...xml.matchAll(/<loc>([^<]*\/shop\/[^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (!products.length) {
    // Fall back to the product links on the shop page itself.
    const html = await (await fetch(`${base}/shop`, { headers })).text();
    products = [...new Set([...html.matchAll(/href="(\/shop\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  }
  products = products.slice(0, 60);
  if (!products.length) {
    console.error("Found no product pages. The bypass secret was probably wrong: copy it again from Vercel and retry.");
    process.exit(1);
  }
  const variants = new Set();
  for (const path of products.slice(0, 8)) {
    const html = await (await fetch(base + path, { headers })).text();
    for (const m of html.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)) variants.add(m[0]);
  }
  // Pages contain other ids too (products, images); keep only ones the cart accepts.
  const valid = [];
  for (const id of [...variants].slice(0, 40)) {
    const res = await fetch(`${base}/api/cart-price`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ lines: [{ variantId: id, qty: 1 }] }),
    });
    if (res.ok) valid.push(id);
  }
  return { products, variants: valid };
}

// One shopper's visit: home → shop → search → two products → price the cart.
function journey({ products, variants }) {
  const steps = [
    ["home", () => fetch(`${base}/`, { headers })],
    ["shop", () => fetch(`${base}/shop`, { headers })],
    ["search", () => fetch(`${base}/shop?q=${encodeURIComponent(pick(SEARCHES))}`, { headers })],
    ["product", () => fetch(base + pick(products), { headers })],
    ["product", () => fetch(base + pick(products), { headers })],
  ];
  if (variants.length) {
    steps.push([
      "cart-price",
      () =>
        fetch(`${base}/api/cart-price`, {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ lines: [{ variantId: pick(variants), qty: 1 }] }),
        }),
    ]);
  }
  return steps;
}

const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);

async function runStage(users, site) {
  const stats = new Map();
  const record = (name, ms, ok) => {
    const s = stats.get(name) ?? { times: [], errors: 0 };
    s.times.push(ms);
    if (!ok) s.errors += 1;
    stats.set(name, s);
  };
  const end = Date.now() + STAGE_MS;
  const shopper = async () => {
    while (Date.now() < end) {
      for (const [name, go] of journey(site)) {
        const t = performance.now();
        let ok = false;
        try {
          const res = await go();
          await res.arrayBuffer();
          ok = res.ok;
        } catch {}
        record(name, performance.now() - t, ok);
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 700)); // think time
      }
    }
  };
  await Promise.all(Array.from({ length: users }, shopper));

  console.log(`\n${users} shoppers at once, ${STAGE_MS / 1000}s`);
  console.log("step         requests  errors   median    p95     slowest");
  for (const [name, s] of stats) {
    const t = s.times.sort((a, b) => a - b);
    const ms = (n) => `${Math.round(n)}ms`.padStart(7);
    console.log(
      `${name.padEnd(12)} ${String(t.length).padStart(8)} ${String(s.errors).padStart(7)} ${ms(pct(t, 50))} ${ms(pct(t, 95))} ${ms(t.at(-1))}`,
    );
  }
}

const site = await discover();
console.log(`Testing ${base}: ${site.products.length} product pages, ${site.variants.length} variant ids found`);
for (const users of stages) await runStage(users, site);
