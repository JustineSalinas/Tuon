"use client";

/**
 * The real interface, at the size it fits.
 *
 * These were abstract bars and blocks, on the argument that a shrunk
 * screenshot is unreadable and dates the moment a screen changes. That is
 * true of screenshots and not of this: every screen below is built from the
 * same design tokens and the same sample set the rest of the page uses, so it
 * cannot drift from the product, and it is drawn at a size chosen for
 * legibility rather than photographed at one that is not.
 *
 * Which screens appear was decided by what survives the shrink. A heatmap,
 * three figures and one flashcard still read at eight pixels; a dense list
 * does not, which is why the notes screen carries four rows and not twelve.
 *
 * Hardware is still drawn because it is physical: bezels, the Dynamic Island,
 * the hinge. Still no painted status bar — a fake one reads as doubled-up
 * against the real thing.
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { FileText, Search, X } from "lucide-react";

import { TuonMark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";
import { SAMPLE_FLASHCARDS, SAMPLE_NOTE } from "@/lib/marketing/sample-set";
import { cn } from "@/lib/utils";

/**
 * Platform marks for the "soon on" pills.
 *
 * These are nominative use — naming the platform an app is headed for — and
 * NOT reproductions of the official "Download on the App Store" / "Get it on
 * Google Play" badges, which are locked artwork you may only use to link to a
 * live listing.
 *
 * BEFORE LAUNCH, replace these with the real badge assets from Apple's and
 * Google's identity guideline pages. Both require their supplied artwork used
 * unmodified; a hand-drawn approximation breaks the guidelines more surely
 * than shipping no badge at all. These exist so the layout is right today.
 */
function AppleLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.36 12.72c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.28-1.61 2.79-.41 6.92 1.15 9.19.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 2.99.72 1.24-.02 2.02-1.13 2.78-2.24.87-1.29 1.23-2.54 1.25-2.6-.03-.01-2.39-.92-2.41-3.64zM14.1 5.98c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.68 1.37-.59.68-1.1 1.77-.96 2.81 1.02.08 2.06-.52 2.7-1.28z" />
    </svg>
  );
}

/** Google Play's four-colour triangle. */
function PlayStoreLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3.6 2.4a1.2 1.2 0 0 0-.5 1v17.2c0 .42.2.79.5 1l9.06-9.6L3.6 2.4z" fill="#34A853" />
      <path d="M16.9 8.55 13.5 6.6 3.6 2.4a1.2 1.2 0 0 0-.14-.06l9.2 9.66 4.24-3.45z" fill="#4285F4" />
      <path d="m12.66 12 -9.2 9.66c.05-.02.1-.04.14-.06l9.9-4.2 3.4-1.95L12.66 12z" fill="#EA4335" />
      <path d="m16.9 8.55-4.24 3.45 4.24 3.45 3.4-1.95a1.2 1.2 0 0 0 0-3l-3.4-1.95z" fill="#FBBC04" />
    </svg>
  );
}

