/**
 * The verification email.
 *
 * These pin the things that actually decide whether a transactional message
 * gets delivered and trusted, because every one of them is easy to break in a
 * refactor and impossible to notice from the app: you only find out when mail
 * stops arriving.
 */
import assert from "node:assert/strict";

import { verificationEmail } from "../src/lib/email/templates.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const LINK = "https://tuon-1673l9ve.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc123";

console.log("\nVerification email");

check("the subject names the product, never a project id", () => {
  // Firebase's default read "Verify your email for project-375294634038",
  // because %APP_NAME% falls back to the project id. That is what made it look
  // machine-generated.
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.equal(mail.subject, "Verify your email for Tuón");
  assert.doesNotMatch(mail.subject, /project-\d+/);
});

check("a plain-text alternative is always present and carries the link", () => {
  // A multipart message with no text part is itself a spam signal, and some
  // clients show the text part instead of the HTML.
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.ok(mail.text.length > 80, "text part should be a real message");
  assert.ok(mail.text.includes(LINK), "text part must contain the link");
  assert.doesNotMatch(mail.text, /<[a-z]/i, "text part must not contain markup");
});

check("the HTML contains no remote images", () => {
  // Most clients block them by default, and image-heavy mail from a young
  // sending domain scores worse.
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.doesNotMatch(mail.html, /<img/i);
  assert.doesNotMatch(mail.html, /background-image/i);
});

check("the HTML pulls in no external stylesheets or fonts", () => {
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.doesNotMatch(mail.html, /<link[^>]+stylesheet/i);
  assert.doesNotMatch(mail.html, /@import/i);
});

check("the link appears as a clickable button and as raw text", () => {
  // The raw URL is the fallback for clients that mangle the button, and it
  // lets a cautious reader see where they are going before clicking.
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  const occurrences = mail.html.split(LINK.replace(/&/g, "&amp;")).length - 1;
  assert.ok(occurrences >= 2, `link appeared ${occurrences} times, expected 2+`);
});

check("a preheader is set so the preview is not just the wordmark", () => {
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.match(mail.html, /Confirm this address/);
});

check("it says why the message was received", () => {
  // "Why am I getting this" is what a recipient asks before trusting a link.
  const mail = verificationEmail({ to: "a@b.com", link: LINK });
  assert.match(mail.html, /You received this because/i);
  assert.match(mail.text, /If you did not sign up/i);
});

check("the greeting uses a first name when there is one", () => {
  const mail = verificationEmail({
    to: "a@b.com",
    link: LINK,
    displayName: "Adrian Salinas",
  });
  assert.match(mail.html, /Hi Adrian,/);
  assert.match(mail.text, /Hi Adrian,/);
});

check("a missing or blank display name degrades to a plain greeting", () => {
  for (const displayName of [null, undefined, "   "]) {
    const mail = verificationEmail({ to: "a@b.com", link: LINK, displayName });
    assert.match(mail.html, /Hi,/);
    assert.doesNotMatch(mail.html, /Hi\s+,/, "no dangling comma");
  }
});

check("a hostile display name cannot inject markup", () => {
  // displayName is user-controlled and lands in HTML we send to an inbox.
  const mail = verificationEmail({
    to: "a@b.com",
    link: LINK,
    displayName: '<script>alert(1)</script>',
  });
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
});

check("the recipient is carried through untouched", () => {
  const mail = verificationEmail({ to: "student@example.ph", link: LINK });
  assert.equal(mail.to, "student@example.ph");
});

console.log(`\n${passed} checks passed.\n`);
