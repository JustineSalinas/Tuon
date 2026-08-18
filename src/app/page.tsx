"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock, FileText, Layers, Sparkles } from "lucide-react";

import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { TuonMark, Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";
import {
  GENERATION_EXPLAINER,
  PLANS,
  PLAN_ORDER,
  annualFreeMonths,
  annualMonthlyEquivalent,
} from "@/lib/ai/config";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <HowItWorks />
          <BuiltForPH />
          <Pricing />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}

function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-8">
        <Link href="/">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>Sign in</Button>
          <Button size="sm" render={<Link href="/signup" />}>Get started</Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="paper-grain relative overflow-hidden border-b">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            Built for Filipino students
          </Badge>

          <h1 className="font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
            Your notes, turned into
            <span className="text-primary"> everything you need to study.</span>
          </h1>

          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Paste your lecture notes. Tuón writes the flashcards and a practice quiz,
            then schedules each card to come back right before you would have
            forgotten it.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="text-base" render={<Link href="/signup" />}>
                Start free
                <ArrowRight />
              </Button>
            <Button size="lg" variant="outline" className="text-base" render={<Link href="/login" />}>I already have an account</Button>
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            Free forever for notes and flashcards ·{" "}
            {PLANS.free.monthlyGenerations} AI study sets a month
          </p>
        </motion.div>

        {/* Meaning of the name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 flex items-start gap-4 border-t pt-8"
        >
          <TuonMark className="text-primary mt-1 size-6 shrink-0" />
          <p className="text-muted-foreground max-w-lg leading-relaxed">
            <span className="text-foreground font-display text-lg font-semibold">
              tuón
            </span>{" "}
            <span className="text-sm">· Cebuano and Tagalog</span>
            <br />
            To study. To give something your full attention.
          </p>
        </motion.div>
      </div>

      {!reduceMotion ? (
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute -top-32 -right-32 size-[36rem] rounded-full blur-3xl"
        />
      ) : null}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: FileText,
      title: "Paste your notes",
      body: "Lecture notes, a textbook excerpt, your handwritten reviewer typed up. Tag it with a subject so everything stays organised.",
    },
    {
      icon: Sparkles,
      title: "Generate a study set",
      body: "One tap gives you 8 to 15 flashcards and a 5-question practice quiz, written from your material and nothing else.",
    },
    {
      icon: Layers,
      title: "Review on schedule",
      body: "Rate each card Again, Hard, Good or Easy. The SM-2 algorithm decides when you see it next, so you study less and remember more.",
    },
  ];

  return (
    <Section
      eyebrow="How it works"
      title="From notes to knowing it, in three steps"
    >
      <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.1}>
            <div className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
              <step.icon className="size-5" />
            </div>
            <div className="text-muted-foreground mt-5 text-xs font-medium tracking-widest uppercase">
              Step {index + 1}
            </div>
            <h3 className="font-display mt-2 text-xl font-semibold tracking-tight">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-2.5 leading-relaxed">{step.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function BuiltForPH() {
  const points = [
    "Senior High strands built in — STEM, ABM, HUMSS and GAS, with the right subjects for each",
    "Core subjects like General Mathematics, Earth and Life Science and Oral Communication ready to pick",
    "College programs from BS Nursing to AB Communication, with room to add your own",
    "UPCAT, ACET and DCAT prep treated as first-class subjects",
    "Notes that mix English and Tagalog or Cebuano stay exactly as you wrote them",
  ];

  return (
    <Section
      eyebrow="Built for here"
      title="It already knows your curriculum"
      muted
    >
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Most study apps are built for American classrooms and then translated.
            Tuón starts from the Philippine K-12 system, so setting up takes three
            taps instead of typing out every subject yourself.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="space-y-3.5">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={3} />
                <span className="text-sm leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const freeMonths = annualFreeMonths("plus");

  return (
    <Section eyebrow="Pricing" title="Priced in pesos, capped honestly">
      <Reveal>
        <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          One <span className="text-foreground font-medium">study set</span> is{" "}
          {GENERATION_EXPLAINER}. Writing notes, importing PDFs, making your own
          flashcards, and the entire review schedule are unlimited on every plan
          — including Free.
        </p>
      </Reveal>

      {/* Billing period */}
      <Reveal delay={0.05}>
        <div
          role="group"
          aria-label="Billing period"
          className="bg-secondary mt-8 inline-flex rounded-full p-1"
        >
          {[
            { label: "Monthly", value: false },
            { label: `Yearly · ${freeMonths} months free`, value: true },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setAnnual(option.value)}
              aria-pressed={annual === option.value}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                annual === option.value
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((planId, index) => (
          <Reveal key={planId} delay={index * 0.08}>
            <PlanCard planId={planId} annual={annual} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
          Why numbers instead of &ldquo;unlimited&rdquo;: every study set costs us
          real money to generate. A cap we can honour beats an unlimited promise
          we&rsquo;d have to quietly throttle. For scale, a student carrying six
          subjects and making a reviewer for each twice a week uses about 48 a
          month.
        </p>
      </Reveal>
    </Section>
  );
}

function PlanCard({ planId, annual }: { planId: Plan; annual: boolean }) {
  const plan = PLANS[planId];
  const isFree = plan.phpMonthly === 0;
  const perMonth = annual ? annualMonthlyEquivalent(planId) : plan.phpMonthly;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border p-7",
        plan.highlighted && "border-primary/50 bg-accent/30 lg:-my-2 lg:py-9",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          {plan.name}
        </h3>
        {plan.highlighted ? <Badge>Most popular</Badge> : null}
      </div>

      <div className="font-display mt-3 text-4xl font-semibold">
        ₱{perMonth}
        {isFree ? null : (
          <span className="text-muted-foreground text-lg font-normal">/month</span>
        )}
      </div>

      <p className="text-muted-foreground mt-2 min-h-10 text-sm leading-relaxed">
        {annual && plan.phpAnnual
          ? `₱${plan.phpAnnual.toLocaleString("en-PH")} billed once a year.`
          : plan.tagline}
      </p>

      <ul className="mt-6 space-y-3 text-sm">
        {plan.features.map((feature) => (
          <PricingRow key={feature}>{feature}</PricingRow>
        ))}
        {plan.plannedFeatures.map((feature) => (
          <PricingRow key={feature} planned>
            {feature}
          </PricingRow>
        ))}
      </ul>

      <div className="mt-8 pt-2 [&>*]:w-full">
        {isFree ? (
          <Button variant="outline" size="lg" render={<Link href="/signup" />}>
            Start free
          </Button>
        ) : (
          <Button size="lg" variant={plan.highlighted ? "default" : "outline"} disabled>
            Coming soon
          </Button>
        )}
      </div>
    </div>
  );
}

