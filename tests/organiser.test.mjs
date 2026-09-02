/**
 * The organiser: plan items, the Pomodoro clock, and study-time totals.
 *
 * The Pomodoro group is the one that matters most. Every naive timer works on
 * a desktop with the tab in front and fails on a locked phone, and the failure
 * is silent — the log just quietly reports less than the student did. Those
 * checks simulate the gap directly.
 */
import assert from "node:assert/strict";

import {
  DEADLINE_GRACE_DAYS,
  classesOn,
  daysBetween,
  describeDueDate,
  formatDayKey,
  formatMinute,
  isDayKey,
  isUsableTitle,
  nextDeadline,
  orderTodos,
  overlappingClassIds,
  parseTimeValue,
  toTimeValue,
  upcomingDeadlines,
} from "../src/lib/organiser/plan-items.ts";
import {
  FOCUS_BLOCKS_BEFORE_LONG_BREAK,
  elapsedMs,
  formatRemaining,
  initialPomodoro,
  isComplete,
  loggableMinutes,
  nextPhase,
  setSubject,
  pause,
  phaseDurationMs,
  readStoredState,
  remainingMs,
  reset,
  start,
  DEFAULT_POMODORO,
  MAX_PHASE_MINUTES,
  MIN_PHASE_MINUTES,
  clampPhaseMinutes,
  readPomodoroSettings,
} from "../src/lib/organiser/pomodoro.ts";
import {
  MAX_SESSION_MINUTES,
  UNTAGGED,
  clampMinutes,
  formatMinutes,
  minutesByDay,
  minutesBySubject,
  sessionsSince,
  sessionsInWeek,
  totalMinutes,
  weekDayKeys,
} from "../src/lib/organiser/sessions.ts";
import {
  MAX_BATCH_WRITES,
  chunk,
  describeContents,
  planRetag,
  summariseSubject,
  tagMatches,
} from "../src/lib/organiser/subject-cleanup.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const MINUTE = 60_000;

/** Minimal PlanItem; only the fields the function under test reads. */
function item(kind, fields = {}) {
  return {
    id: fields.id ?? Math.random().toString(36).slice(2),
    kind,
    title: fields.title ?? "Something",
    courseTag: fields.courseTag ?? null,
    createdAt: { seconds: fields.created ?? 0 },
    ...fields,
  };
}

console.log("\nDates and day keys");

check("a day key is YYYY-MM-DD and nothing else", () => {
  assert.equal(isDayKey("2026-08-30"), true);
  assert.equal(isDayKey("2026-8-30"), false);
  assert.equal(isDayKey("30/08/2026"), false);
  assert.equal(isDayKey(null), false);
  assert.equal(isDayKey(20260830), false);
});

check("days between two keys counts calendar days", () => {
  assert.equal(daysBetween("2026-08-30", "2026-09-02"), 3);
  assert.equal(daysBetween("2026-09-02", "2026-08-30"), -3);
  assert.equal(daysBetween("2026-08-30", "2026-08-30"), 0);
});

check("a month boundary does not confuse the count", () => {
  assert.equal(daysBetween("2026-08-31", "2026-09-01"), 1);
  // 2028 is a leap year; February has 29 days.
  assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);
});

check("a deadline is described by distance, not by date, when it is near", () => {
  // A shape rather than a sentence: the words are the view's, because this
  // module cannot know what language the student reads.
  const today = "2026-08-30";
  assert.deepEqual(describeDueDate("2026-08-30", today), { kind: "today" });
  assert.deepEqual(describeDueDate("2026-08-31", today), { kind: "tomorrow" });
  assert.deepEqual(describeDueDate("2026-09-02", today), { kind: "inDays", days: 3 });
});

check("an overdue deadline says how late it is", () => {
  // The one that has to shout. A bare date does not read as a problem.
  const today = "2026-08-30";
  assert.deepEqual(describeDueDate("2026-08-29", today), { kind: "yesterday" });
  assert.deepEqual(describeDueDate("2026-08-28", today), { kind: "daysAgo", days: 2 });
});

