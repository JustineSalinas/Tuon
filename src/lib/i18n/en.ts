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
    onTrack: "On track",
    shaky: "Shaky",
    notStarted: "Not started",
    daysTo: (days: number, when: string) =>
      `${days} ${days === 1 ? "day" : "days"} to ${when}`,
    todayIs: (when: string) => `Today — ${when}`,
    freshLine: (onTrack: number, total: number, pct: number) =>
      `${onTrack} of ${total} ${total === 1 ? "card" : "cards"} should still be fresh — ${pct}%`,
    weakestSubject: "Weakest subject",
    dueToday: "Due today",
    neverSeen: "Never seen",
    noCardsYet: "No cards yet",
    turnIntoCards: (title: string) => `Turn “${title}” into cards`,
    testYourselfOn: (title: string) => `Test yourself on ${title}`,
    shakyCards: (count: number) =>
      `${count} shaky ${count === 1 ? "card" : "cards"}`,
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
    loadMore: (count: number) => `Load ${count} more`,
    searchingLoaded: (count: string, noun: string) =>
      `Searching the ${count} ${noun} loaded so far.`,
    nounNotes: "notes",
    nounSets: "study sets",
    dateLocale: "en-PH",
    weekdays: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    weekdaysNarrow: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  },

  sets: {
    title: "Study sets",
    search: "Search study sets",
    allSets: "All sets",
    termsLiveIn: "Terms and their subjects live in",
    settingsLink: "settings",
    noMatch: (query: string) => `No study sets match “${query}”.`,
    noneYet: "No study sets yet",
    noneYetHint:
      "Write a note, then hit Generate study set. Your flashcards and quiz will show up here.",
    startANote: "Start a note",
    notFound: "Study set not found",
    backToSets: "Back to study sets",
    questions: (count: number) =>
      `${count} ${count === 1 ? "question" : "questions"}`,
    flashcards: (count: number) =>
      `${count} ${count === 1 ? "flashcard" : "flashcards"}`,
    quizQuestions: (count: number) =>
      `${count} quiz ${count === 1 ? "question" : "questions"}`,
    due: (count: number) => `${count} due`,
    fresh: (count: number) => `${count} new`,
    sourceNote: "source note",
    reviewFlashcards: "Review flashcards",
    dueAndNew: (due: number, fresh: number) => `${due} due, ${fresh} new`,
    caughtUpForNow: "All caught up for now",
    takeTheQuiz: "Take the quiz",
    multipleChoice: (count: number) =>
      `${count} multiple-choice ${count === 1 ? "question" : "questions"}`,
    sitATest: "Sit a test",
    testHint: "Timed and mixed, from your weakest cards",
    dueNow: "Due now",
    neverSeen: "Never seen",
    scheduled: "Scheduled",
    cardsTab: "Flashcards",
    newCard: "New",
    resetProgress: "Reset progress",
    resetTitle: "Start this set over?",
    resetBody:
      "Every card in this set becomes due again and forgets how well you knew it. The cards themselves are untouched — this only clears the schedule, for when you are studying a subject from scratch.",
    resetDone: (count: number) =>
      `${count} ${count === 1 ? "card is" : "cards are"} due again.`,
    resetFailed: "Could not reset this set's progress.",
    deleteSet: "Delete set",
    deleteTitle: "Delete this study set?",
    deleteBody:
      "Its flashcards, quiz, and review history will no longer be reachable. The note it came from stays.",
    deleteDone: "Study set deleted.",
    deleteFailed: "Could not delete that study set.",
  },

  mastery: {
    untouched: "Not started",
    learning: "Learning",
    familiar: "Familiar",
    confident: "Confident",
    mastered: "Mastered",
    untouchedHint: "nothing reviewed yet",
    learningHint: "most cards are still coming back within the week",
    familiarHint: "the schedule is starting to stretch out",
    confidentHint: "most cards hold for weeks at a time",
    masteredHint: "everything is weeks out and nothing is shaky",
    ariaLabel: "Mastery of this set",
    shakyStep: (count: number) =>
      `${count} ${count === 1 ? "card keeps" : "cards keep"} tripping you up — those are worth the most right now.`,
    untouchedStep: (count: number) =>
      `${count} ${count === 1 ? "card has" : "cards have"} never been reviewed.`,
    derivedNote:
      "Read from how far ahead each card is scheduled and how often you have missed it — the same figures the review queue runs on, so this can never disagree with it.",
  },

  share: {
    action: "Share",
    lockedTitle: (plan: string) => `Sharing is part of ${plan}`,
    title: "Share this study set",
    body: "Anyone with the link can view the cards and save a copy. They cannot edit yours, and your review history stays private.",
    anyoneWithLink: "Anyone with the link",
    onlyYou: "Only you",
    turningOff: "Turning this off breaks the link immediately.",
    turnOn: "Turn on to create a shareable link.",
    toggleLabel: "Share by link",
    copyLink: "Copy link",
    live: "Link is live.",
    revoked: "Link revoked.",
    changeFailed: "Could not change sharing. Please try again.",
    copyFailed: "Could not copy. Select the link and copy it manually.",
    unlistedNote:
      "The link is not listed or searchable anywhere — it only works for someone you send it to.",
  },

  exportSet: {
    action: "Export",
    lockedTitle: (plan: string) => `Exporting is part of ${plan}`,
    heading: "Export this set",
    anki: "Anki deck",
    ankiHint: "Tab-separated .txt",
    spreadsheet: "Spreadsheet",
    spreadsheetHint: "CSV for Excel or Sheets",
    pdf: "Printable PDF",
    pdfHint: "Cards and quiz with answer key",
    ankiSaved: "Anki file saved. Import it with File → Import in Anki.",
    csvSaved: "CSV saved.",
    pdfHowTo: "Choose “Save as PDF” in the print dialog.",
  },

  notes: {
    search: "Search your notes",
    noMatch: (query: string) => `No notes match “${query}”.`,
    noneYet: "No notes yet",
    noneYetHint:
      "Paste in your lecture notes or a reviewer, and Tuón will turn them into flashcards and a quiz.",
    createFirst: "Create your first note",
    emptyNote: "Empty note",
    characters: (count: string) => `${count} characters`,
    charactersUnit: "characters",
    untitled: "Untitled note",
    titlePlaceholder: "Note title",
    contentLabel: "Note content",
    contentPlaceholder:
      "Paste or type your class notes here — or drop a PDF. Type [[ to link another note.",
    subject: "Subject",
    subjectOptional: "Subject (optional)",
    noSubject: "No subject",
    subjectExample: "e.g. Calculus 1",
    moreNeeded: (count: number) => `${count} more needed to generate`,
    startTyping: "Start typing to save this note.",
    addMoreToGenerate: (count: number) =>
      `Add ${count} more characters to generate a study set.`,
    saving: "Saving",
    saved: "Saved",
    saveFailed: "Could not save",
    dismiss: "Dismiss",
    deleteNote: "Delete note",
    deleteTitle: "Delete this note?",
    deleteBody:
      "The note will be removed. Study sets you already generated from it will stay.",
    deleted: "Note deleted.",
    deleteFailed: "Could not delete that note.",
    linkANote: "Link a note",
    linkTo: (title: string) => `Link to “${title}”`,
    insertHint: "to insert · Esc to dismiss",
    linkHintBefore: "Type",
    linkHintAfter:
      "to link another note. Linked notes show up here, along with anything that links back.",
    linksFrom: "Links from this note",
    linkedFrom: "Linked from",
    notCreatedYet: "not created yet",
  },

  pdf: {
    importPdf: "Import PDF",
    orDrop: "or drop a file anywhere below",
    reading: "Reading your PDF…",
    dropHere: "Drop your PDF here",
    limitNote: (pages: number) => `Up to ${pages} pages · stays on your device`,
    imported: (pages: number) =>
      `Imported ${pages} ${pages === 1 ? "page" : "pages"}`,
    onlyFirst: (read: number, total: number) =>
      `only the first ${read} of ${total} were read`,
    clipped: "text was clipped to fit one note",
    notAPdf: "That is not a PDF. Only PDF files can be imported right now.",
    tooLarge: (sizeMb: string, limitMb: number) =>
      `That PDF is ${sizeMb}MB. The limit is ${limitMb}MB — try splitting it into chapters.`,
    readerFailed: "Could not start the PDF reader. Please refresh and try again.",
    passwordProtected:
      "That PDF is password-protected. Remove the password and try again.",
    unreadable: "That file could not be read as a PDF. It may be corrupted.",
    noTextLayer:
      "No readable text found. This looks like a scanned PDF or images of pages — Tuón cannot read those yet. Try a PDF exported from a document.",
    unknown: "Something went wrong reading that PDF. Please try another file.",
  },

  generate: {
    generateSet: "Generate study set",
    updateSet: "Update the study set",
    separateSet: "Make a separate set",
    generating: "Generating…",
    progress: [
      "Reading your note…",
      "Picking out what matters…",
      "Writing flashcards…",
      "Building your practice quiz…",
      "Almost there…",
    ],
    tryAgain: "Try again",
    failed: "Generation failed. Please try again.",
    offline: "Could not reach the server. Check your connection and try again.",
    merged: (added: number, kept: number) =>
      `${added} new ${added === 1 ? "card" : "cards"} added. Your ${kept} existing ${kept === 1 ? "card" : "cards"} kept their progress.`,
    nothingNew:
      "Nothing new to add — your note has not changed enough since last time.",
    ready: (cards: number, questions: number) =>
      `${cards} flashcards and ${questions} quiz questions ready.`,
    remaining: (left: number, limit: number) =>
      `${left} of ${limit} study sets left this month`,
    exhausted: (limit: number, resetsAt: string | null) =>
      `That’s all ${limit} study sets for this month${resetsAt ? ` — they reset ${resetsAt}` : ""}. You can still write notes and make flashcards by hand.`,
    upgradeOffer: (perMonth: number, php: number) =>
      `Get ${perMonth}/month for ₱${php}`,
  },

  markdown: {
    importAction: "Import Markdown",
    importShort: "Import",
    exportAll: "Export all",
    readingFirst: (limit: number, total: number) =>
      `Reading the first ${limit} files of ${total}.`,
    nothingToImport: "Nothing to import",
    importCount: (count: number) =>
      `Import ${count} ${count === 1 ? "note" : "notes"}?`,
    noneReadable: "None of those files could be read as notes.",
    titleRule:
      "Titles come from front matter, then a heading, then the filename. Any [[links]] between them keep working.",
    skipped: (count: number) =>
      `${count} ${count === 1 ? "file" : "files"} skipped`,
    noTitle: "No title could be worked out",
    empty: "The file is empty",
    unreadable: "Could not be read",
    tooLong: (length: string, limit: string) =>
      `Too long — ${length} characters, limit is ${limit}`,
    imported: (count: number) =>
      `${count} ${count === 1 ? "note" : "notes"} imported.`,
    importFailed: "Could not import those notes. Nothing was saved.",
    nothingToExport: "There are no notes to export yet.",
    exported: (count: number) =>
      `${count} ${count === 1 ? "note" : "notes"} exported.`,
    exportFailed: "Could not build that export.",
  },

  calendar: {
    title: "Calendar",
    subtitle:
      "When each card comes back. Spaced repetition decides the dates — you just show up.",
    reviewNow: (count: number) => `Review ${count} now`,
    previousMonth: "Previous month",
    nextMonth: "Next month",
    scheduled: "Scheduled",
    overdue: "Overdue",
    tapADay: "Tap a day to see which cards.",
    nothingScheduled: "Nothing scheduled.",
    overdueSuffix: " — overdue",
    noneYet: "Nothing scheduled yet",
    noneYetHint:
      "Once you review a card for the first time, it lands on this calendar — and comes back right before you would have forgotten it.",
    makeASet: "Make a study set",
  },

  organiser: {
    yourWeek: "Your week",
    yourWeekHint:
      "Deadlines, what you owe, and when you are in class. Only you see any of this.",
    deadlines: "Deadlines",
    todos: "To do",
    timetable: "Timetable",
    time: "Time",
    saveFailed: "Could not save that. Check your connection.",
    changeFailed: "Could not save that change.",
    deleteFailed: "Could not delete that.",
    deadlinePlaceholder: "Thesis draft, problem set, presentation…",
    deadlinesEmpty:
      "Nothing due. When you add a deadline here, it also becomes what your readiness on the dashboard is measured against.",
    todoPlaceholder: "Read chapter 4, email Ms. Reyes…",
    todosEmpty:
      "Small things that are not flashcards. They stay on the list once ticked, so you can see what the week actually cost you.",
    markDone: (title: string) => `Mark ${title} as done`,
    markNotDone: (title: string) => `Mark ${title} as not done`,
    deleteItem: (title: string) => `Delete ${title}`,
    classesOverlap:
      "Two classes overlap. Left as you entered it — a real clash is something to sort out with your school, not something this should quietly refuse to save.",
    timetableEmpty:
      "Add your class times and the week has a shape. It is also how you spot the free afternoon you keep forgetting about.",
    dueDate: "Due date",
    dueDateOptional: "Due date (optional)",
    subject: "Subject",
    noSubject: "No subject",
    addAClass: "Add a class",
    newClass: "New class",
    classNamePlaceholder: "General Biology lecture",
    className: "Class name",
    starts: "Starts",
    ends: "Ends",
    locationPlaceholder: "Room 204 (optional)",
    location: "Location",
    saveClass: "Save class",
    endsBeforeStarts: "Ends before it starts.",
  },

  studyLog: {
    thisWeek: "This week",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    minutes: "minutes",
    minutesStudied: "Minutes studied",
    day: "Day",
    addElsewhere: "Add time you studied elsewhere",
    nothingLogged:
      "Nothing logged this week. The timer above fills this in, and anything you did away from Tuón can be added by hand — a week that says zero when you studied is worse than no log at all.",
    saveSessionFailed: "Could not save that session.",
    editSession: (day: string) => `Edit ${day} session`,
    deleteSession: (day: string) => `Delete ${day} session`,
    cardsReviewed: (count: number) => `${count} cards`,
    sourcePomodoro: "Timer",
    sourceReview: "Review",
    sourceManual: "Added by you",
  },

  groups: {
    title: "Study groups",
    subtitle:
      "Small, invite-only, and private. There is no directory and no way to find a group you were not invited to — these are for people who already study together.",
    noneYet:
      "No groups yet. Make one for your class or review batch, or paste a code someone sent you.",
    startAGroup: "Start a group",
    startAGroupHint: "For a class, a barkada, or a review batch",
    groupName: "Group name",
    groupNamePlaceholder: "STEM 12-A Biology",
    create: "Create",
    isReady: (name: string) => `${name} is ready`,
    codeOnce:
      "Send this code to the people you want in. It is only shown now, and it stops working after two weeks.",
    copyCode: "Copy code",
    copied: "Copied",
    savedIt: "I have saved it",
    copyFailed: "Could not copy that. Write it down instead.",
    joinWithCode: "Join with a code",
    joinHint: "Someone in the group has to send you one",
    inviteCode: "Invite code",
    join: "Join",
    joined: "You are in.",
    notAMember: "You are not in this group",
    notAMemberHint:
      "Groups are invite-only, so a link on its own is not enough. Ask someone inside for a code.",
    yourGroups: "Your groups",
    studyingNow: (count: number) => `${count} studying now`,
    inviteSomeone: "Invite someone.",
    inviteBody:
      "Send them the code you were given when this group was made — codes expire after two weeks, so ask the owner for a fresh one if it stops working.",
    copyGroupLink: "Copy group link",
    couldNotCopy: "Could not copy that.",
    whoIsIn: "Who is in",
    owner: "owner",
    studying: "studying",
    leave: "Leave",
    left: "You left the group.",
    deleteGroup: "Delete group",
    deleted: "Group deleted.",
    deleteTitle: "Delete this group?",
    deleteBody:
      "You are the last member, so leaving removes the group along with its deadlines and its list of shared sets. Nobody’s notes or cards are touched — those stay in the library of whoever made them.",
    workingTowards: "What the group is working towards",
    deadlinePlaceholder: "Practical exam, group report…",
    deadline: "Deadline",
    addDeadlineFailed: "Could not add that deadline.",
    noDeadlines:
      "Nothing yet. A shared date is the thing that makes a group a group rather than a chat.",
    studyingWhat: "What the group is studying",
    studyingWhatHint:
      "Sets stay in the library of whoever made them, so a fix reaches everyone rather than leaving copies to go stale. Only this group can open them.",
    everythingShared: "Everything you have is already here.",
    shareOneOfYours: "Share one of your sets",
    shareFailed: "Could not share that set.",
    removeFailed: "Could not remove that.",
    remove: (title: string) => `Remove ${title}`,
    aClassmate: "A classmate",
    standings: "Standings",
    standingsHint:
      "XP comes from cards you actually remembered when they came back — not from hours logged, so leaving a timer running earns nothing. A card that holds for a month is worth ten recalls.",
    noStandings: "Nothing yet. Review some cards and your first XP appears here.",
    you: "you",
    masteredCount: (count: number) => `${count} mastered`,
    xp: (value: string) => `${value} XP`,
    standingsPrivacy:
      "Only these figures are shared with the group — never your notes, your cards, or which subjects you are behind on.",
    error: {
      UNVERIFIED: "This request could not be verified. Please reload and try again.",
      NOT_SIGNED_IN: "You need to be signed in.",
      MALFORMED: "Something went wrong sending that. Please try again.",
      UNKNOWN_ACTION: "Something went wrong sending that. Please try again.",
      NAME_REQUIRED: "Give the group a name.",
      NO_PROFILE: "Finish setting up your account first.",
      TOO_MANY_GROUPS: "You are already in as many groups as Tuón allows.",
      BAD_CODE: "That invite code is not valid.",
      EXPIRED_CODE: "That invite is not valid any more. Ask for a fresh one.",
      GROUP_FULL: "That group is full.",
      JOIN_FAILED: "Could not join that group.",
      UNKNOWN_GROUP: "Unknown group.",
      RATE_LIMITED: "Too many changes from this connection. Try again in a few minutes.",
      SERVER_NOT_CONFIGURED: "This server is not fully configured yet.",
      OFFLINE: "Could not reach Tuón. Check your connection.",
      unknown: "That did not work. Try again.",
    },
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
