"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock, Sparkles } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Faq } from "@/components/marketing/faq";
import { DeviceLineup, NativeAppsNotice } from "@/components/marketing/device-showcase";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SetupFlow } from "@/components/marketing/setup-flow";
import { MemoryDecay } from "@/components/marketing/memory-decay";
import { ByHand } from "@/components/marketing/by-hand";
import { HeroDashboard } from "@/components/marketing/hero-dashboard";
import { PaperCreature } from "@/components/brand/paper-creature";
import { ASK_INPUT_ID, AskTuon } from "@/components/marketing/ask-tuon";
import { TalaAside, TalaPerch } from "@/components/marketing/tala";
import { TuonMark } from "@/components/brand/logo";
import { CREATURE_NAME } from "@/lib/brand";
import type { Messages } from "@/lib/i18n/en";
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
          <WhyItSticks />
          <HowItWorksSection />
          <VersusByHand />
          <EveryDevice />
          <BuiltForPH />
          <Pricing />
          <FaqSection />
          <AskTuon />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}

function Hero() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <section className="paper-grain relative overflow-hidden border-b">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-20 md:px-8 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            {t.marketing.hero.badge}
          </Badge>

          <h1 className="font-display mt-6 text-4xl leading-[1.03] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t.marketing.hero.headline}
            <span className="text-primary">{t.marketing.hero.headlineAccent}</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-balance">
            {t.marketing.hero.body}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="text-base" render={<Link href="/signup" />}>
              {t.marketing.hero.startFree}
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base"
              render={<Link href="/login" />}
            >
              {t.marketing.hero.haveAccount}
            </Button>
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            {t.marketing.hero.freeForever(PLANS.free.monthlyGenerations)}
          </p>
        </motion.div>

        {/* The product itself, running, directly under the promise about it.
            Tala perches on the corner so the first thing she does on the page
            is say hello — before any feature does. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-14 max-w-4xl md:mt-16"
        >
          <TalaPerch className="-top-10 -right-2 z-10 size-20 md:-top-12 md:-right-5 md:size-24" />
          <HeroDashboard />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-20">
        {/* Meaning of the name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 flex flex-col gap-6 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <TuonMark className="text-primary mt-1 size-6 shrink-0" />
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              <span className="text-foreground font-display text-lg font-semibold">
                tuón
              </span>{" "}
              <span className="text-sm">{t.marketing.hero.languages}</span>
              <br />
              {t.marketing.hero.meaning}
            </p>
          </div>

          {/* Beside the definition, because that is the one spot in the hero
              about understanding rather than selling. Kept general on purpose:
              naming a single question ("does it cover your subject?") tells
              someone whose question is different that this is not for them. */}
          <Link
            href="#ask"
            // The scroll already worked; this is what makes it arrive IN the
            // chat rather than beside it. `preventScroll` so the caret lands
            // without a second jump fighting the smooth scroll on its way.
            onClick={() =>
              document
                .getElementById(ASK_INPUT_ID)
                ?.focus({ preventScroll: true })
            }
            className="border-border hover:border-primary/40 hover:bg-accent/30 group inline-flex shrink-0 items-center gap-3 rounded-full border py-2 pr-5 pl-2.5 transition-colors"
          >
            <PaperCreature state="idle" className="size-9 shrink-0" />
            <span className="text-sm font-medium">
              {t.marketing.hero.haveAQuestion}
              <span className="text-muted-foreground block text-xs font-normal">
                {t.marketing.hero.askTala(CREATURE_NAME)}
              </span>
            </span>
            <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
          </Link>
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

function WhyItSticks() {
  const { t } = useI18n();

  return (
    <Section
      id="why"
      eyebrow={t.marketing.why.eyebrow}
      title={t.marketing.why.title}
      muted
    >
      <Reveal>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          {t.marketing.why.body}
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <TalaAside state="asleep" className="mt-8">
          {t.marketing.why.aside}
        </TalaAside>
      </Reveal>
      <Reveal delay={0.1}>
        <MemoryDecay />
      </Reveal>
    </Section>
  );
}

function VersusByHand() {
  const { t } = useI18n();

  return (
    <Section
      id="versus"
      eyebrow={t.marketing.versus.eyebrow}
      title={t.marketing.versus.title}
    >
      <Reveal>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          {t.marketing.versus.body}
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <ByHand />
      </Reveal>
    </Section>
  );
}

function HowItWorksSection() {
  const { t } = useI18n();

  return (
    <Section
      id="how"
      eyebrow={t.marketing.how.eyebrow}
      title={t.marketing.how.title}
    >
      <Reveal>
        <HowItWorks />
      </Reveal>
    </Section>
  );
}

function FaqSection() {
  const { t } = useI18n();

  return (
    <Section
      id="faq"
      eyebrow={t.marketing.faq.eyebrow}
      title={t.marketing.faq.title}
    >
      <Reveal>
        <Faq />
      </Reveal>
    </Section>
  );
}

