/**
 * English — the source of truth for every string in the app.
 *
 * WHY THIS SHAPE, AND NOT A LIBRARY. Messages are a nested object of strings
 * and functions rather than flat keys fed through an ICU parser. The result is
 * that `fil.ts` is typed against this file, so a missing or misspelled key is
 * a COMPILE ERROR rather than an English string appearing in the middle of a
 * Filipino screen. Half-translated locales are the normal failure mode of
 * every catalogue-based system, and this makes them impossible to commit.
 *
 * Parameterised strings are functions, which also means each locale writes its
 * own plural rules in plain code. English and Filipino do not agree about
 * plurals — "8 cards" against "8 kard" — and a shared rule table would force
 * one of them to be wrong.
 *
 * Keys are grouped by where they appear, not by meaning, so a translator can
 * work through a screen at a time and see the words next to each other the way
 * a student will.
 */

export const en = {
  nav: {
    home: "Home",
    notes: "Notes",
    sets: "Study sets",
    calendar: "Calendar",
    groups: "Groups",
    graph: "Graph",
    retention: "Retention",
    newNote: "New note",
    settings: "Settings",
    signOut: "Sign out",
  },

  dashboard: {
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    todaysPlan: "Today's plan",
    allSets: "All sets",
    recentNotes: "Recent notes",
    allNotes: "All notes",
    studyTime: "Study time",
    fullLog: "Full log",
    startReviewing: "Start reviewing",
    everythingOnTrack: "Everything is on track.",
    cardsNeedWork: (count: number) =>
      `${count} ${count === 1 ? "card needs" : "cards need"} work`,
    cardsReadyToStart: (count: number) =>
      `${count} ${count === 1 ? "card is" : "cards are"} ready to start`,
    rateEachOne: "Rate each one and Tuón schedules when you see it again.",
    noneWillHold: (when: string) => `None of them will hold until ${when}.`,
    projectedNote:
      "Projected from your own review schedule, assuming you keep up. It is an estimate of what you will still remember — not a prediction of your score.",
    nextDays: (days: number) => `The next ${days} days`,
  },

  review: {
    showAnswer: "Show answer",
    yourAnswer: "Your answer",
    check: "Check",
    justShowMe: "Just show me the answer",
    hint: "Hint",
    more: "More",
    question: "Question",
    answer: "Answer",
    typePrompt: "Type what you remember, then press Enter",
    tapPrompt: "Tap the card or press Space to reveal",
    correct: "Correct",
    almost: "Almost",
    notQuite: "Not quite",
    skipped: "Skipped",
    withAHint: "with a hint",
    youWrote: (text: string) => `you wrote “${text}”`,
    markedMissed: "You marked this one as missed",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    allCaughtUp: "All caught up",
    nothingDue:
      "Nothing is due right now. Coming back early is wasted effort — the schedule is doing its job.",
    reviewAnyway: "Review anyway",
    back: "Back",
    sessionComplete: "Session complete",
    keepGoing: "Keep going",
    done: "Done",
    goAgain: "Go through them again",
    exitReview: "Exit review",
  },

  timer: {
    focus: "Focus",
    shortBreak: "Short break",
    longBreak: "Long break",
    start: "Start a focus block",
    pause: "Pause the timer",
    options: "Timer options",
    endBlock: "End block and log it",
    skipBreak: "Skip the break",
    resetNothing: "Reset — log nothing",
    changeLengths: "Change the lengths",
    studying: "Studying",
    noSubject: "No subject",
    blocksToday: (count: number) =>
      `${count} ${count === 1 ? "block" : "blocks"} today`,
    backgroundNote:
      "Keeps running in the background. Only focus blocks are logged.",
    logged: (time: string, next: string) => `${time} logged. ${next} next.`,
    breakOver: "Break over. Back to it.",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    remove: "Remove",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    loading: "Loading",
    minutes: "minutes",
    cards: (count: number) => `${count} ${count === 1 ? "card" : "cards"}`,
    days: (count: number) => `${count} ${count === 1 ? "day" : "days"}`,
    members: (count: number) => `${count} ${count === 1 ? "member" : "members"}`,
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    inDays: (days: number) => `In ${days} days`,
    daysAgo: (days: number) => `${days} days ago`,
  },

  settings: {
    title: "Settings",
    studying: "Studying",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    colour: "Colour",
    language: "Language",
    languageHint:
      "Tuón's own words. Your notes and cards stay in whatever language you wrote them.",
    timeZone: "Time zone",
    dailyGoal: "Daily card goal",
    typedRecall: "Type the answer first",
    focusTimer: "Focus timer",
    semesters: "Semesters",
    picture: "Picture",
    upload: "Upload",
    change: "Change",
  },
} as const;

/**
 * The shape every other locale must match exactly.
 *
 * Derived from `en` rather than declared separately, which is what makes a
 * forgotten key impossible to commit: adding a string here breaks every locale
 * that has not been given one, at compile time.
 *
 * The widening matters. `as const` above types each string as its own literal,
 * so a raw `typeof en` would demand that Filipino say "Notes" — the constraint
 * would be that every locale is identical to English, which is exactly wrong.
 * This keeps the KEYS and the function SIGNATURES rigid while letting the
 * words differ, so a translator is free on the text and cannot be free on the
 * structure.
 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;
