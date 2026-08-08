# Firsthand — a cognitive autonomy trainer

Use AI without losing your own thinking. Firsthand structures every AI
interaction so your first pass — answer, confidence, reasoning — goes on
record **before** the model says a word.

Built on the cognitive-offloading literature (research brief:
`D:\output\cognitive-autonomy-app-research.md`): AI degrades a skill when it
*replaces* the cognitive operation you needed to practice, not when it
scaffolds it. Firsthand intervenes at the workflow level.

## The four modes

| Mode | AI withholds | Discipline |
|---|---|---|
| **Learn** | The answer | Attempt first; climb hint → critique → evidence → answer, one explicit step at a time |
| **Decide** | The first word | Your judgment goes on record before the recommendation; log accept/override + rationale |
| **Create** | The first idea | Diverge privately (5+ ideas) before AI variations; origin labels track what's yours |
| **Execute** | Nothing | Full assistance for low-stakes, repetitive, time-critical work |

Learn mode is fully interactive in this MVP; Decide/Create/Execute have
protocol landing pages and ship next on the same session spine.

Live at **[sdforest.site/firsthand](https://sdforest.site/firsthand)**.

## The Autonomy Test

A scored diagnostic, reachable from the home screen as a panel swap rather
than a separate route. All content is preset — no AI call at any point — so
every attempt gets the identical stimulus and scores are comparable across
attempts. Three dimensions:

| Dimension | Measures | Scoring |
|---|---|---|
| **Calibration check** | Answer + confidence sealed before the preset AI answer appears, then the verified answer | Brier-style: confidence read as a probability, squared against the outcome. Confident-and-wrong costs the most |
| **Automation bias probe** | Five AI recommendations, two subtly flawed — accept or flag each | Balanced accuracy, so flagging everything cannot game it. Catch rate and false-alarm rate weigh equally |
| **Retrieval gap** | One problem solved with a generous AI scaffold; a structurally identical variant ten minutes later with none | Ratio of unaided to assisted rubric points, Laplace-smoothed so it stays defined at zero |

The composite **Autonomy Score** weights these 35/35/30 and leads the
dashboard with a per-dimension breakdown and a trend line over attempts. It
stays *provisional* — renormalised over the two closed dimensions — until the
delayed retrieval probe closes. The ten-minute gap is enforced from a stored
timestamp, not a session variable, so it survives reloads: reopening the test
lands straight in the unaided variant once due, and shows a countdown before.

Rubric scoring is self-reported, and the UI says so. Both attempts are scored
against the identical four criteria, which is what makes the ratio mean
anything.

## What's implemented

- **First-pass capture** — non-skippable modal (Escape and outside-click
  disabled): answer, confidence 1–5, reasoning, sealed with a timestamp
- **Progressive disclosure ladder** — four rungs unlocked strictly in order,
  each by explicit request; the full answer takes a second confirming click
- **Origin boundary** — user-authored content is sealed in solid red;
  AI-generated content is quarantined behind dashed borders and `AI` tags
- **Verification loop** — evidence rung ships claim-level DOIs; the user logs
  held / didn't-hold verdicts per claim
- **Session bounding** — stated capability goal + time box always visible;
  sessions end explicitly, never drift
- **Delayed recall** — each session schedules an unaided recall test (10 min /
  1 day / 1 week) that surfaces on the dashboard when due
- **Weekly dashboard** — unaided score, verification accuracy, calibration
  gap, first-pass-first rate (8 weeks of sample data + your real session
  record from localStorage)

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts ·
Framer Motion · localStorage (no backend in the MVP).

## Run

```bash
npm install
npm run dev -- --port 3020
```

Then open **http://localhost:3020/firsthand** — not the root. `next.config.ts`
sets `basePath: "/firsthand"` so that routes and `/_next/*` assets share one
prefix, which is what lets a single rewrite pair front the app at
`sdforest.site/firsthand` without 404-ing every stylesheet and chunk. The root
path is not served.

`npm run build` produces a fully static export-ready build (all routes
prerender).

## Design

Dark-only instrument: ink ground `#0a0a0a`, one signal red `#e23727`, warm
bone text. Newsreader (editorial serif) for the questions that matter, Geist
for UI, Geist Mono for the record. Chart palette (red + teal `#0d9488`)
validated for CVD separation and contrast against the dark surface.