function PricingRow({
  children,
  planned,
}: {
  children: React.ReactNode;
  planned?: boolean;
}) {
  return (
    <li className={cn("flex gap-2.5", planned && "text-muted-foreground")}>
      {planned ? (
        <Clock className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={3} />
      )}
      <span>
        {children}
        {planned ? <span className="ml-1 text-xs">(soon)</span> : null}
      </span>
    </li>
  );
}

function FinalCta() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-8 md:py-32">
        <Reveal>
          <TuonMark className="text-primary mx-auto size-9" />
          <h2 className="font-display mx-auto mt-7 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Stop making flashcards. Start remembering.
          </h2>
          <Button size="lg" className="mt-9 text-base" render={<Link href="/signup" />}>
              Create your free account
              <ArrowRight />
            </Button>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between md:px-8">
        <Wordmark className="text-foreground" markClassName="size-5" />
        <p>Made in the Philippines, for Filipino students.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <a href="mailto:hello@tuon.app" className="hover:text-foreground">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}

function Section({
  eyebrow,
  title,
  children,
  muted,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "bg-secondary/40 border-t" : "border-t"}>
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <div className="text-primary text-xs font-medium tracking-widest uppercase">
            {eyebrow}
          </div>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** Fades content in as it scrolls into view. */
function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
