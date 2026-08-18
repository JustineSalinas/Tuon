import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { POLICY_UPDATED } from "@/lib/legal/consent";
import { PLANS } from "@/lib/ai/config";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The agreement between you and Tuón — plans, limits, and what we each owe the other.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated={POLICY_UPDATED}
      summary={
        <>
          <p>
            Use Tuón for your own studying. Don&rsquo;t upload things you have no
            right to, and don&rsquo;t try to break the limits.
          </p>
          <p>
            <strong>AI makes mistakes.</strong> Check generated cards against your
            own material before you trust them for an exam.
          </p>
          <p>Your notes stay yours. You can leave and take them with you.</p>
        </>
      }
    >
      <p>
        These terms apply when you use Tuón. By creating an account you accept
        them. If you are under 18, please read them with a parent or guardian.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give a real email address — account recovery depends on it.</li>
        <li>Keep your password to yourself; you are responsible for what happens under your account.</li>
        <li>One account per person.</li>
        <li>Tell us promptly if you think someone else has got in.</li>
      </ul>

      <h2>What you may upload</h2>
      <p>You keep ownership of everything you write or paste. You are telling us that:</p>
      <ul>
        <li>you have the right to use that material;</li>
        <li>
          you will not upload anything unlawful, hateful, or that infringes
          someone else&rsquo;s rights;
        </li>
        <li>
          you understand that copying a textbook wholesale may infringe its
          copyright, and that responsibility is yours.
        </li>
      </ul>
      <p>
        We grant ourselves only the narrow permission needed to run the service:
        to store your content, show it back to you, and send a note&rsquo;s text
        for AI generation when you ask for it.
      </p>

      <h2>What the AI produces</h2>
      <p>
        Flashcards and quizzes are generated automatically from your notes.{" "}
        <strong>
          They can be wrong, incomplete, or misleading, even when they read
          convincingly.
        </strong>{" "}
        They are a study aid, not a source of truth, and not a substitute for
        your teacher, textbook, or your own judgement. Always check anything
        that matters against your course material.
      </p>
      <p>
        The AI is instructed to use only what is in your note. If your note
        contains an error, expect the flashcards to repeat it.
      </p>

      <h2>Plans and limits</h2>
      <ul>
        <li>
          <strong>{PLANS.free.name}</strong> — {PLANS.free.monthlyGenerations} AI
          study sets each calendar month.
        </li>
        <li>
          <strong>{PLANS.plus.name}</strong> — {PLANS.plus.monthlyGenerations} a
          month, at ₱{PLANS.plus.phpMonthly}.
        </li>
        <li>
          <strong>{PLANS.pro.name}</strong> — {PLANS.pro.monthlyGenerations} a
          month, at ₱{PLANS.pro.phpMonthly}.
        </li>
      </ul>
      <p>
        Writing notes, importing PDFs, making your own flashcards, and reviewing
        are unlimited on every plan. Limits reset at the start of each calendar
        month, Philippine time. If a generation fails, it is not counted against
        your allowance.
      </p>

      <h2>Paying</h2>
      <p>
        Paid plans are not yet available. When they are, these terms will be
        updated to cover billing, renewal, and refunds before any payment is
        taken, and we will tell you in the app first.
      </p>

      <h2>Things you must not do</h2>
      <ul>
        <li>Create accounts automatically, or make accounts to get around plan limits.</li>
        <li>Call our interfaces other than through the app.</li>
        <li>Resell access, or scrape content in bulk.</li>
        <li>Try to get the AI to produce material unrelated to studying.</li>
        <li>Interfere with the service or with other people&rsquo;s use of it.</li>
      </ul>
      <p>We may suspend accounts that do these things.</p>

      <h2>Sharing</h2>
      <p>
        If you share a study set by link, you are responsible for what it
        contains and who you send it to. We may remove shared content that
        breaks these terms.
      </p>

      <h2>Leaving</h2>
      <p>
        You can delete your account at any time in Settings. Export your data
        first if you want to keep it — deletion removes your notes, sets, and
        review history and cannot be undone.
      </p>
      <p>
        We may close an account that seriously or repeatedly breaks these terms.
        Where we reasonably can, we will give you notice and a chance to export
        your data.
      </p>

      <h2>Availability</h2>
      <p>
        Tuón is provided as-is. We do not promise it will always be available or
        error-free, and we may change or discontinue features. If we shut the
        service down, we will give reasonable notice and time to export.
      </p>

      <h2>Liability</h2>
      <p>
        Nothing here limits liability that cannot be limited by law. Otherwise,
        to the extent the law allows, we are not liable for indirect or
        consequential loss, including exam results. This is a study tool; your
        academic outcomes remain your own.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of the Philippines.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@tuon.app">hello@tuon.app</a>
      </p>
    </LegalPage>
  );
}