check("a distant deadline shows its date instead", () => {
  // "In 23 days" means nothing to anyone.
  assert.deepEqual(describeDueDate("2026-09-30", "2026-08-30"), {
    kind: "date",
    dayKey: "2026-09-30",
  });
  assert.match(formatDayKey("2026-09-30"), /Sep/);
});

console.log("\nTimetable times");

check("minutes from midnight render as a clock time", () => {
  assert.equal(formatMinute(0), "12:00 AM");
  assert.equal(formatMinute(9 * 60), "9:00 AM");
  assert.equal(formatMinute(12 * 60), "12:00 PM");
  assert.equal(formatMinute(13 * 60 + 30), "1:30 PM");
  assert.equal(formatMinute(23 * 60 + 59), "11:59 PM");
});

check("a time input round-trips", () => {
  assert.equal(parseTimeValue("09:30"), 570);
  assert.equal(toTimeValue(570), "09:30");
  assert.equal(toTimeValue(parseTimeValue("00:00")), "00:00");
});

check("a nonsense time is rejected rather than coerced", () => {
  // Coercing "25:00" to something would put a class at a time nobody chose.
  assert.equal(parseTimeValue("25:00"), null);
  assert.equal(parseTimeValue("09:70"), null);
  assert.equal(parseTimeValue("morning"), null);
  assert.equal(parseTimeValue(""), null);
});

console.log("\nOrdering what the student sees");

check("deadlines come soonest first", () => {
  const items = [
    item("deadline", { id: "c", dueDate: "2026-09-10" }),
    item("deadline", { id: "a", dueDate: "2026-09-01" }),
    item("deadline", { id: "b", dueDate: "2026-09-05" }),
  ];
  assert.deepEqual(
    upcomingDeadlines(items, "2026-08-30").map((i) => i.id),
    ["a", "b", "c"],
  );
});

check("a just-missed deadline still shows", () => {
  // It vanishing at midnight is useless to someone opening the app the next
  // morning, which is exactly when they need to see it.
  const items = [item("deadline", { id: "late", dueDate: "2026-08-29" })];
  assert.equal(upcomingDeadlines(items, "2026-08-30").length, 1);
});

check("an ancient deadline is dropped", () => {
  const items = [item("deadline", { id: "old", dueDate: "2026-01-01" })];
  assert.equal(upcomingDeadlines(items, "2026-08-30").length, 0);
});

check("the grace period is exactly as long as it claims", () => {
  const items = [
    item("deadline", { id: "edge", dueDate: "2026-08-23" }), // 7 days ago
    item("deadline", { id: "past", dueDate: "2026-08-22" }), // 8 days ago
  ];
  assert.equal(DEADLINE_GRACE_DAYS, 7);
  assert.deepEqual(
    upcomingDeadlines(items, "2026-08-30").map((i) => i.id),
    ["edge"],
  );
});

check("todos put unfinished work first", () => {
  const items = [
    item("todo", { id: "done", done: true, created: 1 }),
    item("todo", { id: "open", done: false, created: 2 }),
  ];
  assert.deepEqual(
    orderTodos(items).map((i) => i.id),
    ["open", "done"],
  );
});

check("finished todos stay on the list rather than vanishing", () => {
  // A list that empties itself gives no sense that anything was done.
  const items = [item("todo", { id: "done", done: true })];
  assert.equal(orderTodos(items).length, 1);
});

check("dated todos come before undated ones, soonest first", () => {
  const items = [
    item("todo", { id: "someday", created: 1 }),
    item("todo", { id: "friday", dueDate: "2026-09-04", created: 2 }),
    item("todo", { id: "tomorrow", dueDate: "2026-08-31", created: 3 }),
  ];
  assert.deepEqual(
    orderTodos(items).map((i) => i.id),
    ["tomorrow", "friday", "someday"],
  );
});

