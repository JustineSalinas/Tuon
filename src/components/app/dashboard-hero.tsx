"use client";

/**
 * The dashboard's greeting banner.
 *
 * A gradient surface, a way into Tala, and the handful of places a student
 * actually goes first — new note, review, calendar. Plain action chips
 * rather than restating the plan or the stats, both of which already have
 * their own sections a scroll away; the hero's job is to get a returning
 * student moving in under a second, not to repeat the page under it.
 */

import Link from "next/link";
import { CalendarDays, FileText, Layers, Sparkles } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { CREATURE_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function DashboardHero({
  greeting,
  firstName,
  subhead,
}: {
  greeting: string;
  firstName: string;
  /** Rendered under the greeting — an exam countdown, or nothing. */
  subhead?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6 md:p-8"
      style={{
        backgroundImage:
          "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 62%, black))",
      }}
    >
      <div className="relative z-10">
        <h1 className="text-primary-foreground font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          {greeting}, {firstName}
        </h1>
        <div
          className="mt-1.5 text-sm"
          style={{ color: "color-mix(in oklch, var(--primary-foreground) 78%, transparent)" }}
        >
          {subhead ?? t.dashboard.heroSubtitle(CREATURE_NAME)}
        </div>

        <Link
          href="/app/tala"
          className="bg-background text-foreground mt-5 flex w-full items-center gap-3 rounded-full px-4 py-3 text-left shadow-sm transition-transform hover:scale-[1.01] sm:max-w-md"
        >
          <Sparkles className="text-primary size-4 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
            {t.tala.placeholder}
          </span>
        </Link>

        <div className="mt-4 flex flex-wrap gap-2">
          <HeroChip href="/app/notes/new" icon={FileText}>
            {t.dashboard.quickNewNote}
          </HeroChip>
          <HeroChip href="/app/review" icon={Layers}>
            {t.dashboard.quickReview}
          </HeroChip>
          <HeroChip href="/app/tala" icon={Sparkles}>
            {t.dashboard.quickAsk(CREATURE_NAME)}
          </HeroChip>
          <HeroChip href="/app/calendar" icon={CalendarDays}>
            {t.dashboard.quickCalendar}
          </HeroChip>
        </div>
      </div>
    </section>
  );
}

function HeroChip({
  href,
  icon: Icon,
  children,
  className,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-background/15 text-primary-foreground hover:bg-background/25 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {children}
    </Link>
  );
}
