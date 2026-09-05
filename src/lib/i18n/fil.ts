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
    tala: "Tanungin si Tala",
    groups: "Mga grupo",
    graph: "Graph",
    retention: "Retention",
    newNote: "Bagong nota",
    more: "Iba pa",
    closeMenu: "Isara ang menu",
    settings: "Settings",
    help: "Tulong",
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
    thisWeek: "Ngayong linggo",
    fullYear: "Buong taon",
    streakDays: (n: number) =>
      n === 0 ? "Walang sunod-sunod" : `${n} araw na sunod-sunod`,
    comingUp: "Paparating",
    allDeadlines: "Kalendaryo",
    nothingDue: "Walang nakatakda",
    addDeadline: "Magdagdag ng deadline sa kalendaryo",
    yearOfStudy: "Ang taon mo",
    fullLog: "Buong log",
    startReviewing: "Simulan ang review",
    everythingOnTrack: "Nasa tamang landas ang lahat.",
    // No plural change on the noun: "8 kard", not "8 mga kard".
    cardsNeedWork: (count: number) =>
      `${count} kard ang kailangan pang balikan`,
    cardsReadyToStart: (count: number) =>
      `${count} kard ang handa nang simulan`,
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
    logged: (time: string, next: string) =>
      `${time} ang na-log. ${next} na susunod.`,
    nextUp: (next: string) => `${next} na ang susunod.`,
    notLogged: "Hindi na-save sa log mo ang block na iyon.",
    breakOver: "Tapos na ang break. Balik na tayo.",
  },

  whenToStudy: {
    heading: "Kailan mag-aral",
    span: (from: string, to: string) => `${from} – ${to}`,
    reason: {
      wholeDay: "Walang klase sa iskedyul mo ngayon.",
      beforeFirstClass: "Bago ang unang klase mo.",
      betweenClasses: "Sa pagitan ng mga klase.",
      afterClasses: "Pagkatapos ng huling klase mo.",
    },
    needs: (minutes: number) => `Mga ${minutes} min para sa plano ngayon.`,
    tight: (minutes: number) =>
      `${minutes} min lang ang bakante — baka hindi mo matapos lahat.`,
    nextClass: (title: string, time: string) =>
      `Susunod: ${title} nang ${time}`,
    noClasses: "Walang klase ngayon.",
    noneLeft: "Wala nang bakante ngayong araw. Bukas na lang.",
    addTimetable: "Idagdag ang lingguhang iskedyul mo",
    addTimetableWhy:
      "Klase, shift sa trabaho, kahit ano na pumupuno sa araw — hahanapin ni Tuón ang mga puwang, para may oras na kasama ang plano.",
  },

  heatmap: {
    whereItWent: "Saan napunta ang oras",
    otherSubjects: "Lahat ng iba pa",
    noneYet: "Wala pang naitalang pag-aaral",
    totalAcross: (hours: string, days: number) =>
      `${hours} sa ${days} ${days === 1 ? "araw" : "na araw"}`,
    currentRun: "kasalukuyang sunod",
    longestRun: "pinakamahabang sunod",
    runDays: (days: number) => `${days} ${days === 1 ? "araw" : "na araw"}`,
    legend: {
      under15: "wala pang 15m",
      m15: "15m",
      m30: "30m",
      h1: "1h+",
    },
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
    dateLocale: "fil-PH",
    weekdays: [
      "Linggo",
      "Lunes",
      "Martes",
      "Miyerkules",
      "Huwebes",
      "Biyernes",
      "Sabado",
    ],
    weekdaysShort: ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"],
    weekdaysNarrow: ["Li", "Lu", "Ma", "Mi", "Hu", "Bi", "Sa"],
  },

  sets: {
    title: "Mga study set",
    search: "Maghanap ng study set",
    allSets: "Lahat ng set",
    termsLiveIn: "Ang mga term at ang mga subject nito ay nasa",
    settingsLink: "settings",
    noMatch: (query: string) => `Walang study set na tumugma sa “${query}”.`,
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
    learningHint:
      "karamihan sa kard ay bumabalik pa rin sa loob ng isang linggo",
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
    notFound: "Hindi mahanap ang nota",
    notFoundHint: "Maaaring nabura na ito.",
    backToNotes: "Balik sa mga nota",
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
    moreNeeded: (count: number) =>
      `${count} pa ang kailangan para makapag-generate`,
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
    readerFailed:
      "Hindi masimulan ang PDF reader. Mag-refresh at subukan ulit.",
    passwordProtected:
      "May password ang PDF na iyon. Alisin ang password at subukan ulit.",
    unreadable: "Hindi mabasa ang file na iyon bilang PDF. Maaaring sira ito.",
    noTextLayer:
      "Walang nabasang teksto. Mukhang scanned PDF ito o mga larawan ng pahina — hindi pa mabasa ni Tuón ang ganito. Subukan ang PDF na galing sa dokumento.",
    unknown:
      "May naging problema sa pagbasa ng PDF na iyon. Subukan ang ibang file.",
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
    offline:
      "Hindi maabot ang server. Tingnan ang koneksyon mo at subukan ulit.",
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

  calendar: {
    title: "Kalendaryo",
    subtitle:
      "Kung kailan babalik ang bawat kard. Ang spaced repetition ang bahala sa petsa — sumipot ka lang.",
    reviewNow: (count: number) => `I-review ang ${count} ngayon`,
    previousMonth: "Nakaraang buwan",
    nextMonth: "Susunod na buwan",
    scheduled: "Nakaiskedyul",
    overdue: "Lampas na",
    tapADay: "Pindutin ang isang araw para makita kung anong kard.",
    selectedDay: "Piniling araw",
    yearHint: "Bawat araw na nag-aral ka, at kung saan napunta ang oras.",
    nothingScheduled: "Walang nakaiskedyul.",
    overdueSuffix: " — lampas na",
    noneYet: "Wala pang nakaiskedyul",
    noneYetHint:
      "Kapag na-review mo na ang isang kard sa unang pagkakataon, mapupunta ito sa kalendaryong ito — at babalik bago mo pa ito makalimutan.",
    makeASet: "Gumawa ng study set",
  },

  organiser: {
    yourWeek: "Ang linggo mo",
    yourWeekHint:
      "Mga deadline, kung ano ang utang mo, at kung kailan ka may klase. Ikaw lang ang nakakakita nito.",
    deadlines: "Mga deadline",
    todos: "Gagawin",
    timetable: "Iskedyul",
    time: "Oras",
    timeStudied: "Oras na inaral",
    timeStudiedHint:
      "Mag-log ng sesyon, o hayaang gawin ng timer. Ang linggong ito, oras-oras.",
    saveFailed: "Hindi ma-save iyon. Tingnan ang koneksyon mo.",
    changeFailed: "Hindi ma-save ang pagbabagong iyon.",
    deleteFailed: "Hindi mabura iyon.",
    deadlinePlaceholder: "Draft ng tesis, problem set, presentasyon…",
    deadlinesEmpty:
      "Walang due. Kapag nagdagdag ka ng deadline dito, ito rin ang pagbabatayan ng readiness mo sa dashboard.",
    todoPlaceholder: "Basahin ang kabanata 4, i-email si Ms. Reyes…",
    todosEmpty:
      "Maliliit na bagay na hindi flashcard. Mananatili sila sa listahan kahit na-tsek na, para makita mo kung ano talaga ang inabot ng linggo mo.",
    markDone: (title: string) => `Markahan ang ${title} bilang tapos`,
    markNotDone: (title: string) =>
      `Markahan ang ${title} bilang hindi pa tapos`,
    deleteItem: (title: string) => `Burahin ang ${title}`,
    classesOverlap:
      "May dalawang klaseng nagsasabay. Iniwan kung paano mo ito inilagay — ang tunay na banggaan ay dapat ayusin sa eskwelahan mo, hindi basta tanggihang i-save dito.",
    timetableEmpty:
      "Ilagay ang oras ng klase mo at magkakahugis ang linggo. Dito mo rin mapapansin ang bakanteng hapon na palagi mong nakakalimutan.",
    dueDate: "Petsa ng deadline",
    dueDateOptional: "Petsa ng deadline (opsyonal)",
    subject: "Subject",
    noSubject: "Walang subject",
    addAClass: "Idagdag sa linggo mo",
    newClass: "Bagong gawain",
    classNamePlaceholder: "Lecture sa General Biology, o Night shift",
    className: "Ano ito",
    starts: "Simula",
    ends: "Katapusan",
    locationPlaceholder: "Room 204 (opsyonal)",
    location: "Lugar",
    saveClass: "I-save ang klase",
    endsBeforeStarts: "Nauuna ang katapusan sa simula.",
  },

  studyLog: {
    thisWeek: "Ngayong linggo",
    previousWeek: "Nakaraang linggo",
    nextWeek: "Susunod na linggo",
    minutes: "minuto",
    minutesStudied: "Minutong nag-aral",
    day: "Araw",
    addElsewhere: "Magdagdag ng oras na nag-aral ka sa ibang lugar",
    nothingLogged:
      "Walang naitala ngayong linggo. Pinupuno ito ng timer sa itaas, at ang anumang ginawa mo sa labas ng Tuón ay pwedeng idagdag nang manu-mano — mas masama ang linggong nagsasabing zero kaysa sa walang log.",
    saveSessionFailed: "Hindi ma-save ang session na iyon.",
    editSession: (day: string) => `I-edit ang session ng ${day}`,
    deleteSession: (day: string) => `Burahin ang session ng ${day}`,
    cardsReviewed: (count: number) => `${count} kard`,
    sourcePomodoro: "Timer",
    sourceReview: "Review",
    sourceManual: "Ikaw ang nagdagdag",
  },

  groups: {
    title: "Mga study group",
    subtitle:
      "Maliit, imbitasyon lang, at pribado. Walang direktoryo at walang paraan para makahanap ng grupong hindi ka inimbitahan — para ito sa mga taong magkakasama nang nag-aaral.",
    noneYet:
      "Wala pang grupo. Gumawa ng isa para sa klase o review batch mo, o i-paste ang code na ipinadala sa iyo.",
    startAGroup: "Magsimula ng grupo",
    startAGroupHint: "Para sa klase, barkada, o review batch",
    groupName: "Pangalan ng grupo",
    groupNamePlaceholder: "STEM 12-A Biology",
    create: "Gumawa",
    isReady: (name: string) => `Handa na ang ${name}`,
    codeOnce:
      "Ipadala ang code na ito sa mga gusto mong isama. Ngayon lang ito ipapakita, at titigil itong gumana pagkatapos ng dalawang linggo.",
    copyCode: "Kopyahin ang code",
    copied: "Nakopya",
    savedIt: "Na-save ko na",
    copyFailed: "Hindi makopya iyon. Isulat na lang.",
    joinWithCode: "Sumali gamit ang code",
    joinHint: "May kailangang magpadala sa iyo mula sa grupo",
    inviteCode: "Invite code",
    join: "Sumali",
    joined: "Nakapasok ka na.",
    notAMember: "Wala ka sa grupong ito",
    notAMemberHint:
      "Imbitasyon lang ang mga grupo, kaya hindi sapat ang link. Humingi ng code sa isang nasa loob.",
    yourGroups: "Mga grupo mo",
    studyingNow: (count: number) => `${count} ang nag-aaral ngayon`,
    inviteSomeone: "Mag-imbita.",
    inviteBody:
      "Ipadala sa kanila ang code na ibinigay sa iyo noong ginawa ang grupong ito — nag-e-expire ang code pagkatapos ng dalawang linggo, kaya humingi ng bago sa may-ari kung tumigil na itong gumana.",
    copyGroupLink: "Kopyahin ang link ng grupo",
    couldNotCopy: "Hindi makopya iyon.",
    whoIsIn: "Sino ang kasama",
    owner: "may-ari",
    studying: "nag-aaral",
    leave: "Umalis",
    left: "Umalis ka sa grupo.",
    deleteGroup: "Burahin ang grupo",
    deleted: "Nabura ang grupo.",
    deleteTitle: "Burahin ang grupong ito?",
    deleteBody:
      "Ikaw na ang huling miyembro, kaya ang pag-alis ay magbubura sa grupo kasama ang mga deadline at listahan ng shared set nito. Walang mahahawakan sa nota o kard ninuman — mananatili iyon sa library ng gumawa.",
    workingTowards: "Ano ang pinaghahandaan ng grupo",
    deadlinePlaceholder: "Practical exam, group report…",
    deadline: "Deadline",
    addDeadlineFailed: "Hindi maidagdag ang deadline na iyon.",
    noDeadlines:
      "Wala pa. Ang pinagsasaluhang petsa ang nagpapagawa sa grupo bilang grupo sa halip na chat lang.",
    studyingWhat: "Ano ang pinag-aaralan ng grupo",
    studyingWhatHint:
      "Nananatili ang mga set sa library ng gumawa, kaya ang pag-aayos ay umaabot sa lahat sa halip na mag-iwan ng lumang kopya. Ang grupong ito lang ang makakabukas nito.",
    everythingShared: "Nandito na ang lahat ng meron ka.",
    shareOneOfYours: "I-share ang isa sa mga set mo",
    shareFailed: "Hindi ma-share ang set na iyon.",
    removeFailed: "Hindi maalis iyon.",
    remove: (title: string) => `Alisin ang ${title}`,
    aClassmate: "Isang kaklase",
    standings: "Standings",
    standingsHint:
      "Galing ang XP sa mga kard na talagang naalala mo nang bumalik ang mga ito — hindi sa oras na naitala, kaya walang kinikita ang pag-iwan ng timer. Ang kard na tumatagal ng isang buwan ay katumbas ng sampung recall.",
    noStandings:
      "Wala pa. Mag-review ng ilang kard at lalabas dito ang unang XP mo.",
    you: "ikaw",
    masteredCount: (count: number) => `${count} ang bihasa na`,
    xp: (value: string) => `${value} XP`,
    standingsPrivacy:
      "Ang mga bilang na ito lang ang ibinabahagi sa grupo — hindi kailanman ang nota mo, ang kard mo, o kung anong subject ang huli ka.",
    error: {
      UNVERIFIED:
        "Hindi ma-verify ang request na ito. I-reload at subukan ulit.",
      NOT_SIGNED_IN: "Kailangan mong maka-sign in.",
      MALFORMED: "May naging problema sa pagpapadala niyon. Subukan ulit.",
      UNKNOWN_ACTION: "May naging problema sa pagpapadala niyon. Subukan ulit.",
      NAME_REQUIRED: "Bigyan ng pangalan ang grupo.",
      NO_PROFILE: "Tapusin muna ang pag-set up ng account mo.",
      TOO_MANY_GROUPS:
        "Nasa pinakamaraming grupo ka na na pinapayagan ng Tuón.",
      BAD_CODE: "Hindi wasto ang invite code na iyon.",
      EXPIRED_CODE: "Hindi na wasto ang imbitasyong iyon. Humingi ng bago.",
      GROUP_FULL: "Puno na ang grupong iyon.",
      JOIN_FAILED: "Hindi makasali sa grupong iyon.",
      UNKNOWN_GROUP: "Hindi kilalang grupo.",
      RATE_LIMITED:
        "Masyadong maraming pagbabago mula sa koneksyong ito. Subukan ulit sa loob ng ilang minuto.",
      SERVER_NOT_CONFIGURED:
        "Hindi pa buo ang pagkaka-configure ng server na ito.",
      OFFLINE: "Hindi maabot ang Tuón. Tingnan ang koneksyon mo.",
      unknown: "Hindi iyon gumana. Subukan ulit.",
    },
  },

  settingsPage: {
    profile: "Profile",
    displayName: "Pangalang ipapakita",
    school: "Eskwelahan",
    schoolPlaceholder: "Pangalan ng eskwelahan mo",
    schoolNote: "Opsyonal. Ikaw lang ang nakakakita nito.",
    educationLevel: "Antas ng pag-aaral",
    strandNote:
      "Ang pagpapalit ng strand mo ay nagpapalit ng mga subject na inaalok. Mananatili sa mga nota at study set mo ang tag na meron na sila — walang mare-retag o mabubura.",
    change: "Palitan",
    subjects: "Mga subject",
    course: "Kurso",
    fromCurrentTerm:
      "Galing ang mga subject mo sa term na minarkahan mong kasalukuyan.",
    editUnderSemesters: "I-edit ang mga ito sa Semesters",
    addAnotherSubject: "Magdagdag pa ng subject",
    addYourOwnCourse: "Idagdag ang sarili mong kurso",
    removeChip: (name: string) => `Alisin ang ${name}`,
    saveChanges: "I-save ang mga pagbabago",
    saved: "Na-save ang settings.",
    saveFailed: "Hindi ma-save ang settings mo.",
    levelUpdated: "Na-update ang antas ng pag-aaral.",
    changeFailed: "Hindi ma-save ang pagbabagong iyon.",
    removeElsewhere: (subject: string) =>
      `Para alisin ang ${subject}, gamitin ang “Mga subject mo” sa ibaba.`,
    removeElsewhereWhy:
      "Inilipat muna nito ang mga nota at kard mo, para walang maiwan.",
    signedIn: "Naka-sign in",
  },

  picture: {
    title: "Larawan",
    hint: "Nakikita mo, at ng sinumang kasama mo sa study group. Nire-resize sa device mo bago i-save, kaya hindi ka gagastos ng data sa larawang galing mismo sa telepono mo.",
    updated: "Na-update ang larawan.",
    saveFailed: "Hindi ma-save ang larawang iyon.",
    removeFailed: "Hindi maalis ang larawang iyon.",
    type: "Kailangang JPEG, PNG o WebP iyon.",
    tooBig:
      "Masyadong malaki ang larawang iyon. Subukan ang mas mababa sa 10MB.",
    decode: "Hindi mabasa ang file na iyon bilang larawan.",
    encode: "Hindi ma-resize ang larawang iyon. Subukan ang iba.",
  },

  semesters: {
    title: "Mga semester",
    firstRun:
      "Sa ngayon ay isang listahan lang ang mga subject mo. Hatiin sa mga term at ipapakita ng Tuón ang kinukuha mo ngayon, habang nananatili sa kinalalagyan nila ang mga nota at kard noong nakaraang term.",
    setUp: "I-set up ang mga semester",
    hint: "Ang term na minarkahan mong kasalukuyan ang magdedesisyon kung anong subject ang lalabas kapag nag-tag ka ng nota o study set. Napapanatili ng mga lumang term ang lahat ng nasa kanila.",
    addSemester: "Magdagdag ng semester",
    atMost: (count: number) =>
      `${count} semester ang pinakamarami na itinatago ng Tuón.`,
    termFull: (count: number) => `May ${count} subject na ang term na iyon.`,
    current: "Kasalukuyan",
    makeCurrent: "Gawing kasalukuyan",
    deleteTerm: (name: string) => `Burahin ang ${name}`,
    noSubjectsYet: "Wala pang subject.",
    addASubject: "Magdagdag ng subject",
    addSubjectTo: (name: string) => `Magdagdag ng subject sa ${name}`,
    removeSubject: (name: string) => `Alisin ang ${name}`,
    removalNote:
      "Ang pag-alis ng subject dito ay tinatanggal lang ito sa listahan ng term na ito. Hindi magagalaw ang mga nota at study set na naka-tag dito.",
    ordinal: (index: number) => `Ika-${index + 1} Semester`,
  },

  manageSubjects: {
    title: "Mga subject mo",
    titleOne: "Subject mo",
    hint: "Kung ano ang laman ng bawat isa, at kung paano tanggalin ang isa nang hindi ito nawawala. Ang pag-alis ng subject ay hindi kailanman nagbubura ng nota, kard, o oras na naitala mo.",
    orphanTitle: "Wala na sa profile mo",
    orphanHint:
      "Mga gawaing naka-tag sa subject na wala ka na. Nasa library mo pa rin ang lahat at lumalabas pa rin sa review — hindi lang ito nabibilang sa alinmang subject. Ilipat ito, o alisin ang label.",
    sortOut: "Ayusin",
    removeTitle: (subject: string) => `Alisin ang ${subject}?`,
    nothingTagged: "Walang naka-tag sa subject na ito, kaya walang ililipat.",
    subjectHolds: (contents: string) => `May ${contents} ang subject na ito.`,
    nothingDeleted: "Walang mabubura rito.",
    nothingDeletedBody:
      "Mananatiling gaya ng dati ang mga nota, kard, review history at naitalang oras mo — ang label lang ang magbabago.",
    whereShouldItGo: "Saan ito dapat pumunta?",
    leaveUntagged: "Iwanang walang tag",
    moveTo: (subject: string) => `Ilipat sa ${subject}`,
    untaggedWarning:
      "Lumalabas pa rin sa library mo ang materyal na walang tag at lumalabas pa rin sa review. Hindi lang ito mabibilang sa alinmang subject sa dashboard.",
    removed: (subject: string) => `Naalis ang ${subject}.`,
    removedMoved: (subject: string, target: string) =>
      `Naalis ang ${subject}. Nailipat lahat sa ${target}.`,
    removedUntagged: (subject: string, count: number) =>
      `Naalis ang ${subject}. Wala nang tag ang ${count} bagay nito.`,
    removeFailed: "Hindi maalis ang subject na iyon. Walang nabago.",
    contents: {
      notes: (count: number) => `${count} nota`,
      sets: (count: number) => `${count} study set`,
      setsWithCards: (sets: number, cards: number) =>
        `${sets} study set (${cards} kard)`,
      planItems: (count: number) => `${count} bagay sa linggo mo`,
      sessions: (count: number) => `${count} naitalang session`,
      nothing: "wala pa",
      separator: ", ",
      lastSeparator: " at ",
      none: "Walang naka-tag sa subject na ito.",
    },
  },

  preferences: {
    appearanceHint:
      "Ang dark ay mainit sa mata, hindi itim na itim — para sa pag-review nang ala-una ng umaga nang hindi sumisigaw ang screen.",
    colourHint:
      "Hiwalay sa light at dark — pumili ng kulay minsan at susunod ito sa iyo kahit saan ka pumunta.",
    colourFailed:
      "Hindi ma-save ang kulay na iyon. Magre-reset ito sa ibang device.",
    languageHint:
      "Ang sariling salita ng Tuón. Mananatili ang mga nota at kard mo sa kung anong wika mo isinulat — pati na ang Taglish.",
    languageFailed: "Hindi ma-save ang wikang iyon.",
    draftLocale: "Draft — hindi pa nasusuri ng katutubong nagsasalita",
    timeZoneHint:
      "Nagdedesisyon kung kailan itinuturing na due ang isang kard ngayong araw. Kapag mali ito, malilipat ang bawat petsa ng review, at walang magmumukhang mali sa screen.",
    timeZoneSaved:
      "Na-update ang time zone. Susunod dito ang mga due date mo mula ngayon.",
    timeZoneFailed: "Hindi ma-save ang time zone mo.",
    deviceSays: "Sabi ng device na ito, nasa",
    deviceSaysTail: " ka, na hindi ang pinagbabatayan ng mga review mo.",
    useThisDevice: "Gamitin ang device na ito",
    timerHint:
      "Ang timer sa sidebar. Dalawampu’t limang minuto ang klasikong block at bagay sa marami; kung hindi ito bagay sa iyo, mas mahalaga ang maikling natatapos mo kaysa sa mahabang iniiwan mo.",
    timerSaved: "Na-update ang timer.",
    timerFailed: "Hindi ma-save ang mga haba na iyon.",
    longBreakNote:
      "Dumarating ang mahabang break pagkatapos ng bawat ikaapat na focus block.",
    typedRecallHint:
      "Ang pagbasa sa likod at pag-isip ng “ay alam ko iyan” ay hindi katulad ng pagkakaalala nito. Sinasagot ng pag-type ang tanong bago mo makita. Sa mga sagot lang na kayang i-type, at pinapatawad ang spelling, ayos ng salita at accent.",
    typedRecallFailed: "Hindi ma-save ang setting na iyon.",
    dailyGoalHint:
      "Ginagawang session na kaya mong tapusin ang “i-review lahat”. Naghihintay pa rin sa iyo ang mga kard na lampas dito — walang nilalaktawan.",
    dailyGoalSaved: "Na-update ang pang-araw-araw na target.",
    dailyGoalFailed: "Hindi ma-save ang pang-araw-araw na target mo.",
    cardsUnit: "kard",
  },

  reminder: {
    title: "Pang-araw-araw na paalala",
    hint: "Isang paalala sa isang araw kapag may due kang kard. Bilang ng kard ang tinitingnan, hindi sunod-sunod na araw — hindi kabiguan ang makalimutan ang isang araw tuwing exam.",
    remindMeAt: "Paalalahanan ako sa",
    deviceNote:
      "Galing ang paalala sa device na ito, kaya lalabas lang ito sa araw na binuksan mo ang Tuón. Malaki ang maitutulong ng pag-install nito sa home screen mo.",
    unsupported: "Hindi makapagpakita ng paalala ang browser na ito.",
    blocked:
      "Hinarang ng browser mo ang mga notification. Pwede mo itong payagan sa site settings.",
    set: (time: string) => `Nakatakda ang paalala sa ${time}.`,
    cardsReady: (count: number) => `${count} kard ang handa nang i-review.`,
  },

  examDate: {
    label: "Petsa ng exam",
    yourExam: "Ang exam mo",
    countdown: (subject: string, days: number) =>
      `${subject} sa loob ng ${days} araw — walang kard na iiskedyul lampas dito.`,
    passed:
      "Lumipas na ang petsang iyon. Bumalik na sa normal na iskedyul ang mga review; alisin ang laman ng field o itakda ang susunod.",
    hint: "Opsyonal. Itakda ito at babalikan ang bawat kard nang hindi bababa sa isang beses bago ang petsa, na humihigpit ang agwat habang papalapit. Kung wala nito, ang kard na alam na alam mo ay pwedeng maiskedyul nang ilang buwan — lampas sa exam.",
  },

  security: {
    title: "Account at seguridad",
    emailAddress: "Email address",
    verified: "Na-verify",
    notVerified: "Hindi pa na-verify",
    resend: "Ipadala ulit",
    change: "Palitan",
    newEmail: "Bagong email address",
    emailPlaceholder: "juan@example.com",
    currentPassword: "Kasalukuyang password mo",
    googleReauth:
      "Hihilingin sa iyong mag-sign in muli gamit ang Google para kumpirmahin.",
    emailChangeNote:
      "Magpapadala muna kami ng link sa bagong address. Magbabago lang ang email mo kapag pinindot mo ito, kaya hindi ka mai-lock out ng isang typo.",
    sendConfirmation: "Ipadala ang kumpirmasyon",
    confirmationSent:
      "Tingnan ang bagong address mo para sa link ng kumpirmasyon. Magbabago ang email mo kapag pinindot mo ito.",
    verificationFailed:
      "Hindi maipadala ang email na iyon. Subukan ulit sa loob ng isang minuto.",
    alreadyVerified: "Na-verify na ang address na ito.",
    verificationSent:
      "Naipadala ang verification email. Tingnan ang inbox at spam folder mo.",
    password: "Password",
    passwordHint: "Palitan ito kung sa tingin mo ay may ibang nakakaalam nito.",
    currentPasswordLabel: "Kasalukuyang password",
    newPassword: "Bagong password",
    passwordPlaceholder: "Hindi bababa sa 6 na karakter",
    updatePassword: "I-update ang password",
    passwordChanged: "Napalitan ang password.",
    googleOnly:
      "Nag-sign in ka gamit ang Google, kaya walang password sa Tuón na papalitan. Pamahalaan ito sa Google Account mo.",
    signOutEverywhere: "Mag-sign out sa lahat ng lugar",
    signOutEverywhereHint:
      "Tinatapos ang bawat session, pati ang computer lab na nakalimutan mong sign-outan. Masi-sign out ka rin dito.",
    signedOutEverywhere:
      "Naka-sign out na sa lahat. Sini-sign out ka na rin dito.",
    signOutFailed: "Hindi ma-sign out ang ibang device mo. Subukan ulit.",
    noEmail: "Walang email address ang account na ito.",
    error: {
      wrongPassword: "Mali ang password na iyon.",
      emailInUse: "May ibang account nang gumagamit ng email address na iyon.",
      invalidEmail: "Mukhang hindi wastong email address iyon.",
      weakPassword: "Gumamit ng password na hindi bababa sa 6 na karakter.",
      recentLogin: "Mag-sign in ulit, tapos subukan muli.",
      tooManyRequests:
        "Masyadong maraming pagsubok. Maghintay sandali at subukan ulit.",
      cancelled: "Kinansela ang pag-sign in.",
      unknown: "May naging problema.",
    },
  },

  data: {
    title: "Ang datos mo",
    intro: "Sa iyo ang lahat ng nandito. Tingnan ang",
    privacyNotice: "Paunawa sa Privacy",
    introTail: "para sa kung ano ang hawak namin at bakit.",
    downloadTitle: "I-download ang datos mo",
    downloadHint:
      "Profile, nota, study set, at review history bilang isang JSON file.",
    download: "I-download",
    downloaded: "Na-download na ang datos mo.",
    exportFailed: "Nabigo ang export.",
    deleteTitle: "Burahin ang account mo",
    deleteHint:
      "Tinatanggal ang mga nota, study set, at review history mo. Hindi na mababawi.",
    deleteBody:
      "Buburahin nito ang profile mo, bawat nota, bawat study set, at ang buong review history mo. Hindi na ito maibabalik, at hindi na mabubuo muli ang progreso mo sa spaced repetition.",
    downloadFirst: "I-download muna ang datos mo kung gusto mo itong itago.",
    typeToConfirmBefore: "I-type ang",
    typeToConfirmAfter: "para kumpirmahin",
    yourPassword: "Password mo",
    googleReauth:
      "Hihilingin sa iyong mag-sign in muli gamit ang Google para kumpirmahin.",
    deletePermanently: "Burahin nang tuluyan",
    deleted: "Nabura na ang account mo at lahat ng datos nito.",
    deleteFailed: "Hindi mabura ang account mo.",
  },

  billing: {
    freePlan: "Libreng plan",
    planName: (name: string) => `Tuón ${name}`,
    included: (count: number) =>
      `${count} AI study set kada buwan. Palaging walang limitasyon ang mga nota, PDF import, at flashcard na ikaw ang gumawa.`,
    paymentFailed: "Hindi natuloy ang huling bayad mo.",
    graceOneDay: "isa pang araw",
    graceDays: (days: number) => `${days} pang araw`,
    graceBody: (window: string) =>
      `Mananatili sa iyo ang lahat sa loob ng ${window} habang inaayos mo ito. Walang mabubura sa alinmang paraan — pagkatapos niyon, babalik lang sa libreng limitasyon ang account.`,
    cancelledUntil: (plan: string, date: string) =>
      `Kinansela. Sa iyo pa rin ang ${plan} hanggang ${date}.`,
    renews: (date: string) => `Magre-renew sa ${date}.`,
    usedThisMonth: "Nagamit ngayong buwan",
    resets: (explainer: string, date: string) =>
      `Ang isang study set ay ${explainer}. Magre-reset sa ${date}.`,
    upgrade: "Mag-upgrade",
    monthly: "Buwanan",
    yearly: "Taunan",
    annualDeal: (months: number) =>
      `Magbayad ng ${months} buwan, makakuha ng 12.`,
    perYear: "taon",
    perMonth: "buwan",
    choose: (plan: string) => `Piliin ang ${plan}`,
    payWith:
      "Magbayad gamit ang GCash, Maya, o card. Pwede kang mag-cancel anumang oras — walang naisulat mo ang nabubura kapag natapos ang isang plan.",
    notLive:
      "Hindi pa live ang mga bayad. Sandali lang — patuloy na gagana ang libreng plan mo.",
    checkoutFailed: "Hindi masimulan ang checkout.",
    confirmingTitle: "Salamat — kinukumpirma namin ang bayad mo.",
    confirmingBody:
      "Mag-a-update dito ang plan mo pagkatapos itong ma-clear, kadalasan sa loob ng ilang segundo.",
    checkoutCancelled: "Kinansela ang checkout. Walang siningil.",
  },

  plans: {
    free: {
      tagline: "Sapat para sa reviewer ng isang subject kada buwan.",
      features: [
        "5 AI study set kada buwan",
        "Walang limitasyong nota, PDF import, at sarili mong flashcard",
        "Spaced repetition na may typed recall at hint",
        "May-oras na test mula sa pinakamahina mong kard",
        "Mga deadline, iskedyul, Pomodoro, at study log",
        "Pribadong study group kasama ang klase mo",
        "Mag-import at mag-export ng nota bilang Markdown",
      ],
    },
    plus: {
      tagline:
        "Buong course load — anim na subject, dalawang beses sa isang linggo.",
      features: [
        "50 AI study set kada buwan",
        "Mga notang hanggang 60,000 karakter",
        "I-export ang study set sa Anki, CSV, o PDF",
        "Retention stats — kung ano ang malilimutan mo na",
        "Mag-share ng set sa link kasama ang mga blockmate mo",
        "Lahat ng nasa Free",
      ],
    },
    pro: {
      tagline: "Para sa finals week, thesis season, at board review.",
      features: [
        "120 AI study set kada buwan — mga apat sa isang araw",
        "Mga notang hanggang 120,000 karakter",
        "Priority generation — walang paghihintay sa pagitan ng mga set",
        "Lahat ng nasa Plus",
      ],
    },
  },

  palettes: {
    terracotta: {
      label: "Terracotta",
      hint: "Mainit na luad at cream — ang orihinal",
    },
    indigo: {
      label: "Indigo",
      hint: "Malamig at tahimik, para sa pag-aaral sa gabi",
    },
    forest: {
      label: "Forest",
      hint: "Malalim na berde, magaan sa mata sa mahabang session",
    },
    plum: { label: "Plum", hint: "Malamlam na lila na may mainit na abo" },
    slate: {
      label: "Slate",
      hint: "Halos walang kulay — walang nakikipagtagisan sa nota mo",
    },
  },

  quiz: {
    title: "Quiz",
    exit: "Lumabas sa quiz",
    noneYet: "Wala pang quiz",
    noneYetHint: "Walang tanong sa quiz ang study set na ito.",
    backToSet: "Balik sa set",
    progress: (index: number, total: number) => `${index} / ${total}`,
    correctAnswer: "— tamang sagot",
    yourAnswerWrong: "— sagot mo, mali",
    seeResults: "Tingnan ang resulta",
    nextQuestion: "Susunod na tanong",
    worthAnotherLook: "Sulit balikan",
    perfect: "Perpekto. Tama lahat ng tanong.",
    reviewFlashcards: "I-review ang flashcards",
    retake: "Ulitin ang quiz",
    savingResult: "Sine-save ang resulta…",
    flawless: "Walang mali",
    solid: "Matatag",
    gettingThere: "Papalapit na",
    needsAnotherPass: "Kailangan pa ng isang balik",
    worthRestudying: "Sulit balikan ang nota",
  },

  test: {
    title: "Test",
    leave: "Umalis sa test",
    noneYet: "Wala pang mate-test",
    noneYetHint:
      "Walang flashcard ang set na ito, kaya walang mapagkukunan ng test.",
    backToSet: "Balik sa set",
    briefTitle: (questions: number, minutes: number) =>
      `${questions} tanong, ${minutes} minuto`,
    brief:
      "Kinuha mula sa mga kard na pinakamahina ka, hindi sa mga paborito mo. May tinype, may multiple choice. Tumatakbo pa rin ang orasan kahit lumipat ka ng tab, at ang hindi mo naabot ay bibilangin bilang mali — gaya ng ginagawa ng tunay na exam.",
    briefSchedule:
      "Ina-update ng bawat sagot ang review schedule mo, kaya hindi ito praktis na pwede mong itapon.",
    start: "Simulan ang test",
    underTime: (percent: number) => `${percent}% sa loob ng oras`,
    savingSchedule: " · sine-save ang iskedyul mo…",
    scheduleUpdated: " · na-update na ang iskedyul mo",
    worthAnotherLook: "Sulit balikan",
    dueSooner: "Mas maaga na ulit ang due ng mga ito.",
    youPut: (answer: string) => `Inilagay mo “${answer}”`,
    markedMissed: "Minarkahan mong hindi mo ito nasagot",
    notReached: "Hindi naabot bago maubos ang oras",
    takeAnother: "Sumagot pa ng isa",
    position: (index: number, total: number) => `${index} sa ${total}`,
    yourAnswer: "Sagot mo",
    forgiving: "Pinapatawad ang spelling at ayos ng salita.",
    finish: "Tapusin",
    next: "Susunod",
    answerInYourHead: "Sagutin sa isip mo, tapos i-check ang sarili mo.",
    showAnswer: "Ipakita ang sagot",
    missedIt: "Hindi ko nakuha",
    hadIt: "Nakuha ko",
  },

  cardFeedback: {
    thanks: "Salamat — titingnan namin ang kard na ito.",
    failed: "Hindi maipadala iyon sa ngayon.",
    reported: "Naisumbong bilang masamang kard",
    report: "Isumbong na mali ang kard na ito",
    reportedShort: "Naisumbong",
    somethingWrong: "May mali ba sa kard na ito?",
  },

  report: {
    action: "Isumbong",
    title: "Isumbong ang study set na ito",
    body: "Sabihin sa amin kung ano ang mali rito. Binabasa namin ang bawat sumbong; hindi kami basta kumikilos dito nang kusa.",
    notStudyMaterial: "Hindi pang-aral na materyal",
    harassment: "Pambu-bully o panliligalig",
    copyright: "Kinopya mula sa libro o bayad na kurso",
    personalInformation: "May personal na detalye ng iba",
    other: "Iba pa",
    anythingElse: "May iba pa? (opsyonal)",
    detailPlaceholder: "Ano ang dapat naming tingnan?",
    send: "Ipadala ang sumbong",
    thanks: "Salamat — titingnan namin.",
    failed: "Hindi maipadala ang sumbong na iyon. Subukan ulit.",
  },

  stats: {
    title: "Retention",
    subtitle:
      "Kung ano ang hitsura ng iskedyul mo, at aling kard ang nadudulas.",
    keepForgetting: "Paulit-ulit na nakakalimutan",
    failedRepeatedly: "kard na paulit-ulit mong namali",
    nothingTroubling: "walang nagpapahirap sa iyo",
    dueNow: "Due na",
    waitingForYou: "naghihintay sa iyo",
    allCaughtUp: "wala nang naiwan",
    mature: "Matured",
    matureHint: "babalik pagkalipas ng isang buwan o higit pa",
    nextTwoWeeks: "Susunod na dalawang linggo",
    perDay: "Ilang kard ang babalik bawat araw.",
    chart: "Tsart",
    table: "Talahanayan",
    whereCardsAre: "Nasaan ang mga kard mo",
    whereCardsAreHint:
      "Gumagalaw ang bawat kard mula kaliwa pakanan habang naaalala mo ito.",
    maturity: {
      new: "Hindi pa nakikita",
      learning: "Natututo pa",
      young: "Bata pa",
      matureStage: "Matured",
      newHint: "wala pang review",
      learningHint: "babalik sa loob ng isang linggo",
      youngHint: "1 hanggang 4 na linggo pa",
      matureHint: "isang buwan o higit pa",
    },
    stageCount: (label: string, count: number) => `${label}: ${count}`,
    atRiskTitle: "Mga kard na paulit-ulit mong nakakalimutan",
    atRiskHint: (ease: string) =>
      `Bumaba ang ease sa ilalim ng ${ease} — kadalasan tanda ito na masyadong marami ang ginagawa ng kard. Isipin mong hatiin ito.`,
    ease: (value: string) => `ease ${value}`,
    overdue: "lampas na",
    late: "huli",
    today: "ngayon",
    tableCaption: "Mga kard na due kada araw sa susunod na dalawang linggo",
    day: "Araw",
    cardsDue: "Kard na due",
    overdueRow: "Lampas na",
    todayRow: "Ngayon",
    noHistory: "Wala pang review history",
    noHistoryHint:
      "Mag-review ng ilang kard at mapupuno ito — kung ano ang malilimutan mo na, at kung gaano kabigat ang linggong darating.",
    startReviewing: "Simulan ang review",
    makeASet: "Gumawa ng study set",
    lockedTitle: (plan: string) => `Bahagi ng ${plan} ang retention stats`,
    lockedBody: (php: number) =>
      `Tingnan kung aling kard ang paulit-ulit mong nakakalimutan at kung gaano kabigat ang linggong darating, mula ₱${php} kada buwan.`,
    seePlans: "Tingnan ang mga plan",
  },

  graph: {
    title: "Graph",
    summary: (notes: number, links: number) =>
      `${notes} konektadong nota · ${links} link`,
    subtitle: "Kung paano magkakaugnay ang mga nota mo.",
    noneYet: "Wala pang naka-link",
    hintBefore: "I-type ang",
    hintAfter:
      "sa loob ng nota para i-link ito sa iba. Ang mga konseptong nagkokonekta sa iba't ibang subject ay lalabas dito bilang mapa.",
    openNotes: "Buksan ang mga nota mo",
    writeFirst: "Isulat ang unang nota mo",
  },

  firstRun: {
    heading: "Gawin natin ang unang study set mo",
    body: (creature: string) =>
      `I-paste ang isang pahina ng nota. Gagawin itong flashcards at practice quiz ni ${creature}, tapos ibabalik ang bawat kard bago mo pa ito makalimutan.`,
    companion: (creature: string) => `${creature}, ang kasama mo sa pag-aaral`,
    createFirst: "Gumawa ng unang nota mo",
    aboutAMinute: "Mga isang minuto, at walang kailangang i-install.",
    step: (n: number) => `Hakbang ${n}`,
    steps: [
      {
        title: "I-paste ang notes mo",
        body: "Lecture notes, sipi mula sa libro, o ang sulat-kamay mong reviewer na na-type na.",
      },
      {
        title: "Gumawa ng study set",
        body: "Flashcards at practice quiz, isinulat mula sa materyal mo at wala nang iba.",
      },
      {
        title: "Mag-review sa iskedyul",
        body: "Babalik ang bawat kard bago mo pa ito makalimutan.",
      },
    ],
    whatComesOut: "Ano ang lalabas",
    yourNote: "Nota mo",
    sampleNote:
      "“Nagaganap ang light-dependent reactions sa thylakoid membrane. Hinahati ang tubig, naglalabas ng O₂, at naiimbak ang enerhiya bilang ATP at NADPH…”",
    sampleCardIndex: "Kard 3 sa 12",
    sampleFront: "Saan nagaganap ang light-dependent reactions?",
    sampleBack: "Sa thylakoid membrane ng chloroplast.",
    sampleNext: "Susunod na review sa loob ng 6 na araw",
  },

  banners: {
    quotaTitle: "Mga study set",
    quotaUsedUp: (date: string) => `Naubos na. Magre-reset sa ${date}.`,
    quotaLeft: (left: number, date: string) =>
      `${left} ang natitira ngayong buwan · magre-reset sa ${date}`,
    quotaUpgrade: (perMonth: number, php: number) =>
      `Kumuha ng ${perMonth} kada buwan sa ₱${php}`,
    confirmEmail:
      "Kumpirmahin ang email mo para makapagsimulang gumawa ng study set.",
    confirmEmailRest: "Gumagana naman ang lahat ng iba pa habang naghihintay.",
    checking: "Tinitingnan…",
    confirmedIt: "Nakumpirma ko na",
    sending: "Ipinapadala…",
    resend: "Ipadala ulit",
    dismiss: "Isara",
    stillNotConfirmed:
      "Hindi pa rin nakumpirma. Buksan muna ang link sa email.",
    sendFailed:
      "Hindi maipadala sa ngayon. Subukan ulit sa loob ng isang minuto.",
    alreadyVerified: "Na-verify na ang address na ito.",
    sentTo: (email: string) =>
      `Naipadala sa ${email}. Tingnan ang spam kung hindi ito dumating.`,
    offline: "Walang koneksyon — pwede ka pa ring mag-review.",
    offlineRest:
      "Naka-save sa device na ito ang mga rating mo at magsi-sync pagbalik ng koneksyon.",
  },

  auth: {
    signupHeading: "Simulan ang mas matalinong pag-aaral",
    loginHeading: "Maligayang pagbabalik",
    signupSub:
      "Gawing flashcards at quiz ang notes mo sa klase sa loob ng ilang segundo.",
    loginSub: "Ituloy kung saan ka huminto.",
    email: "Email",
    emailPlaceholder: "juan@example.com",
    password: "Password",
    forgot: "Nakalimutan ang password?",
    newPasswordPlaceholder: "Hindi bababa sa 6 na karakter",
    passwordPlaceholder: "Password mo",
    creatingAccount: "Ginagawa ang account…",
    signingIn: "Nagsa-sign in…",
    createAccount: "Gumawa ng account",
    signIn: "Mag-sign in",
    or: "o",
    continueWithGoogle: "Magpatuloy gamit ang Google",
    termsBefore: "Sa paggawa ng account, sumasang-ayon ka sa aming",
    terms: "Mga Tuntunin ng Paggamit",
    termsAnd: "at",
    privacy: "Paunawa sa Privacy",
    termsAfter:
      ". Kung wala ka pang 18, basahin ito kasama ang magulang o tagapag-alaga mo.",
    haveAccount: "May account ka na? ",
    newHere: "Bago sa Tuón? ",
    createOne: "Gumawa ng isa",
    aside: {
      meaning:
        "Ang “Tuón” ay nangangahulugang mag-aral — ibigay ang buong atensyon mo sa isang bagay.",
      body: "I-paste ang notes mo sa klase. Makakuha ng flashcards at practice quiz sa ilang segundo, tapos i-review ang mga ito sa iskedyul na naglalagay ng bawat kard sa harap mo bago mo pa ito makalimutan.",
      cardsPerNote: "flashcard kada nota",
      spacedRepetition: "spaced repetition",
      strandsBuiltIn: "nakapaloob ang SHS strands",
    },
    reset: {
      heading: "Nakalimutan ang password mo?",
      body: "I-type ang email na ginamit mo sa pag-sign up at magpapadala kami ng link para makagawa ka ng bago.",
      send: "Ipadala ang reset link",
      sending: "Ipinapadala…",
      backToSignIn: "Balik sa pag-sign in",
      sentHeading: "Tingnan ang email mo",
      sentBodyBefore: "Kung may account para sa",
      sentBodyAfter:
        ", papadala na ang link para makagawa ng bagong password. Mag-e-expire ito sa loob ng isang oras.",
      sentSpam:
        "Walang dumating pagkaraan ng ilang minuto? Tingnan ang spam, at siguraduhing tama ang address na ginamit mo sa pag-sign up.",
      differentAddress: "Gumamit ng ibang address",
    },
    error: {
      weakPassword: "Gumamit ng password na hindi bababa sa 6 na karakter.",
      noMatch: "Walang account na tumutugma sa email at password na iyon.",
      emailInUse:
        "May account nang gumagamit ng email na iyon. Subukang mag-log in na lang.",
      invalidEmail: "Mukhang hindi wastong email address iyon.",
      tooManyRequests:
        "Masyadong maraming pagsubok. Maghintay sandali at subukan ulit.",
      tooManyResets:
        "Masyadong maraming pagsubok. Maghintay ng ilang minuto at subukan ulit.",
      network:
        "Hindi maabot ang network. Tingnan ang koneksyon mo at subukan ulit.",
      popupBlocked:
        "Hinarang ng browser mo ang Google sign-in window. Payagan ang pop-up at subukan ulit.",
      differentMethod:
        "May account ka na sa email na ito gamit ang ibang paraan ng pag-sign in.",
      unauthorizedDomain:
        "Hindi awtorisado ang address na ito para sa pag-sign in. Kung nagbukas ka ng preview o deployment link, gamitin ang pangunahing address ng site.",
      notAllowed:
        "Hindi pinagana ang paraang iyon ng pag-sign in para sa app na ito.",
      sessionExpired: "Hindi na wasto ang session na iyon. Mag-sign in ulit.",
      resetFailed: "Hindi maipadala ang email sa ngayon. Subukan ulit.",
      unknown: "May naging problema. Subukan ulit.",
    },
  },

  onboarding: {
    step: (n: number) => `Hakbang ${n}`,
    progress: (n: number, total: number) => `${n} / ${total}`,
    loading: "Naglo-load",
    back: "Balik",
    saving: "Sine-save…",
    finish: "Tapusin ang setup",
    continue: "Magpatuloy",
    saveFailed: "Hindi ma-save ang setup mo. Subukan ulit.",
    nameTitle: "Ano ang itatawag namin sa iyo?",
    nameSub: (creature: string) => `Ganito ka babatiin ni ${creature}.`,
    displayName: "Pangalang ipapakita",
    namePlaceholder: "Juan",
    levelTitle: "Saan ka nag-aaral?",
    levelSub:
      "Binabago nito kung paano namin ita-tag ang mga nota mo at kung paano isusulat ang flashcards mo.",
    schoolTitle: "Saan ka nag-aaral?",
    schoolSub: "Para maayos ang mga set mo ayon sa taon ng pag-aaral mo.",
    school: "Eskwelahan",
    reviewCentrePlaceholder: "Ang review centre o eskwelahan mo",
    schoolPlaceholder: "Simulang i-type ang pangalan ng eskwelahan mo",
    schoolOptional:
      "Opsyonal — pwede mo itong iwanang blangko, at palitan anumang oras sa Settings.",
    strandTitle: "Anong track ang kinukuha mo?",
    strandSub: "Ipapakita namin ang mga subject na kasama nito.",
    subjectsTitle: "Anong mga subject ang kinukuha mo?",
    subjectsSub: "Pumili ng kahit ilan. Mababago mo ito mamaya.",
    notListed: "Wala sa listahan? Idagdag mo",
    subjectExample: "hal. Research in Daily Life 1",
    selected: (count: number) => `${count} ang napili`,
    examTitle: "Anong exam ang inirereview mo?",
    programTitle: "Anong kurso ang kinukuha mo?",
    examSub: "Ita-tag mo ang bawat subject sa bawat nota.",
    programSub:
      "Ang degree program mo. Ita-tag mo ang bawat subject sa bawat nota.",
    examExample: "hal. Geodetic Engineering",
    programExample: "hal. BS Marine Biology",
    consentTitle: "Bago tayo magsimula",
    consentSub: "Dalawang mabilis na bagay, tapos ang unang study set mo.",
    agreeBefore: "Nabasa ko at sumasang-ayon ako sa",
    agreeAnd: "at",
    agreeAfter: ".",
    newTabHint: "Bubukas ito sa bagong tab — hindi mawawala ang setup mo.",
    ageQuestion: "18 anyos ka na ba o mas matanda?",
    adultYes: "Oo, 18 na ako o mas matanda",
    adultNo: "Hindi, wala pa akong 18",
    guardian:
      "May magulang o tagapag-alaga na kasama kong dumaan dito at pumapayag na hawakan ng Tuón ang mga nota at kasaysayan ng pag-aaral ko.",
    guardianHint: (email: string) =>
      `Pwede silang mag-email sa ${email} anumang oras para makita o mabura ang datos mo.`,
  },

  help: {
    title: "Paano gumagana ang Tuón",
    subtitle:
      "Ang buong app sa loob ng ilang minuto, at kung ano talaga ang ibig sabihin ng bawat salita sa screen.",

    loopTitle: "Ang siklo",
    loopBody:
      "Tatlong hakbang, at ang pangatlo ang tunay na gumagawa ng trabaho. Ang paggawa ng kard ay pakiramdam na pag-aaral; ang matanong nito makalipas ang isang linggo ay pag-aaral talaga.",
    loopSteps: [
      {
        title: "Magsulat o mag-paste ng nota",
        body: "Lecture notes, kabanatang ni-type mo, o PDF handout. Mas mainam ang isang nota kada paksa kaysa isa kada subject.",
        action: "Bagong nota",
        href: "/app/notes/new",
      },
      {
        title: "Gumawa ng study set",
        body: "Flashcards at practice quiz, isinulat mula sa nota mo at wala nang iba. Suriin ang mga ito — pwede mong isumbong ang kard na mali.",
        action: "Mga nota mo",
        href: "/app/notes",
      },
      {
        title: "Mag-review kapag tinanong ka ng Tuón",
        body: "Babalik ang bawat kard bago mo pa ito makalimutan. Mas mabuti ang sampung minuto kada araw kaysa tatlong oras kagabi bago ang exam.",
        action: "Mag-review",
        href: "/app/review",
      },
    ],

    ratingsTitle: "Ang apat na pindutan, at ang ginagawa nila",
    ratingsBody:
      "Ito ang isang bagay na sulit maintindihan nang maayos. Pagkatapos ng bawat kard, sasabihin mo kung kumusta — at ang sagot na iyon ang magdedesisyon kung kailan babalik ang kard. Maging tapat — ang pagbobola sa sarili ay naglalayo sa kard, na kabaligtaran ng gusto mo.",
    ratings: [
      {
        label: "Ulit",
        body: "Nablanko ka, o namali. Magre-reset ang kard at babalik mamaya sa parehong session.",
      },
      {
        label: "Mahirap",
        body: "Nakuha mo, pero nahirapan ka. Bahagyang lalaki ang agwat, at mas madali itong madulas sa susunod.",
      },
      {
        label: "Maayos",
        body: "Alam mo. Ito ang normal na sagot, at ang dapat mong pinakamadalas gamitin.",
      },
      {
        label: "Madali",
        body: "Agad, walang hirap. Biglang lalaki ang agwat. Gamitin nang matipid — ang sobrang paggamit nito ang dahilan kung bakit naiiskedyul ang mga kard lampas sa exam mo.",
      },
    ],
    ratingsFootnote:
      "Buksan ang “I-type muna ang sagot” sa settings at ang pag-type mo na ang gagradohan ng Tuón — pinapatawad ang spelling, ayos ng salita at accent.",

    wordsTitle: "Ano ang ibig sabihin ng mga salita",
    words: [
      {
        term: "Due",
        body: "Naubos na ang agwat ng kard at naghihintay na ito sa iyo ngayon.",
      },
      {
        term: "Mahina",
        body: "Sapat na ang dami ng pagkakamali mo sa kard na ito para isipin ng Tuón na nanganganib ito. Kadalasan ay masyadong marami ang ginagawa ng kard — isipin mong hatiin ito.",
      },
      {
        term: "Matured",
        body: "Naka-iskedyul ang kard nang isang buwan o higit pa. Ilang beses na itong nakayanan nang sunod-sunod.",
      },
      {
        term: "Mastery",
        body: "Kung gaano na kalayo ang isang buong set. Nagsasabi lang itong “Bihasa na” kapag walang hindi pa na-review at walang mahina — pwedeng mataas ang average ng set habang may itinatago itong apat na kard na paulit-ulit mong namamali.",
      },
      {
        term: "Readiness",
        body: "Tantiya kung gaano karami ang matatandaan mo pa sa isang araw, batay sa sarili mong iskedyul. Hindi ito hulang marka.",
      },
    ],

    modesTitle: "Review, quiz, o test?",
    modes: [
      {
        title: "Review",
        body: "Ang pang-araw-araw na gawi. Ang mga due na kard lang, isa-isa, at ginagalaw ng sagot mo ang iskedyul.",
      },
      {
        title: "Quiz",
        body: "Ang multiple-choice na tanong na kasama ng set. Mabuti para sa mabilisang pagsusuri; mas mababa ang halaga ng tamang sagot kaysa sa naalalang sagot, dahil isa sa apat ay hula.",
      },
      {
        title: "Test",
        body: "May oras, halo-halong porma, kinuha mula sa pinakamahina mong kard. Ang hindi mo naabot ay bibilangin bilang mali, gaya ng ginagawa ng exam. Napupunta sa iskedyul ang resulta.",
      },
    ],

    organiserTitle: "Ang linggo mo, at ang timer",
    organiserBody:
      "Nasa kalendaryo ang mga deadline, listahan ng gagawin at iskedyul ng klase mo, at nasa sidebar ang focus timer para sumunod ito sa iyo sa bawat screen. Pumili ng subject sa timer bago ka magsimula at ita-tag doon ang block — iyon ang pumupuno sa breakdown kada subject sa ilalim ng heatmap mo.",
    organiserAction: "Buksan ang kalendaryo",

    groupsTitle: "Mga study group",
    groupsBody:
      "Imbitasyon lang at pribado. Walang direktoryo at walang paraan para makahanap ng grupong hindi ka inimbitahan. Nakabatay ang standings sa XP mula sa mga kard na talagang naalala mo, hindi sa oras na naitala — walang kinikita ang pag-iwan ng timer.",
    groupsAction: "Mga grupo mo",

    subjectsTitle: "Mga subject at semester",
    subjectsBody:
      "I-tag ang nota o set sa isang subject at mabibilang ito sa subject na iyon saanman. Hatiin ang mga subject mo sa mga term sa Settings at ipapakita ng Tuón ang kinukuha mo ngayon, habang nananatili sa kinalalagyan nito ang gawa mo noong nakaraang term. Ang pag-alis ng subject ay hindi kailanman nagbubura — tinatanong muna nito kung saan dapat pumunta ang materyal.",
    subjectsAction: "Settings",

    exportTitle: "Pagkuha ng gawa mo palabas",
    exportBody:
      "Walang nakakulong dito. I-export ang buong note library mo bilang Markdown, ang study set sa Anki, spreadsheet o PDF na pwedeng i-print, at ang buong account mo bilang isang JSON file. Nakakaligtas ang [[wiki links]] sa buong biyahe, kaya bumabalik ang vault na buo ang graph.",
    exportAction: "Mga nota mo",

    troubleTitle: "Kung may mukhang mali",
    trouble: [
      {
        title: "Mali o masamang pagkakasulat ang kard",
        body: "Pindutin ang thumbs-down habang nire-review ito. Iyon lang ang senyas na naghihiwalay sa masamang kard at sa mahirap na kard, at magkaibang tugon ang kailangan ng dalawa.",
      },
      {
        title: "Walang due pero gusto mong mag-aral",
        body: "Ginagawa lang ng iskedyul ang trabaho nito. Sumagot na lang ng test — kinukuha nito ang pinakamahina mong materyal at binibilang pa rin.",
      },
      {
        title: "Mukhang nalilipat ang mga due date mo",
        body: "Tingnan ang time zone mo sa settings. Ito ang nagdedesisyon kung kailan itinuturing na due ang kard ngayon, at kapag mali ito, nalilipat ang bawat petsa nang walang anumang mukhang mali sa screen.",
      },
      {
        title: "Nag-aral ka offline o sa papel",
        body: "Idagdag ang oras nang manu-mano sa study log. Mas masama ang linggong nagsasabing zero kaysa sa walang log.",
      },
    ],

    contactTitle: "Hindi pa rin malinaw?",
    contactBody: (email: string) =>
      `Mag-email sa ${email} at may taong babasa nito.`,
    contactAction: "Magpadala ng email",
  },

  dashboardHelp: {
    title: "Bago ka rito, o gusto mo ng detalye?",
    body: "Kung paano nagdedesisyon ang iskedyul, ano ang ginagawa ng apat na pindutan, at ano ang ibig sabihin ng bawat salita sa screen.",
    action: "Paano gumagana ang Tuón",
  },

  marketing: {
    nav: {
      how: "Paano ito gumagana",
      local: "Gawa para dito",
      pricing: "Presyo",
      faq: "FAQ",
      signIn: "Mag-sign in",
      getStarted: "Magsimula",
      openMenu: "Buksan ang menu",
      closeMenu: "Isara ang menu",
    },

    hero: {
      dueLeft: (n: number) => `${n} kard ang dapat aralin`,
      tapToReveal: "I-tap para makita ang sagot",
      hoursMinutes: (h: number, m: number) => `${h}h ${m}m`,
      thisSession: "Ngayong sesyon",
      requeued: "Babalik bago ka matapos — para diyan ang Ulit.",
      interval: (days: number) =>
        days <= 0
          ? "Ngayon"
          : days === 1
            ? "Bukas"
            : days < 30
              ? `${days} araw`
              : `${Math.round(days / 30)} buwan`,
      scheduled: (days: number) =>
        days <= 1
          ? "Nakaiskedyul na — babalik bukas."
          : `Nakaiskedyul na — babalik sa loob ng ${days} araw.`,
      doneTitle: "Iyan ang buong proseso.",
      doneBody:
        "Anim na kard, mga apatnapung segundo. Ginagawa iyan ng Tuón gamit ang sarili mong notes, at siya na ang bahala kung kailan babalik ang bawat kard.",
      again: "Ulitin",
      badge: "Gawa para sa mga estudyanteng Pilipino",
      headline: "Epektibo ang cramming.",
      headlineAccent: " Sa loob ng mga tatlong araw.",
      body: "I-paste ang notes mo. Isusulat ng Tuón ang flashcards at practice quiz, tapos ibabalik ang bawat kard bago mo pa ito makalimutan — para ang reviewer na ginawa mo ngayong gabi ay gumagana pa rin sa susunod na semester.",
      startFree: "Magsimula nang libre",
      haveAccount: "May account na ako",
      freeForever: (count: number) =>
        `Habambuhay na libre ang mga nota at flashcard · ${count} AI study set kada buwan`,
      languages: "· Cebuano at Tagalog",
      meaning: "Mag-aral. Ibigay ang buong atensyon mo sa isang bagay.",
      haveAQuestion: "May tanong?",
      askTala: (creature: string) => `Tanungin si ${creature}`,
    },

    why: {
      eyebrow: "Bakit ka nakakalimot",
      title: "Tinatapon ng utak mo ang hindi na niya nakikita",
      body: "Hindi ito depekto, at hindi ito problema sa disiplina — ganito talaga gumana ang memorya. Anumang nakita mo nang minsan at hindi na muli ay nililinis. Ang solusyon ay hindi mas maraming oras kagabi bago ang exam; ito ay ang muling pagharap sa parehong kard habang nagsisimula pa lang itong madulas. Ang manu-manong pag-iiskedyul niyan ang bahaging walang nakakasunod.",
      aside:
        "Ang kard na tatlong linggo mo nang hindi nakikita ay tulog. Ginigising ito ng Tuón isang araw bago mo ito mawala.",
    },

    curve: {
      lead: "Panoorin itong mangyari sa isang kard. I-drag sa buong buwan.",
      question: "Ano ang ginagawa ng mitochondria?",
      answer:
        "Naglalabas ng enerhiya mula sa pagkain tungo sa anyong magagamit ng selula.",
      onceLabel: "Minsan lang inaral",
      reviewedLabel: "Nire-review kapag sinabi ng Tuón",
      recall: "ang matatandaan mo nito",
      dayLabel: (day: number) => (day === 0 ? "Ngayon" : `Araw ${day}`),
      today: "Ngayon",
      oneMonth: "Isang buwan",
      scrub: "Igalaw sa buong buwan",
      alt: "Ang parehong flashcard nang dalawang beses, sa loob ng isang buwan. Kaliwa, minsan lang inaral: lumalabo ang sagot sa loob ng ilang araw hanggang hindi na mabasa, nagtatapos sa halos 1 sa 10. Kanan, nire-review sa iskedyul ng Tuón: nananatiling malinaw ang sagot buong buwan, may apat na review na nakamarka.",
      fourReviews: "Apat na review. Mga anim na minuto lahat-lahat.",
      wholeDifference: "Iyan ang buong pagkakaiba ng dalawang kard na ito.",
      source:
        "Batay sa forgetting curve na unang sinukat ni Hermann Ebbinghaus noong 1885 at paulit-ulit nang naipakita mula noon. Iginuhit para ipakita ang mekanismo — hindi ito sukat ng mga gumagamit ng Tuón.",
    },

    how: {
      eyebrow: "Paano ito gumagana",
      title: "Mula sa nota hanggang sa alam mo na, sa tatlong hakbang",
      step: (n: number) => `Hakbang ${n}`,
      answer: "Sagot",
      ratings: ["Ulit", "Mahirap", "Maayos", "Madali"],
      nextDue: "Susunod mong makikita ang kard na ito: sa loob ng 6 na araw.",
      steps: [
        {
          title: "I-paste ang notes mo",
          body: "Lecture notes, sipi mula sa libro, o ang sulat-kamay mong reviewer na na-type na. I-tag ito sa isang subject para maayos ang lahat.",
        },
        {
          title: "Gumawa ng study set",
          body: "Isang pindot lang at makakakuha ka ng 8 hanggang 15 flashcard at 5-tanong na practice quiz, isinulat mula sa materyal mo at wala nang iba.",
        },
        {
          title: "Mag-review sa iskedyul",
          body: "I-rate ang bawat kard ng Ulit, Mahirap, Maayos o Madali. Ang SM-2 algorithm ang magdedesisyon kung kailan mo ito susunod na makikita, kaya mas kaunti ang pag-aaral at mas marami ang natatandaan.",
        },
      ],
    },

    versus: {
      eyebrow: "Kumpara sa manu-mano",
      title: "Marunong ka nang gumawa ng reviewer",
      body: "Long bond paper, apat na kulay ng panulat, isang gabing nawala. Gumagana ito — tapos matatapos ang exam at mapupunta ito sa basurahan. Narito ang parehong trabaho, ginawa sa ibang paraan.",
      byHand: "Manu-mano",
      withTuon: "Gamit ang Tuón",
      rows: [
        {
          label: "Paggawa ng reviewer mula sa isang kabanata",
          byHand: "Isang gabi, at lalong pumapangit ang sulat mo",
          tuon: "Mga labing-isang segundo",
        },
        {
          label: "Pag-alam kung ano ang aaralin ngayong gabi",
          byHand: "Kung ano man ang pinaka-hindi mo sigurado",
          tuon: "Ang eksaktong mga kard na due",
        },
        {
          label: "Ang linggo pagkatapos ng exam",
          byHand: "Bond paper sa basurahan, at wala na",
          tuon: "Naka-iskedyul pa rin, sa iyo pa rin",
        },
        {
          label: "Paghahanap ulit sa isang paksa",
          byHand: "Nagbubuklat sa notebook",
          tuon: "Search, tags, at mga naka-link na nota",
        },
        {
          label: "Ang gastos",
          byHand: "Panulat, papel, photocopy",
          tuon: "Libre para sa limang study set kada buwan",
        },
      ],
    },

    devices: {
      eyebrow: "Bawat device na meron ka",
      title: "Buksan ito kahit ano ang nasa harap mo",
      body: "Tumatakbo ang Tuón sa browser, kaya walang i-i-install at walang isa-sideload. Mag-review sa telepono mo habang nasa jeep, magsulat ng nota sa desktop ng library — pareho ang iskedyul mo sa dalawa, dahil nasa account mo ito at hindi sa device.",
      desktopCaption: "Stats sa desktop ng library",
      tabletCaption: "Mga nota at ang kanilang ugnayan",
      phoneCaption: "Nagre-review sa jeep",
      nav: [
        "Home",
        "Nota",
        "Study sets",
        "Kalendaryo",
        "Tanungin si Tala",
        "Grupo",
        "Graph",
        "Retention",
      ],
      planStep: "I-review ang General Chemistry 1",
      planDetail: "12 kard · pinakamahinang asignatura",
      due: [
        { title: "Gen Chem long quiz", when: "Ngayon" },
        { title: "Bio lab report", when: "Bukas" },
      ],
      notes: [
        {
          title: "Le Chatelier's Principle",
          subject: "General Chemistry 1",
          excerpt:
            "Kapag naistorbo ang sistemang nasa equilibrium, lilipat ito…",
          chars: "2,840 na karakter",
        },
        {
          title: "Enzyme kinetics",
          subject: "General Biology 1",
          excerpt: "Inilalarawan ng Michaelis–Menten ang bilis ng reaksyon…",
          chars: "1,930 na karakter",
        },
        {
          title: "Limits and continuity",
          subject: "Pre-Calculus",
          excerpt: "Inilalarawan ng limit kung saan papunta ang function…",
          chars: "2,110 na karakter",
        },
      ],
      tapToFlip: "I-tap para makita ang sagot",
      inTheWorks: "GINAGAWA PA",
      nativeTitle: "Paparating na ang native apps sa iPhone at Android",
      nativeBody:
        "Offline na review at icon sa home screen, nang hindi isinusuko ang web version. Hindi mo kailangang maghintay — gumagana na sa browser mo ngayon ang lahat ng nasa itaas.",
      soonOn: "Malapit nang nasa",
    },

    local: {
      eyebrow: "Gawa para dito",
      title: "Alam na nito ang kurikulum mo",
      body: "Karamihan sa study app ay gawa para sa mga klase sa Amerika tapos isinalin. Nagsisimula ang Tuón sa Philippine K-12 system, kaya tatlong pindot lang ang pag-set up sa halip na i-type ang bawat subject nang mag-isa.",
      points: [
        "Nakapaloob ang Senior High strands — STEM, ABM, HUMSS at GAS, kasama ang tamang subject sa bawat isa",
        "Handa nang piliin ang core subjects tulad ng General Mathematics, Earth and Life Science at Oral Communication",
        "Mga kursong pangkolehiyo mula BS Nursing hanggang AB Communication, na may puwang para sa sarili mong idagdag",
        "Itinuturing na pangunahing subject ang paghahanda sa UPCAT, ACET at DCAT",
        "Nananatili kung paano mo isinulat ang mga notang naghahalo ng Ingles at Tagalog o Cebuano",
      ],
      setupTitle: "Tatlong tanong at nag-aaral ka na.",
      yourSchool: "Ang eskwelahan mo",
      schoolHint:
        "I-type ang kahit ano — hindi kailangang nasa listahan ang eskwelahan mo.",
      yourStrand: "Ang strand mo",
      strandHint: "Kolehiyo ba? Dito ka pipili ng degree program.",
      yourSubjects: "Ang mga subject mo",
      addYourOwn: "+ Idagdag ang sarili mo",
      subjectsHint:
        "Bawat nota at set ay naka-tag sa isa, kaya walang mapagpapalit.",
    },

    pricing: {
      eyebrow: "Presyo",
      title: "Nakapreso sa piso, at tapat ang limitasyon",
      bodyBefore: "Ang isang",
      studySet: "study set",
      bodyAfter: (explainer: string) =>
        `ay ${explainer}. Walang limitasyon sa lahat ng plan — pati sa Free — ang pagsusulat ng nota, pag-import ng PDF, paggawa ng sariling flashcard, at ang buong review schedule.`,
      billingPeriod: "Panahon ng pagbabayad",
      monthly: "Buwanan",
      yearly: (freeMonths: number) => `Taunan · ${freeMonths} buwang libre`,
      mostPopular: "Pinakasikat",
      perMonth: "/buwan",
      billedAnnually: (total: string) =>
        `₱${total} na sisingilin minsan sa isang taon.`,
      soon: "(malapit na)",
      startFree: "Magsimula nang libre",
      comingSoon: "Malapit na",
      footnote:
        "Bakit bilang sa halip na “walang limitasyon”: totoong pera ang gastos namin sa paggawa ng bawat study set. Mas mabuti ang limitasyong kaya naming tuparin kaysa sa pangakong walang limitasyon na tahimik naming babagalan. Bilang gabay, ang estudyanteng may anim na subject na gumagawa ng reviewer sa bawat isa dalawang beses sa isang linggo ay gumagamit ng mga 48 kada buwan.",
    },

    faq: {
      eyebrow: "Mga tanong",
      title: "Ang unang itinatanong ng mga tao",
      items: [
        {
          q: "Libre ba talaga?",
          a: "Oo, at hindi trial ang libreng plan. Makakakuha ka ng {count} AI study set kada buwan, habambuhay. Walang limitasyon sa lahat ng plan ang pagsusulat ng nota, pag-import ng PDF, paggawa ng sariling flashcard, at ang buong review schedule — ang tanging may bayad ay ang AI na gumagawa ng kard mula sa nota, dahil iyon lang ang may gastos sa amin.",
        },
        {
          q: "Ano ang mangyayari kapag naabot ko ang buwanang limitasyon?",
          a: "Hihinto ang paggawa hanggang sa ika-1. Walang ibang magbabago: patuloy na gumagana ang bawat nota, kard at review na meron ka na, at tumutuloy ang iskedyul. Pwede ka pa ring gumawa ng sariling flashcard nang walang limitasyon.",
        },
        {
          q: "Sino ang nakakakita ng mga nota ko?",
          a: "Ikaw lang. Naka-off ang pag-share bilang default at kada study set — buksan ito at makikita ng kahit sinong may link ang mga kard na iyon; patayin ito at agad na hihinto ang access. Hindi kailanman ibinabahagi ang mga nota at review history mo. Detalyado sa {link} kung ano ang hawak namin at sino ang nagpoproseso nito.",
          linkHref: "/privacy",
          linkLabel: "paunawa sa privacy",
        },
        {
          q: "Ipinapadala ba ang nota ko sa isang kompanya ng AI?",
          a: "Ipinapadala ang teksto ng nota sa Anthropic kapag — at kapag lang — pinindot mo ang Generate. Hindi ipinapadala ang pangalan, email, at review history mo. Walang ipinapadala habang nagsusulat o nagre-review ka lang, at binabasa ang mga PDF sa browser mo at hindi kailanman ina-upload.",
        },
        {
          q: "Nagkakamali ba ang mga flashcard?",
          a: "Minsan, oo. Ang AI ay gumagawa lamang mula sa nota mo, kaya kung may mali ang nota, uulitin ito ng mga kard — at tulad ng anumang AI, minsan ay tiwala itong nagkakamali nang mag-isa. Suriin sa textbook mo ang anumang mahalaga. Pantulong ito sa pag-aaral, hindi pinagmumulan ng katotohanan.",
        },
        {
          q: "Pwede ko ba itong gamitin sa UPCAT o board review?",
          a: "Iyan ang pinakamagaling na gawin ng spaced repetition. Nakapaloob na sa setup ang mga subject sa entrance exam kasama ng strand mo, at ang iskedyul ay ginawa para sa materyal na kailangan mong tandaan nang ilang buwan sa halip na hanggang Biyernes.",
        },
        {
          q: "Gumagana ba ito offline?",
          a: "Ang pag-review, oo. Hindi libre ang data at hindi maaasahan ang wifi sa campus, kaya patuloy na gumagana nang walang koneksyon ang mga kard na meron ka na at nagsi-sync ang mga rating mo pagbalik nito. Kailangan ng network sa paggawa ng bagong study set, dahil sa server nangyayari ang bahaging iyon.",
        },
        {
          q: "Ano ba talaga ang isang study set?",
          a: "Ang isang study set ay {explainer}.",
        },
        {
          q: "Ano ang pinagkaiba nito sa Quizlet o Anki?",
          a: "Mas magaling mag-iskedyul ang Anki pero kilala itong mahirap simulan; mas madaling simulan ang Quizlet pero paliit nang paliit ang libreng bersyon nito. Nasa gitna ang Tuón at may dagdag na walang sa kanilang dalawa: alam nito ang petsa ng exam mo, kaya nasasagot nito ang “handa na ba ako?” at hindi lang “ano ang due?”. Nababasa rin nito ang mga notang naghahalo ng Ingles at Tagalog o Cebuano, na siyang totoong paraan ng pagsulat ng karamihan sa mga estudyante rito.",
        },
        {
          q: "Kailangan ko bang i-type ang bawat sagot?",
          a: "Sa mga kard lang na sapat ang ikli para i-type, at pwede mo itong patayin sa settings o laktawan sa kahit anong kard. Naka-on ito bilang default dahil ang pagbasa sa likod at pag-isip ng “ay alam ko iyan” ay hindi katulad ng pagkakaalala nito. Pinapatawad ang spelling, ayos ng salita, accent at ang mga panandang Tagalog na baka isulat mo — hindi kailanman itinuturing na mali ang typo.",
        },
        {
          q: "Pwede ba akong mag-aral kasama ang mga kaklase ko?",
          a: "Oo, sa mga grupong imbitasyon lang: mag-share ng set, maglagay ng pinagsasaluhang deadline, at makita kung sino ang nag-aaral ngayon. Sadyang walang pampublikong silid at walang direktoryo — marami sa mga estudyante rito ay menor de edad, at ang espasyong mapapasok ng estranghero ay nangangailangan ng moderasyong hindi namin kayang ipangako. Sumasali ka sa grupo dahil may nagpadala sa iyo ng code.",
        },
        {
          q: "Makukuha ko bang muli ang mga nota ko?",
          a: "Anumang oras, bilang Markdown, na buo ang [[links]] mo — isang download para sa buong library. Pwede ka ring magdala ng folder ng Markdown sa parehong paraan. Ang pagsasara ng labasan ang paraan ng mga app para pigilan ang gustong umalis, at hindi iyon plano namin.",
        },
        {
          q: "Paano kung makalimutan ko ng isang linggo?",
          a: "Walang masisira at walang mawawala. Ang mga kard na nalaktawan mo ay due pa rin, at may hangganan ang isang session batay sa pang-araw-araw na target na itinakda mo, kaya hindi dumarating ang backlog bilang pader ng 300 kard. May study grid sa dashboard mo na nagbibilang ng mga araw na nag-aral ka, pero talaan ito at hindi banta — walang nangungulit sa iyo na ipagpatuloy ito, at nananatili sa screen ang pinakamahaba mong takbo kahit may puwang.",
        },
        {
          q: "Pwede ko ba itong gamitin sa telepono ko?",
          a: "Oo — website ito, kaya walang i-i-install, at pwede mo itong idagdag sa home screen mo kung gusto mong bumukas ito na parang app. Ginawa ang pag-review para sa hinlalaki, dahil doon nangyayari ang karamihan nito — sa telepono, sa pagitan ng mga klase.",
        },
      ],
    },

    finalCta: {
      title: "Tigilan na ang paggawa ng flashcard. Simulan ang pag-alala.",
      body: "Magsimula sa isang nota ngayong gabi. Magkakaroon ka ng set ng flashcard bago mo maubos ang kape mo, at bukas darating ang unang review.",
      action: "Gumawa ng libreng account",
      note: "Habambuhay na libre ang mga nota at flashcard · walang kailangang card",
    },

    footer: {
      blurb:
        "Gawing flashcards at quiz ang notes mo sa klase, tapos i-review ang mga ito sa iskedyul na talagang nagpapatatag ng memorya.",
      questions: "May tanong?",
      product: "Produkto",
      account: "Account",
      legal: "Legal",
      createAccount: "Gumawa ng account",
      openTuon: "Buksan ang Tuón",
      privacy: "Paunawa sa privacy",
      terms: "Mga tuntunin ng paggamit",
      contact: "Kontakin kami",
      language: "Wika",
      draft: "draft",
      madeIn: "Gawa sa Pilipinas, para sa mga estudyanteng Pilipino.",
      rights: (year: number) =>
        `© ${year} Tuón · Adrian Salinas. Nakalaan ang lahat ng karapatan.`,
    },
  },

  demo: {
    generate: "Gumawa ng study set",
    noAccount: "Tunay na nota, tunay na resulta, walang kailangang account.",
    reading: "Binabasa ang nota mo…",
    staged:
      "Sa app, mga labindalawang segundo ito. Dito ay itinanghal lang — nauna nang ginawa ang mga kard sa ibaba.",
    cardsAndQuiz: (count: number) => `${count} flashcard at isang quiz`,
    progress: (index: number, total: number) => `${index} / ${total}`,
    showQuestion: "Ipakita ang tanong",
    showAnswer: "Ipakita ang sagot",
    question: "Tanong",
    answer: "Sagot",
    tapToReveal: "Pindutin para ipakita",
    tapToFlipBack: "Pindutin para bumalik",
    seeTheQuiz: "Tingnan ang quiz",
    nextCard: "Susunod na kard",
    practiceQuiz: "Practice quiz",
    tryYourOwn: "Subukan ito sa sarili mong notes",
    startOver: "Magsimula ulit",
  },

  ask: {
    title: "May tanong ka pa?",
    body: (creature: string) =>
      `Tanungin si ${creature} kung sakop ba ng Tuón ang subject o board exam mo, kung magkano ito, o kung sino ang nakakakita ng mga nota mo.`,
    suggestions: [
      "Sakop ba nito ang strand ko?",
      "Pwede ko ba itong gamitin sa CPALE?",
      "Libre ba talaga?",
      "Sino ang nakakakita ng mga nota ko?",
    ],
    thinking: "Nag-iisip",
    askAgain: "Itanong ulit iyon",
    startOver: "Magsimula ulit",
    followUp: "Magtanong pa…",
    placeholder: "Magtanong tungkol sa Tuón…",
    yourQuestion: "Ang tanong mo",
    stop: "Itigil",
    send: "Ipadala",
    disclaimer: (creature: string) =>
      `Mga tanong lang tungkol sa Tuón ang sinasagot ni ${creature}, at pwede itong magkamali. Walang naise-save sa account ang anumang i-type mo rito.`,
    failed: "Hindi masagot iyon. Nasa FAQ sa itaas ang mga karaniwang tanong.",
    offline:
      "Hindi maabot ang server. Tingnan ang koneksyon mo, o basahin ang FAQ sa itaas.",
  },

  shared: {
    mySets: "Mga set ko",
    getTuon: "Kunin ang Tuón nang libre",
    badge: "Ibinahaging study set",
    flashcards: (count: number) => `${count} flashcard`,
    quizQuestions: (count: number) => `${count} tanong sa quiz`,
    saveToMySets: "I-save sa mga set ko",
    signUpToSave: "Mag-sign up nang libre para ma-save ito",
    ownCopy:
      "Magkakaroon ka ng sariling kopya — sa iyo pa rin ang mga review mo.",
    flashcardsHeading: "Flashcards",
    saved: "Na-save sa mga study set mo.",
    saveFailed: "Hindi ma-save ang kopya. Subukan ulit.",
    unavailable: "Hindi available ang link na ito",
    unavailableHint:
      "Maaaring inalis na ito sa pagbabahagi ng may-ari, o mali ang pagkakasulat ng address.",
    goToTuon: "Pumunta sa Tuón",
  },

  offlinePage: {
    title: "Kailangan ng koneksyon ang pahinang ito",
    body: "Nakaimbak sa device na ito ang mga kard mo at ang iskedyul nila, kaya gumagana pa rin ang pag-review. Nase-save ang anumang i-rate mo ngayon at magsi-sync pagbalik ng koneksyon mo.",
    goToReview: "Pumunta sa review",
    backToLibrary: "Balik sa library ko",
  },

  tala: {
    title: (creature: string) => `Tanungin si ${creature}`,
    subtitle:
      "Nakikita niya kung kumusta ang pag-aaral mo — ano ang due, aling subject ang pinakamahina, gaano ka kahanda. Hindi niya nakikita ang mga nota o kard mo.",
    companionOf: (creature: string) =>
      `${creature}, ang kasama mo sa pag-aaral`,
    placeholder: "Magtanong tungkol sa pag-aaral mo…",
    followUp: "Magtanong pa…",
    yourMessage: "Mensahe mo",
    send: "Ipadala",
    stop: "Itigil",
    thinking: "Nag-iisip",
    startOver: "Magsimula ulit",
    tryAgain: "Itanong ulit iyon",
    failed: "Hindi natuloy iyon. Subukang itanong ulit.",
    offline: "Hindi maabot ang Tuón. Tingnan ang koneksyon mo at subukan ulit.",
    unavailable: "Nagpapahinga si Tala",
    unavailableHint:
      "Hindi pa naka-on ang assistant sa deployment na ito. Normal na gumagana ang lahat ng iba pa sa Tuón.",
    disclaimer: (creature: string) =>
      `Pwedeng magkamali si ${creature}, at hindi niya kailanman nakikita ang mga nota o flashcard mo. Nananatili sa device na ito ang usapang ito.`,
    askTonight: "Ano ang dapat kong aralin ngayong gabi?",
    askWeakest: (subject: string) => `Bakit ${subject} ang pinakamahina ko?`,
    askShaky: "Ano ang gagawin ko sa mahihina kong kard?",
    askHowItWorks: "Paano nagdedesisyon ang iskedyul?",
    emptySuggestions: [
      "Paano ako magsisimula?",
      "Ano ang magandang flashcard?",
      "Bakit hindi na lang basahin ulit ang notes ko?",
    ],
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