function MacBookMini({ caption }: { caption: string }) {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[420px] rounded-t-[9px] rounded-b-[2px] bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-1.5 pb-2.5">
        <div className="bg-background flex h-[255px] w-[408px] overflow-hidden rounded-[4px]">
          {/* The real rail: eight destinations, the new-note button, the
              month's quota at the foot. */}
          <div className="bg-sidebar border-border flex w-[86px] shrink-0 flex-col border-r p-2">
            <div className="mb-2 flex items-center gap-1 px-1">
              <TuonMark className="text-primary size-[13px]" />
              <span className="font-display text-[10px] font-semibold">Tu&oacute;n</span>
            </div>

            {t.marketing.devices.nav.map((item, index) => (
              <span
                key={item}
                className={cn(
                  "rounded-[3px] px-1.5 py-[3px] text-[7px] leading-none",
                  index === 0
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {item}
              </span>
            ))}

            <span className="bg-primary text-primary-foreground mt-2 rounded-[4px] px-1.5 py-[4px] text-center text-[7px] leading-none font-medium">
              {t.nav.newNote}
            </span>

            <div className="border-border mt-auto rounded-[4px] border p-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[6px] font-medium">{t.nav.sets}</span>
                <span className="text-muted-foreground text-[6px]">2/5</span>
              </div>
              <div className="bg-secondary mt-1 h-[3px] overflow-hidden rounded-full">
                <div className="bg-primary h-full w-2/5 rounded-full" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 p-2.5">
            <p className="text-[9px] font-semibold">{t.dashboard.goodAfternoon}</p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-semibold">{t.dashboard.todaysPlan}</p>
                <div className="border-border bg-card mt-1 rounded-[5px] border p-1.5">
                  <p className="text-[6px] leading-tight font-medium">
                    {t.marketing.devices.planStep}
                  </p>
                  <p className="text-muted-foreground mt-[2px] text-[6px] leading-tight">
                    {t.marketing.devices.planDetail}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[7px] font-semibold">{t.dashboard.recentNotes}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {t.marketing.devices.notes.slice(0, 2).map((note) => (
                    <div
                      key={note.title}
                      className="border-border bg-card rounded-[5px] border px-1.5 py-1"
                    >
                      <p className="truncate text-[6px] leading-tight font-medium">
                        {note.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-semibold">{t.dashboard.thisWeek}</p>
                <div className="border-border bg-card mt-1 rounded-[5px] border p-1.5">
                  <p className="text-[8px] leading-none font-semibold">
                    {t.marketing.hero.hoursMinutes(2, 40)}
                  </p>
                  <div className="mt-1.5 flex items-end justify-between gap-[2px]">
                    {WEEK.map((value, index) => (
                      <span
                        key={index}
                        style={{ height: value === 0 ? 2 : `${Math.max(3, value / 2)}px` }}
                        className={cn(
                          "flex-1 rounded-t-[1px]",
                          value === 0
                            ? "bg-secondary"
                            : index === 6
                              ? "bg-primary"
                              : "bg-primary/55",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[7px] font-semibold">{t.dashboard.comingUp}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {t.marketing.devices.due.slice(0, 2).map((item) => (
                    <div
                      key={item.title}
                      className="border-border bg-card flex items-baseline justify-between gap-1 rounded-[5px] border px-1.5 py-1"
                    >
                      <span className="truncate text-[6px] leading-tight font-medium">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[6px]">
                        {item.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[7px] w-[452px] rounded-b-md bg-gradient-to-b from-neutral-600 to-neutral-700" />
      <span className="text-muted-foreground mt-4 text-xs">{caption}</span>
    </div>
  );
}

/** A plausible week: two heavy nights, a quiet Friday, a gap. */
const WEEK = [25, 0, 48, 32, 0, 15, 40];

function IPadMini() {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[250px] rounded-2xl bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-[9px]">
        <div className="bg-background h-[300px] w-[232px] overflow-hidden rounded-md p-3">
          <p className="text-[11px] font-semibold">{t.nav.notes}</p>

          {/* The search field, because it is the first thing on the real
              screen and the thing that makes a library of forty notes usable. */}
          <div className="border-border bg-card mt-2 flex items-center gap-1.5 rounded-[7px] border px-2 py-1.5">
            <Search className="text-muted-foreground size-[9px] shrink-0" />
            <span className="text-muted-foreground text-[8px]">{t.notes.search}</span>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {t.marketing.devices.notes.map((note, index) => (
              <div
                key={note.title}
                className={cn(
                  "rounded-[7px] border p-2",
                  index === 0 ? "border-primary/40 bg-accent/25" : "border-border bg-card",
                )}
              >
                <div className="flex items-start gap-1.5">
                  <FileText className="text-muted-foreground mt-[1px] size-[9px] shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-[8px] leading-tight font-medium">
                      {note.title}
                    </p>
                    <p className="text-muted-foreground mt-[2px] line-clamp-1 text-[7px] leading-tight">
                      {note.excerpt}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="bg-secondary text-muted-foreground rounded-[3px] px-1 py-[1px] text-[6px] leading-none">
                    {note.subject}
                  </span>
                  <span className="text-muted-foreground text-[6px]">{note.chars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="text-muted-foreground mt-4 text-xs">
        {t.marketing.devices.tabletCaption}
      </span>
    </div>
  );
}

/**
 * The phone screen runs.
 *
 * A still screen inside a device frame reads as a picture of an app; one that
 * moves reads as the app. It flips between the question and the answer the way
 * the review screen does, with the review screen's own chrome around it — the
 * exit, the set name, the progress bar — because a bare card floating in a
 * phone is not a screen anyone has ever seen.
 */
function IPhoneMini() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [showAnswer, setShowAnswer] = useState(false);
  const card = SAMPLE_FLASHCARDS[1];

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setShowAnswer((shown) => !shown), 3200);
    return () => clearInterval(timer);
  }, [reduce]);

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="w-[168px] rounded-3xl bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-700 p-1.5">
        <div className="bg-background relative h-[328px] w-[156px] overflow-hidden rounded-[19px] px-3 pt-[26px] pb-3">
          {/* Dynamic Island — hardware, so it is drawn. */}
          <div className="absolute top-1.5 left-1/2 h-[15px] w-[52px] -translate-x-1/2 rounded-[9px] bg-neutral-950" />

          {/* Review chrome: the way out, what you are in, how far through. */}
          <div className="flex items-center gap-1.5">
            <X className="text-muted-foreground size-[10px] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[7px] font-medium">
                {SAMPLE_NOTE.title}
              </p>
              <div className="bg-secondary mt-[3px] h-[2px] overflow-hidden rounded-full">
                <div className="bg-primary h-full w-1/3 rounded-full" />
              </div>
            </div>
          </div>

          <div className="border-border bg-card mt-2 flex h-[196px] flex-col rounded-[10px] border p-2.5">
            <p className="text-muted-foreground text-[6px] tracking-widest uppercase">
              {t.review.question}
            </p>
            <p className="mt-1 text-[8px] leading-snug font-medium">{card.front}</p>

            <motion.div
              animate={{ opacity: showAnswer || reduce ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2"
            >
              <div className="bg-border h-px" />
              <p className="text-muted-foreground mt-1.5 text-[6px] tracking-widest uppercase">
                {t.review.answer}
              </p>
              <p className="mt-1 text-[8px] leading-snug">{card.back}</p>
            </motion.div>

            <motion.p
              animate={{ opacity: showAnswer || reduce ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="text-muted-foreground mt-auto text-center text-[7px]"
            >
              {t.marketing.devices.tapToFlip}
            </motion.p>
          </div>

          {/* The four ratings, dimmed until the answer is showing — the rule
              the review screen follows, so you cannot grade yourself before
              finding out whether you were right. */}
          <motion.div
            animate={{ opacity: showAnswer || reduce ? 1 : 0.25 }}
            transition={{ duration: 0.3 }}
            className="mt-2 grid grid-cols-4 gap-1"
          >
            {t.marketing.how.ratings.map((rating, index) => (
              <span
                key={rating}
                className={cn(
                  "grid h-[24px] place-items-center rounded-md text-[6px] leading-none",
                  index === 2
                    ? "bg-primary text-primary-foreground font-medium"
                    : "border-border text-muted-foreground border",
                )}
              >
                {rating}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
      <span className="text-muted-foreground mt-4 text-xs">
        {t.marketing.devices.phoneCaption}
      </span>
    </div>
  );
}

/**
 * The lineup is ~918px of fixed-width hardware, which no phone fits.
 *
 * It used to scale down — 0.38 on a phone — and that did not make it small, it
 * made it unreadable. The screens carry real interface at 6-8px, sized for
 * full scale, and below about 0.8 that text stops being text; the section
 * became three grey thumbnails on the one device most of these students
 * actually hold.
 *
 * So it scrolls at full size instead, snapping from device to device. Scaling
 * was originally chosen over overflow because "a centred overflow lands the
 * visitor on the middle of a half-cropped MacBook, which reads as broken
 * rather than as a carousel" — true of a centred overflow with no affordance,
 * and exactly what snap points and a deliberate peek of the next device fix.
 * From `lg` there is room for all three, and it goes back to a static row.
 */
export function DeviceLineup() {
  const { t } = useI18n();

  return (
    <div className="mt-12 md:mt-14">
      {/* Bleeds to the page edges so the peek reads as "there is more this
          way" rather than as something clipped by a container. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
        {/* 918px wide all in — the MacBook's base bar is 452, wider than its
            lid. `w-max` keeps the row from being squeezed by the scroller. */}
        <div className="flex w-max snap-x snap-mandatory items-end gap-6 lg:w-auto lg:justify-center">
          {/* The phone comes FIRST on a phone. Whoever is reading this on one
              should not have to swipe past a laptop to reach the screen they
              are about to use. */}
          <div className="order-1 snap-center lg:order-3">
            <IPhoneMini />
          </div>
          <div className="order-2 snap-center lg:order-2">
            <IPadMini />
          </div>
          <div className="order-3 snap-center lg:order-1">
            <MacBookMini caption={t.marketing.devices.desktopCaption} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Native-app notice.
 *
 * Says "in the works" rather than a date, and says plainly that nobody has to
 * wait — a store badge for an app that does not exist yet is a promise you
 * have to keep. These are our own pills, not the App Store and Google Play
 * badges: those are trademarked artwork with usage rules, and imitating them
 * before a listing exists invites exactly the complaint you do not want.
 */
export function NativeAppsNotice() {
  const { t } = useI18n();

  return (
    <div className="border-border bg-card mt-12 flex flex-col gap-6 rounded-2xl border p-6 md:mt-14 md:flex-row md:items-center md:gap-8 md:p-7">
      <div className="min-w-0 flex-1">
        <span className="bg-accent text-accent-foreground inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium tracking-wider">
          {t.marketing.devices.inTheWorks}
        </span>
        <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">
          {t.marketing.devices.nativeTitle}
        </h3>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
          {t.marketing.devices.nativeBody}
        </p>
      </div>

      <div className="flex shrink-0 gap-2.5">
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <AppleLogo />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              {t.marketing.devices.soonOn}
            </p>
            <p className="text-sm font-medium">App Store</p>
          </div>
        </div>
        <div className="border-border bg-background flex h-[52px] items-center gap-2.5 rounded-xl border px-4">
          <PlayStoreLogo />
          <div>
            <p className="text-muted-foreground text-[10.5px] tracking-wider uppercase">
              {t.marketing.devices.soonOn}
            </p>
            <p className="text-sm font-medium">Google Play</p>
          </div>
        </div>
      </div>
    </div>
  );
}
