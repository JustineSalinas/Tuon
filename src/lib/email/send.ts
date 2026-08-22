import { log } from "@/lib/observability/log";

/**
 * Transactional email, sent from a domain we own.
 *
 * Firebase Auth's built-in mailer sends from `noreply@<project>.firebaseapp.com`
 * — a domain shared by every Firebase project on earth, including the abusive
 * ones. There is no SPF/DKIM/DMARC alignment to anything we control, so we
 * inherit that pooled reputation and cannot improve it. Gmail put our
 * verification mail straight in spam with "similar to messages that were
 * identified as spam in the past", which is exactly that.
 *
 * Sending it ourselves is the only durable fix: our own domain, our own
 * signing, our own reputation.
 *
 * The provider is deliberately behind one function. Resend is the default
 * because its API is a single POST, but nothing above this file knows that.
 */

export type SendResult =
  /** Delivered to the provider. */
  | { ok: true }
  /**
   * No provider configured. NOT an error: until a domain and an API key exist,
   * callers fall back to Firebase's built-in mailer so signup keeps working.
   */
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "failed"; detail: string };

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  /**
   * Plain-text alternative. Required rather than optional: a multipart message
   * with no text part is itself a spam signal, and this is the one place a
   * caller would be tempted to skip it.
   */
  text: string;
}

/** Whether a real provider is wired up. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: OutgoingEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "not_configured" };

  const replyTo = process.env.EMAIL_REPLY_TO;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // The body carries the actual reason (unverified domain, bad key). It is
      // logged but never returned to the browser: it names our infrastructure.
      const detail = await response.text().catch(() => "");
      log.error({
        scope: "email",
        event: "send.rejected",
        status: response.status,
        detail: detail.slice(0, 500),
      });
      return { ok: false, reason: "failed", detail: `status ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    log.error({
      scope: "email",
      event: "send.threw",
      detail: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "failed", detail: "network" };
  }
}
