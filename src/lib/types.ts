export type ModeId = "learn" | "decide" | "create" | "execute";

export type LadderLevelId = "hint" | "critique" | "evidence" | "answer";

export interface FirstPass {
  answer: string;
  /** 1–5, captured before any AI output is visible */
  confidence: number;
  reasoning: string;
  sealedAt: string; // ISO timestamp — the moment of commitment
}

export interface LadderStep {
  level: LadderLevelId;
  unlockedAt: string;
  /** What the user's AI returned for this rung (pasted in) */
  aiResponse: string;
}

export interface Synthesis {
  /** Final explanation in the user's own words, incl. one uncertainty */
  explanation: string;
  /** 1–5, after seeing AI input */
  postConfidence: number;
  /** How the sealed first pass held up, judged by the user at the end */
  selfGrade?: "correct" | "partial" | "wrong";
}

export interface ClaimCheck {
  claim: string;
  source: string;
  /** Set once the user has independently checked the claim */
  verdict?: "held" | "failed";
}

export type RecallInterval = "10m" | "1d" | "1w";

export interface RecallTest {
  id: string;
  sessionId: string;
  taskTitle: string;
  interval: RecallInterval;
  dueAt: string;
  completedAt?: string;
  /** Did the user reproduce the reasoning unaided? */
  passed?: boolean;
}

export type SessionPhase =
  | "setup"
  | "firstpass"
  | "ladder"
  | "synthesis"
  | "complete";

export interface Session {
  id: string;
  mode: ModeId;
  phase: SessionPhase;
  startedAt: string;
  completedAt?: string;
  task: {
    title: string;
    /** The capability the user wants to keep, stated up front */
    capability: string;
    timeLimitMin: number;
    drillId?: string;
  };
  firstPass?: FirstPass;
  ladder: LadderStep[];
  /** Claim-level verification log (evidence rung) */
  verifications: ClaimCheck[];
  synthesis?: Synthesis;
  recallInterval?: RecallInterval;
}

export interface StoreShape {
  version: 1;
  sessions: Session[];
  recallTests: RecallTest[];
}
