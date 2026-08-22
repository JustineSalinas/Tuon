import type { OutgoingEmail } from "@/lib/email/send";

/**
 * The verification email.
 *
 * Written against what actually gets a transactional message delivered and
 * read, rather than what looks good in a design tool:
 *
 * - Tables and inline styles. Gmail strips <style> blocks in some clients and
 *   Outlook's engine is Word; flexbox and external CSS are not options.
 * - No images at all. A message whose meaning depends on remote images breaks
 *   the moment a client blocks them, which most do by default, and image-heavy
 *   mail from a young domain scores worse.
 * - A plain-text part that says the same thing, including the raw URL. A
 *   multipart message with no text alternative is itself a spam signal.
 * - The reason they are receiving it, in the first line. "Why am I getting
 *   this" is what a recipient asks before they decide to trust a link.
 *
 * Firebase's default template failed most of this: the subject and sign-off
 * both read "project-375294634038" because %APP_NAME% falls back to the
 * project id when no public-facing name is set.
 */

const BRAND = "Tuón";
const INK = "#1F1B18";
const MUTED = "#6B6259";
const PRIMARY = "#C0603A";
const PAPER = "#FAF7F2";
const CARD = "#FFFFFF";
const BORDER = "#E4DDD3";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps body content in the shell every Tuón email shares.
 *
 * `preheader` is the snippet mail clients show beside the subject. Left unset
 * they show the first text in the body, which is usually the wordmark — so
 * every message would preview identically.
 */
function shell({
  preheader,
  body,
}: {
  preheader: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(BRAND)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:${PRIMARY};">
            ${escapeHtml(BRAND)}
          </td>
        </tr>
        <tr>
          <td style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:28px 26px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${INK};">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
            ${escapeHtml(BRAND)} — study tool for Philippine students.<br>
            You received this because someone signed up with this address. If it
            was not you, no account is active until this address is verified,
            and you can ignore this message.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** A button that survives Outlook, which ignores padding on anchors. */
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="${PRIMARY}" style="border-radius:10px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function verificationEmail({
  to,
  link,
  displayName,
}: {
  to: string;
  link: string;
  displayName?: string | null;
}): OutgoingEmail {
  const name = displayName?.trim().split(/\s+/)[0];
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const body = `
<p style="margin:0 0 14px;">${greeting}</p>
<p style="margin:0 0 4px;">
  You signed up for ${escapeHtml(BRAND)} with this address. Confirm it and your
  account is ready.
</p>
${button(link, "Verify my email")}
<p style="margin:0 0 6px;font-size:14px;color:${MUTED};">
  Or paste this into your browser:
</p>
<p style="margin:0 0 18px;font-size:13px;word-break:break-all;">
  <a href="${escapeHtml(link)}" style="color:${PRIMARY};">${escapeHtml(link)}</a>
</p>
<p style="margin:0;font-size:14px;color:${MUTED};">
  The link works once and expires in a few days. If you did not sign up, you can
  safely ignore this email.
</p>`;

  const text = [
    greeting.replace(/&[a-z]+;/g, ""),
    "",
    `You signed up for ${BRAND} with this address. Confirm it and your account is ready.`,
    "",
    "Verify your email:",
    link,
    "",
    "The link works once and expires in a few days. If you did not sign up, you can safely ignore this email.",
    "",
    `${BRAND} — study tool for Philippine students.`,
  ].join("\n");

  return {
    to,
    // No project ids, no ALL CAPS, no "ACTION REQUIRED". Says what it is.
    subject: `Verify your email for ${BRAND}`,
    html: shell({
      preheader: `Confirm this address to finish setting up your ${BRAND} account.`,
      body,
    }),
    text,
  };
}
