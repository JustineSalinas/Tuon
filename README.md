# Tuón

**tuón** — Cebuano and Tagalog: *to study; to give something your full attention.*

An AI study app for Philippine Senior High School (Grades 11–12) and college
students. Paste your class notes, get flashcards and a practice quiz back, then
review them on an SM-2 spaced-repetition schedule.

---

## Before it runs: two keys you need to add

Everything else is already provisioned. These two cannot be generated from a
CLI, so they are on you.

### 1. Firebase service-account key

1. Open the [service accounts settings][sa] for project `tuon-1673l9ve`
2. Click **Generate new private key** — it downloads a `.json` file
3. Paste the entire file contents, on one line in single quotes, into
   `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`

```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"tuon-1673l9ve",...}'
```

### 2. Anthropic API key

Get one at [console.anthropic.com][anthropic] and set `ANTHROPIC_API_KEY` in
`.env.local`.

Until both are set, the API routes return `503` with a clear reason in the
server log — they will not silently look like an auth failure.

```bash
npm install
npm run dev      # http://localhost:3000
```

[sa]: https://console.firebase.google.com/project/tuon-1673l9ve/settings/serviceaccounts/adminsdk
[anthropic]: https://console.anthropic.com/settings/keys

---

## Already set up

Firebase project **`tuon-1673l9ve`**, provisioned and live:

| Thing | State |
| --- | --- |
| Firestore | Created in `asia-southeast1` (Singapore — lowest latency for PH) |
| Security rules | Written and deployed |
| Email/Password auth | Enabled |
| Google auth | Enabled |
| Web app config | Filled into `.env.local` |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui (on Base UI) · Motion · Lenis · Firebase Auth + Firestore ·
Anthropic Claude Sonnet 5 · deploys to Vercel

## The loop

1. **Sign up** → email/password or Google
2. **Onboard** → name → education level → *strand* (SHS only) → subjects or degree program
3. **Write a note** → paste text, tag it with a subject, autosaves as you type
4. **Generate** → one Claude call returns 8–15 flashcards + a 5-question quiz
5. **Review** → flip cards, rate Again / Hard / Good / Easy, SM-2 schedules the next sighting
6. **Quiz** → multiple choice with instant feedback and a score

## Layout

```
src/
  app/
    page.tsx                     marketing page (Lenis + scroll reveals)
    login/  signup/  onboarding/
    app/                         the signed-in product
      page.tsx                   dashboard
      notes/  sets/  settings/
    api/
      generate/                  note -> Claude -> flashcards + quiz
      profile/bootstrap/         server-side profile creation
  components/
    providers/auth-provider      auth + live profile subscription
    onboarding/  notes/  study/  app/  marketing/  brand/
    ui/                          shadcn (Base UI)
  lib/
    srs/sm2.ts                   the spaced-repetition algorithm
    ai/                          config, prompt, defensive parser
    curriculum.ts                SHS strands/subjects + degree programs
    quota.ts                     monthly free-tier accounting
    firebase/                    client + admin SDKs
    hooks/                       Firestore subscriptions, clock
```

## Decisions worth knowing

**Plan and quota are server-owned.** `firestore.rules` lets a user edit only
`displayName`, `educationLevel`, `strand`, `courses`, and `onboardingCompleted`.
`plan` and `aiGenerationsUsedThisPeriod` are writable only through the Admin
SDK. Without this, any student could open devtools and set `plan: "paid"`.

**Generations are reserved, then refunded.** `/api/generate` increments the
counter inside a Firestore transaction *before* calling Claude, and decrements
it if the model call, parse, or save fails. Incrementing afterwards would let
twenty parallel requests each read "4 used" and all pass.

**The model output is never trusted.** `lib/ai/schema.ts` strips code fences,
slices JSON out of surrounding prose, validates with Zod, then drops individual
questions whose answer key is out of range or whose choices are not distinct. If
too little survives, the generation is refunded and the student gets a retry.

**Failed cards return within the session.** Pure SM-2 pushes a lapsed card to
"tomorrow", which feels broken when you just blanked on it. The saved schedule
follows SM-2 exactly; the in-memory queue re-inserts the card a few positions
later.

**Quota months are Manila months.** Periods roll over at midnight UTC+8, not
UTC — otherwise a student generating at 9am on the 1st would still be spending
last month's allowance.

**Smooth scrolling is marketing-only.** Lenis runs on the landing page. The
review and quiz screens skip it: mid-session, input latency matters more than
scroll feel, and the bottom nav is hidden there so the rating buttons own the
thumb zone.

## Tuning

`src/lib/ai/config.ts`:

```ts
AI_MODEL                       = "claude-sonnet-5"
FREE_TIER_MONTHLY_GENERATIONS  = 5
MIN_FLASHCARDS / MAX_FLASHCARDS = 8 / 15
QUIZ_QUESTIONS                 = 5
PAID_PLAN_PHP_MONTHLY          = 149
```

## Deploying

Push to a repo, import into Vercel, and add all the `.env.local` variables to
the Vercel project. Then re-deploy rules if you change them:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Not built yet (deliberately)

Payment processing (PayMongo, for GCash/Maya) · public/shared study sets ·
PDF and audio upload · interactive simulations · school accounts ·
international curricula
