/**
 * Filipino.
 *
 * DRAFT — pending review by a native speaker before it is offered to students.
 * The `PENDING_REVIEW` flag in ./locales is what keeps it out of the picker
 * until then; nothing here is unreachable, it is just not yet on offer.
 *
 * Written in the register Filipino students actually use for schoolwork,
 * which is Taglish rather than deep Tagalog. "Flashcard", "review", "quiz",
 * "semester" and "study set" are the words used in real classrooms — the pure
 * Tagalog equivalents ("kartilya", "pagbabalik-aral") would read as a
 * translation exercise rather than as an app, and students would trust it
 * less, not more.
 *
 * Two grammar notes, since they are the parts a reviewer should check hardest:
 *
 * 1. Filipino does not pluralise the noun after a number — "8 kard", never
 *    "8 mga kard" — so the plural functions here deliberately ignore `count`
 *    where English would switch. That is correct, not an oversight.
 * 2. Inclusivity of "we" does not arise, because the app never says "we". It
 *    speaks to the student as "mo/ka", which is the informal second person a
 *    classmate would use. That is a deliberate register choice: "ninyo" would
 *    be polite to the point of sounding institutional.
 */

import type { Messages } from "@/lib/i18n/en";

export const fil: Messages = {
  nav: {
    home: "Home",
    notes: "Mga nota",
    sets: "Study sets",
    calendar: "Kalendaryo",
    groups: "Mga grupo",
    graph: "Graph",
    retention: "Retention",
    newNote: "Bagong nota",
    settings: "Settings",
    signOut: "Mag-sign out",
  },

  dashboard: {
    goodMorning: "Magandang umaga",
    goodAfternoon: "Magandang hapon",
    goodEvening: "Magandang gabi",
    todaysPlan: "Plano ngayong araw",
    allSets: "Lahat ng set",
    recentNotes: "Mga bagong nota",
    allNotes: "Lahat ng nota",
    studyTime: "Oras ng pag-aaral",
    fullLog: "Buong log",
    startReviewing: "Simulan ang review",
    everythingOnTrack: "Nasa tamang landas ang lahat.",
    // No plural change on the noun: "8 kard", not "8 mga kard".
    cardsNeedWork: (count: number) => `${count} kard ang kailangan pang balikan`,
    cardsReadyToStart: (count: number) => `${count} kard ang handa nang simulan`,
    rateEachOne:
      "I-rate ang bawat isa at si Tuón na ang bahala kung kailan mo ito muling makikita.",
    noneWillHold: (when: string) =>
      `Wala rito ang mananatili sa memorya mo hanggang ${when}.`,
    projectedNote:
      "Batay ito sa sarili mong review schedule, sa palagay na magpapatuloy ka. Tantiya ito ng matatandaan mo — hindi hula sa magiging score mo.",
    nextDays: (days: number) => `Sa susunod na ${days} araw`,
  },

  review: {
    showAnswer: "Ipakita ang sagot",
    yourAnswer: "Sagot mo",
    check: "I-check",
    justShowMe: "Ipakita na lang ang sagot",
    hint: "Clue",
    more: "Dagdag pa",
    question: "Tanong",
    answer: "Sagot",
    typePrompt: "I-type ang natatandaan mo, tapos pindutin ang Enter",
    tapPrompt: "I-tap ang kard o pindutin ang Space para makita",
    correct: "Tama",
    almost: "Malapit na",
    notQuite: "Hindi pa",
    skipped: "Nilaktawan",
    withAHint: "may clue",
    youWrote: (text: string) => `ang sagot mo ay “${text}”`,
    markedMissed: "Minarkahan mo itong hindi natandaan",
    again: "Ulit",
    hard: "Mahirap",
    good: "Tama",
    easy: "Madali",
    allCaughtUp: "Wala nang naiwan",
    nothingDue:
      "Wala pang dapat balikan ngayon. Sayang lang ang maagang pagbabalik — gumagana ang schedule.",
    reviewAnyway: "Mag-review pa rin",
    back: "Bumalik",
    sessionComplete: "Tapos na ang session",
    keepGoing: "Ituloy pa",
    done: "Tapos na",
    goAgain: "Ulitin ang lahat",
    exitReview: "Lumabas sa review",
  },

  timer: {
    focus: "Focus",
    shortBreak: "Maikling break",
    longBreak: "Mahabang break",
    start: "Simulan ang focus block",
    pause: "I-pause ang timer",
    options: "Mga opsyon sa timer",
    endBlock: "Tapusin ang block at i-log",
    skipBreak: "Laktawan ang break",
    resetNothing: "I-reset — walang ilo-log",
    changeLengths: "Baguhin ang haba",
    studying: "Pinag-aaralan",
    noSubject: "Walang subject",
    blocksToday: (count: number) => `${count} block ngayong araw`,
    backgroundNote:
      "Patuloy itong tumatakbo kahit nasa background. Focus blocks lang ang nilo-log.",
    logged: (time: string, next: string) => `${time} ang na-log. ${next} na susunod.`,
    breakOver: "Tapos na ang break. Balik na tayo.",
  },

  common: {
    save: "I-save",
    cancel: "Kanselahin",
    add: "Idagdag",
    remove: "Alisin",
    delete: "Burahin",
    edit: "I-edit",
    close: "Isara",
    loading: "Naglo-load",
    minutes: "minuto",
    cards: (count: number) => `${count} kard`,
    days: (count: number) => `${count} araw`,
    members: (count: number) => `${count} miyembro`,
    today: "Ngayon",
    tomorrow: "Bukas",
    yesterday: "Kahapon",
    inDays: (days: number) => `Sa ${days} araw`,
    daysAgo: (days: number) => `${days} araw na ang nakalipas`,
  },

  settings: {
    title: "Settings",
    studying: "Pag-aaral",
    appearance: "Itsura",
    light: "Maliwanag",
    dark: "Madilim",
    system: "System",
    colour: "Kulay",
    language: "Wika",
    languageHint:
      "Ang sariling salita ng Tuón. Mananatili sa wikang ginamit mo ang mga nota at kard mo.",
    timeZone: "Time zone",
    dailyGoal: "Target na kard bawat araw",
    typedRecall: "I-type muna ang sagot",
    focusTimer: "Focus timer",
    semesters: "Mga semestre",
    picture: "Larawan",
    upload: "Mag-upload",
    change: "Palitan",
  },
};
