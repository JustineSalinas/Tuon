/**
 * The Pomodoro timer's arithmetic.
 *
 * The one rule that matters: TIME IS COMPUTED FROM TIMESTAMPS, NEVER
 * ACCUMULATED FROM TICKS. A `setInterval` that adds a second each time it
 * fires is wrong on any device a student actually owns — background a tab and
 * browsers throttle timers to once a minute or stop them entirely, lock a
 * phone and they stop altogether. A timer built that way silently under-counts
 * every session, which is worse than not logging at all: the number looks
 * plausible and is a lie.
 *
 * So the interval here only decides when to REDRAW. What the clock says is
 * always `now - startedAt`, and closing the laptop mid-session costs nothing.
 *
 * Pure, with no React and no timers of its own.
 */

export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

/**
 * How long each phase runs, in minutes.
 *
 * Classic 25/5/15 is the default and not the law. Twenty-five minutes suits
 * some people and is far too long for others — a student with ADHD, or one
 * working in the twelve-minute gaps between classes, needs a shorter block,
 * and forcing the textbook number on them just means they stop using the
 * timer and the study log goes quiet with it.
 */
export interface PomodoroSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

/** Bounds. Under a minute is not a block; over two hours is not a Pomodoro. */
export const MIN_PHASE_MINUTES = 1;
export const MAX_PHASE_MINUTES = 120;

export function clampPhaseMinutes(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_PHASE_MINUTES, Math.max(MIN_PHASE_MINUTES, Math.round(value)));
}

/** Reads whatever is on the profile into settings that are safe to run on. */
export function readPomodoroSettings(raw: {
  pomodoroFocus?: unknown;
  pomodoroShortBreak?: unknown;
  pomodoroLongBreak?: unknown;
}): PomodoroSettings {
  return {
    focus: clampPhaseMinutes(raw.pomodoroFocus, DEFAULT_POMODORO.focus),
    shortBreak: clampPhaseMinutes(raw.pomodoroShortBreak, DEFAULT_POMODORO.shortBreak),
    longBreak: clampPhaseMinutes(raw.pomodoroLongBreak, DEFAULT_POMODORO.longBreak),
  };
}

export const FOCUS_BLOCKS_BEFORE_LONG_BREAK = 4;

const MINUTE_MS = 60_000;

/**
 * A running or paused timer.
 *
 * `startedAt` is the wall-clock instant the current run began; `elapsedMs` is
 * everything banked from earlier runs of this same phase. Pausing folds the
 * current run into `elapsedMs` and drops `startedAt`. That pair survives a
 * reload, a backgrounded tab and a locked phone without any of them being
 * special cases.
 */
export interface PomodoroState {
  phase: PomodoroPhase;
  /** Epoch ms, or null when paused or not started. */
  startedAt: number | null;
  /** Milliseconds already spent in this phase, excluding the current run. */
  elapsedMs: number;
  /** Completed focus blocks, deciding when the long break falls due. */
  completedFocus: number;
}

export function initialPomodoro(phase: PomodoroPhase = "focus"): PomodoroState {
  return { phase, startedAt: null, elapsedMs: 0, completedFocus: 0 };
}

export function phaseDurationMs(
  phase: PomodoroPhase,
  settings: PomodoroSettings = DEFAULT_POMODORO,
): number {
  return settings[phase] * MINUTE_MS;
}

export function isRunning(state: PomodoroState): boolean {
  return state.startedAt !== null;
}

/** Milliseconds spent in the current phase, including the run in progress. */
export function elapsedMs(state: PomodoroState, now: number): number {
  const live = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
  return state.elapsedMs + live;
}

/** Never negative: a phase that ran over while the tab slept reads as 0 left. */
export function remainingMs(
  state: PomodoroState,
  now: number,
  settings: PomodoroSettings = DEFAULT_POMODORO,
): number {
  return Math.max(0, phaseDurationMs(state.phase, settings) - elapsedMs(state, now));
}

export function isComplete(
  state: PomodoroState,
  now: number,
  settings: PomodoroSettings = DEFAULT_POMODORO,
): boolean {
  return remainingMs(state, now, settings) === 0;
}

export function start(state: PomodoroState, now: number): PomodoroState {
  if (isRunning(state)) return state;
  return { ...state, startedAt: now };
}

export function pause(state: PomodoroState, now: number): PomodoroState {
  if (!isRunning(state)) return state;
  return { ...state, startedAt: null, elapsedMs: elapsedMs(state, now) };
}

/** Back to the start of the same phase, keeping the block count. */
export function reset(state: PomodoroState): PomodoroState {
  return { ...state, startedAt: null, elapsedMs: 0 };
}

/**
 * What comes after the phase that just ended.
 *
 * Only focus blocks are counted, and the long break lands after every fourth
 * one. Breaks never advance the count, or skipping a break would earn a long
 * break sooner.
 */
export function nextPhase(state: PomodoroState): PomodoroState {
  if (state.phase !== "focus") {
    return { phase: "focus", startedAt: null, elapsedMs: 0, completedFocus: state.completedFocus };
  }

  const completedFocus = state.completedFocus + 1;
  const phase: PomodoroPhase =
    completedFocus % FOCUS_BLOCKS_BEFORE_LONG_BREAK === 0 ? "longBreak" : "shortBreak";
  return { phase, startedAt: null, elapsedMs: 0, completedFocus };
}

/**
 * Minutes to log for a focus block that is ending.
 *
 * Rounded down, and only whole minutes count: a session abandoned after forty
 * seconds is not a minute of study, and rounding those up across a week would
 * inflate the log by exactly the amount the student did not do. Breaks are
 * never logged — resting is not studying, and counting it would make the
 * number meaningless.
 */
export function loggableMinutes(state: PomodoroState, now: number): number {
  if (state.phase !== "focus") return 0;
  return Math.floor(elapsedMs(state, now) / MINUTE_MS);
}

/** "24:59". Always mm:ss, so the digits do not reflow as it counts down. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

/**
 * Narrows an unknown value — typically JSON out of localStorage, written by an
 * older version of this file — into a state we are willing to resume from.
 *
 * A stored timer is not trustworthy input. Anything unrecognised falls back to
 * a fresh timer rather than throwing, because a corrupt value should cost the
 * student one session, not the whole screen.
 */
export function readStoredState(value: unknown): PomodoroState | null {
  if (value === null || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const phase = raw.phase;
  if (phase !== "focus" && phase !== "shortBreak" && phase !== "longBreak") return null;

  const startedAt =
    raw.startedAt === null || raw.startedAt === undefined
      ? null
      : typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt)
        ? raw.startedAt
        : null;

  const elapsed = typeof raw.elapsedMs === "number" && Number.isFinite(raw.elapsedMs)
    ? Math.max(0, raw.elapsedMs)
    : 0;

  const completedFocus =
    typeof raw.completedFocus === "number" && Number.isFinite(raw.completedFocus)
      ? Math.max(0, Math.floor(raw.completedFocus))
      : 0;

  return { phase, startedAt, elapsedMs: elapsed, completedFocus };
}