check("undated todos keep the order they were typed", () => {
  const items = [
    item("todo", { id: "second", created: 200 }),
    item("todo", { id: "first", created: 100 }),
  ];
  assert.deepEqual(
    orderTodos(items).map((i) => i.id),
    ["first", "second"],
  );
});

check("only todos come back from the todo list", () => {
  const items = [item("todo", { id: "t" }), item("deadline", { id: "d", dueDate: "2026-09-01" })];
  assert.deepEqual(
    orderTodos(items).map((i) => i.id),
    ["t"],
  );
});

console.log("\nThe timetable");

check("a weekday's classes are earliest first", () => {
  const items = [
    item("class", { id: "late", weekday: 1, startMinute: 780, endMinute: 840 }),
    item("class", { id: "early", weekday: 1, startMinute: 480, endMinute: 540 }),
    item("class", { id: "other-day", weekday: 2, startMinute: 60, endMinute: 120 }),
  ];
  assert.deepEqual(
    classesOn(items, 1).map((i) => i.id),
    ["early", "late"],
  );
});

check("overlapping classes are flagged", () => {
  const items = [
    item("class", { id: "a", weekday: 1, startMinute: 480, endMinute: 600 }),
    item("class", { id: "b", weekday: 1, startMinute: 540, endMinute: 660 }),
  ];
  assert.deepEqual([...overlappingClassIds(items)].sort(), ["a", "b"]);
});

check("back-to-back classes are not a clash", () => {
  // Ending at 10:00 and starting at 10:00 is a normal timetable, not an error.
  const items = [
    item("class", { id: "a", weekday: 1, startMinute: 480, endMinute: 600 }),
    item("class", { id: "b", weekday: 1, startMinute: 600, endMinute: 720 }),
  ];
  assert.equal(overlappingClassIds(items).size, 0);
});

check("the same times on different days do not clash", () => {
  const items = [
    item("class", { id: "mon", weekday: 1, startMinute: 480, endMinute: 600 }),
    item("class", { id: "tue", weekday: 2, startMinute: 480, endMinute: 600 }),
  ];
  assert.equal(overlappingClassIds(items).size, 0);
});

console.log("\nThe horizon a deadline sets");

check("the next deadline is the soonest one still ahead", () => {
  const items = [
    item("deadline", { id: "later", dueDate: "2026-09-20" }),
    item("deadline", { id: "soon", dueDate: "2026-09-02" }),
  ];
  assert.equal(nextDeadline(items, "2026-08-30").id, "soon");
});

check("a passed deadline is never the horizon", () => {
  // You cannot prepare for a date that has gone; using it would make the
  // readiness projection answer a question nobody asked.
  const items = [item("deadline", { dueDate: "2026-08-01" })];
  assert.equal(nextDeadline(items, "2026-08-30"), null);
});

check("today counts as still ahead", () => {
  const items = [item("deadline", { id: "today", dueDate: "2026-08-30" })];
  assert.equal(nextDeadline(items, "2026-08-30")?.id, "today");
});

check("no deadlines means no horizon, not a fabricated one", () => {
  assert.equal(nextDeadline([item("todo", {})], "2026-08-30"), null);
});

check("a blank title is not saveable", () => {
  assert.equal(isUsableTitle("  "), false);
  assert.equal(isUsableTitle("Read chapter 4"), true);
  assert.equal(isUsableTitle("x".repeat(141)), false);
});

console.log("\nThe Pomodoro clock");

check("a fresh timer is not running", () => {
  const state = initialPomodoro();
  assert.equal(state.startedAt, null);
  assert.equal(remainingMs(state, 0), phaseDurationMs("focus"));
});

