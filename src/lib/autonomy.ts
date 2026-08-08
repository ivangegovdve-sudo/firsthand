/**
 * The Autonomy Test — a scored diagnostic across three dimensions.
 *
 * All content is preset. No AI call happens at any point: the "AI answer"
 * and "AI recommendation" texts below are written into the app, which is
 * also the honest thing to do for a measurement instrument — every user
 * gets the identical stimulus, so scores are comparable across attempts.
 *
 * Domains are the same three mechanisms the Learn drills teach: the Google
 * effect (Sparrow 2011), the tutoring paradox (PNAS 2025), and automation
 * bias (Parasuraman & Manzey 2010).
 */

import type {
  AutonomyTestResult,
  BiasProbeResult,
  CalibrationItemResult,
  RetrievalProbe,
} from "./types";

/* ------------------------------------------------------------------ */
/* Dimension 1 — Calibration Check                                     */
/* ------------------------------------------------------------------ */

export interface CalibrationItem {
  id: string;
  domain: string;
  question: string;
  options: string[];
  correctIndex: number;
  /** Preset "AI answer" — shown after the sealed answer, before the truth */
  aiAnswer: string;
  /** The verified answer, with its source */
  verified: string;
  source: string;
}

export const CALIBRATION_ITEMS: CalibrationItem[] = [
  {
    id: "cal-google-effect",
    domain: "The Google effect",
    question:
      "Participants typed facts into a computer. Half were told the file would be saved, half that it would be erased. On a later memory test, the group that expected the file to be saved showed which pattern?",
    options: [
      "Worse recall of the facts, better recall of where they were stored",
      "Worse recall of both the facts and where they were stored",
      "Better recall of the facts, worse recall of where they were stored",
      "No reliable difference from the erased-file group",
    ],
    correctIndex: 0,
    aiAnswer:
      "Expecting the information to remain externally available reduces recall for the content itself while improving recall for the access route. This is the transactive-memory division of labour: when a reliable partner holds the content, encoding effort shifts from what to where.",
    verified:
      "Worse recall of the facts, better recall of where they were stored. Note what the finding does not say: nothing was erased from memory, and the effect is about what gets encoded when retention is expected to be someone else's job.",
    source: "Sparrow, Liu & Wegner 2011, Science — DOI 10.1126/science.1207745",
  },
  {
    id: "cal-tutoring-paradox",
    domain: "The tutoring paradox",
    question:
      "High-school students practised with an unguarded GPT-4 tutor that supplied complete worked solutions on request. Their practice scores rose sharply. On a later assessment with the tutor removed, how did they score against students who never had AI help?",
    options: [
      "Better — the practice gains transferred",
      "About the same — no measurable harm once access was removed",
      "Worse than students who never had AI help",
      "Worse in mathematics only; better in reading",
    ],
    correctIndex: 2,
    aiAnswer:
      "The assisted group's practice gains largely persist. Because the tutor modelled correct solution paths, students internalised those paths, and follow-up testing shows them performing at roughly the level of unaided peers — the intervention is close to neutral once access is withdrawn.",
    verified:
      "Worse than students who never had AI help. Practice scores measured the model's competence, borrowed; the generation step the assessment tests went unpractised. A guarded variant of the same tutor — hints and incremental feedback instead of full solutions — largely eliminated the harm, so the fix is order of operations, not access.",
    source: "PNAS 2025 — DOI 10.1073/pnas.2422633122",
  },
  {
    id: "cal-automation-bias",
    domain: "Automation bias",
    question:
      "A radiologist's AI assistant does not flag a scan that contains a real tumour. The radiologist, reading alongside it, signs the scan off as clear. In human-factors terms, the radiologist's error is:",
    options: [
      "A commission error — acting on a wrong recommendation",
      "An omission error — failing to act because the automation stayed silent",
      "Not automation bias; the AI was simply wrong",
      "A calibration error — miscalibrated confidence in their own reading",
    ],
    correctIndex: 1,
    aiAnswer:
      "This is an omission error. Automation bias runs in two directions: commission errors, where the human follows an incorrect recommendation against contrary evidence, and omission errors, where the human treats the absence of an alert as evidence of absence. The second is the one experienced operators miss, because silence does not feel like a claim.",
    verified:
      "An omission error. The failure is not that the model was wrong — it is the human's changed behaviour: searching less carefully because a net is assumed to exist. Underneath sits deskilling, since every catch the automation makes is practice the human did not get.",
    source:
      "Parasuraman & Manzey 2010, Human Factors — DOI 10.1007/s10111-010-0149-2",
  },
];

