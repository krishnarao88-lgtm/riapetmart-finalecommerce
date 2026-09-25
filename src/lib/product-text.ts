// Supplier text arrives with Windows line breaks, repeated headings and ingredient lists as one
// long line. cleanProductText tidies it on save; textBlocks structures it for display.

export type TextBlock =
  | { kind: "para"; text: string }
  | { kind: "item"; title: string; text: string }
  | { kind: "list"; items: string[] };

const HEADING = /^(ingredients?|composition|dosage|directions?|how to use|usage|feeding guide)\b[^\n]{0,60}\n/i;

/** Normalises whitespace and drops a leading heading that repeats the section title. */
export function cleanProductText(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(HEADING, "")
    .trim();
}

/** Splits on commas that aren't inside brackets: "Salt, Fish (12%, dried)" -> two items. */
function splitList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

/** A comma list of short names (at least 6 of them) reads better as a list than a paragraph. */
function asList(sentence: string): string[] | null {
  const items = splitList(sentence.replace(/\.$/, ""));
  const short = items.every((i) => i.replace(/\([^)]*\)/g, "").trim().split(/\s+/).length <= 6);
  return items.length >= 6 && short ? items : null;
}

export function textBlocks(raw: string | null | undefined): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const para of cleanProductText(raw).split(/\n\n/)) {
    if (!para) continue;
    // "1. Chirata (Swertia chirata):\nDigestive health: …" or "Puppies: 1 tablet …"
    const item = para.match(/^(?:\d+[.)]\s*)?([^:\n]{2,50}):\s*\n?([\s\S]+)$/);
    if (item && (/^\d+[.)]/.test(para) || item[2].includes("\n") || item[1].split(/\s+/).length <= 5)) {
      blocks.push({ kind: "item", title: item[1].trim(), text: item[2].trim() });
      continue;
    }
    // Ingredient line, possibly followed by prose: "Rice, Maize, … Green tea powder. Features …"
    const end = para.search(/\.\s+(?=[A-Z])/);
    const head = end === -1 ? para : para.slice(0, end + 1);
    const list = para.includes("\n") ? null : asList(head);
    if (list) {
      blocks.push({ kind: "list", items: list });
      const rest = para.slice(head.length).trim();
      if (rest) blocks.push({ kind: "para", text: rest });
      continue;
    }
    blocks.push({ kind: "para", text: para });
  }
  return blocks;
}