check("time comes from the clock, not from ticks", () => {
  // THE point of this module. Nothing here ever counts events; ten minutes of
  // wall clock is ten minutes whether the tab rendered once or six hundred
  // times.
  const state = start(initialPomodoro(), 0);
  assert.equal(elapsedMs(state, 10 * MINUTE), 10 * MINUTE);
  assert.equal(remainingMs(state, 10 * MINUTE), 15 * MINUTE);
});

check("a backgrounded tab loses no time at all", () => {
  // Lock the phone at minute 1, come back at minute 20. A tick-counting timer
  // would report about a minute; this must report nineteen.
  const state = start(initialPomodoro(), 0);
  assert.equal(elapsedMs(state, 20 * MINUTE), 20 * MINUTE);
  assert.equal(isComplete(state, 26 * MINUTE), true);
});

check("remaining never goes negative", () => {
  // A phase that ran over while the tab slept reads as finished, not as
  // "-4:12", which is what a naive subtraction shows.
  const state = start(initialPomodoro(), 0);
  assert.equal(remainingMs(state, 90 * MINUTE), 0);
});

check("pausing banks the time and stops the clock", () => {
  const running = start(initialPomodoro(), 0);
  const paused = pause(running, 10 * MINUTE);
  assert.equal(paused.startedAt, null);
  assert.equal(paused.elapsedMs, 10 * MINUTE);
  // An hour of being paused adds nothing.
  assert.equal(elapsedMs(paused, 70 * MINUTE), 10 * MINUTE);
});

check("resuming continues rather than restarting", () => {
  const paused = pause(start(initialPomodoro(), 0), 10 * MINUTE);
  const resumed = start(paused, 70 * MINUTE);
  assert.equal(elapsedMs(resumed, 75 * MINUTE), 15 * MINUTE);
});

check("pausing twice does not double-count", () => {
  const paused = pause(start(initialPomodoro(), 0), 10 * MINUTE);
  const again = pause(paused, 40 * MINUTE);
  assert.equal(again.elapsedMs, 10 * MINUTE);
});

check("reset clears the phase but keeps the blocks earned", () => {
  const state = { ...start(initialPomodoro(), 0), completedFocus: 3 };
  const cleared = reset(state);
  assert.equal(cleared.elapsedMs, 0);
  assert.equal(cleared.startedAt, null);
  assert.equal(cleared.completedFocus, 3);
});

check("focus is followed by a short break", () => {
  const next = nextPhase(start(initialPomodoro(), 0));
  assert.equal(next.phase, "shortBreak");
  assert.equal(next.completedFocus, 1);
});

check("every fourth focus block earns the long break", () => {
  let state = initialPomodoro();
  for (let i = 0; i < FOCUS_BLOCKS_BEFORE_LONG_BREAK - 1; i += 1) {
    state = nextPhase({ ...state, phase: "focus" });
  }
  const fourth = nextPhase({ ...state, phase: "focus" });
  assert.equal(fourth.phase, "longBreak");
  assert.equal(fourth.completedFocus, FOCUS_BLOCKS_BEFORE_LONG_BREAK);
});

check("a break never earns credit toward the long break", () => {
  // Otherwise skipping breaks would bring the long one forward.
  const after = nextPhase({ ...initialPomodoro("shortBreak"), completedFocus: 2 });
  assert.equal(after.phase, "focus");
  assert.equal(after.completedFocus, 2);
});

check("a new phase starts from zero", () => {
  const finished = { ...start(initialPomodoro(), 0), elapsedMs: 25 * MINUTE };
  const next = nextPhase(finished);
  assert.equal(next.elapsedMs, 0);
  assert.equal(next.startedAt, null);
});

console.log("\nHow long a block runs");

check("the classic lengths are the default", () => {
  assert.deepEqual(DEFAULT_POMODORO, { focus: 25, shortBreak: 5, longBreak: 15 });
  assert.equal(phaseDurationMs("focus"), 25 * MINUTE);
});

