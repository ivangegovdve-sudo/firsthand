import type { ModeId } from "./types";

export interface ModeMeta {
  id: ModeId;
  name: string;
  /** What the AI is NOT allowed to do in this mode */
  withholds: string;
  tagline: string;
  /** 0–4 notches of AI restraint. Learn withholds the most. */
  restraint: number;
  useWhen: string;
  protocol: string[];
  evidence: string;
  live: boolean;
}

export const MODES: ModeMeta[] = [
  {
    id: "learn",
    name: "Learn",
    withholds: "The answer",
    tagline: "You attempt first. AI only hints, critiques, and cites.",
    restraint: 4,
    useWhen:
      "You want to retain the skill or concept itself — not just finish the task.",
    protocol: [
      "State the task and the capability you intend to keep",
      "Work unaided; seal your answer, confidence, and reasoning",
      "Climb the ladder: hint → critique → evidence → full answer, one deliberate step at a time",
      "Write the final explanation in your own words, with one uncertainty",
      "Schedule a delayed recall test",
    ],
    evidence:
      "Unguarded AI help harms unaided learning (PNAS 2025); retrieval before consulting sources is one of the best-replicated effects in learning science (Karpicke & Roediger 2008).",
    live: true,
  },
  {
    id: "decide",
    name: "Decide",
    withholds: "The first word",
    tagline: "Your judgment goes on record before the recommendation.",
    restraint: 3,
    useWhen:
      "The choice is consequential and you must stay the one deciding.",
    protocol: [
      "Record your independent judgment, confidence, and reasoning",
      "Only then see the AI recommendation, with uncertainty and failure modes",
      "Log accept or override — with your rationale either way",
      "Verify the claims that carry the decision",
    ],
    evidence:
      "Automation bias — following wrong recommendations or missing absent ones — is one of the strongest findings in human-factors research (Parasuraman & Manzey 2010; Goddard et al. 2012).",
    live: false,
  },
  {
    id: "create",
    name: "Create",
    withholds: "The first idea",
    tagline: "Diverge privately before AI suggests anything.",
    restraint: 2,
    useWhen:
      "The work is creative and you want your ideas to stay yours.",
    protocol: [
      "Generate 5+ ideas privately — no AI in the room",
      "Then see AI variations, clearly labeled",
      "Origin labels track what's yours vs generated",
      "Keep one non-AI branch alive to the end",
    ],
    evidence:
      "Early AI suggestions anchor creative search and homogenize output — a diversity harm, not a volume harm (Design Science; Tankelevitch et al. 2023).",
    live: false,
  },
  {
    id: "execute",
    name: "Execute",
    withholds: "Nothing",
    tagline: "Full AI assistance. Low stakes, no scaffolding.",
    restraint: 0,
    useWhen:
      "The task is repetitive, low-stakes, or time-critical — the cognitive cost of scaffolding exceeds the benefit.",
    protocol: [
      "State the task and time box",
      "Let AI do the work",
      "Session still ends explicitly — no drift",
    ],
    evidence:
      "Not every task deserves friction. Calibrated reliance means knowing when to delegate, not blanket distrust (SCAN 2026).",
    live: false,
  },
];

export function getMode(id: string): ModeMeta | undefined {
  return MODES.find((m) => m.id === id);
}
