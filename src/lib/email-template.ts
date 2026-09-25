import { site } from "./site.ts";

export type EmailLine = { name: string; detail?: string; amount?: string };
export type EmailContent = {
  preheader: string; // inbox preview text
  heading: string;
  paragraphs: string[];
  lines?: EmailLine[];
  total?: string;
  code?: string; // a discount code, shown large
  cta?: { label: string; url: string };
  note?: string; // small print under the button
};

const C = { cream: "#fbf1e2", terracotta: "#d9814a", rust: "#a8452b", choc: "#2e1d14", choc2: "#6b5540", line: "#ecdcc6" };
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const addressLine = `${site.address.street}, ${site.address.postcode} ${site.address.city}, ${site.address.state}`;

/** One branded layout for every email the shop sends, with a plain-text twin for clients that block HTML. */
export function renderEmail(e: EmailContent): { html: string; text: string } {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.choc}">${esc(t)}</p>`;
  const rows = (e.lines ?? [])
    .map(
      (l) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.choc}"><strong>${esc(l.name)}</strong>${l.detail ? `<br><span style="color:${C.choc2};font-size:13px">${esc(l.detail)}</span>` : ""}</td>
  <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.choc};white-space:nowrap">${esc(l.amount ?? "")}</td>
</tr>`,
    )
    .join("");
  const table = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px">${rows}${
        e.total
          ? `<tr><td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${C.choc}">Total</td><td align="right" style="padding:12px 0 0;font-size:15px;font-weight:700;color:${C.choc}">${esc(e.total)}</td></tr>`
          : ""
      }</table>`
    : "";
  const code = e.code
    ? `<div style="margin:6px 0 20px;padding:16px;border:2px dashed ${C.terracotta};border-radius:12px;text-align:center;font-size:24px;font-weight:800;letter-spacing:3px;color:${C.rust}">${esc(e.code)}</div>`
    : "";
  const cta = e.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="border-radius:999px;background:${C.terracotta}"><a href="${esc(e.cta.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(e.cta.label)}</a></td></tr></table>`
    : "";
  const note = e.note ? `<p style="margin:0;font-size:13px;line-height:1.5;color:${C.choc2}">${esc(e.note)}</p>` : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:0 4px 14px"><a href="${esc(site.url)}" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${C.rust};text-decoration:none">${esc(site.name)}</a>
    <div style="font-size:12px;color:${C.choc2}">${esc(site.tagline)}</div></td></tr>
  <tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:18px;padding:28px 26px">
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${C.choc}">${esc(e.heading)}</h1>
    ${e.paragraphs.map(p).join("")}${table}${code}${cta}${note}
  </td></tr>
  <tr><td style="padding:18px 6px;font-size:12px;line-height:1.6;color:${C.choc2};text-align:center">
    ${esc(site.name)} · ${esc(addressLine)}<br>
    <a href="https://wa.me/${site.whatsapp}" style="color:${C.rust}">WhatsApp ${esc(site.phone)}</a> · <a href="${esc(site.url)}" style="color:${C.rust}">${esc(site.url.replace(/^https?:\/\//, ""))}</a><br>
    Open ${esc(site.hours.days)}, ${site.hours.opens}–${site.hours.closes}
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    e.heading,
    "",
    ...e.paragraphs.flatMap((t) => [t, ""]),
    ...(e.lines ?? []).map((l) => `- ${l.name}${l.detail ? ` (${l.detail})` : ""}${l.amount ? `  ${l.amount}` : ""}`),
    ...(e.total ? [`Total: ${e.total}`, ""] : e.lines?.length ? [""] : []),
    ...(e.code ? [`Your code: ${e.code}`, ""] : []),
    ...(e.cta ? [`${e.cta.label}: ${e.cta.url}`, ""] : []),
    ...(e.note ? [e.note, ""] : []),
    "--",
    site.name,
    addressLine,
    `WhatsApp ${site.phone} · ${site.url}`,
  ].join("\n");

  return { html, text };
}
