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
    onTrack: "Nasa tamang landas",
    shaky: "Marupok pa",
    notStarted: "Hindi pa nasisimulan",
    daysTo: (days: number, when: string) => `${days} araw bago ang ${when}`,
    todayIs: (when: string) => `Ngayon — ${when}`,
    freshLine: (onTrack: number, total: number, pct: number) =>
      `${onTrack} sa ${total} kard ang dapat sariwa pa — ${pct}%`,
    weakestSubject: "Pinakamahinang subject",
    dueToday: "Dapat balikan ngayon",
    neverSeen: "Hindi pa nakikita",
    noCardsYet: "Wala pang kard",
    turnIntoCards: (title: string) => `Gawing kard ang “${title}”`,
    testYourselfOn: (title: string) => `Subukan ang sarili sa ${title}`,
    shakyCards: (count: number) => `${count} marupok na kard`,
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
    loadMore: (count: number) => `Mag-load pa ng ${count}`,
    searchingLoaded: (count: string, noun: string) =>
      `Hinahanap sa ${count} ${noun} na na-load hanggang ngayon.`,
    nounNotes: "nota",
    nounSets: "study set",
  },

  sets: {
    title: "Mga study set",
    search: "Maghanap ng study set",
    allSets: "Lahat ng set",
    termsLiveIn: "Ang mga term at ang mga subject nito ay nasa",
    settingsLink: "settings",
    noMatch: (query: string) =>
      `Walang study set na tumugma sa “${query}”.`,
    noneYet: "Wala pang study set",
    noneYetHint:
      "Magsulat ng nota, tapos pindutin ang Generate study set. Lalabas dito ang flashcards at quiz mo.",
    startANote: "Magsimula ng nota",
    notFound: "Hindi mahanap ang study set",
    backToSets: "Balik sa mga study set",
    questions: (count: number) => `${count} tanong`,
    flashcards: (count: number) => `${count} flashcard`,
    quizQuestions: (count: number) => `${count} tanong sa quiz`,
    due: (count: number) => `${count} due`,
    fresh: (count: number) => `${count} bago`,
    sourceNote: "pinagmulang nota",
    reviewFlashcards: "I-review ang flashcards",
    dueAndNew: (due: number, fresh: number) => `${due} due, ${fresh} bago`,
    caughtUpForNow: "Wala munang dapat balikan",
    takeTheQuiz: "Sagutan ang quiz",
    multipleChoice: (count: number) => `${count} multiple-choice na tanong`,
    sitATest: "Sumagot ng test",
    testHint: "May oras at halo-halo, mula sa pinakamahina mong kard",
    dueNow: "Due na",
    neverSeen: "Hindi pa nakikita",
    scheduled: "Nakaiskedyul",
    cardsTab: "Flashcards",
    newCard: "Bago",
    resetProgress: "I-reset ang progreso",
    resetTitle: "Uulitin ang set na ito?",
    resetBody:
      "Magiging due ulit ang bawat kard dito at makakalimutan nito kung gaano mo kaalam ang mga ito. Hindi magagalaw ang mga kard mismo — ang iskedyul lang ang buburahin, para sa pag-aaral ng subject mula sa umpisa.",
    resetDone: (count: number) => `${count} kard ang due na ulit.`,
    resetFailed: "Hindi ma-reset ang progreso ng set na ito.",
    deleteSet: "Burahin ang set",
    deleteTitle: "Burahin ang study set na ito?",
    deleteBody:
      "Hindi na maaabot ang flashcards, quiz, at review history nito. Mananatili ang notang pinagmulan.",
    deleteDone: "Nabura ang study set.",
    deleteFailed: "Hindi mabura ang study set na iyon.",
  },

  mastery: {
    untouched: "Hindi pa nasisimulan",
    learning: "Natututo pa",
    familiar: "Pamilyar na",
    confident: "Kumpiyansa na",
    mastered: "Bihasa na",
    untouchedHint: "wala pang na-review",
    learningHint: "karamihan sa kard ay bumabalik pa rin sa loob ng isang linggo",
    familiarHint: "nagsisimula nang humaba ang iskedyul",
    confidentHint: "karamihan sa kard ay tumatagal nang ilang linggo",
    masteredHint: "lahat ay ilang linggo pa at walang mahina",
    ariaLabel: "Antas ng kaalaman sa set na ito",
    shakyStep: (count: number) =>
      `${count} kard ang paulit-ulit kang natatalo — iyon ang pinakasulit ngayon.`,
    untouchedStep: (count: number) => `${count} kard ang hindi pa na-review.`,
    derivedNote:
      "Batay sa kung gaano kalayo naka-iskedyul ang bawat kard at kung gaano kadalas mo ito namamali — ang mismong bilang na ginagamit ng review queue, kaya hinding-hindi ito magkakasalungat dito.",
  },

  share: {
    action: "I-share",
    lockedTitle: (plan: string) => `Bahagi ng ${plan} ang pag-share`,
    title: "I-share ang study set na ito",
    body: "Kahit sino na may link ay makikita ang mga kard at makakakuha ng kopya. Hindi nila mababago ang sa iyo, at mananatiling pribado ang review history mo.",
    anyoneWithLink: "Kahit sino na may link",
    onlyYou: "Ikaw lang",
    turningOff: "Kapag pinatay ito, agad nang hindi gagana ang link.",
    turnOn: "Buksan para gumawa ng link na pwedeng i-share.",
    toggleLabel: "I-share sa pamamagitan ng link",
    copyLink: "Kopyahin ang link",
    live: "Buhay na ang link.",
    revoked: "Binawi ang link.",
    changeFailed: "Hindi mabago ang pag-share. Subukan ulit.",
    copyFailed: "Hindi makopya. Piliin ang link at kopyahin nang manu-mano.",
    unlistedNote:
      "Hindi nakalista o nahahanap kahit saan ang link — gagana lang ito para sa taong pinadalhan mo.",
  },

  exportSet: {
    action: "I-export",
    lockedTitle: (plan: string) => `Bahagi ng ${plan} ang pag-export`,
    heading: "I-export ang set na ito",
    anki: "Anki deck",
    ankiHint: "Tab-separated na .txt",
    spreadsheet: "Spreadsheet",
    spreadsheetHint: "CSV para sa Excel o Sheets",
    pdf: "PDF na pwedeng i-print",
    pdfHint: "Mga kard at quiz kasama ang sagutan",
    ankiSaved: "Na-save ang Anki file. I-import ito sa File → Import sa Anki.",
    csvSaved: "Na-save ang CSV.",
    pdfHowTo: "Piliin ang “Save as PDF” sa print dialog.",
  },

  notes: {
    search: "Maghanap sa mga nota mo",
    noMatch: (query: string) => `Walang notang tumugma sa “${query}”.`,
    noneYet: "Wala pang nota",
    noneYetHint:
      "I-paste ang lecture notes o reviewer mo, at gagawin itong flashcards at quiz ni Tuón.",
    createFirst: "Gumawa ng unang nota mo",
    emptyNote: "Walang laman na nota",
    characters: (count: string) => `${count} karakter`,
    charactersUnit: "karakter",
    untitled: "Notang walang pamagat",
    titlePlaceholder: "Pamagat ng nota",
    contentLabel: "Laman ng nota",
    contentPlaceholder:
      "I-paste o i-type dito ang notes mo sa klase — o mag-drop ng PDF. I-type ang [[ para mag-link ng ibang nota.",
    subject: "Subject",
    subjectOptional: "Subject (opsyonal)",
    noSubject: "Walang subject",
    subjectExample: "hal. Calculus 1",
    moreNeeded: (count: number) => `${count} pa ang kailangan para makapag-generate`,
    startTyping: "Magsimulang mag-type para ma-save ang notang ito.",
    addMoreToGenerate: (count: number) =>
      `Magdagdag ng ${count} pang karakter para makagawa ng study set.`,
    saving: "Sine-save",
    saved: "Na-save",
    saveFailed: "Hindi ma-save",
    dismiss: "Isara",
    deleteNote: "Burahin ang nota",
    deleteTitle: "Burahin ang notang ito?",
    deleteBody:
      "Mabubura ang nota. Mananatili ang mga study set na nagawa mo na mula rito.",
    deleted: "Nabura ang nota.",
    deleteFailed: "Hindi mabura ang notang iyon.",
    linkANote: "Mag-link ng nota",
    linkTo: (title: string) => `I-link sa “${title}”`,
    insertHint: "para ipasok · Esc para isara",
    linkHintBefore: "I-type ang",
    linkHintAfter:
      "para mag-link ng ibang nota. Lalabas dito ang mga naka-link na nota, kasama ang anumang naka-link pabalik.",
    linksFrom: "Mga link mula sa notang ito",
    linkedFrom: "Naka-link mula sa",
    notCreatedYet: "wala pa",
  },

  pdf: {
    importPdf: "Mag-import ng PDF",
    orDrop: "o mag-drop ng file kahit saan sa ibaba",
    reading: "Binabasa ang PDF mo…",
    dropHere: "I-drop dito ang PDF mo",
    limitNote: (pages: number) =>
      `Hanggang ${pages} pahina · mananatili sa device mo`,
    imported: (pages: number) => `Na-import ang ${pages} pahina`,
    onlyFirst: (read: number, total: number) =>
      `ang unang ${read} lang sa ${total} ang nabasa`,
    clipped: "pinutol ang teksto para kasya sa isang nota",
    notAPdf: "Hindi iyon PDF. PDF file lang ang pwedeng i-import sa ngayon.",
    tooLarge: (sizeMb: string, limitMb: number) =>
      `${sizeMb}MB ang PDF na iyon. ${limitMb}MB ang limitasyon — subukang hatiin ito sa mga kabanata.`,
    readerFailed: "Hindi masimulan ang PDF reader. Mag-refresh at subukan ulit.",
    passwordProtected:
      "May password ang PDF na iyon. Alisin ang password at subukan ulit.",
    unreadable: "Hindi mabasa ang file na iyon bilang PDF. Maaaring sira ito.",
    noTextLayer:
      "Walang nabasang teksto. Mukhang scanned PDF ito o mga larawan ng pahina — hindi pa mabasa ni Tuón ang ganito. Subukan ang PDF na galing sa dokumento.",
    unknown: "May naging problema sa pagbasa ng PDF na iyon. Subukan ang ibang file.",
  },

  generate: {
    generateSet: "Gumawa ng study set",
    updateSet: "I-update ang study set",
    separateSet: "Gumawa ng hiwalay na set",
    generating: "Ginagawa…",
    progress: [
      "Binabasa ang nota mo…",
      "Pinipili ang mahahalaga…",
      "Sinusulat ang flashcards…",
      "Binubuo ang practice quiz mo…",
      "Malapit na…",
    ],
    tryAgain: "Subukan ulit",
    failed: "Hindi nagawa. Subukan ulit.",
    offline: "Hindi maabot ang server. Tingnan ang koneksyon mo at subukan ulit.",
    merged: (added: number, kept: number) =>
      `${added} bagong kard ang naidagdag. Napanatili ng ${kept} mong kard ang progreso nila.`,
    nothingNew:
      "Walang bagong maidagdag — hindi pa gaanong nagbabago ang nota mo mula noong huli.",
    ready: (cards: number, questions: number) =>
      `Handa na ang ${cards} flashcard at ${questions} tanong sa quiz.`,
    remaining: (left: number, limit: number) =>
      `${left} sa ${limit} study set ang natitira ngayong buwan`,
    exhausted: (limit: number, resetsAt: string | null) =>
      `Iyan na ang lahat ng ${limit} study set ngayong buwan${resetsAt ? ` — magre-reset ito sa ${resetsAt}` : ""}. Pwede ka pa ring magsulat ng nota at gumawa ng flashcards nang manu-mano.`,
    upgradeOffer: (perMonth: number, php: number) =>
      `Kumuha ng ${perMonth}/buwan sa ₱${php}`,
  },

  markdown: {
    importAction: "Mag-import ng Markdown",
    importShort: "I-import",
    exportAll: "I-export lahat",
    readingFirst: (limit: number, total: number) =>
      `Binabasa ang unang ${limit} file sa ${total}.`,
    nothingToImport: "Walang ma-import",
    importCount: (count: number) => `I-import ang ${count} nota?`,
    noneReadable: "Wala sa mga file na iyon ang mabasa bilang nota.",
    titleRule:
      "Ang pamagat ay galing sa front matter, tapos sa heading, tapos sa pangalan ng file. Patuloy na gagana ang anumang [[links]] sa pagitan nila.",
    skipped: (count: number) => `${count} file ang nilaktawan`,
    noTitle: "Walang matukoy na pamagat",
    empty: "Walang laman ang file",
    unreadable: "Hindi mabasa",
    tooLong: (length: string, limit: string) =>
      `Masyadong mahaba — ${length} karakter, ${limit} ang limitasyon`,
    imported: (count: number) => `${count} nota ang na-import.`,
    importFailed: "Hindi ma-import ang mga notang iyon. Walang na-save.",
    nothingToExport: "Wala pang notang pwedeng i-export.",
    exported: (count: number) => `${count} nota ang na-export.`,
    exportFailed: "Hindi mabuo ang export na iyon.",
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