/**
 * Brier-style calibration: confidence 1–5 maps to a probability 0–1, and is
 * compared against the binary outcome. Score 100 means every confidence
 * rating tracked reality exactly; 0 means maximal confidence, always wrong.
 */
export function calibrationScore(items: CalibrationItemResult[]): {
  score: number;
  correct: number;
  total: number;
  /** Signed: mean stated confidence − mean accuracy. Positive = overconfident */
  gap: number;
} {
  const total = items.length;
  if (total === 0) return { score: 0, correct: 0, total: 0, gap: 0 };

  let brier = 0;
  let meanP = 0;
  let correct = 0;

  for (const item of items) {
    const p = (item.confidence - 1) / 4;
    const o = item.correct ? 1 : 0;
    brier += (p - o) ** 2;
    meanP += p;
    correct += o;
  }

  return {
    score: Math.round(100 * (1 - brier / total)),
    correct,
    total,
    gap: Number((meanP / total - correct / total).toFixed(2)),
  };
}

/* ------------------------------------------------------------------ */
/* Dimension 2 — Automation Bias Probe                                 */
/* ------------------------------------------------------------------ */

export interface BiasItem {
  id: string;
  context: string;
  /** The preset AI recommendation the user must accept or flag */
  recommendation: string;
  flawed: boolean;
  /** Shown in review, whichever way the user answered */
  verdict: string;
}

export const BIAS_ITEMS: BiasItem[] = [
  {
    id: "bias-order-effect",
    context: "Study design for an internal experiment",
    recommendation:
      "To test whether your AI note-taker hurts recall, run a within-subjects design: each participant completes one AI-assisted session, then one unaided session, and you compare recall scores between the two. Using the same people for both conditions controls for individual differences in memory ability.",
    flawed: true,
    verdict:
      "Flawed — every participant meets the conditions in the same fixed order, so any difference is confounded with practice, fatigue, and familiarity with the task. Within-subjects designs need counterbalancing: half the participants unaided first. The stated rationale is true and irrelevant, which is what makes this one easy to wave through.",
  },
  {
    id: "bias-guarded-tutor",
    context: "Product design for a study tool",
    recommendation:
      "In your tutor feature, withhold the worked solution until the learner submits an attempt, then release incremental hints rather than the full answer. Preserving the learner's generation step is what protects unaided performance later.",
    flawed: false,
    verdict:
      "Sound — this is the guarded-tutor condition that largely eliminated the harm in the PNAS 2025 study. Order of operations, not restricted access.",
  },
  {
    id: "bias-overgeneralize",
    context: "Drafting a claim for a public write-up",
    recommendation:
      "Cite Sparrow et al. (2011) as evidence that AI use causes long-term memory decline. The study found reduced recall for information participants expected to remain available, which establishes the mechanism behind AI-driven cognitive deterioration.",
    flawed: true,
    verdict:
      "Flawed — the study measured what gets encoded when retention is expected to be external, within a single session, years before LLMs. It supports an offloading effect on encoding; it does not establish long-term decline, and the leap to \"AI-driven deterioration\" is inference dressed as finding.",
  },
  {
    id: "bias-omission-seed",
    context: "QA design for an AI-assisted review workflow",
    recommendation:
      "To measure whether your reviewers are catching omission errors, seed cases where the assistant is configured to stay silent on a known positive, and record whether the human flags it anyway. Measuring only the cases the assistant flags cannot detect this failure mode.",
    flawed: false,
    verdict:
      "Sound — omission errors are invisible to any metric computed over the assistant's own alerts. A seeded silent positive is the standard way to surface them.",
  },
  {
    id: "bias-split-metrics",
    context: "Metric definition for a learning product",
    recommendation:
      "Report assisted performance and unaided performance as two separate metrics rather than blending them into one score. They can move in opposite directions, and a blended number hides exactly the gap you need to see.",
    flawed: false,
    verdict:
      "Sound — assisted output rising while retained capability falls is the core finding this whole instrument is built around. Blending the two conceals it.",
  },
];

export const BIAS_FLAWED_COUNT = BIAS_ITEMS.filter((i) => i.flawed).length;

/**
 * Balanced accuracy, not raw catch rate. Catching both planted errors by
 * flagging all five is not vigilance, so specificity carries equal weight.
 * `caught` is reported separately because it is the number users ask for.
 */
export function biasScore(items: BiasProbeResult[]): {
  score: number;
  caught: number;
  errors: number;
  falseFlags: number;
  sound: number;
} {
  const errors = items.filter((i) => i.isFlawed).length;
  const sound = items.length - errors;
  const caught = items.filter((i) => i.isFlawed && i.flagged).length;
  const falseFlags = items.filter((i) => !i.isFlawed && i.flagged).length;

  if (errors === 0 || sound === 0) {
    return { score: 0, caught, errors, falseFlags, sound };
  }

  const sensitivity = caught / errors;
  const specificity = (sound - falseFlags) / sound;

  return {
    score: Math.round(100 * ((sensitivity + specificity) / 2)),
    caught,
    errors,
    falseFlags,
    sound,
  };
}

