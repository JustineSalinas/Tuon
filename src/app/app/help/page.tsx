"use client";

/**
 * How Tuón works.
 *
 * Onboarding teaches the shape of the app in four screens and is never seen
 * again; the first-run dashboard teaches the loop and disappears the moment
 * there is data. Neither is where someone goes three weeks later wondering
 * what "shaky" means, or why a card they answered correctly came back the
 * next day anyway. That is what this page is for.
 *
 * It leads with the four rating buttons rather than with the tour, because
 * that is the one thing in a spaced-repetition app that is genuinely
 * counter-intuitive: the honest answer schedules better than the flattering
 * one, and nothing on the review screen has room to say so.
 *
 * Every section links to the thing it describes. A help page that explains a
 * feature without offering a way in is a manual, and nobody reads manuals.
 */

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Download,
  GraduationCap,
  LifeBuoy,
  Mail,
  Users,
} from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "hello@tuon.app";

/**
 * The rating swatches, in schedule order.
 *
 * Coloured the way the review screen colours them, so the explanation and the
 * buttons it explains are recognisably the same four things.
 */
const RATING_STYLES = [
  "bg-destructive/15 text-destructive",
  "bg-warning/20 text-warning-text",
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
];

export default function HelpPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
          <LifeBuoy className="size-3.5" />
          {t.nav.help}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          {t.help.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t.help.subtitle}
        </p>
      </header>

      {/* The loop, with a way into each step. */}
      <Section title={t.help.loopTitle} body={t.help.loopBody}>
        <ol className="mt-4 grid gap-3">
          {t.help.loopSteps.map((step, index) => (
            <li
              key={step.title}
              className="bg-card flex flex-wrap items-start gap-4 rounded-2xl border p-4"
            >
              <span className="bg-secondary text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                render={<Link href={step.href} />}
              >
                {step.action}
                <ArrowRight />
              </Button>
            </li>
          ))}
        </ol>
      </Section>

      {/* The part worth reading twice. */}
      <Section title={t.help.ratingsTitle} body={t.help.ratingsBody}>
        <dl className="mt-4 divide-y rounded-2xl border">
          {t.help.ratings.map((rating, index) => (
            <div key={rating.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-4">
              <dt
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${RATING_STYLES[index]}`}
              >
                {rating.label}
              </dt>
              <dd className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
                {rating.body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {t.help.ratingsFootnote}
        </p>
      </Section>

      {/* A glossary, because these words appear on five screens each. */}
      <Section title={t.help.wordsTitle}>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {t.help.words.map((word) => (
            <div key={word.term}>
              <dt className="text-sm font-medium">{word.term}</dt>
              <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {word.body}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t.help.modesTitle}>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {t.help.modes.map((mode) => (
            <div key={mode.title} className="bg-card rounded-2xl border p-4">
              <p className="font-medium">{mode.title}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {mode.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Feature
        icon={CalendarDays}
        title={t.help.organiserTitle}
        body={t.help.organiserBody}
        action={t.help.organiserAction}
        href="/app/calendar"
      />
      <Feature
        icon={Users}
        title={t.help.groupsTitle}
        body={t.help.groupsBody}
        action={t.help.groupsAction}
        href="/app/groups"
      />
      <Feature
        icon={GraduationCap}
        title={t.help.subjectsTitle}
        body={t.help.subjectsBody}
        action={t.help.subjectsAction}
        href="/app/settings#semesters"
      />
      <Feature
        icon={Download}
        title={t.help.exportTitle}
        body={t.help.exportBody}
        action={t.help.exportAction}
        href="/app/notes"
      />

      <Section title={t.help.troubleTitle}>
        <div className="mt-4 divide-y rounded-2xl border">
          {t.help.trouble.map((item) => (
            <div key={item.title} className="p-4">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <section className="border-primary/30 bg-accent/30 mt-10 rounded-2xl border p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t.help.contactTitle}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {t.help.contactBody(SUPPORT_EMAIL)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          render={<a href={`mailto:${SUPPORT_EMAIL}`} />}
        >
          <Mail />
          {t.help.contactAction}
        </Button>
      </section>
    </main>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {body ? (
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
      ) : null}
      {children}
    </section>
  );
}

/** One feature, its explanation, and the way in. */
function Feature({
  icon: Icon,
  title,
  body,
  action,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <section className="mt-8 flex flex-wrap items-start gap-4">
      <span className="bg-secondary text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" render={<Link href={href} />}>
          {action}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
