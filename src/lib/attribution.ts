// Where an order came from (ad click, campaign, referring site), kept on the order so Admin, Telegram and the
// weekly report can show which channel actually sells. Shared by the browser (capture) and the server (clean).

export const ATTR_KEY = "riapetmart:attr";
const MAX_AGE_MS = 30 * 86_400_000; // same 30-day window most ad platforms use
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid", "ttclid"] as const;
const FIELDS = [...PARAMS, "ref", "landing", "fbp", "fbc", "ip", "ua"] as const;

export type Attribution = Partial<Record<(typeof FIELDS)[number], string>> & { at?: number };

/** Browser: remember the latest outside touch (ad click, UTM link or external referrer). Internal clicks keep it. */
export function captureAttribution() {
  const url = new URL(window.location.href);
  const touch: Attribution = {};
  for (const p of PARAMS) {
    const v = url.searchParams.get(p);
    if (v) touch[p] = v;
  }
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== url.hostname) touch.ref = host;
  } catch {}
  if (!Object.keys(touch).length) return;
  touch.landing = url.pathname;
  touch.at = Date.now();
  localStorage.setItem(ATTR_KEY, JSON.stringify(touch));
}

/** Browser: the stored touch (if still fresh) plus Meta's own cookies, for the checkout request. */
export function readAttribution(): Attribution {
  let stored: Attribution = {};
  try {
    const raw = JSON.parse(localStorage.getItem(ATTR_KEY) ?? "{}") as Attribution;
    if (raw.at && Date.now() - raw.at < MAX_AGE_MS) stored = raw;
  } catch {}
  const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
  const fbp = cookie("_fbp");
  // Meta's documented format when the pixel hasn't set _fbc yet: fb.1.<click time ms>.<fbclid>
  const fbc = cookie("_fbc") ?? (stored.fbclid ? `fb.1.${stored.at}.${stored.fbclid}` : undefined);
  return { ...stored, ...(fbp && { fbp }), ...(fbc && { fbc }) };
}

/** Server: keep only known fields as short plain strings. Never trust the browser's shape. */
export function cleanAttribution(raw: unknown, extra: { ip?: string | null; ua?: string | null } = {}): Attribution | null {
  const input = { ...(raw && typeof raw === "object" ? raw : {}), ip: extra.ip, ua: extra.ua } as Record<string, unknown>;
  const out: Attribution = {};
  for (const f of FIELDS) {
    const v = input[f];
    if (typeof v === "string" && v.trim()) out[f] = v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, f === "ua" ? 300 : 200);
  }
  const at = Number(input.at);
  if (Number.isFinite(at) && at > 0) out.at = Math.floor(at);
  return Object.keys(out).length ? out : null;
}

/** Plain-English channel for Admin and Telegram, e.g. "Meta ad · clearance-oct". */
export function sourceLabel(a: Attribution | null | undefined): string {
  if (!a) return "Direct / unknown";
  const src = (a.utm_source ?? "").toLowerCase();
  const ref = (a.ref ?? "").toLowerCase();
  const has = (...words: string[]) => words.some((w) => src.includes(w) || ref.includes(w));
  let channel: string;
  if (a.fbclid || has("facebook", "instagram") || ["fb", "ig", "meta"].includes(src)) channel = a.fbclid || a.utm_medium ? "Meta ad" : "Facebook / Instagram";
  else if (a.ttclid || has("tiktok")) channel = a.ttclid ? "TikTok ad" : "TikTok";
  else if (a.gclid) channel = "Google ad";
  else if (has("google")) channel = "Google search";
  else if (has("whatsapp", "wa.me")) channel = "WhatsApp";
  else if (has("shopee", "lazada")) channel = src.includes("lazada") || ref.includes("lazada") ? "Lazada" : "Shopee";
  else if (src) channel = a.utm_source!;
  else if (ref) channel = ref.replace(/^www\./, "");
  else return "Direct / unknown";
  return a.utm_campaign ? `${channel} · ${a.utm_campaign}` : channel;
}
