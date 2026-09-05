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
    tala: "Ask Tala",
    groups: "Groups",
    graph: "Graph",
    retention: "Retention",
    newNote: "New note",
    more: "More",
    closeMenu: "Close menu",
    settings: "Settings",
    help: "Help",
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
    thisWeek: "This week",
    fullYear: "Full year",
    streakDays: (n: number) =>
      n === 0 ? "No run going" : `${n} ${n === 1 ? "day" : "days"} in a row`,
    comingUp: "Coming up",
    allDeadlines: "Calendar",
    nothingDue: "Nothing due",
    addDeadline: "Add a deadline in the calendar",
    yearOfStudy: "Your year",
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
    nextUp: (next: string) => `${next} next.`,
    breakOver: "Break over. Back to it.",
    notLogged: "That block was not saved to your log.",
  },

  heatmap: {
    whereItWent: "Where the hours went",
    otherSubjects: "Everything else",
    noneYet: "No study logged yet",
    /** @param hours already formatted, e.g. "12h 30m" */
    totalAcross: (hours: string, days: number) =>
      `${hours} across ${days} ${days === 1 ? "day" : "days"}`,
    currentRun: "current run",
    longestRun: "longest run",
    runDays: (days: number) => `${days} ${days === 1 ? "day" : "days"}`,
    /** What one square is worth. Named amounts, not "less / more". */
    legend: {
      under15: "under 15m",
      m15: "15m",
      m30: "30m",
      h1: "1h+",
    },
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
    members: (count: number) =>
      `${count} ${count === 1 ? "member" : "members"}`,
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
    notFound: "Note not found",
    notFoundHint: "It may have been deleted.",
    backToNotes: "Back to notes",
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
    readerFailed:
      "Could not start the PDF reader. Please refresh and try again.",
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
    /** Eyebrow on the day panel when the chosen day is not today. */
    selectedDay: "Selected day",
    yearHint: "Every day you studied, and what you spent the hours on.",
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
    noStandings:
      "Nothing yet. Review some cards and your first XP appears here.",
    you: "you",
    masteredCount: (count: number) => `${count} mastered`,
    xp: (value: string) => `${value} XP`,
    standingsPrivacy:
      "Only these figures are shared with the group — never your notes, your cards, or which subjects you are behind on.",
    error: {
      UNVERIFIED:
        "This request could not be verified. Please reload and try again.",
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
      RATE_LIMITED:
        "Too many changes from this connection. Try again in a few minutes.",
      SERVER_NOT_CONFIGURED: "This server is not fully configured yet.",
      OFFLINE: "Could not reach Tuón. Check your connection.",
      unknown: "That did not work. Try again.",
    },
  },

  settingsPage: {
    profile: "Profile",
    displayName: "Display name",
    school: "School",
    schoolPlaceholder: "Your school's name",
    schoolNote: "Optional. Only you can see this.",
    educationLevel: "Education level",
    strandNote:
      "Changing your strand changes which subjects are offered. Your notes and study sets keep whatever tag they already have — nothing is retagged or deleted.",
    change: "Change",
    subjects: "Subjects",
    course: "Course",
    fromCurrentTerm:
      "Your subjects come from the term you have marked as current.",
    editUnderSemesters: "Edit them under Semesters",
    addAnotherSubject: "Add another subject",
    addYourOwnCourse: "Add your own course",
    removeChip: (name: string) => `Remove ${name}`,
    saveChanges: "Save changes",
    saved: "Settings saved.",
    saveFailed: "Could not save your settings.",
    levelUpdated: "Education level updated.",
    changeFailed: "Could not save that change.",
    removeElsewhere: (subject: string) =>
      `To remove ${subject}, use “Your subjects” further down.`,
    removeElsewhereWhy:
      "It moves your notes and cards somewhere first, so nothing is stranded.",
    signedIn: "Signed in",
  },

  picture: {
    title: "Picture",
    hint: "Shown to you, and to anyone in a study group with you. Resized on your device before it is saved, so a photo straight off your phone does not cost you data.",
    updated: "Picture updated.",
    saveFailed: "Could not save that picture.",
    removeFailed: "Could not remove that picture.",
    type: "That has to be a JPEG, PNG or WebP.",
    tooBig: "That image is too large. Try one under 10MB.",
    decode: "That file could not be read as an image.",
    encode: "That image could not be resized. Try a different one.",
  },

  semesters: {
    title: "Semesters",
    firstRun:
      "Right now your subjects are one flat list. Split them into terms and Tuón shows you the ones you are taking now, while last term’s notes and cards stay exactly where they are.",
    setUp: "Set up semesters",
    hint: "The term you mark as current decides which subjects appear when you tag a note or a study set. Older terms keep everything in them.",
    addSemester: "Add a semester",
    atMost: (count: number) => `${count} semesters is the most Tuón keeps.`,
    termFull: (count: number) => `That term already has ${count} subjects.`,
    current: "Current",
    makeCurrent: "Make current",
    deleteTerm: (name: string) => `Delete ${name}`,
    noSubjectsYet: "No subjects yet.",
    addASubject: "Add a subject",
    addSubjectTo: (name: string) => `Add a subject to ${name}`,
    removeSubject: (name: string) => `Remove ${name}`,
    removalNote:
      "Removing a subject here only takes it off this term’s list. Notes and study sets tagged with it are untouched.",
    ordinal: (index: number) => {
      const names = ["1st", "2nd", "3rd"];
      return `${names[index] ?? `${index + 1}th`} Semester`;
    },
  },

  manageSubjects: {
    title: "Your subjects",
    titleOne: "Your subject",
    hint: "What each one holds, and how to remove one without losing it. Removing a subject never deletes a note, a card, or an hour you logged.",
    orphanTitle: "Not on your profile any more",
    orphanHint:
      "Work tagged with a subject you no longer have. It is all still in your library and still comes up for review — it just is not counted under any subject. Move it somewhere, or clear the label.",
    sortOut: "Sort out",
    removeTitle: (subject: string) => `Remove ${subject}?`,
    nothingTagged:
      "Nothing is tagged with this subject, so there is nothing to move.",
    subjectHolds: (contents: string) => `This subject has ${contents}.`,
    nothingDeleted: "None of it is deleted.",
    nothingDeletedBody:
      "Your notes, cards, review history and logged hours all stay exactly as they are — only the label on them changes.",
    whereShouldItGo: "Where should it go?",
    leaveUntagged: "Leave it untagged",
    moveTo: (subject: string) => `Move to ${subject}`,
    untaggedWarning:
      "Untagged material still appears in your library and still comes up for review. It just will not be counted under any subject on the dashboard.",
    removed: (subject: string) => `${subject} removed.`,
    removedMoved: (subject: string, target: string) =>
      `${subject} removed. Everything moved to ${target}.`,
    removedUntagged: (subject: string, count: number) =>
      `${subject} removed. Its ${count === 1 ? "item is" : "items are"} now untagged.`,
    removeFailed: "Could not remove that subject. Nothing was changed.",
    contents: {
      notes: (count: number) => `${count} ${count === 1 ? "note" : "notes"}`,
      sets: (count: number) => `${count} study ${count === 1 ? "set" : "sets"}`,
      setsWithCards: (sets: number, cards: number) =>
        `${sets} study ${sets === 1 ? "set" : "sets"} (${cards} cards)`,
      planItems: (count: number) =>
        `${count} ${count === 1 ? "item" : "items"} in your week`,
      sessions: (count: number) =>
        `${count} logged ${count === 1 ? "session" : "sessions"}`,
      nothing: "nothing yet",
      /** Joins a list of the above: "a, b and c". */
      separator: ", ",
      lastSeparator: " and ",
      none: "Nothing is tagged with this subject.",
    },
  },

  preferences: {
    appearanceHint:
      "Dark is warm rather than black — it is meant for reviewing at 1am without the screen shouting at you.",
    colourHint:
      "Separate from light and dark — pick a colour once and it follows you into whichever one you are in.",
    colourFailed:
      "Could not save that colour. It will reset on another device.",
    languageHint:
      "Tuón’s own words. Your notes and cards stay in whatever language you wrote them — including Taglish.",
    languageFailed: "Could not save that language.",
    draftLocale: "Draft — not checked by a native speaker yet",
    timeZoneHint:
      "Decides when a card counts as due today. Getting this wrong shifts every review date, and nothing on screen would look wrong.",
    timeZoneSaved: "Time zone updated. Your due dates follow it from now on.",
    timeZoneFailed: "Could not save your time zone.",
    deviceSays: "This device says you are in",
    deviceSaysTail: ", which is not what your reviews are scheduled against.",
    useThisDevice: "Use this device",
    timerHint:
      "The timer in the sidebar. Twenty-five minutes is the classic block and suits plenty of people; if it does not suit you, a shorter one you actually finish is worth more than a long one you abandon.",
    timerSaved: "Timer updated.",
    timerFailed: "Could not save those lengths.",
    longBreakNote: "The long break comes after every fourth focus block.",
    typedRecallHint:
      "Reading the back and thinking “yeah, I knew that” is not the same as remembering it. Typing settles the question before you see it. Only on answers short enough to type, and spelling, word order and accents are all forgiven.",
    typedRecallFailed: "Could not save that setting.",
    dailyGoalHint:
      "Turns “review everything” into a session you can actually finish. Cards past this still wait for you — nothing is skipped.",
    dailyGoalSaved: "Daily goal updated.",
    dailyGoalFailed: "Could not save your daily goal.",
    cardsUnit: "cards",
  },

  reminder: {
    title: "Daily reminder",
    hint: "One nudge a day when you have cards due. It counts cards, not days in a row — missing a day during exams is not a failure.",
    remindMeAt: "Remind me at",
    deviceNote:
      "The reminder comes from this device, so it can only appear on a day you open Tuón. Installing it to your home screen makes that far more likely.",
    unsupported: "This browser cannot show reminders.",
    blocked:
      "Your browser blocked notifications. You can allow them in site settings.",
    set: (time: string) => `Reminder set for ${time}.`,
    /**
     * The notification itself. Counts cards, never days in a row — the whole
     * point of the reminder is that missing a day is not a failure.
     */
    cardsReady: (count: number) =>
      `${count} ${count === 1 ? "card is" : "cards are"} ready for review.`,
  },

  examDate: {
    label: "Exam date",
    yourExam: "Your exam",
    countdown: (subject: string, days: number) =>
      `${subject} in ${days} ${days === 1 ? "day" : "days"} — no card will be scheduled past it.`,
    passed:
      "That date has passed. Reviews are back on the normal schedule; clear the field or set the next one.",
    hint: "Optional. Set it and every card is brought back at least once before the date, with the gaps tightening as it approaches. Without it, a card you know well can be scheduled months out — past the exam.",
  },

  security: {
    title: "Account & security",
    emailAddress: "Email address",
    verified: "Verified",
    notVerified: "Not verified",
    resend: "Resend",
    change: "Change",
    newEmail: "New email address",
    emailPlaceholder: "juan@example.com",
    currentPassword: "Your current password",
    googleReauth:
      "You’ll be asked to sign in with Google once more to confirm.",
    emailChangeNote:
      "We send a link to the new address first. Your email only changes once you click it, so a typo cannot lock you out.",
    sendConfirmation: "Send confirmation",
    confirmationSent:
      "Check your new address for a confirmation link. Your email changes once you click it.",
    verificationFailed:
      "Could not send that email. Please try again in a minute.",
    alreadyVerified: "This address is already verified.",
    verificationSent:
      "Verification email sent. Check your inbox and spam folder.",
    password: "Password",
    passwordHint: "Change it if you think someone else knows it.",
    currentPasswordLabel: "Current password",
    newPassword: "New password",
    passwordPlaceholder: "At least 6 characters",
    updatePassword: "Update password",
    passwordChanged: "Password changed.",
    googleOnly:
      "You sign in with Google, so there is no Tuón password to change. Manage it in your Google Account.",
    signOutEverywhere: "Sign out everywhere",
    signOutEverywhereHint:
      "Ends every session, including any computer lab you forgot to sign out of. You will be signed out here too.",
    signedOutEverywhere: "Signed out everywhere. Signing you out here too.",
    signOutFailed: "Could not sign out your other devices. Please try again.",
    noEmail: "This account has no email address.",
    error: {
      wrongPassword: "That password is not correct.",
      emailInUse: "Another account already uses that email address.",
      invalidEmail: "That does not look like a valid email address.",
      weakPassword: "Please use a password of at least 6 characters.",
      recentLogin: "Please sign in again, then retry.",
      tooManyRequests: "Too many attempts. Please wait a moment and try again.",
      cancelled: "Sign-in was cancelled.",
      unknown: "Something went wrong.",
    },
  },

  data: {
    title: "Your data",
    intro: "Everything here is yours. See the",
    privacyNotice: "Privacy Notice",
    introTail: "for what we hold and why.",
    downloadTitle: "Download your data",
    downloadHint:
      "Profile, notes, study sets, and review history as one JSON file.",
    download: "Download",
    downloaded: "Your data has been downloaded.",
    exportFailed: "Export failed.",
    deleteTitle: "Delete your account",
    deleteHint:
      "Removes your notes, study sets, and review history. Not reversible.",
    deleteBody:
      "This deletes your profile, every note, every study set, and your whole review history. It cannot be undone, and your spaced repetition progress cannot be rebuilt.",
    downloadFirst: "Download your data first if you want to keep it.",
    typeToConfirmBefore: "Type",
    typeToConfirmAfter: "to confirm",
    yourPassword: "Your password",
    googleReauth:
      "You will be asked to sign in with Google once more to confirm.",
    deletePermanently: "Delete permanently",
    deleted: "Your account and all of its data have been deleted.",
    deleteFailed: "Could not delete your account.",
  },

  billing: {
    freePlan: "Free plan",
    planName: (name: string) => `Tuón ${name}`,
    included: (count: number) =>
      `${count} AI study sets per month. Notes, PDF imports, and flashcards you write yourself are always unlimited.`,
    paymentFailed: "Your last payment didn’t go through.",
    graceOneDay: "one more day",
    graceDays: (days: number) => `${days} more days`,
    graceBody: (window: string) =>
      `You keep everything for ${window} while you sort it out. Nothing is deleted either way — after that the account just goes back to free limits.`,
    cancelledUntil: (plan: string, date: string) =>
      `Cancelled. You keep ${plan} until ${date}.`,
    renews: (date: string) => `Renews ${date}.`,
    usedThisMonth: "Used this month",
    resets: (explainer: string, date: string) =>
      `One study set is ${explainer}. Resets ${date}.`,
    upgrade: "Upgrade",
    monthly: "Monthly",
    yearly: "Yearly",
    annualDeal: (months: number) => `Pay for ${months} months, get 12.`,
    perYear: "yr",
    perMonth: "mo",
    choose: (plan: string) => `Choose ${plan}`,
    payWith:
      "Pay with GCash, Maya, or a card. You can cancel any time — nothing you have written is ever deleted when a plan ends.",
    notLive:
      "Payments aren’t live yet. Hang tight — your free plan keeps working.",
    checkoutFailed: "Could not start checkout.",
    confirmingTitle: "Thanks — we’re confirming your payment.",
    confirmingBody:
      "Your plan updates here as soon as it clears, usually within a few seconds.",
    checkoutCancelled: "Checkout cancelled. Nothing was charged.",
  },

  plans: {
    free: {
      tagline: "Enough for one subject's reviewers each month.",
      features: [
        "5 AI study sets a month",
        "Unlimited notes, PDF imports, and your own flashcards",
        "Spaced repetition with typed recall and hints",
        "Timed tests drawn from your weakest cards",
        "Deadlines, timetable, Pomodoro, and a study log",
        "Private study groups with your class",
        "Import and export your notes as Markdown",
      ],
    },
    plus: {
      tagline: "A full course load — six subjects, twice a week.",
      features: [
        "50 AI study sets a month",
        "Notes up to 60,000 characters",
        "Export study sets to Anki, CSV, or PDF",
        "Retention stats — what you're about to forget",
        "Share a set by link with your blockmates",
        "Everything in Free",
      ],
    },
    pro: {
      tagline: "For finals week, thesis season, and board review.",
      features: [
        "120 AI study sets a month — about four a day",
        "Notes up to 120,000 characters",
        "Priority generation — no waiting between sets",
        "Everything in Plus",
      ],
    },
  },

  palettes: {
    terracotta: {
      label: "Terracotta",
      hint: "Warm clay and cream — the original",
    },
    indigo: { label: "Indigo", hint: "Cool and quiet, for studying at night" },
    forest: {
      label: "Forest",
      hint: "Deep green, easy on the eyes for long sessions",
    },
    plum: { label: "Plum", hint: "Muted purple with a warm grey" },
    slate: {
      label: "Slate",
      hint: "Almost no colour at all — nothing competes with your notes",
    },
  },

  quiz: {
    title: "Quiz",
    exit: "Exit quiz",
    noneYet: "No quiz yet",
    noneYetHint: "This study set does not have any quiz questions.",
    backToSet: "Back to set",
    progress: (index: number, total: number) => `${index} / ${total}`,
    correctAnswer: "— correct answer",
    yourAnswerWrong: "— your answer, incorrect",
    seeResults: "See results",
    nextQuestion: "Next question",
    worthAnotherLook: "Worth another look",
    perfect: "Perfect score. Every question correct.",
    reviewFlashcards: "Review the flashcards",
    retake: "Retake quiz",
    savingResult: "Saving result…",
    flawless: "Flawless",
    solid: "Solid",
    gettingThere: "Getting there",
    needsAnotherPass: "Needs another pass",
    worthRestudying: "Worth restudying the note",
  },

  test: {
    title: "Test",
    leave: "Leave the test",
    noneYet: "Nothing to test yet",
    noneYetHint:
      "This set has no flashcards, so there is nothing to draw a test from.",
    backToSet: "Back to the set",
    briefTitle: (questions: number, minutes: number) =>
      `${questions} questions, ${minutes} minutes`,
    brief:
      "Drawn from the cards you are weakest on, not the ones you like. Some you type, some are multiple choice. The clock keeps running if you switch tabs, and anything you do not reach counts as wrong — which is what an exam does.",
    briefSchedule:
      "Every answer updates your review schedule, so this is not a practice run you can throw away.",
    start: "Start the test",
    underTime: (percent: number) => `${percent}% under time`,
    savingSchedule: " · saving your schedule…",
    scheduleUpdated: " · your schedule has been updated",
    worthAnotherLook: "Worth another look",
    dueSooner: "These are due again sooner now.",
    youPut: (answer: string) => `You put “${answer}”`,
    markedMissed: "You marked this one as missed",
    notReached: "Not reached before time ran out",
    takeAnother: "Take another",
    position: (index: number, total: number) => `${index} of ${total}`,
    yourAnswer: "Your answer",
    forgiving: "Spelling and word order are forgiven.",
    finish: "Finish",
    next: "Next",
    answerInYourHead: "Answer it in your head, then check yourself.",
    showAnswer: "Show the answer",
    missedIt: "Missed it",
    hadIt: "Had it",
  },

  cardFeedback: {
    thanks: "Thanks — we'll look at this card.",
    failed: "Could not send that just now.",
    reported: "Reported as a bad card",
    report: "Report this card as wrong",
    reportedShort: "Reported",
    somethingWrong: "Something wrong with this card?",
  },

  report: {
    action: "Report",
    title: "Report this study set",
    body: "Tell us what’s wrong with it. We read every report; we don’t act on them automatically.",
    notStudyMaterial: "Not study material",
    harassment: "Bullying or harassment",
    copyright: "Copied from a book or paid course",
    personalInformation: "Contains someone's personal details",
    other: "Something else",
    anythingElse: "Anything else? (optional)",
    detailPlaceholder: "What should we look at?",
    send: "Send report",
    thanks: "Thanks — we'll take a look.",
    failed: "Could not send that report. Please try again.",
  },

  stats: {
    title: "Retention",
    subtitle: "What your schedule looks like, and which cards are slipping.",
    keepForgetting: "Keep forgetting",
    failedRepeatedly: "cards you have failed repeatedly",
    nothingTroubling: "nothing is giving you trouble",
    dueNow: "Due now",
    waitingForYou: "waiting for you",
    allCaughtUp: "all caught up",
    mature: "Mature",
    matureHint: "coming back a month or more out",
    nextTwoWeeks: "Next two weeks",
    perDay: "How many cards come back each day.",
    chart: "Chart",
    table: "Table",
    whereCardsAre: "Where your cards are",
    whereCardsAreHint:
      "Every card moves left to right as you keep remembering it.",
    maturity: {
      new: "Never seen",
      learning: "Learning",
      young: "Young",
      matureStage: "Mature",
      newHint: "no reviews yet",
      learningHint: "coming back within a week",
      youngHint: "1 to 4 weeks out",
      matureHint: "a month or more out",
    },
    stageCount: (label: string, count: number) => `${label}: ${count}`,
    atRiskTitle: "Cards you keep forgetting",
    atRiskHint: (ease: string) =>
      `Ease has dropped below ${ease} — usually a sign the card is doing too much at once. Consider splitting it.`,
    ease: (value: string) => `ease ${value}`,
    overdue: "overdue",
    late: "late",
    today: "today",
    tableCaption: "Cards due per day for the next two weeks",
    day: "Day",
    cardsDue: "Cards due",
    overdueRow: "Overdue",
    todayRow: "Today",
    noHistory: "No review history yet",
    noHistoryHint:
      "Review a few cards and this fills in — what you are about to forget, and how heavy the week ahead looks.",
    startReviewing: "Start reviewing",
    makeASet: "Make a study set",
    lockedTitle: (plan: string) => `Retention stats are part of ${plan}`,
    lockedBody: (php: number) =>
      `See which cards you keep forgetting and how heavy the week ahead looks, from ₱${php} a month.`,
    seePlans: "See plans",
  },

  graph: {
    title: "Graph",
    summary: (notes: number, links: number) =>
      `${notes} connected ${notes === 1 ? "note" : "notes"} · ${links} ${links === 1 ? "link" : "links"}`,
    subtitle: "How your notes connect to each other.",
    noneYet: "Nothing linked yet",
    hintBefore: "Type",
    hintAfter:
      "inside a note to link it to another one. Concepts that connect across subjects show up here as a map.",
    openNotes: "Open your notes",
    writeFirst: "Write your first note",
  },

  firstRun: {
    heading: "Let’s make your first study set",
    body: (creature: string) =>
      `Paste one page of notes. ${creature} turns it into flashcards and a practice quiz, then brings each card back right before you would have forgotten it.`,
    companion: (creature: string) => `${creature}, your study companion`,
    createFirst: "Create your first note",
    aboutAMinute: "About a minute, and nothing to install.",
    step: (n: number) => `Step ${n}`,
    steps: [
      {
        title: "Paste your notes",
        body: "Lecture notes, a textbook excerpt, your handwritten reviewer typed up.",
      },
      {
        title: "Generate a study set",
        body: "Flashcards and a practice quiz, written from your material and nothing else.",
      },
      {
        title: "Review on schedule",
        body: "Each card comes back right before you would have forgotten it.",
      },
    ],
    whatComesOut: "What comes out",
    yourNote: "Your note",
    sampleNote:
      "“Light-dependent reactions occur in the thylakoid membrane. Water is split, releasing O₂, and the energy is stored as ATP and NADPH…”",
    sampleCardIndex: "Card 3 of 12",
    sampleFront: "Where do the light-dependent reactions take place?",
    sampleBack: "In the thylakoid membrane of the chloroplast.",
    sampleNext: "Next review in 6 days",
  },

  banners: {
    quotaTitle: "Study sets",
    quotaUsedUp: (date: string) => `Used up. Resets ${date}.`,
    quotaLeft: (left: number, date: string) =>
      `${left} left this month · resets ${date}`,
    quotaUpgrade: (perMonth: number, php: number) =>
      `Get ${perMonth} a month for ₱${php}`,
    confirmEmail: "Confirm your email to start generating study sets.",
    confirmEmailRest: "Everything else works in the meantime.",
    checking: "Checking…",
    confirmedIt: "I’ve confirmed it",
    sending: "Sending…",
    resend: "Resend",
    dismiss: "Dismiss",
    stillNotConfirmed: "Still not confirmed. Open the link in the email first.",
    sendFailed: "Could not send just now. Try again in a minute.",
    alreadyVerified: "This address is already verified.",
    sentTo: (email: string) =>
      `Sent to ${email}. Check spam if it doesn't arrive.`,
    offline: "No connection — you can keep reviewing.",
    offlineRest:
      "Your ratings are saved on this device and sync when you are back.",
  },

  auth: {
    signupHeading: "Start studying smarter",
    loginHeading: "Welcome back",
    signupSub: "Turn your class notes into flashcards and quizzes in seconds.",
    loginSub: "Pick up where you left off.",
    email: "Email",
    emailPlaceholder: "juan@example.com",
    password: "Password",
    forgot: "Forgot password?",
    newPasswordPlaceholder: "At least 6 characters",
    passwordPlaceholder: "Your password",
    creatingAccount: "Creating account…",
    signingIn: "Signing in…",
    createAccount: "Create account",
    signIn: "Sign in",
    or: "or",
    continueWithGoogle: "Continue with Google",
    termsBefore: "By creating an account you agree to our",
    terms: "Terms of Use",
    termsAnd: "and",
    privacy: "Privacy Notice",
    termsAfter:
      ". If you are under 18, please read them with a parent or guardian.",
    haveAccount: "Already have an account? ",
    newHere: "New to Tuón? ",
    createOne: "Create one",
    aside: {
      meaning: "“Tuón” means to study — to give something your full attention.",
      body: "Paste your notes from class. Get flashcards and a practice quiz back in seconds, then review them on a schedule that puts each card in front of you right before you would have forgotten it.",
      cardsPerNote: "flashcards per note",
      spacedRepetition: "spaced repetition",
      strandsBuiltIn: "SHS strands built in",
    },
    reset: {
      heading: "Forgot your password?",
      body: "Type the email you signed up with and we will send you a link to set a new one.",
      send: "Send the reset link",
      sending: "Sending…",
      backToSignIn: "Back to sign in",
      sentHeading: "Check your email",
      sentBodyBefore: "If an account exists for",
      sentBodyAfter:
        ", a link to set a new password is on its way. It expires in an hour.",
      sentSpam:
        "Nothing after a few minutes? Check spam, and make sure you typed the address you signed up with.",
      differentAddress: "Use a different address",
    },
    error: {
      weakPassword: "Please use a password of at least 6 characters.",
      noMatch: "That email and password do not match an account.",
      emailInUse:
        "An account already exists with that email. Try logging in instead.",
      invalidEmail: "That does not look like a valid email address.",
      tooManyRequests: "Too many attempts. Please wait a moment and try again.",
      tooManyResets:
        "Too many attempts. Please wait a few minutes and try again.",
      network: "Cannot reach the network. Check your connection and try again.",
      popupBlocked:
        "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
      differentMethod:
        "You already have an account with this email using a different sign-in method.",
      unauthorizedDomain:
        "This address is not authorised for sign-in. If you opened a preview or deployment link, use the main site address instead.",
      notAllowed: "That sign-in method is not enabled for this app.",
      sessionExpired: "That session is no longer valid. Please sign in again.",
      resetFailed: "Could not send the email just now. Please try again.",
      unknown: "Something went wrong. Please try again.",
    },
  },

  onboarding: {
    step: (n: number) => `Step ${n}`,
    progress: (n: number, total: number) => `${n} / ${total}`,
    loading: "Loading",
    back: "Back",
    saving: "Saving…",
    finish: "Finish setup",
    continue: "Continue",
    saveFailed: "Could not save your setup. Please try again.",
    nameTitle: "What should we call you?",
    nameSub: (creature: string) => `This is how ${creature} will greet you.`,
    displayName: "Display name",
    namePlaceholder: "Juan",
    levelTitle: "Where are you studying?",
    levelSub: "This changes how we tag your notes and pitch your flashcards.",
    schoolTitle: "Where do you study?",
    schoolSub: "So your sets are grouped the way your school year is.",
    school: "School",
    reviewCentrePlaceholder: "Your review centre or school",
    schoolPlaceholder: "Start typing your school's name",
    schoolOptional:
      "Optional — you can leave this blank, and change it any time in Settings.",
    strandTitle: "Which track are you in?",
    strandSub: "We will show the subjects that go with it.",
    subjectsTitle: "Which subjects are you taking?",
    subjectsSub: "Pick as many as you like. You can change these later.",
    notListed: "Not listed? Add it",
    subjectExample: "e.g. Research in Daily Life 1",
    selected: (count: number) => `${count} selected`,
    examTitle: "Which exam are you reviewing for?",
    programTitle: "What course are you taking?",
    examSub: "You will tag individual subjects on each note.",
    programSub:
      "Your degree program. You will tag individual subjects on each note.",
    examExample: "e.g. Geodetic Engineering",
    programExample: "e.g. BS Marine Biology",
    consentTitle: "Before we start",
    consentSub: "Two quick things, and then your first study set.",
    agreeBefore: "I have read and agree to the",
    agreeAnd: "and",
    agreeAfter: ".",
    newTabHint: "They open in a new tab — you won't lose your setup.",
    ageQuestion: "Are you 18 or older?",
    adultYes: "Yes, I'm 18 or older",
    adultNo: "No, I'm under 18",
    guardian:
      "A parent or guardian has gone through this with me and agrees to Tuón holding my notes and study history.",
    guardianHint: (email: string) =>
      `They can email ${email} any time to see or delete your data.`,
  },

  help: {
    title: "How Tuón works",
    subtitle:
      "The whole app in a few minutes, and what every word on screen actually means.",

    loopTitle: "The loop",
    loopBody:
      "Three steps, and the third is the one that does the work. Writing cards feels like studying; being asked them a week later is studying.",
    loopSteps: [
      {
        title: "Write or paste a note",
        body: "Lecture notes, a chapter you typed up, a PDF handout. One note per topic works better than one per subject.",
        action: "New note",
        href: "/app/notes/new",
      },
      {
        title: "Generate a study set",
        body: "Flashcards and a practice quiz, written from your note and nothing else. Check them — you can report a card that is wrong.",
        action: "Your notes",
        href: "/app/notes",
      },
      {
        title: "Review when Tuón asks",
        body: "Each card comes back just before you would have forgotten it. Ten minutes most days beats three hours the night before.",
        action: "Review",
        href: "/app/review",
      },
    ],

    ratingsTitle: "The four buttons, and what they do",
    ratingsBody:
      "This is the one thing worth understanding properly. After each card you say how it went, and that answer decides when the card comes back. Answer honestly — flattering yourself moves the card further away, which is the opposite of what you want.",
    ratings: [
      {
        label: "Again",
        body: "You blanked, or got it wrong. The card resets and comes back later in the same session.",
      },
      {
        label: "Hard",
        body: "You got there, but it was a struggle. The gap grows a little, and the card gets easier to trip on next time.",
      },
      {
        label: "Good",
        body: "You knew it. This is the normal answer, and the one to use most.",
      },
      {
        label: "Easy",
        body: "Instant, with no effort. The gap jumps. Use it sparingly — overusing it is how cards get scheduled past your exam.",
      },
    ],
    ratingsFootnote:
      "Turn on “Type the answer first” in settings and Tuón grades your typing instead — spelling, word order and accents are all forgiven.",

    wordsTitle: "What the words mean",
    words: [
      {
        term: "Due",
        body: "The card's gap has run out and it is waiting for you today.",
      },
      {
        term: "Shaky",
        body: "You have failed this card enough times that Tuón thinks it is at risk. Usually it means the card is trying to do too much at once — consider splitting it.",
      },
      {
        term: "Mature",
        body: "The card is scheduled a month or more out. It has held up several times in a row.",
      },
      {
        term: "Mastery",
        body: "How far along a whole set is. It only says “Mastered” when nothing in the set is unreviewed and nothing is shaky — a set can average high while hiding four cards you keep failing.",
      },
      {
        term: "Readiness",
        body: "An estimate of how much you will still remember on a given day, read from your own schedule. It is not a predicted score.",
      },
    ],

    modesTitle: "Review, quiz, or test?",
    modes: [
      {
        title: "Review",
        body: "The daily habit. Only the cards that are due, one at a time, and your answers move the schedule.",
      },
      {
        title: "Quiz",
        body: "The multiple-choice questions generated with the set. Good for a quick check; a right answer counts for less than a recalled one, because one in four is a guess.",
      },
      {
        title: "Test",
        body: "Timed, mixed formats, drawn from your weakest cards. Anything you do not reach counts as wrong, which is what an exam does. Results feed the schedule.",
      },
    ],

    organiserTitle: "Your week, and the timer",
    organiserBody:
      "The calendar holds deadlines, a to-do list and your class timetable, and the focus timer lives in the sidebar so it follows you between screens. Pick a subject on the timer before you start and the block is logged against it — that is what fills the per-subject breakdown under your heatmap.",
    organiserAction: "Open the calendar",

    groupsTitle: "Study groups",
    groupsBody:
      "Invite-only and private. There is no directory and no way to find a group you were not invited to. Standings rank on XP earned from cards you actually remembered, never on hours logged — leaving a timer running earns nothing.",
    groupsAction: "Your groups",

    subjectsTitle: "Subjects and semesters",
    subjectsBody:
      "Tag a note or a set with a subject and it counts towards that subject everywhere. Split your subjects into terms under Settings and Tuón shows you the ones you are taking now, while last term's work stays exactly where it is. Removing a subject never deletes anything — it asks where the material should go first.",
    subjectsAction: "Settings",

    exportTitle: "Getting your work out",
    exportBody:
      "Nothing here is trapped. Export your whole note library as Markdown, a study set to Anki, a spreadsheet or a printable PDF, and your entire account as one JSON file. [[Wiki links]] survive the round trip, so a vault comes back with its graph intact.",
    exportAction: "Your notes",

    troubleTitle: "If something looks wrong",
    trouble: [
      {
        title: "A card is wrong or badly written",
        body: "Tap the thumbs-down while reviewing it. That is the only signal that separates a bad card from a hard one, and the two need opposite responses.",
      },
      {
        title: "Nothing is due, but you want to study",
        body: "That is the schedule doing its job. Sit a test instead — it draws from your weakest material and still counts.",
      },
      {
        title: "Your due dates look shifted",
        body: "Check your time zone in settings. It decides when a card counts as due today, and getting it wrong moves every date without anything on screen looking wrong.",
      },
      {
        title: "You studied offline or on paper",
        body: "Add the time by hand in the study log. A week that says zero when you studied is worse than no log at all.",
      },
    ],

    contactTitle: "Still stuck?",
    contactBody: (email: string) => `Email ${email} and a person will read it.`,
    contactAction: "Send an email",
  },

  dashboardHelp: {
    title: "New here, or want the details?",
    body: "How the schedule decides, what the four buttons do, and what every word on screen means.",
    action: "How Tuón works",
  },

  marketing: {
    nav: {
      how: "How it works",
      local: "Built for here",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      getStarted: "Get started",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },

    hero: {
      dueLeft: (n: number) => `${n} card${n === 1 ? "" : "s"} due`,
      tapToReveal: "Tap to see the answer",
      hoursMinutes: (h: number, m: number) => `${h}h ${m}m`,
      thisSession: "This session",
      requeued: "Back before you finish — that is what Again is for.",
      interval: (days: number) =>
        days <= 0
          ? "Today"
          : days === 1
            ? "Tomorrow"
            : days < 30
              ? `${days} days`
              : `${Math.round(days / 30)} months`,
      scheduled: (days: number) =>
        days <= 1
          ? "Scheduled — back tomorrow."
          : `Scheduled — back in ${days} days.`,
      doneTitle: "That is the whole loop.",
      doneBody:
        "Six cards, about forty seconds. Tuón does that with your own notes, and decides when each card comes back so you do not have to.",
      again: "Run it again",
      badge: "Built for Filipino students",
      headline: "Cramming works.",
      headlineAccent: " For about three days.",
      body: "Paste your notes. Tuón writes the flashcards and a practice quiz, then brings each card back right before you would have forgotten it — so the reviewer you make tonight still works next semester.",
      startFree: "Start free",
      haveAccount: "I already have an account",
      freeForever: (count: number) =>
        `Free forever for notes and flashcards · ${count} AI study sets a month`,
      languages: "· Cebuano and Tagalog",
      meaning: "To study. To give something your full attention.",
      haveAQuestion: "Have a question?",
      askTala: (creature: string) => `Ask ${creature}`,
    },

    why: {
      eyebrow: "Why you forget",
      title: "Your brain throws away whatever it stops seeing",
      body: "That is not a flaw, and it is not a discipline problem — it is what memory is for. Anything you meet once and never again gets cleared out. The fix is not more hours the night before; it is meeting the same card again just as it starts to slip. Doing that scheduling by hand is the part nobody keeps up.",
      aside:
        "A card you have not seen in three weeks is asleep. Tuón wakes it up the day before you would have lost it.",
    },

    curve: {
      lead: "Watch it happen to one card. Drag through the month.",
      question: "What does the mitochondria do?",
      answer: "Releases energy from food into a form the cell can use.",
      onceLabel: "Studied once",
      reviewedLabel: "Reviewed when Tuón says",
      recall: "you would remember this",
      dayLabel: (day: number) => (day === 0 ? "Today" : `Day ${day}`),
      today: "Today",
      oneMonth: "One month",
      scrub: "Move through the month",
      alt: "The same flashcard twice, over one month. Left, studied once: the answer blurs away within days until it cannot be read, ending near one in ten. Right, reviewed on Tuón's schedule: the answer stays sharp all month, with four reviews marked along the way.",
      fourReviews: "Four reviews. About six minutes in total.",
      wholeDifference: "That is the whole difference between these two cards.",
      source:
        "Based on the forgetting curve first measured by Hermann Ebbinghaus in 1885 and reproduced many times since. Drawn to show the mechanism — these are not measurements of Tuón users.",
    },

    how: {
      eyebrow: "How it works",
      title: "From notes to knowing it, in three steps",
      step: (n: number) => `Step ${n}`,
      answer: "Answer",
      ratings: ["Again", "Hard", "Good", "Easy"],
      nextDue: "Next time you see this card: in 6 days.",
      steps: [
        {
          title: "Paste your notes",
          body: "Lecture notes, a textbook excerpt, your handwritten reviewer typed up. Tag it with a subject so everything stays organised.",
        },
        {
          title: "Generate a study set",
          body: "One tap gives you 8 to 15 flashcards and a 5-question practice quiz, written from your material and nothing else.",
        },
        {
          title: "Review on schedule",
          body: "Rate each card Again, Hard, Good or Easy. The SM-2 algorithm decides when you see it next, so you study less and remember more.",
        },
      ],
    },

    versus: {
      eyebrow: "Versus doing it yourself",
      title: "You already know how to make a reviewer",
      body: "Long bond paper, four colours of pen, an evening gone. It works — and then the exam ends and it goes in the bin. Here is the same job, done the other way.",
      byHand: "By hand",
      withTuon: "With Tuón",
      rows: [
        {
          label: "Turning a chapter into a reviewer",
          byHand: "An evening, and your handwriting gets worse",
          tuon: "About eleven seconds",
        },
        {
          label: "Knowing what to study tonight",
          byHand: "Whatever you feel least sure about",
          tuon: "The exact cards that are due",
        },
        {
          label: "The week after the exam",
          byHand: "Bond paper in the bin, and it is gone",
          tuon: "Still scheduled, still yours",
        },
        {
          label: "Finding that one topic again",
          byHand: "Flipping through a notebook",
          tuon: "Search, tags, and linked notes",
        },
        {
          label: "What it costs",
          byHand: "Pens, paper, photocopies",
          tuon: "Free for five study sets a month",
        },
      ],
    },

    devices: {
      eyebrow: "Every device you own",
      title: "Open it on whatever is in front of you",
      body: "Tuón runs in the browser, so there is nothing to install and nothing to sideload. Review on your phone on the jeep, write notes on the library desktop — your schedule is the same in both, because it lives with your account and not the device.",
      desktopCaption: "Stats on the library desktop",
      tabletCaption: "Notes and their links",
      phoneCaption: "Reviewing on the jeep",
      nav: [
        "Home",
        "Notes",
        "Study sets",
        "Calendar",
        "Ask Tala",
        "Groups",
        "Graph",
        "Retention",
      ],
      planStep: "Review General Chemistry 1",
      planDetail: "12 cards · weakest subject",
      due: [
        { title: "Gen Chem long quiz", when: "Today" },
        { title: "Bio lab report", when: "Tomorrow" },
      ],
      notes: [
        {
          title: "Le Chatelier's Principle",
          subject: "General Chemistry 1",
          excerpt:
            "If a system at equilibrium is disturbed, it shifts to counteract…",
          chars: "2,840 characters",
        },
        {
          title: "Enzyme kinetics",
          subject: "General Biology 1",
          excerpt: "Michaelis–Menten describes the rate of an enzyme reaction…",
          chars: "1,930 characters",
        },
        {
          title: "Limits and continuity",
          subject: "Pre-Calculus",
          excerpt:
            "A limit describes what a function approaches, not what it is…",
          chars: "2,110 characters",
        },
      ],
      tapToFlip: "Tap to see the answer",
      inTheWorks: "IN THE WORKS",
      nativeTitle: "Native apps are coming to iPhone and Android",
      nativeBody:
        "Offline review and a home-screen icon, without giving up the web version. You do not have to wait for them — everything above works in your browser today.",
      soonOn: "Soon on",
    },

    local: {
      eyebrow: "Built for here",
      title: "It already knows your curriculum",
      body: "Most study apps are built for American classrooms and then translated. Tuón starts from the Philippine K-12 system, so setting up takes three taps instead of typing out every subject yourself.",
      points: [
        "Senior High strands built in — STEM, ABM, HUMSS and GAS, with the right subjects for each",
        "Core subjects like General Mathematics, Earth and Life Science and Oral Communication ready to pick",
        "College programs from BS Nursing to AB Communication, with room to add your own",
        "UPCAT, ACET and DCAT prep treated as first-class subjects",
        "Notes that mix English and Tagalog or Cebuano stay exactly as you wrote them",
      ],
      setupTitle: "Three questions and you are studying.",
      yourSchool: "Your school",
      schoolHint: "Type anything — your school does not have to be on a list.",
      yourStrand: "Your strand",
      strandHint: "College instead? You pick a degree program here.",
      yourSubjects: "Your subjects",
      addYourOwn: "+ Add your own",
      subjectsHint:
        "Every note and set is tagged with one, so nothing gets mixed up.",
    },

    pricing: {
      eyebrow: "Pricing",
      title: "Priced in pesos, capped honestly",
      bodyBefore: "One",
      studySet: "study set",
      bodyAfter: (explainer: string) =>
        `is ${explainer}. Writing notes, importing PDFs, making your own flashcards, and the entire review schedule are unlimited on every plan — including Free.`,
      billingPeriod: "Billing period",
      monthly: "Monthly",
      yearly: (freeMonths: number) => `Yearly · ${freeMonths} months free`,
      mostPopular: "Most popular",
      perMonth: "/month",
      billedAnnually: (total: string) => `₱${total} billed once a year.`,
      soon: "(soon)",
      startFree: "Start free",
      comingSoon: "Coming soon",
      footnote:
        "Why numbers instead of “unlimited”: every study set costs us real money to generate. A cap we can honour beats an unlimited promise we’d have to quietly throttle. For scale, a student carrying six subjects and making a reviewer for each twice a week uses about 48 a month.",
    },

    faq: {
      eyebrow: "Questions",
      title: "The things people ask first",
      /**
       * Answers may carry a `{link}` placeholder, which the view replaces with
       * the entry's link. A placeholder rather than split fragments because
       * word order moves between languages, and the link has to be able to
       * move with it.
       */
      items: [
        {
          q: "Is it really free?",
          a: "Yes, and the free plan is not a trial. You get {count} AI study sets a month, forever. Writing notes, importing PDFs, making your own flashcards, and the whole review schedule are unlimited on every plan — the only thing that costs money is the AI turning a note into cards, because that is the only thing that costs us money.",
        },
        {
          q: "What happens when I hit the monthly cap?",
          a: "Generation pauses until the 1st. Nothing else changes: every note, card, and review you already have keeps working, and the schedule carries on. You can still write your own flashcards without limit.",
        },
        {
          q: "Who can see my notes?",
          a: "Only you. Sharing is off by default and per study set — turn it on and anyone with that link can see those cards; turn it off and access stops immediately. Your notes and review history are never shared. {link} spells out exactly what we hold and who processes it.",
          linkHref: "/privacy",
          linkLabel: "The privacy notice",
        },
        {
          q: "Does my note get sent to an AI company?",
          a: "The text of a note is sent to Anthropic when — and only when — you press Generate. Your name, email, and review history are not. Nothing is sent while you are just writing or reviewing, and PDFs are read in your browser and never uploaded.",
        },
        {
          q: "Are the flashcards ever wrong?",
          a: "Sometimes, yes. The AI works only from your note, so if the note has an error the cards will repeat it — and like any AI it can occasionally be confidently wrong on its own. Check anything that matters against your textbook. It is a study aid, not a source of truth.",
        },
        {
          q: "Can I use it for UPCAT or board review?",
          a: "That is what spaced repetition is best at. Entrance-exam subjects are built into setup alongside your strand, and the schedule is designed for material you need to hold for months rather than until Friday.",
        },
        {
          q: "Does it work offline?",
          a: "Reviewing does. Data is not free and campus wifi is not reliable, so cards you already have keep working with no connection and your ratings sync when one comes back. Generating a new study set needs the network, because that part happens on a server.",
        },
        {
          q: "What exactly is one study set?",
          a: "One study set is {explainer}.",
        },
        {
          q: "How is this different from Quizlet or Anki?",
          a: "Anki is the better scheduler and has a reputation for being hard to start; Quizlet is easier to start and its free tier keeps shrinking. Tuón sits between them and adds the thing neither does: it knows your exam date, so it can answer “will I be ready?” rather than just “what is due?”. It also reads notes that mix English with Tagalog or Cebuano, which is how most students here actually write them.",
        },
        {
          q: "Do I have to type every answer?",
          a: "Only on cards short enough to type, and you can turn it off in settings or skip it on any single card. It is on by default because reading the back and thinking “yeah, I knew that” is not the same as remembering it. Spelling, word order, accents and the Tagalog markers you might write are all forgiven — a typo never counts as wrong.",
        },
        {
          q: "Can I study with my classmates?",
          a: "Yes, in invite-only groups: share a set, put a shared deadline in, and see who is studying right now. There is deliberately no public room and no directory — a lot of students here are minors, and a space strangers can walk into needs moderation we are not able to promise. You join a group because someone in it sent you a code.",
        },
        {
          q: "Can I get my notes back out?",
          a: "Any time, as Markdown, with your [[links]] intact — one download for the whole library. You can bring a folder of Markdown in the same way. Locking the exit is how apps keep people who want to leave, and it is not a plan.",
        },
        {
          q: "What if I miss a week?",
          a: "Nothing breaks and nothing is lost. Cards you missed are simply still due, and a session is capped at a daily goal you set, so a backlog never arrives as a wall of 300 cards. There is a study grid on your dashboard that counts the days you studied, but it is a record rather than a threat — nothing nags you about keeping it going, and your best run stays on screen even after a gap.",
        },
        {
          q: "Can I use it on my phone?",
          a: "Yes — it is a website, so there is nothing to install, and you can add it to your home screen if you want it to open like an app. Reviewing is built thumb-first, because most of it happens on a phone between classes.",
        },
      ],
    },

    finalCta: {
      title: "Stop making flashcards. Start remembering.",
      body: "Start with one note tonight. You will have a set of flashcards before you finish your coffee, and the first review lands tomorrow.",
      action: "Create your free account",
      note: "Free forever for notes and flashcards · no card needed",
    },

    footer: {
      blurb:
        "Turn your class notes into flashcards and quizzes, then review them on a schedule that actually makes things stick.",
      questions: "Questions?",
      product: "Product",
      account: "Account",
      legal: "Legal",
      createAccount: "Create an account",
      openTuon: "Open Tuón",
      privacy: "Privacy notice",
      terms: "Terms of use",
      contact: "Contact us",
      language: "Language",
      draft: "draft",
      madeIn: "Made in the Philippines, for Filipino students.",
      rights: (year: number) =>
        `© ${year} Tuón · Adrian Salinas. All rights reserved.`,
    },
  },

  demo: {
    generate: "Generate a study set",
    noAccount: "Real notes, real output, no account needed.",
    reading: "Reading your note…",
    staged:
      "In the app this takes about twelve seconds. Here it’s staged — the cards below were generated ahead of time.",
    cardsAndQuiz: (count: number) => `${count} flashcards and a quiz`,
    progress: (index: number, total: number) => `${index} / ${total}`,
    showQuestion: "Show question",
    showAnswer: "Show answer",
    question: "Question",
    answer: "Answer",
    tapToReveal: "Tap to reveal",
    tapToFlipBack: "Tap to flip back",
    seeTheQuiz: "See the quiz",
    nextCard: "Next card",
    practiceQuiz: "Practice quiz",
    tryYourOwn: "Try it with your own notes",
    startOver: "Start over",
  },

  ask: {
    title: "Still have a question?",
    body: (creature: string) =>
      `Ask ${creature} whether Tuón covers your subject or your board exam, what it costs, or who can see your notes.`,
    suggestions: [
      "Does it cover my strand?",
      "Can I use it for the CPALE?",
      "Is it really free?",
      "Who can see my notes?",
    ],
    thinking: "Thinking",
    askAgain: "Ask that again",
    startOver: "Start over",
    followUp: "Ask a follow-up…",
    placeholder: "Ask about Tuón…",
    yourQuestion: "Your question",
    stop: "Stop",
    send: "Send",
    disclaimer: (creature: string) =>
      `${creature} only answers questions about Tuón, and can be wrong. Nothing you type here is saved to an account.`,
    failed:
      "Could not answer that one. The FAQ above covers the usual questions.",
    offline:
      "Could not reach the server. Check your connection, or read the FAQ above.",
  },

  shared: {
    mySets: "My sets",
    getTuon: "Get Tuón free",
    badge: "Shared study set",
    flashcards: (count: number) => `${count} flashcards`,
    quizQuestions: (count: number) => `${count} quiz questions`,
    saveToMySets: "Save to my sets",
    signUpToSave: "Sign up free to save this",
    ownCopy: "You get your own copy — your reviews stay yours.",
    flashcardsHeading: "Flashcards",
    saved: "Saved to your study sets.",
    saveFailed: "Could not save a copy. Please try again.",
    unavailable: "This link is not available",
    unavailableHint:
      "It may have been unshared by its owner, or the address might be mistyped.",
    goToTuon: "Go to Tuón",
  },

  offlinePage: {
    title: "This page needs a connection",
    body: "Your cards and their schedule are stored on this device, so reviewing still works. Anything you rate now is saved and syncs when you are back online.",
    goToReview: "Go to review",
    backToLibrary: "Back to my library",
  },

  tala: {
    title: (creature: string) => `Ask ${creature}`,
    subtitle:
      "She can see how your studying is going — what is due, which subject is weakest, how ready you are. She cannot see your notes or your cards.",
    companionOf: (creature: string) => `${creature}, your study companion`,
    placeholder: "Ask about your studying…",
    followUp: "Ask a follow-up…",
    yourMessage: "Your message",
    send: "Send",
    stop: "Stop",
    thinking: "Thinking",
    startOver: "Start over",
    tryAgain: "Ask that again",
    failed: "That one did not come through. Try asking again.",
    offline: "Could not reach Tuón. Check your connection and try again.",
    unavailable: "Tala is resting",
    unavailableHint:
      "The assistant is not switched on for this deployment yet. Everything else in Tuón works as normal.",
    disclaimer: (creature: string) =>
      `${creature} can be wrong, and never sees your notes or flashcards. This conversation stays on this device.`,
    askTonight: "What should I study tonight?",
    askWeakest: (subject: string) => `Why is ${subject} my weakest?`,
    askShaky: "What do I do about my shaky cards?",
    askHowItWorks: "How does the schedule decide?",
    emptySuggestions: [
      "How do I get started?",
      "What makes a good flashcard?",
      "Why not just re-read my notes?",
    ],
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
