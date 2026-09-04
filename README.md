# Tuón

**tuón** — Cebuano and Tagalog: *to study; to give something your full attention.*

Tuón turns your class notes into flashcards and practice quizzes, then schedules
your reviews so the material actually stays. Paste a lecture handout, import a
PDF, or write your own notes — you get a study set back in one step, and a
spaced-repetition schedule that decides what you see tomorrow.

Built for how studying actually works in the Philippines: Senior High strands
and college degree programs out of the box, a Manila-time study calendar, GCash
and Maya for payment, and a free tier that is genuinely usable.

---

## Who it's for

**Senior High School students (Grades 11–12).** Onboarding asks for your
strand — STEM, ABM, HUMSS, GAS, TVL — and fills in your subjects, so you are
not typing "General Chemistry 2" by hand.

**College students.** Pick your degree program and add your own subjects per
semester. Study sets, deadlines, and the timetable all follow the semester you
are in.

**Board and licensure reviewers.** Long-horizon review is the case spaced
repetition was built for. Set your exam date and the schedule compresses to
fit the runway you actually have, rather than politely scheduling a card for
after the exam.

---

## What it does

### Turning notes into study material
- **Paste, type, or import.** Notes autosave as you write. PDF import pulls the
  text out of a handout or a scanned reviewer. Markdown imports and exports
  cleanly, so your notes are never trapped here.
- **One generation, two outputs.** A single call returns 8–15 flashcards and a
  5-question multiple-choice quiz, tagged to the subject the note belongs to.
- **Your own cards too.** Write flashcards by hand and mix them into any set.

### Reviewing
- **SM-2 spaced repetition.** Rate a card Again / Hard / Good / Easy and the
  interval adjusts. Cards you blank on come back later in the same session
  rather than being pushed to tomorrow.
- **Typed recall and hints.** Type the answer instead of flipping, for the
  material where recognition is not the same as knowing it.
- **Timed tests.** A test drawn from your weakest cards, under a clock, scored
  at the end.
- **Quizzes** with instant feedback and an explanation for each answer.

### Keeping track
- **Readiness per subject.** How ready you are for each subject, measured
  against the exam date you set — not a generic percentage.
- **Retention stats.** What you are about to forget, before you forget it.
- **A study plan** that says what to do today, in order, and why.
- **Pomodoro timer** tagged to a subject, so focused minutes are attributed to
  the thing you were actually studying.
- **Study heatmap and streaks**, built from those minutes, with a per-subject
  breakdown across the year.
- **Calendar and timetable** for deadlines, class schedule, and exam dates.
- **A knowledge graph** of how your subjects and sets connect.

### Studying with other people
- **Private study groups.** Join your class or block with an invite code and
  share sets inside the group.
- **Share a set by link.** A read-only page anyone can open — no account needed
  to study from it.

### Tala, the study companion
Tala is the paper owl in the corner of the app, and she talks. She can see your
study state — cards due, weakest subject, readiness against your exam, what
today's plan already decided — and answers questions about it in plain language.
She never sees your note text or your card contents, and the conversation stays
on your device.

There is also **Ask Tuón** on the landing page, for questions about the app
before you sign up.

### The rest
- **English and Filipino** throughout the product.
- **Works offline** for reviewing, and installs as an app on your phone.
- **Themes and colour palettes**, light and dark.
- **Export everything** — your sets to Anki, CSV, or PDF; your whole account as
  a data file; and a one-click account deletion that actually deletes.
- **A help page** that explains the four rating buttons, the vocabulary, and
  what to do when something looks wrong.

---

## How the loop goes

1. **Sign up** with email or Google, verify your address
2. **Onboard** — name, education level, strand or degree program, subjects,
   exam dates
3. **Write or import a note**, tagged with a subject
4. **Generate** — flashcards and a quiz come back in one step
5. **Review** on the schedule Tuón sets, rating each card as you go
6. **Check your readiness** before the exam, and let the plan tell you what is
   most overdue

---

## Plans

| | Free | Plus — ₱149/mo | Pro — ₱299/mo |
| --- | --- | --- | --- |
| AI study sets a month | 5 | 50 | 120 |
| Note length | 30,000 chars | 60,000 | 120,000 |
| Notes, PDF import, own flashcards | ✓ | ✓ | ✓ |
| Spaced repetition, tests, quizzes | ✓ | ✓ | ✓ |
| Deadlines, timetable, Pomodoro, study log | ✓ | ✓ | ✓ |
| Private study groups | ✓ | ✓ | ✓ |
| Export to Anki, CSV, PDF | — | ✓ | ✓ |
| Retention stats | — | ✓ | ✓ |
| Share a set by link | — | ✓ | ✓ |
| Wait between generations | 20s | 5s | none |

Annual billing is ten months' price for twelve months' access. Payment is by
GCash, Maya, or card through PayMongo.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui on Base UI · Motion · Lenis · Firebase Auth, Firestore and App Check ·
Anthropic Claude (Sonnet 5 for generation, Haiku 4.5 for conversation) ·
PayMongo · Resend · deployed on Vercel

The spaced-repetition scheduler, the readiness model, the study plan, and the
quiz scorer are all plain TypeScript modules with no framework or network
dependency, tested directly by the suite in `tests/`.

---

## Running it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # the full suite
```

Copy `.env.example` to `.env.local` and fill it in. Two values cannot be
generated from a CLI and have to come from a console: a Firebase
service-account key (Firebase console → Project settings → Service accounts)
and an Anthropic API key. Until both are set the API routes return `503` with
the reason in the server log, rather than looking like an auth failure.

Firestore rules and indexes deploy separately:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Not built yet

Audio and video notes · interactive simulations · school and teacher accounts ·
curricula outside the Philippines