check("a student's own lengths are used instead", () => {
  // Twenty-five minutes is far too long for some people, and forcing the
  // textbook number on them just means they stop using the timer.
  const mine = { focus: 12, shortBreak: 3, longBreak: 20 };
  assert.equal(phaseDurationMs("focus", mine), 12 * MINUTE);
  assert.equal(phaseDurationMs("shortBreak", mine), 3 * MINUTE);
  assert.equal(remainingMs(start(initialPomodoro(), 0), 2 * MINUTE, mine), 10 * MINUTE);
});

check("a short block completes at its own length", () => {
  const mine = { focus: 5, shortBreak: 1, longBreak: 10 };
  const state = start(initialPomodoro(), 0);
  assert.equal(isComplete(state, 4 * MINUTE, mine), false);
  assert.equal(isComplete(state, 5 * MINUTE, mine), true);
  // The default would still have twenty minutes left on the clock.
  assert.equal(isComplete(state, 5 * MINUTE), false);
});

check("a length outside the bounds is clamped, not accepted", () => {
  // A zero-length phase would complete instantly and log blocks forever.
  assert.equal(clampPhaseMinutes(0, 25), MIN_PHASE_MINUTES);
  assert.equal(clampPhaseMinutes(-5, 25), MIN_PHASE_MINUTES);
  assert.equal(clampPhaseMinutes(9999, 25), MAX_PHASE_MINUTES);
  assert.equal(clampPhaseMinutes(30, 25), 30);
});

check("junk falls back to the value it replaced", () => {
  assert.equal(clampPhaseMinutes("abc", 25), 25);
  assert.equal(clampPhaseMinutes(NaN, 25), 25);
  assert.equal(clampPhaseMinutes(undefined, 25), 25);
});

check("a profile with nothing set gets the classic lengths", () => {
  assert.deepEqual(readPomodoroSettings({}), DEFAULT_POMODORO);
});

check("a profile with partial settings keeps the rest at default", () => {
  const settings = readPomodoroSettings({ pomodoroFocus: 45 });
  assert.equal(settings.focus, 45);
  assert.equal(settings.shortBreak, DEFAULT_POMODORO.shortBreak);
});

check("a corrupt profile value cannot produce a zero-length phase", () => {
  // The nastiest failure: a phase of 0 completes the instant it starts, so the
  // timer would log block after block without anyone studying.
  const settings = readPomodoroSettings({ pomodoroFocus: 0, pomodoroShortBreak: "x" });
  assert.ok(settings.focus >= MIN_PHASE_MINUTES);
  assert.ok(settings.shortBreak >= MIN_PHASE_MINUTES);
});

console.log("\nWhat gets logged");

check("only whole minutes of focus are logged", () => {
  // Forty seconds is not a minute of study, and rounding those up across a
  // week inflates the log by exactly the time the student did not put in.
  const state = start(initialPomodoro(), 0);
  assert.equal(loggableMinutes(state, 40_000), 0);
  assert.equal(loggableMinutes(state, 5 * MINUTE + 59_000), 5);
});

check("breaks are never logged as study", () => {
  const resting = start(initialPomodoro("shortBreak"), 0);
  assert.equal(loggableMinutes(resting, 5 * MINUTE), 0);
});

check("a partial block still logs what was done", () => {
  // Stopping at eleven minutes should not throw those minutes away.
  const state = start(initialPomodoro(), 0);
  assert.equal(loggableMinutes(state, 11 * MINUTE), 11);
});

check("the countdown is always mm:ss", () => {
  // Fixed width, so the digits do not reflow every second.
  assert.equal(formatRemaining(25 * MINUTE), "25:00");
  assert.equal(formatRemaining(59_000), "00:59");
  assert.equal(formatRemaining(0), "00:00");
  assert.equal(formatRemaining(-5000), "00:00");
});

console.log("\nResuming a stored timer");

