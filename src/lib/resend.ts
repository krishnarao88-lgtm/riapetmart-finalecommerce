import "server-only";
import { Resend } from "resend";
import { site } from "@/lib/site";
import { renderEmail, type EmailContent } from "@/lib/email-template";

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

/**
 * Sends a branded email (HTML + plain text). Replies go to the shop inbox, not the no-reply sender.
 * Marketing mail (reminders, review asks) carries an unsubscribe header, which inboxes expect.
 * Throws on failure — Resend reports errors in its result rather than throwing.
 */
export async function sendEmail(to: string, subject: string, content: EmailContent, opts: { marketing?: boolean } = {}) {
  const { html, text } = renderEmail(content);
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    replyTo: site.email,
    subject,
    html,
    text,
    headers: opts.marketing ? { "List-Unsubscribe": `<mailto:${site.email}?subject=Unsubscribe%20${encodeURIComponent(to)}>` } : undefined,
  });
  if (error) throw new Error(`Email to ${to} failed: ${error.message}`);
}
