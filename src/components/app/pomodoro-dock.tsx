"use client";

/**
 * The focus timer, in the sidebar.
 *
 * It used to sit on the calendar page, above a set of tabs it had nothing to
 * do with — which meant the one screen you could see it on was the one screen
 * you were not studying on. Start a block and open your notes and it was gone.
 *
 * Its state has always been global (a module store, so it survives navigation);
 * only the UI was stuck to a page. Here it follows you: start it anywhere, and
 * the countdown stays in the corner while you read, review or sit a test.
 *
 * Compact by design. A timer that takes a quarter of the sidebar is a timer
 * competing with the app it is supposed to be quietly counting alongside.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  BookMarked,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import {
  formatRemaining,
  isRunning,
  loggableMinutes,
  nextPhase,
  pause,
  phaseDurationMs,
  remainingMs,
  reset,
  setSubject,
  start,
} from "@/lib/organiser/pomodoro";
import {
  getTimerServerSnapshot,
  getTimerSnapshot,
  subscribeToTimer,
  updateTimerState,
} from "@/lib/organiser/timer-store";
import { formatMinutes } from "@/lib/organiser/sessions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Redraw cadence. Nothing is counted here; this only moves the digits. */
const REDRAW_MS = 500;

export function PomodoroDock({ subjects }: { subjects: string[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { timeZone, pomodoro } = usePreferences();

  const state = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    getTimerServerSnapshot,
  );

  const [now, setNow] = useState(() => Date.now());
  // The subject lives in the timer's own state, so a reload mid-block comes
  // back still knowing what it is counting.
  const subject = state.subject ?? "";
  const running = isRunning(state);
  const focus = state.phase === "focus";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), REDRAW_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = remainingMs(state, now, pomodoro);
  const total = phaseDurationMs(state.phase, pomodoro);
  const progress = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
  const started = running || state.elapsedMs > 0;

  const courses = useMemo(() => subjects.filter(Boolean), [subjects]);

  /**
   * Writes the minutes just studied. Fire and forget: the timer must move on
   * whether or not Firestore is reachable.
   */
  function log(minutes: number) {
    if (!user || minutes <= 0) return;
    void addDoc(collection(db, "users", user.uid, "studySessions"), {
      source: "pomodoro",
      day: dayKey(new Date(), timeZone),
      minutes,
      courseTag: subject || null,
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }).catch(() => {
      toast.error(t.timer.notLogged);
    });
  }

  function finish(announce: boolean) {
    const minutes = loggableMinutes(state, Date.now());
    log(minutes);
    const next = nextPhase(state);
    updateTimerState(() => next);

    if (!announce) return;
    if (focus) {
      // Naming the subject in the confirmation is what makes the tag
      // believable: the student sees where the block landed at the moment it
      // lands, rather than finding out at the end of the week.
      const where = subject ? ` · ${subject}` : "";
      toast.success(
        minutes > 0
          ? `${t.timer.logged(formatMinutes(minutes), t.timer[next.phase])}${where}`
          : t.timer.nextUp(t.timer[next.phase]),
      );
    } else {
      toast.success(t.timer.breakOver);
    }
  }

  /**
   * A phase ending on its own. Guarded by a ref keyed on the start instant so
   * a second render at the same moment cannot log the block twice.
   */
  const finishedAt = useRef<number | null>(null);
  const complete = running && remaining === 0;
  useEffect(() => {
    if (!complete) return;
    if (finishedAt.current === state.startedAt) return;
    finishedAt.current = state.startedAt;
    finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, state.startedAt]);

  return (
    <div className="bg-sidebar-accent/40 rounded-xl border p-2.5">
      <div className="flex items-center gap-2">
        {focus ? (
          <Timer className={cn("size-3.5 shrink-0", running ? "text-primary" : "text-muted-foreground")} />
        ) : (
          <Coffee className="text-muted-foreground size-3.5 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg leading-none font-semibold tabular-nums">
              {formatRemaining(remaining)}
            </span>
            <span className="text-muted-foreground truncate text-[11px]">
              {started ? t.timer[state.phase] : t.timer.focus}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            updateTimerState((s) => (isRunning(s) ? pause(s, Date.now()) : start(s, Date.now())))
          }
          aria-label={running ? t.timer.pause : t.timer.start}
          className="bg-primary text-primary-foreground focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label={t.timer.options}
                className="text-muted-foreground hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md transition-colors"
              />
            }
          >
            <Settings2 className="size-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{t.timer[state.phase]}</p>
              <p className="text-muted-foreground text-xs">
                {t.timer.blocksToday(state.completedFocus)}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                finish(true);
                finishedAt.current = null;
              }}
            >
              <SkipForward className="size-4" />
              {focus ? t.timer.endBlock : t.timer.skipBreak}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                updateTimerState(reset);
                finishedAt.current = null;
              }}
            >
              <RotateCcw className="size-4" />
              {t.timer.resetNothing}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/app/settings#timer" />}>
              <Settings2 className="size-4" />
              {t.timer.changeLengths}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The subject sits on the face of the dock, not inside the menu it
          used to hide in. A tag nobody finds is a tag nobody sets, and every
          untagged block is an hour the per-subject totals cannot account
          for — which makes the breakdown beside the heatmap a lie of
          omission rather than a summary. */}
      {courses.length > 0 && focus ? (
        <div className="mt-2 flex items-center gap-1.5">
          <BookMarked className="text-muted-foreground size-3 shrink-0" />
          <label htmlFor="dock-subject" className="sr-only">
            {t.timer.studying}
          </label>
          <select
            id="dock-subject"
            value={subject}
            onChange={(e) =>
              updateTimerState((s) => setSubject(s, e.target.value || null))
            }
            className={cn(
              "focus-visible:ring-ring -mx-1 min-w-0 flex-1 truncate rounded-md border-0 bg-transparent px-1 py-0.5 text-[11px]",
              "hover:bg-sidebar-accent/60 cursor-pointer transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
              subject ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <option value="">{t.timer.noSubject}</option>
            {courses.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {started ? (
        <div className="bg-muted mt-2 h-0.5 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              focus ? "bg-primary" : "bg-muted-foreground/50",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {/* Explaining itself once, quietly. The old card carried three lines of
          this permanently, which is a paragraph you read once and then scroll
          past forever. */}
      {!started ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">
          {t.timer.backgroundNote}
        </p>
      ) : null}
    </div>
  );
}