function EveryDevice() {
  const { t } = useI18n();

  return (
    <Section
      id="devices"
      eyebrow={t.marketing.devices.eyebrow}
      title={t.marketing.devices.title}
    >
      <Reveal>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          {t.marketing.devices.body}
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <DeviceLineup />
      </Reveal>
      <Reveal delay={0.1}>
        <NativeAppsNotice />
      </Reveal>
    </Section>
  );
}

function BuiltForPH() {
  const { t } = useI18n();
  const points = t.marketing.local.points;

  return (
    <Section
      id="local"
      eyebrow={t.marketing.local.eyebrow}
      title={t.marketing.local.title}
      muted
      perch={
        // Inside the section, not straddling its top border: the header is
        // sticky, so anything perched on that border gets sliced in half the
        // moment the section scrolls up under it.
        <TalaPerch
          state="thinking"
          studying
          className="top-6 right-8 size-24 lg:right-16 lg:size-28"
        />
      }
    >
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t.marketing.local.body}
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

      <Reveal delay={0.15}>
        <SetupFlow />
      </Reveal>
    </Section>
  );
}

function Pricing() {
  const { t } = useI18n();
  const [annual, setAnnual] = useState(false);
  const freeMonths = annualFreeMonths("plus");

  return (
    <Section
      id="pricing"
      eyebrow={t.marketing.pricing.eyebrow}
      title={t.marketing.pricing.title}
    >
      <Reveal>
        <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          {t.marketing.pricing.bodyBefore}{" "}
          <span className="text-foreground font-medium">
            {t.marketing.pricing.studySet}
          </span>{" "}
          {t.marketing.pricing.bodyAfter(GENERATION_EXPLAINER)}
        </p>
      </Reveal>

      {/* Billing period */}
      <Reveal delay={0.05}>
        <div
          role="group"
          aria-label={t.marketing.pricing.billingPeriod}
          className="bg-secondary mt-8 inline-flex rounded-full p-1"
        >
          {[
            { label: t.marketing.pricing.monthly, value: false },
            { label: t.marketing.pricing.yearly(freeMonths), value: true },
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
            <PlanCard planId={planId} annual={annual} t={t} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
          {t.marketing.pricing.footnote}
        </p>
      </Reveal>
    </Section>
  );
}

function PlanCard({
  planId,
  annual,
  t,
}: {
  planId: Plan;
  annual: boolean;
  t: Messages;
}) {
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
        {plan.highlighted ? <Badge>{t.marketing.pricing.mostPopular}</Badge> : null}
      </div>

      <div className="font-display mt-3 text-4xl font-semibold">
        ₱{perMonth}
        {isFree ? null : (
          <span className="text-muted-foreground text-lg font-normal">
            {t.marketing.pricing.perMonth}
          </span>
        )}
      </div>

      <p className="text-muted-foreground mt-2 min-h-10 text-sm leading-relaxed">
        {annual && plan.phpAnnual
          ? t.marketing.pricing.billedAnnually(
              plan.phpAnnual.toLocaleString(t.common.dateLocale),
            )
          : t.plans[planId].tagline}
      </p>

      <ul className="mt-6 space-y-3 text-sm">
        {t.plans[planId].features.map((feature) => (
          <PricingRow key={feature}>{feature}</PricingRow>
        ))}
        {plan.plannedFeatures.map((feature) => (
          <PricingRow key={feature} planned soonLabel={t.marketing.pricing.soon}>
            {feature}
          </PricingRow>
        ))}
      </ul>

      <div className="mt-8 pt-2 [&>*]:w-full">
        {isFree ? (
          <Button variant="outline" size="lg" render={<Link href="/signup" />}>
            {t.marketing.pricing.startFree}
          </Button>
        ) : (
          <Button size="lg" variant={plan.highlighted ? "default" : "outline"} disabled>
            {t.marketing.pricing.comingSoon}
          </Button>
        )}
      </div>
    </div>
  );
}

function PricingRow({
  children,
  planned,
  soonLabel,
}: {
  children: React.ReactNode;
  planned?: boolean;
  soonLabel?: string;
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
        {planned ? <span className="ml-1 text-xs">{soonLabel}</span> : null}
      </span>
    </li>
  );
}

function FinalCta() {
  const { t } = useI18n();

  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-8 md:py-32">
        <Reveal>
          {/* No mark here. The Ask section directly above already shows Tala,
              and a second owl one screen later reads as a stutter — the closing
              line is stronger arriving on its own than under a logo the reader
              has already seen twice on the way down. */}
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t.marketing.finalCta.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-md leading-relaxed">
            {t.marketing.finalCta.body}
          </p>
          <Button size="lg" className="mt-9 text-base" render={<Link href="/signup" />}>
              {t.marketing.finalCta.action}
              <ArrowRight />
            </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            {t.marketing.finalCta.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  muted,
  perch,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
  /** Optional <TalaPerch>, positioned against this section's own box. */
  perch?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      // Clears the sticky header, so an anchor does not land under it.
      className={cn(
        "relative scroll-mt-16",
        muted ? "bg-secondary/40 border-t" : "border-t",
      )}
    >
      {perch}
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
