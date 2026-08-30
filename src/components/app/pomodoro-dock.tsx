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
import { Coffee, Pause, Play, RotateCcw, Settings2, SkipForward, Timer } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import {
  PHASE_LABELS,
  formatRemaining,
  isRunning,
  loggableMinutes,
  nextPhase,
  pause,
  phaseDurationMs,
  remainingMs,
  reset,
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
  const { timeZone, pomodoro } = usePreferences();

  const state = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    getTimerServerSnapshot,
  );

  const [now, setNow] = useState(() => Date.now());
  const [subject, setSubject] = useState("");
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
      toast.error("That block was not saved to your log.");
    });
  }

  function finish(announce: boolean) {
    const minutes = loggableMinutes(state, Date.now());
    log(minutes);
    const next = nextPhase(state);
    updateTimerState(() => next);

    if (!announce) return;
    if (focus) {
      toast.success(
        minutes > 0
          ? `${formatMinutes(minutes)} logged. ${PHASE_LABELS[next.phase]} next.`
          : `${PHASE_LABELS[next.phase]} next.`,
      );
    } else {
      toast.success("Break over. Back to it.");
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
              {started ? PHASE_LABELS[state.phase] : "Focus"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            updateTimerState((s) => (isRunning(s) ? pause(s, Date.now()) : start(s, Date.now())))
          }
          aria-label={running ? "Pause the timer" : "Start a focus block"}
          className="bg-primary text-primary-foreground focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="Timer options"
                className="text-muted-foreground hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md transition-colors"
              />
            }
          >
            <Settings2 className="size-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{PHASE_LABELS[state.phase]}</p>
              <p className="text-muted-foreground text-xs">
                {state.completedFocus} {state.completedFocus === 1 ? "block" : "blocks"} today
              </p>
            </DropdownMenuLabel>

            {courses.length > 0 && focus ? (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <label
                    htmlFor="dock-subject"
                    className="text-muted-foreground text-xs"
                  >
                    Studying
                  </label>
                  <select
                    id="dock-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="border-input bg-background focus-visible:ring-ring mt-1 h-8 w-full rounded-md border px-2 text-xs focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    <option value="">No subject</option>
                    {courses.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                finish(true);
                finishedAt.current = null;
              }}
            >
              <SkipForward className="size-4" />
              {focus ? "End block and log it" : "Skip the break"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                updateTimerState(reset);
                finishedAt.current = null;
              }}
            >
              <RotateCcw className="size-4" />
              Reset — log nothing
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/app/settings#timer" />}>
              <Settings2 className="size-4" />
              Change the lengths
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          Keeps running in the background. Only focus blocks are logged.
        </p>
      ) : null}
    </div>
  );
}
