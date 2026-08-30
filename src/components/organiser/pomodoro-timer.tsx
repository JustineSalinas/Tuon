"use client";

/**
 * The Pomodoro timer.
 *
 * Its real job is not the countdown — it is to make the study log honest. A
 * log built from "how long did you study?" is a log of what people remember
 * and round up; a log built from a timer is a log of what happened.
 *
 * The interval below only decides when to REDRAW. Every number on screen comes
 * from `Date.now()` against the stored start instant, so a backgrounded tab, a
 * throttled timer or a locked phone costs nothing — see lib/organiser/pomodoro
 * for why that distinction is the whole feature.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Coffee, Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Redraw cadence. Nothing is counted here; this only moves the digits. */
const REDRAW_MS = 250;

export function PomodoroTimer({ subjects }: { subjects: string[] }) {
  const { user } = useAuth();
  const { timeZone } = usePreferences();

  const state = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    getTimerServerSnapshot,
  );

  const [now, setNow] = useState(() => Date.now());
  const [subject, setSubject] = useState("");
  const running = isRunning(state);

  // Ticks only while the clock is moving. A paused timer redrawing four times
  // a second would keep a phone's radio and CPU awake for no reason.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), REDRAW_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = remainingMs(state, now);
  const elapsed = phaseDurationMs(state.phase) - remaining;
  const progress = Math.min(100, (elapsed / phaseDurationMs(state.phase)) * 100);
  const focus = state.phase === "focus";

  /**
   * Writes the minutes just studied.
   *
   * Fire and forget on purpose: the timer must move on immediately whether or
   * not Firestore is reachable. Losing one logged block to a dead connection
   * is a smaller harm than a timer that stalls at the end of every session.
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

  /** Ends the current phase, logging it if it was focus, and moves on. */
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
   * The phase ending on its own, as opposed to being skipped.
   *
   * Guarded by a ref rather than by state so a second render at the same
   * instant cannot log the block twice — which would double-count every
   * session a student actually completed, the one error a study log must not
   * make.
   */
  const finishedAt = useRef<number | null>(null);
  const complete = running && remaining === 0;

  useEffect(() => {
    if (!complete) return;
    if (finishedAt.current === state.startedAt) return;
    finishedAt.current = state.startedAt;
    finish(true);
    // `finish` closes over fresh state each render; re-running on every change
    // would re-fire the same completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, state.startedAt]);

  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {focus ? (
            <Timer className="text-primary size-4" />
          ) : (
            <Coffee className="text-muted-foreground size-4" />
          )}
          <span className="text-sm font-medium">{PHASE_LABELS[state.phase]}</span>
          {state.completedFocus > 0 ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {state.completedFocus} {state.completedFocus === 1 ? "block" : "blocks"} today
            </span>
          ) : null}
        </div>

        {subjects.length > 0 && focus ? (
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="What are you studying?"
            className="border-input bg-background focus-visible:ring-ring h-8 max-w-44 rounded-md border px-2 text-xs focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <option value="">No subject</option>
            {subjects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-5">
        <span
          className={cn(
            "font-display text-5xl font-semibold tabular-nums",
            !focus && "text-muted-foreground",
          )}
          // Announced only when it changes phase, not every second, or a
          // screen reader would read the countdown aloud forever.
          aria-live="off"
        >
          {formatRemaining(remaining)}
        </span>

        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button
              variant="outline"
              onClick={() => updateTimerState((s) => pause(s, Date.now()))}
            >
              <Pause />
              Pause
            </Button>
          ) : (
            <Button onClick={() => updateTimerState((s) => start(s, Date.now()))}>
              <Play />
              {state.elapsedMs > 0 ? "Resume" : "Start"}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              // Skipping still banks what was done. Eleven minutes of work
              // thrown away because the block was not finished is how a log
              // starts under-reporting.
              finish(true);
              finishedAt.current = null;
            }}
          >
            <SkipForward />
            {focus ? "End block" : "Skip break"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset this block"
            title="Reset — nothing is logged"
            onClick={() => {
              updateTimerState(reset);
              finishedAt.current = null;
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div className="bg-muted mt-4 h-1 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            focus ? "bg-primary" : "bg-muted-foreground/50",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Keeps running with the tab in the background or the phone locked — the
        clock is read from the time, not counted up. Only focus blocks are
        logged; whole minutes only.
      </p>
    </div>
  );
}