check("a stored timer is restored", () => {
  const stored = {
    phase: "focus",
    startedAt: 1000,
    elapsedMs: 500,
    completedFocus: 2,
    subject: "General Biology 1",
  };
  assert.deepEqual(readStoredState(stored), stored);
});

check("a reload mid-block does not lose what was being studied", () => {
  // The failure this closes: the subject used to live in the dock's own
  // state, so a refresh left a running timer that no longer knew what it was
  // counting — and the whole block landed in the log untagged.
  const restored = readStoredState({
    phase: "focus",
    startedAt: 1000,
    elapsedMs: 0,
    completedFocus: 0,
    subject: "  Statistics  ",
  });
  assert.equal(restored.subject, "Statistics");
});

check("a stored subject that is not usable reads as untagged", () => {
  // Not as a reason to throw the whole timer away.
  assert.equal(readStoredState({ phase: "focus", subject: 42 }).subject, null);
  assert.equal(readStoredState({ phase: "focus", subject: "   " }).subject, null);
  assert.equal(readStoredState({ phase: "focus" }).subject, null);
});

check("the subject survives a break and the block after it", () => {
  // A break does not change what you came back to. Clearing it here would
  // silently untag every block after the first.
  const focused = setSubject(initialPomodoro(), "Chemistry");
  const onBreak = nextPhase(focused);
  assert.equal(onBreak.phase, "shortBreak");
  assert.equal(onBreak.subject, "Chemistry");
  assert.equal(nextPhase(onBreak).subject, "Chemistry");
});

check("a blank subject is stored as untagged, not as an empty string", () => {
  // Untagged is a real answer; "" would sort as its own subject in every
  // breakdown built on this.
  assert.equal(setSubject(initialPomodoro(), "   ").subject, null);
  assert.equal(setSubject(initialPomodoro(), null).subject, null);
});

check("junk in storage does not take the screen down", () => {
  // Written by an older version, or by a user editing localStorage. It should
  // cost one session, not the page.
  assert.equal(readStoredState(null), null);
  assert.equal(readStoredState("running"), null);
  assert.equal(readStoredState({ phase: "lunch" }), null);
});

check("missing fields fall back instead of producing NaN", () => {
  // A NaN elapsed makes the countdown render "NaN:NaN" forever.
  const restored = readStoredState({ phase: "focus" });
  assert.equal(restored.elapsedMs, 0);
  assert.equal(restored.completedFocus, 0);
  assert.equal(restored.startedAt, null);
  assert.equal(Number.isFinite(remainingMs(restored, 0)), true);
});

console.log("\nStudy totals");

check("minutes are clamped to something a human could do", () => {
  // A timer left running overnight would otherwise log 14 hours and wreck
  // every average built on top of it.
  assert.equal(clampMinutes(30), 30);
  assert.equal(clampMinutes(-5), 0);
  assert.equal(clampMinutes(99999), MAX_SESSION_MINUTES);
  assert.equal(clampMinutes("thirty"), 0);
  assert.equal(clampMinutes(NaN), 0);
});

check("durations read the way people say them", () => {
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(85), "1h 25m");
  assert.equal(formatMinutes(120), "2h");
  assert.equal(formatMinutes(0), "0m");
});

check("a day's sessions add up", () => {
  const sessions = [
    { day: "2026-08-30", minutes: 25, courseTag: "Math" },
    { day: "2026-08-30", minutes: 25, courseTag: "Math" },
    { day: "2026-08-29", minutes: 50, courseTag: null },
  ];
  const byDay = minutesByDay(sessions);
  assert.equal(byDay.get("2026-08-30"), 50);
  assert.equal(byDay.get("2026-08-29"), 50);
  assert.equal(totalMinutes(sessions), 100);
});

