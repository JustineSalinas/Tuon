/**
 * Sends one real verification email, to prove the Resend setup works.
 *
 * Exists because the alternative way to test this is to sign up a throwaway
 * account in production and wait — and when it fails you cannot tell whether
 * the key is wrong, the domain is unverified, or the template broke.
 *
 * Reads RESEND_API_KEY and EMAIL_FROM from .env.local. Never prints the key.
 *
 *   npm run email:test -- you@example.com
 */
import { readFileSync } from "node:fs";

import { verificationEmail } from "../src/lib/email/templates.ts";

function readEnv(name) {
  // Deliberately not dotenv: this script must not add a dependency, and the
  // format we need is one KEY=value per line.
  let text;
  try {
    text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    throw new Error("No .env.local found. Copy .env.example and fill it in.");
  }
  const line = text
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${name}=`));
  const value = line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error(`${name} is not set in .env.local.`);
  return value;
}

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Usage: npm run email:test -- you@example.com");
  process.exit(1);
}

let apiKey;
let from;
try {
  apiKey = readEnv("RESEND_API_KEY");
  from = readEnv("EMAIL_FROM");
} catch (error) {
  console.error(`\n${error.message}\n`);
  process.exit(1);
}

// A real-shaped link, so the template renders exactly as it will in production.
const message = verificationEmail({
  to,
  displayName: "Test Student",
  link: "https://example.com/__/auth/action?mode=verifyEmail&oobCode=TEST-LINK-NOT-REAL",
});

console.log(`\nFrom:    ${from}`);
console.log(`To:      ${to}`);
console.log(`Subject: ${message.subject}\n`);

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: message.subject,
    html: message.html,
    text: message.text,
  }),
});

const body = await response.text();

if (!response.ok) {
  console.error(`FAILED (HTTP ${response.status})`);
  console.error(body);
  // The two failures worth naming, because the message alone is cryptic.
  if (response.status === 403 || /domain/i.test(body)) {
    console.error(
      "\nUsually means the domain in EMAIL_FROM is not verified in Resend yet.\n" +
        "Add it under Domains and publish the DNS records it gives you.",
    );
  }
  if (response.status === 401) {
    console.error("\nUsually means RESEND_API_KEY is wrong or was revoked.");
  }
  process.exit(1);
}

console.log("Sent. Check the inbox, and check spam — where it lands is the point.");
console.log(body);
