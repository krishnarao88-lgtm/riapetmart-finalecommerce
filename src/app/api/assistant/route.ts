import { NextResponse } from "next/server";
import { type AssistantProduct, orderStatus, SHOP_FACTS, searchProducts } from "@/lib/assistant-tools";
import { getRunningPromotions } from "@/lib/promotions-server";
import { promoLabel } from "@/lib/promotions";

const MODEL = "claude-haiku-4-5";
const MAX_TURNS = 12;
const MAX_CHARS = 800;
const MAX_TOOL_ROUNDS = 4;

// ponytail: per-instance memory limit, so a visitor hitting several serverless instances gets a bit more.
// Move to a Supabase counter if abuse shows up; the Anthropic console spend limit is the hard cap.
const hits = new Map<string, { count: number; reset: number }>();
function allowed(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + 10 * 60_000 });
    return true;
  }
  h.count += 1;
  return h.count <= 25;
}

const tools = [
  {
    name: "search_products",
    description:
      "Search the shop's live catalogue. Use for any product question. Pass 1-5 short keywords (product type, ingredient, need, brand), e.g. ['hairball','cat food'] or ['skin','shampoo']. Returns products with prices, stock and sales, plus own-brand products that pair with them.",
    input_schema: {
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        pet: { type: "string", enum: ["dog", "cat", "any"] },
      },
      required: ["keywords"],
    },
  },
  {
    name: "get_order_status",
    description:
      "Look up an order. Needs the 8-character order number from the confirmation email (e.g. #1A2B3C4D) and the email used at checkout. Ask the customer for both if missing.",
    input_schema: {
      type: "object",
      properties: { order_number: { type: "string" }, email: { type: "string" } },
      required: ["order_number", "email"],
    },
  },
];

type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
type Message = { role: "user" | "assistant"; content: string | Block[] | { type: string; tool_use_id: string; content: string }[] };

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "The assistant isn't switched on yet." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) {
    return NextResponse.json({ error: "Lots of questions! Please try again in a few minutes, or ask us on WhatsApp." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const history = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const messages: Message[] = history
    .filter((m: unknown): m is { role: string; text: string } => {
      const x = m as { role?: unknown; text?: unknown };
      return (x.role === "user" || x.role === "assistant") && typeof x.text === "string" && x.text.trim().length > 0;
    })
    .map((m: { role: "user" | "assistant"; text: string }) => ({ role: m.role, content: m.text.slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Ask me something about pet food, care or your order." }, { status: 400 });
  }
  while (messages[0]?.role !== "user") messages.shift();

  const { promos } = await getRunningPromotions();
  const system = `You are the friendly shopping assistant for Ria Pet Mart, a pet shop in Rawang, Malaysia. Reply in the customer's language (English, Malay or Chinese), briefly: 2-5 short sentences or a short list, plain text, no markdown, no emojis.

Rules:
- Recommend only products returned by search_products, with their exact names and prices. Never invent products, prices, stock, sizes or discounts. If nothing fits, say so and suggest WhatsApp.
- When search results include own_brand_pairings (Aniamor, Robust, Phyto), suggest one naturally when it genuinely fits the need, and mention it's 10% off when bought together.
- Health: you are not a vet. Give general product guidance only. For symptoms like not eating, vomiting or diarrhoea for more than a day, blood, breathing trouble, seizures, suspected poisoning or parvo, tell them to see a vet now.
- Orders: use get_order_status. Never reveal anything about an order unless the tool found it with the number and email the customer gave.
- Refunds, returns, changes to an order or anything you can't do: explain the policy, then point them to WhatsApp (see shop facts).

${SHOP_FACTS}
Sales running today: ${promos.length ? promos.map((p) => promoLabel(p)).join(", ") : "none"}.`;

  const shown: AssistantProduct[] = [];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system, tools, messages }),
    });
    if (!res.ok) {
      console.error("assistant: anthropic error", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Sorry, I can't answer right now. Please ask us on WhatsApp." }, { status: 502 });
    }
    const data = (await res.json()) as { content: Block[]; stop_reason: string };

    if (data.stop_reason !== "tool_use" || round === MAX_TOOL_ROUNDS) {
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      const unique = [...new Map(shown.map((p) => [p.url, p])).values()].slice(0, 4);
      return NextResponse.json({ text: text || "Sorry, I didn't catch that. Could you rephrase?", products: unique });
    }

    messages.push({ role: "assistant", content: data.content });
    const results = await Promise.all(
      data.content
        .filter((b) => b.type === "tool_use")
        .map(async (b) => {
          let result: unknown;
          try {
            if (b.name === "search_products") {
              const input = b.input as { keywords?: unknown; pet?: string };
              const keywords = Array.isArray(input.keywords) ? input.keywords.map(String) : [];
              const found = await searchProducts(keywords, input.pet);
              shown.push(...found.products.filter((p) => p.in_stock).slice(0, 3), ...found.own_brand_pairings.slice(0, 1));
              result = found;
            } else if (b.name === "get_order_status") {
              const input = b.input as { order_number?: unknown; email?: unknown };
              result = await orderStatus(String(input.order_number ?? ""), String(input.email ?? ""));
            } else {
              result = { error: "Unknown tool" };
            }
          } catch (err) {
            console.error("assistant: tool failed", b.name, err);
            result = { error: "Lookup failed; suggest WhatsApp." };
          }
          return { type: "tool_result", tool_use_id: String(b.id), content: JSON.stringify(result) };
        }),
    );
    messages.push({ role: "user", content: results });
  }
  return NextResponse.json({ error: "Sorry, something went wrong." }, { status: 500 });
}