check("time with no subject is kept, not dropped", () => {
  // Unattributed study is still study; silently discarding it would make the
  // total disagree with the per-subject breakdown.
  const rows = minutesBySubject([
    { day: "d", minutes: 30, courseTag: "Math" },
    { day: "d", minutes: 20, courseTag: null },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.reduce((sum, r) => sum + r.minutes, 0), 50);
});

check("subjects are ordered by time spent", () => {
  const rows = minutesBySubject([
    { day: "d", minutes: 10, courseTag: "Math" },
    { day: "d", minutes: 40, courseTag: "Biology" },
  ]);
  assert.equal(rows[0].subject, "Biology");
});

check("untagged time is keyed by a sentinel, never by a printable word", () => {
  // The breakdown says "No subject" in whichever language the student reads,
  // so the key it groups on must not be an English label — otherwise a real
  // subject actually called "No subject" would merge into it.
  const rows = minutesBySubject([{ day: "d", minutes: 20, courseTag: null }]);
  assert.equal(rows[0].subject, UNTAGGED);
  assert.notEqual(UNTAGGED, "No subject");
});

check("a window keeps the days on its boundary", () => {
  // Day keys sort as strings, so this is an inclusive string comparison —
  // dropping the first day would quietly shorten every breakdown by one.
  const sessions = [
    { day: "2026-08-29", minutes: 10 },
    { day: "2026-08-30", minutes: 20 },
    { day: "2026-09-05", minutes: 30 },
  ];
  const kept = sessionsSince(sessions, "2026-08-30");
  assert.deepEqual(kept.map((s) => s.day), ["2026-08-30", "2026-09-05"]);
});

check("a session with no day is excluded rather than counted as ancient", () => {
  assert.deepEqual(sessionsSince([{ minutes: 10 }], "2026-08-30"), []);
});

check("a week is seven days starting on Sunday", () => {
  // 2026-08-30 is a Sunday.
  const week = weekDayKeys("2026-08-30");
  assert.equal(week.length, 7);
  assert.equal(week[0], "2026-08-30");
  assert.equal(week[6], "2026-09-05");
});

check("a midweek day resolves to its own week", () => {
  // 2026-09-02 is a Wednesday.
  const week = weekDayKeys("2026-09-02");
  assert.equal(week[0], "2026-08-30");
  assert.ok(week.includes("2026-09-02"));
});

check("the previous week is a real week, not seven days back", () => {
  const week = weekDayKeys("2026-09-02", -1);
  assert.equal(week[0], "2026-08-23");
  assert.equal(week.length, 7);
});

check("a week crossing a month boundary is still seven days", () => {
  const week = weekDayKeys("2026-08-31");
  assert.equal(week.length, 7);
  assert.equal(new Set(week).size, 7);
});

check("only sessions inside the week come back", () => {
  const sessions = [
    { day: "2026-08-30", minutes: 25, startedAt: { seconds: 1 } },
    { day: "2026-08-20", minutes: 25, startedAt: { seconds: 2 } },
  ];
  const week = sessionsInWeek(sessions, weekDayKeys("2026-08-30"));
  assert.equal(week.length, 1);
  assert.equal(week[0].day, "2026-08-30");
});

check("sessions are newest first within the week", () => {
  const sessions = [
    { day: "2026-08-30", minutes: 25, startedAt: { seconds: 100 } },
    { day: "2026-09-01", minutes: 25, startedAt: { seconds: 50 } },
    { day: "2026-08-30", minutes: 25, startedAt: { seconds: 200 } },
  ];
  const week = sessionsInWeek(sessions, weekDayKeys("2026-08-30"));
  assert.deepEqual(
    week.map((s) => `${s.day}/${s.startedAt.seconds}`),
    ["2026-09-01/50", "2026-08-30/200", "2026-08-30/100"],
  );
});

console.log("\nRemoving a subject");

const CONTENTS = {
  notes: [
    { id: "n1", courseTag: "General Biology 1" },
    { id: "n2", courseTag: "Calculus" },
    { id: "n3", courseTag: null },
  ],
  sets: [
    { id: "s1", courseTag: "General Biology 1", flashcardCount: 8 },
    { id: "s2", courseTag: "General Biology 1", flashcardCount: 12 },
  ],
  planItems: [{ id: "p1", courseTag: "General Biology 1" }],
  sessions: [{ id: "x1", courseTag: "Calculus" }],
};

check("a tag matches regardless of case and padding", () => {
  // Tags are typed by people and arrive from three different screens.
  assert.equal(tagMatches("General Biology 1", "general biology 1"), true);
  assert.equal(tagMatches("  Calculus ", "Calculus"), true);
  assert.equal(tagMatches("Calculus", "Biology"), false);
  assert.equal(tagMatches(null, "Biology"), false);
  assert.equal(tagMatches(undefined, "Biology"), false);
});

check("everything attached to a subject is counted", () => {
  const summary = summariseSubject(CONTENTS, "General Biology 1");
  assert.equal(summary.notes, 1);
  assert.equal(summary.sets, 2);
  assert.equal(summary.planItems, 1);
  assert.equal(summary.sessions, 0);
  assert.equal(summary.isEmpty, false);
});

check("cards are counted through their set", () => {
  // A flashcard has no subject of its own; it inherits its set's. Reporting
  // "2 study sets" without the 20 cards understates what is at stake.
  assert.equal(summariseSubject(CONTENTS, "General Biology 1").cards, 20);
});

check("a subject with nothing attached is marked empty", () => {
  const summary = summariseSubject(CONTENTS, "Physics");
  assert.equal(summary.isEmpty, true);
  assert.equal(summary.cards, 0);
});

check("the plan names every document that must be rewritten", () => {
  const plan = planRetag(CONTENTS, "General Biology 1");
  assert.deepEqual(plan.notes, ["n1"]);
  assert.deepEqual(plan.sets, ["s1", "s2"]);
  assert.deepEqual(plan.planItems, ["p1"]);
  assert.deepEqual(plan.sessions, []);
  assert.equal(plan.total, 4);
});

check("untagged material is never swept up", () => {
  // n3 has no subject. Retagging it would attach material to a subject the
  // student never put it in.
  const plan = planRetag(CONTENTS, "General Biology 1");
  assert.equal(plan.notes.includes("n3"), false);
});

check("another subject is left completely alone", () => {
  const plan = planRetag(CONTENTS, "General Biology 1");
  assert.equal(plan.notes.includes("n2"), false);
  assert.equal(plan.sessions.includes("x1"), false);
});

check("writes are chunked below the Firestore batch limit", () => {
  // A batch over 500 is refused outright, and the failure would land halfway
  // through - some material retagged, some orphaned, which is the exact state
  // this module exists to prevent.
  const ids = Array.from({ length: 950 }, (_, i) => String(i));
  const batches = chunk(ids);
  assert.equal(batches.length, 3);
  assert.ok(batches.every((b) => b.length <= MAX_BATCH_WRITES));
  assert.equal(batches.flat().length, 950);
  assert.ok(MAX_BATCH_WRITES < 500);
});

check("chunking an empty list produces no batches", () => {
  assert.deepEqual(chunk([]), []);
});

check("the confirmation says what exists, in words", () => {
  const summary = summariseSubject(CONTENTS, "General Biology 1");
  const text = describeContents(summary);
  assert.match(text, /1 note/);
  assert.match(text, /2 study sets \(20 cards\)/);
  assert.match(text, / and /);
});

check("singulars and plurals both read correctly", () => {
  const one = describeContents(
    summariseSubject(
      { notes: [{ id: "a", courseTag: "X" }], sets: [], planItems: [], sessions: [] },
      "X",
    ),
  );
  assert.equal(one, "1 note");
});

check("an empty subject says so rather than listing nothing", () => {
  const text = describeContents(summariseSubject(CONTENTS, "Physics"));
  assert.match(text, /Nothing/);
});

console.log(`\n${passed} checks passed.\n`);