/* ------------------------------------------------------------------ */
/* Dimension 3 — Retrieval Gap                                         */
/* ------------------------------------------------------------------ */

export const RETRIEVAL_DELAY_MS = 10 * 60 * 1000;

export interface RetrievalVariant {
  id: string;
  title: string;
  problem: string;
}

/**
 * Two structurally identical problems. The first is solved with a preset AI
 * scaffold visible; the second, ten minutes later, alone. Both are scored
 * against the same four criteria, so the ratio is meaningful.
 */
export const RETRIEVAL_ASSISTED: RetrievalVariant = {
  id: "retrieval-translate",
  title: "The translate button",
  problem:
    "A language-learning app finds that users who lean on its built-in AI translate button finish lessons 40% faster and score higher on in-lesson checks. Thirty-day retention is flat against last year. Design the smallest product change that would tell you whether the translate button is building capability or borrowing it.",
};

export const RETRIEVAL_UNAIDED: RetrievalVariant = {
  id: "retrieval-autocomplete",
  title: "The autocomplete",
  problem:
    "A coding bootcamp's students use an AI autocomplete that fills in whole function bodies. Weekly project scores are up. The closed-editor final assessment is next month. Design the smallest curriculum change that would tell you whether the autocomplete is building capability or borrowing it.",
};

/** The preset AI scaffold for the assisted attempt — deliberately generous. */
export const RETRIEVAL_AI_SCAFFOLD = `Work it in four moves.

1. Identify the operation being replaced. The button does not replace "learning the language" — it replaces one specific act: retrieving and producing the target word from memory. That act is what the lesson was meant to train, so it is the thing to measure.

2. Measure it with the tool unavailable. In-lesson checks run while the button is one tap away, so they score the pair, not the person. Add a short segment where the button is disabled and the user must produce the word cold.

3. Separate practice from measurement in time. Immediate testing measures what is still in working memory. Put the unaided segment at the start of the next session, not the end of this one.

4. Give yourself something to compare against. Flat retention across the whole population tells you nothing about this feature. Randomise a share of users into a button-free variant, or capture each user's own unaided baseline before their first assisted lesson.

Smallest change that does all four: a 60-second button-disabled production check at the start of each session, run against a randomised holdout that never gets the button.`;

export const RETRIEVAL_RUBRIC: string[] = [
  "Names the specific cognitive operation the tool performs in the user's place — not just \"learning\" or \"the skill\".",
  "Proposes a measurement taken while the tool is unavailable.",
  "Puts a delay between the assisted practice and the unaided measurement.",
  "Includes a comparison — a holdout group, or the same person's own unaided baseline.",
];

/**
 * Performance ratio, unaided over assisted, Laplace-smoothed so the score is
 * defined when the assisted attempt scored zero. 100 is capped: retaining
 * everything is the ceiling this dimension measures.
 */
export function retentionScore(probe: RetrievalProbe): number | null {
  if (probe.unaidedPoints === undefined) return null;
  const raw =
    (probe.unaidedPoints + 0.5) / (probe.assistedPoints + 0.5);
  return Math.max(0, Math.min(100, Math.round(100 * raw)));
}

/* ------------------------------------------------------------------ */
/* Composite                                                           */
/* ------------------------------------------------------------------ */

export const WEIGHTS = {
  calibration: 0.35,
  bias: 0.35,
  retention: 0.3,
} as const;

export interface AutonomyScore {
  composite: number;
  calibration: number;
  bias: number;
  retention: number | null;
  /** True until the delayed retrieval probe has been completed */
  provisional: boolean;
}

export function scoreTest(result: AutonomyTestResult): AutonomyScore {
  const calibration = calibrationScore(result.calibration).score;
  const bias = biasScore(result.bias).score;
  const retention = retentionScore(result.retrieval);

  const weighted =
    calibration * WEIGHTS.calibration + bias * WEIGHTS.bias;
  const composite =
    retention === null
      ? Math.round(weighted / (WEIGHTS.calibration + WEIGHTS.bias))
      : Math.round(weighted + retention * WEIGHTS.retention);

  return {
    composite,
    calibration,
    bias,
    retention,
    provisional: retention === null,
  };
}

export function scoreBand(score: number): string {
  if (score >= 80) return "Autonomy held";
  if (score >= 65) return "Mostly held";
  if (score >= 50) return "Leaning on the model";
  return "Delegated more than you kept";
}
