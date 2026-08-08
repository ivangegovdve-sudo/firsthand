import type { LadderLevelId } from "./types";

export interface EvidenceClaim {
  claim: string;
  source: string;
}

export interface Drill {
  id: string;
  title: string;
  /** The capability that must remain the user's, stated up front */
  capability: string;
  /** The question the user answers unaided first */
  prompt: string;
  defaultMinutes: number;
  hint: string;
  critique: string;
  evidenceIntro: string;
  evidence: EvidenceClaim[];
  answer: string;
}

export const LADDER_LEVELS: {
  id: LadderLevelId;
  name: string;
  gives: string;
}[] = [
  {
    id: "hint",
    name: "Hint",
    gives: "A nudge toward the mechanism. No conclusions.",
  },
  {
    id: "critique",
    name: "Critique",
    gives: "The common failure modes — test your sealed answer against them.",
  },
  {
    id: "evidence",
    name: "Evidence",
    gives: "Sourced claims with DOIs. You verify at least one yourself.",
  },
  {
    id: "answer",
    name: "Full answer",
    gives: "The complete synthesis. Only after you have attempted.",
  },
];

/**
 * The starter curriculum is self-referential: each drill teaches one of the
 * mechanisms this app is built to counteract, sourced from the same papers.
 */
export const DRILLS: Drill[] = [
  {
    id: "google-effect",
    title: "The Google effect",
    capability: "Explain how offloading changes memory — without looking it up",
    prompt:
      "You save a fact to a trusted tool — a note app, a search engine, an AI. A week later, what do you remember about it, and what exactly did the act of saving change? Predict the pattern, then explain the mechanism.",
    defaultMinutes: 10,
    hint: "Think about what your brain treats as already handled. When a reliable external partner holds the content, what does memory prioritize instead of the fact itself — and what does it let go?",
    critique:
      "Common failure modes at this rung: (1) claiming the memory is deleted — offloading changes what gets encoded, it doesn't erase; (2) treating this as a technology-age defect — it's ordinary transactive memory, the same division of labor couples use when one partner remembers the birthdays; (3) missing the trade — you remember where better and what worse. Does your sealed answer commit any of these?",
    evidenceIntro:
      "Three claims carry the answer. Check at least one against its source — search the DOI — and log whether it held.",
    evidence: [
      {
        claim:
          "People who expect information to stay available recall the information itself worse, but recall where to find it better.",
        source:
          "Sparrow, Liu & Wegner 2011, Science — DOI 10.1126/science.1207745",
      },
      {
        claim:
          "Offloading is a general cognitive strategy: using action or external resources to reduce the demands on internal processing.",
        source:
          "Risko & Gilbert 2016, Trends in Cognitive Sciences — DOI 10.1016/j.tics.2016.07.002",
      },
      {
        claim:
          "No study establishes that ordinary LLM use causes a general, irreversible decline in memory — the LLM analogue remains an inference.",
        source:
          "Heersmink 2024, Nature Human Behaviour (commentary) — DOI 10.1038/s41562-024-01859-y",
      },
    ],
    answer:
      "Saving a fact to a trusted store signals your memory that retention is someone else's job. Encoding effort drops for the content and shifts to the route: you get better at remembering where the fact lives and worse at recalling the fact itself. This is transactive memory — old, human, and mostly adaptive, not erasure. What changes with AI is scale: a model produces whole answers and drafts, so the operation being skipped is no longer just storage but generation itself. The honest boundary of the evidence: strong for offloading effects on memory, unproven for permanent general decline from LLM use.",
  },
  {
    id: "tutoring-paradox",
    title: "The tutoring paradox",
    capability: "Predict when AI help hurts learning — and when it doesn't",
    prompt:
      "A school gives every student an AI tutor that provides complete worked solutions on demand. Practice scores jump. Predict what happens on the closed-book exam — and name the design change that would flip the result.",
    defaultMinutes: 12,
    hint: "Separate what improved during practice from what the practice was supposed to build. Whose solution path was being rehearsed — the student's, or the model's?",
    critique:
      "Check your sealed answer for these gaps: (1) if you predicted a drop, did you explain why — which operation went unpracticed — or just assert it? (2) Did you distinguish assisted performance from retained capability? They move independently, and the gap between them is exactly what practice scores hide. (3) Your design fix: does it change the order of operations, or just restrict access? Banning the tutor is not the interesting answer.",
    evidenceIntro:
      "Three claims carry the answer. Check at least one against its source — search the DOI — and log whether it held.",
    evidence: [
      {
        claim:
          "High-school students with unguarded GPT-4 access performed substantially better during practice, then worse than never-aided controls once access was removed.",
        source: "PNAS 2025 — DOI 10.1073/pnas.2422633122",
      },
      {
        claim:
          "A tutor variant with guardrails — hints and incremental feedback instead of full solutions — largely eliminated the harm.",
        source: "PNAS 2025 — DOI 10.1073/pnas.2422633122 (same study)",
      },
      {
        claim:
          "Retrieval practice — testing yourself before consulting the source — is among the most replicated effects in learning science.",
        source:
          "Karpicke & Roediger 2008, Science — DOI 10.1126/science.1152408",
      },
    ],
    answer:
      "Practice scores measured the model's competence, borrowed. Students rehearsed reading solutions, not producing them, so the generation step — the thing the exam tests — went unpracticed. On the closed-book exam the unguarded-tutor group lands below students who never had help at all. The flip is order, not access: a tutor that withholds the solution until after an attempt — hints first, worked steps on explicit request — preserves the generation step, and the harm largely disappears. That guarded tutor is this Learn mode, and it is why the ladder you just climbed made you answer first.",
  },
  {
    id: "automation-bias",
    title: "Two ways to fail on autopilot",
    capability: "Catch automation bias in your own decisions",
    prompt:
      "An experienced radiologist works with an AI assistant that flags suspicious scans. Describe the two distinct ways the assistant can cause the radiologist to be wrong — including the one where the AI says nothing at all.",
    defaultMinutes: 10,
    hint: "One failure happens when the human follows the machine. The other happens when the machine stays silent. Name both directions.",
    critique:
      "Test your sealed answer: (1) Did you catch the silent failure — treating the absence of an alert as evidence of absence? That is the one experts miss. (2) 'The AI was wrong' is not the failure. The failure is the human's changed behavior: searching less carefully because a net exists. (3) Bonus rigor: who stays responsible when the automation fails rarely but catastrophically — and are they still practiced enough to catch it by then?",
    evidenceIntro:
      "Three claims carry the answer. Check at least one against its source — search the DOI — and log whether it held.",
    evidence: [
      {
        claim:
          "Commission errors: following an incorrect automated recommendation despite contrary evidence. Omission errors: failing to act because the automation did not flag.",
        source:
          "Parasuraman & Manzey 2010, Human Factors — DOI 10.1007/s10111-010-0149-2",
      },
      {
        claim:
          "Automation bias is documented across clinical decision support systems in a systematic review of health-care studies.",
        source:
          "Goddard, Roudsari & Wyatt 2012, IJMI — DOI 10.1016/j.ijmedinf.2012.01.001",
      },
      {
        claim:
          "Automation removes routine practice while leaving humans responsible for exactly the rare failures that now exceed their eroded skill — the irony of automation.",
        source: "Bainbridge 1983, Automatica — DOI 10.1016/0005-1098(83)90046-8",
      },
    ],
    answer:
      "Failure one is commission: the AI flags a benign artifact and the radiologist, anchored by the confident flag, overcalls it. Failure two is omission: the AI misses a tumor and the radiologist — recalibrated to treat silence as clearance — stops hunting for what the machine didn't mark. Beneath both sits deskilling: every catch the net makes is practice the human didn't get, so vigilance erodes exactly as fast as responsibility doesn't. The countermeasure is not distrust but order: record your independent read first, then open the AI's. That is what Decide mode enforces.",
  },
];

export function getDrill(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}
