import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { POLICY_UPDATED } from "@/lib/legal/consent";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "What Tuón collects, why, who it is shared with, and the rights you have under the Data Privacy Act.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      updated={POLICY_UPDATED}
      summary={
        <>
          <p>
            We store your account details, the notes you write, and your review
            history — so the app can schedule your cards.
          </p>
          <p>
            <strong>
              When you generate a study set, the text of that note is sent to
              Anthropic
            </strong>{" "}
            so their AI can write your flashcards. Nothing else is sent.
          </p>
          <p>
            We never sell your data, and you can delete everything at any time
            from Settings.
          </p>
        </>
      }
    >
      <p>
        This notice explains how Tuón handles personal information, wherever
        you are. It is written to meet the Philippine Data Privacy Act of 2012
        (Republic Act No. 10173), since that is where Tuón started and where
        most of its infrastructure runs — and we apply the same notice, the
        same rights, and the same account controls to every account
        regardless of country. If your own country gives you additional
        rights, this notice does not reduce them.
      </p>

      <h2>What we collect</h2>

      <h3>What you give us</h3>
      <ul>
        <li>
          <strong>Account</strong> — your email address, and your password if you
          did not sign in with Google. Passwords are handled by Firebase
          Authentication and are never visible to us.
        </li>
        <li>
          <strong>Profile</strong> — your display name, country, education
          level, and strand, subjects, or degree program you choose during
          setup. Country decides which curriculum helpers and payment methods
          you see; nothing else in the app reads it.
        </li>
        <li>
          <strong>Study content</strong> — the notes you write or paste, text
          extracted from PDFs, Word documents, or photos you import, cards
          brought in from an Anki deck, and the flashcards and quizzes
          generated from any of that.
        </li>
      </ul>

      <h3>What the app produces</h3>
      <ul>
        <li>
          <strong>Review history</strong> — how you rated each card and when it
          is next due. This is what makes spaced repetition work.
        </li>
        <li>
          <strong>Usage counters</strong> — how many study sets you have
          generated this month, so we can apply your plan&rsquo;s limit.
        </li>
      </ul>

      <h3>What we do not collect</h3>
      <p>
        We do not use advertising trackers, we do not build advertising profiles,
        and we do not read your notes except as needed to generate the study
        materials you ask for.
      </p>

      <h2>Most imports stay on your device</h2>
      <p>
        When you import a PDF or a Word document, the file is read in your
        browser and never uploaded. When you import an Anki deck, it is
        unzipped and read the same way — entirely in your browser, including
        any cards it contains. In every one of these cases, only the text you
        keep in the note or the resulting flashcards is saved, and only that
        text is later sent for AI generation. The original file never leaves
        your device.
      </p>
      <p>
        A photo is the one exception, and it is a real one: reading
        handwriting needs the AI&rsquo;s vision, so a photo you import is sent
        to Anthropic to be read into text. It is shrunk and compressed in
        your browser first, used once to produce that text, and not stored by
        us afterward.
      </p>

      <h2>Who else processes your data</h2>
      <ul>
        <li>
          <strong>Google (Firebase)</strong> — authentication and database. Your
          account and study content are stored here.
        </li>
        <li>
          <strong>Anthropic</strong> — the AI that writes your flashcards and
          reads your imported photos. A note&rsquo;s text is sent when, and
          only when, you press &ldquo;Generate study set&rdquo;; a photo is
          sent when, and only when, you import one. Your name, email, and
          review history are never sent.
        </li>
        <li>
          <strong>PayMongo</strong> — payment processing for students paying
          from the Philippines (GCash, Maya, and PH-issued cards). We never
          see or store your card or wallet details; PayMongo handles them
          directly and tells us only whether the payment succeeded.
        </li>
        <li>
          <strong>RevenueCat and Stripe</strong> — payment processing for
          students paying from anywhere else, by card. Same rule: we never
          see your card details, only whether the payment succeeded.
        </li>
        <li>
          <strong>Vercel</strong> — hosting. Standard server logs, which may
          include IP addresses.
        </li>
      </ul>
      <p>
        These providers process data on our instructions. Because they operate
        internationally, your data may be processed outside the Philippines
        and outside your own country.
      </p>

      <h2>Why we are allowed to hold it</h2>
      <ul>
        <li>
          <strong>To provide the service you asked for</strong> — we cannot show
          you your notes without storing them.
        </li>
        <li>
          <strong>Your consent</strong> — for optional things such as reminder
          emails, which you can withdraw at any time.
        </li>
        <li>
          <strong>Our legitimate interest</strong> — keeping the service secure
          and preventing abuse.
        </li>
      </ul>

      <h2>Students under 18</h2>
      <p>
        Tuón is built for Senior High School and college students everywhere,
        so we expect many of our users to be minors, wherever they are
        signing up from. If you are under 18, please review this notice with
        a parent or guardian before creating an account. A parent or guardian
        may contact us at any time to see, correct, or delete their
        child&rsquo;s information.
      </p>
      <p>
        This is an attestation, not a verification: the account holder tells
        us a guardian has agreed, and we record that answer, but we have no
        way to confirm a guardian&rsquo;s identity at this scale. If your
        country sets its own age of consent for an information service, that
        age applies to you in addition to the question we ask.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Your account and study content are kept until you delete them. Deleting
        your account removes your profile, notes, study sets, and review history
        from our database. Backups and provider logs may persist for a short
        period afterwards before being overwritten.
      </p>

      <h2>Your rights</h2>
      <p>Under the Data Privacy Act you have the right to:</p>
      <ul>
        <li>be told what we hold about you, and get a copy of it;</li>
        <li>correct anything inaccurate;</li>
        <li>have your data erased;</li>
        <li>take your data elsewhere in a usable format;</li>
        <li>object to certain processing, or withdraw consent;</li>
        <li>
          complain to the National Privacy Commission if you believe your rights
          have been infringed.
        </li>
      </ul>
      <p>
        The first four are built into the app: <strong>Settings</strong> lets you
        download everything we hold and delete your account outright. For
        anything else, email us.
      </p>

      <h2>Security</h2>
      <p>
        Access is enforced at the database level, not just in the app: our
        security rules make one student&rsquo;s notes unreadable by any other
        account, and those rules are covered by an automated test suite. Traffic
        is encrypted in transit.
      </p>
      <p>
        No service can promise perfect security. If a breach affects your
        personal data, we will notify you and the National Privacy Commission as
        the law requires.
      </p>

      <h2>Sharing a study set</h2>
      <p>
        Sharing is off by default. When you turn it on for a set, anyone holding
        that link can view its cards — the link is not listed or searchable
        anywhere. Turning sharing off revokes access immediately. Your notes,
        your other sets, and your review history are never shared.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this notice materially we will tell you in the app before
        the change takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, requests, or complaints:{" "}
        <a href="mailto:hello@tuon.app">hello@tuon.app</a>.
      </p>
    </LegalPage>
  );
}
