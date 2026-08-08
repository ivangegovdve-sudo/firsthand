/**
 * Sample dashboard data — eight weeks of a trainee whose autonomy metrics
 * are improving. Real sessions from localStorage render alongside it; the
 * charts are labeled "sample data" until enough real weeks accumulate.
 *
 * Chart palette validated (dataviz six checks) against the dark surface:
 * red #e23727 + teal #0d9488 pass lightness band, chroma floor, CVD
 * separation, normal-vision floor, and contrast. Neutrals are for text,
 * grid, and reference lines only — never series identity.
 */

export const CHART = {
  signal: "#e23727",
  held: "#0d9488",
  grid: "#232120",
  axis: "#8f8a82",
  reference: "#5a5650",
  surface: "#111110",
} as const;

export interface WeekMetrics {
  /** Week start label */
  week: string;
  /** Delayed-recall + unaided-transfer composite, 0–100 */
  unaidedScore: number;
  /** Of planted-error checks, % where the user's verdict was right */
  verificationAccuracy: number;
  /** AI claims independently checked that held up */
  claimsHeld: number;
  /** AI claims independently checked that did not hold */
  claimsFailed: number;
  /** Signed: sealed confidence − outcome, averaged. Positive = overconfident */
  calibrationGap: number;
  /** % of AI consultations that came after a sealed first pass */
  firstPassRate: number;
}

export const WEEKS: WeekMetrics[] = [
  { week: "Jun 15", unaidedScore: 54, verificationAccuracy: 50, claimsHeld: 5,  claimsFailed: 1, calibrationGap: 1.6, firstPassRate: 42 },
  { week: "Jun 22", unaidedScore: 58, verificationAccuracy: 55, claimsHeld: 7,  claimsFailed: 2, calibrationGap: 1.4, firstPassRate: 51 },
  { week: "Jun 29", unaidedScore: 57, verificationAccuracy: 60, claimsHeld: 6,  claimsFailed: 1, calibrationGap: 1.5, firstPassRate: 55 },
  { week: "Jul 6",  unaidedScore: 63, verificationAccuracy: 58, claimsHeld: 9,  claimsFailed: 3, calibrationGap: 1.1, firstPassRate: 61 },
  { week: "Jul 13", unaidedScore: 66, verificationAccuracy: 70, claimsHeld: 8,  claimsFailed: 2, calibrationGap: 0.9, firstPassRate: 68 },
  { week: "Jul 20", unaidedScore: 64, verificationAccuracy: 68, claimsHeld: 11, claimsFailed: 4, calibrationGap: 1.0, firstPassRate: 72 },
  { week: "Jul 27", unaidedScore: 71, verificationAccuracy: 75, claimsHeld: 10, claimsFailed: 3, calibrationGap: 0.6, firstPassRate: 79 },
  { week: "Aug 3",  unaidedScore: 74, verificationAccuracy: 78, claimsHeld: 12, claimsFailed: 4, calibrationGap: 0.4, firstPassRate: 83 },
];

export const THIS_WEEK = WEEKS[WEEKS.length - 1];
export const LAST_WEEK = WEEKS[WEEKS.length - 2];
