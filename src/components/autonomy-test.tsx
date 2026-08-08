"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Flag, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfidencePicker, ConfidenceNotches } from "@/components/confidence";
import {
  BIAS_ITEMS,
  CALIBRATION_ITEMS,
  RETRIEVAL_AI_SCAFFOLD,
  RETRIEVAL_ASSISTED,
  RETRIEVAL_DELAY_MS,
  RETRIEVAL_RUBRIC,
  RETRIEVAL_UNAIDED,
  biasScore,
  calibrationScore,
  scoreBand,
  scoreTest,
} from "@/lib/autonomy";
import {
  completeRetrievalProbe,
  newId,
  openRetrievalProbe,
  saveAutonomyTest,
} from "@/lib/store";
import type { AutonomyTestResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step =
  | "intro"
  | "calibration"
  | "calibration-ai"
  | "calibration-truth"
  | "bias"
  | "bias-review"
  | "retrieval"
  | "results"
  | "probe-wait"
  | "probe"
  | "probe-results";

const DIMENSIONS = [
  { key: "calibration", label: "Calibration" },
  { key: "bias", label: "Automation bias" },
  { key: "retrieval", label: "Retrieval gap" },
] as const;

const STEP_DIMENSION: Record<Step, number> = {
  intro: -1,
  calibration: 0,
  "calibration-ai": 0,
  "calibration-truth": 0,
  bias: 1,
  "bias-review": 1,
  retrieval: 2,
  results: 2,
  "probe-wait": 2,
  probe: 2,
  "probe-results": 2,
};

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function StepFrame({
  step,
  kicker,
  title,
  lede,
  children,
  footer,
}: {
  step: Step;
  kicker: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      key={step}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-col"
      aria-label={title}
    >
      <div className="rule-tick pt-4">
        <Kicker>{kicker}</Kicker>
        <h2 className="font-display mt-3 text-3xl tracking-tight sm:text-4xl">
          {title}
        </h2>
        {lede && (
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {lede}
          </p>
        )}
      </div>
      <div className="mt-8">{children}</div>
      {footer && (
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          {footer}
        </div>
      )}
    </motion.section>
  );
}

function DimensionRail({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {DIMENSIONS.map((d, i) => (
        <li
          key={d.key}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]"
          aria-current={i === current ? "step" : undefined}
        >
          <span
            className={cn(
              "inline-block h-3 w-1",
              i < current
                ? "bg-muted-foreground"
                : i === current
                  ? "bg-primary"
                  : "bg-border"
            )}
            aria-hidden
          />
          <span
            className={cn(
              i === current
                ? "text-foreground"
                : i < current
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
            )}
          >
            {d.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ScoreDial({
  score,
  label,
  provisional,
}: {
  score: number;
  label: string;
  provisional?: boolean;
}) {
  return (
    <div className="rule-tick pt-4">
      <Kicker>{label}</Kicker>
      <p className="mt-2 font-mono text-6xl tabular-nums leading-none tracking-tight text-primary">
        {score}
        <span className="text-2xl text-muted-foreground">/100</span>
      </p>
      {provisional && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Provisional — retrieval gap still open
        </p>
      )}
    </div>
  );
}

function DimensionBar({
  label,
  score,
  detail,
}: {
  label: string;
  score: number | null;
  detail: string;
}) {
  return (
    <div className="border-b border-border py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
          {label}
        </span>
        <span className="font-mono text-lg tabular-nums">
          {score === null ? "—" : score}
        </span>
      </div>
      <div className="mt-2 h-1 w-full bg-border" role="presentation">
        <div
          className="h-1 bg-primary"
          style={{ width: `${score === null ? 0 : score}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function AiPanel({
  title = "Your AI's answer",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 font-mono text-[10px] uppercase tracking-[0.14em]",
        ok ? "text-muted-foreground" : "text-primary"
      )}
    >
      {ok ? (
        <Check className="mt-px size-3 shrink-0" aria-hidden />
      ) : (
        <X className="mt-px size-3 shrink-0" aria-hidden />
      )}
      <span>{children}</span>
    </p>
  );
}

function RubricCheck({
  values,
  onToggle,
}: {
  values: boolean[];
  onToggle: (i: number) => void;
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Score your own answer — check every criterion it actually meets
      </legend>
      <ul className="mt-4 flex flex-col">
        {RETRIEVAL_RUBRIC.map((criterion, i) => (
          <li key={i} className="border-b border-border">
            <label className="flex cursor-pointer items-start gap-3 py-3.5">
              <input
                type="checkbox"
                checked={values[i] ?? false}
                onChange={() => onToggle(i)}
                className="mt-0.5 size-4 shrink-0 appearance-none border border-input bg-transparent outline-none checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <span className="text-sm leading-6">{criterion}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Self-reported, and the score is only as honest as this step. Both
        attempts use the same four criteria, which is what makes the ratio mean
        anything.
      </p>
    </fieldset>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* The test                                                            */
/* ------------------------------------------------------------------ */

export function AutonomyTest({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>("intro");
  const [ready, setReady] = useState(false);

  // Dimension 1
  const [choices, setChoices] = useState<(number | null)[]>(
    CALIBRATION_ITEMS.map(() => null)
  );
  const [confidences, setConfidences] = useState<(number | null)[]>(
    CALIBRATION_ITEMS.map(() => null)
  );

  // Dimension 2
  const [flags, setFlags] = useState<(boolean | null)[]>(
    BIAS_ITEMS.map(() => null)
  );

  // Dimension 3
  const [assistedAnswer, setAssistedAnswer] = useState("");
  const [assistedRubric, setAssistedRubric] = useState<boolean[]>(
    RETRIEVAL_RUBRIC.map(() => false)
  );
  const [assistedPhase, setAssistedPhase] = useState<"write" | "score">("write");
  const [unaidedAnswer, setUnaidedAnswer] = useState("");
  const [unaidedRubric, setUnaidedRubric] = useState<boolean[]>(
    RETRIEVAL_RUBRIC.map(() => false)
  );
  const [unaidedPhase, setUnaidedPhase] = useState<"write" | "score">("write");

  const [startedAt] = useState(() => new Date().toISOString());
  const [test, setTest] = useState<AutonomyTestResult | null>(null);
  const [now, setNow] = useState(0);

  /**
   * localStorage is only readable after mount, so the open-probe check runs
   * in an effect rather than in initial state — otherwise the first render
   * would not match the server's.
   */
  useEffect(() => {
    const open = openRetrievalProbe();
    setNow(Date.now());
    if (open) {
      setTest(open);
      setStep(
        Date.now() >= new Date(open.retrieval.dueAt).getTime()
          ? "probe"
          : "probe-wait"
      );
    }
    setReady(true);
  }, []);

  /** Both steps that show a countdown need a live clock, not the mount time. */
  useEffect(() => {
    if (step !== "probe-wait" && step !== "results") return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const calibrationResults = useMemo(
    () =>
      CALIBRATION_ITEMS.map((item, i) => ({
        itemId: item.id,
        choice: choices[i] ?? -1,
        correct: choices[i] === item.correctIndex,
        confidence: confidences[i] ?? 1,
      })),
    [choices, confidences]
  );

  const biasResults = useMemo(
    () =>
      BIAS_ITEMS.map((item, i) => ({
        itemId: item.id,
        flagged: flags[i] === true,
        isFlawed: item.flawed,
      })),
    [flags]
  );

  const cal = calibrationScore(calibrationResults);
  const probe = biasScore(biasResults);

  const calibrationComplete = choices.every((c) => c !== null) &&
    confidences.every((c) => c !== null);
  const biasComplete = flags.every((f) => f !== null);

  function finishFirstSitting() {
    const assistedAt = new Date().toISOString();
    const result: AutonomyTestResult = {
      id: newId(),
      startedAt,
      completedAt: assistedAt,
      calibration: calibrationResults,
      bias: biasResults,
      retrieval: {
        variantId: RETRIEVAL_UNAIDED.id,
        assistedAt,
        dueAt: new Date(Date.now() + RETRIEVAL_DELAY_MS).toISOString(),
        assistedPoints: assistedRubric.filter(Boolean).length,
        assistedAnswer,
      },
    };
    saveAutonomyTest(result);
    setTest(result);
    setStep("results");
  }

  function finishProbe() {
    if (!test) return;
    const points = unaidedRubric.filter(Boolean).length;
    completeRetrievalProbe(test.id, points, unaidedAnswer);
    setTest({
      ...test,
      retrieval: {
        ...test.retrieval,
        unaidedPoints: points,
        unaidedAnswer,
        completedAt: new Date().toISOString(),
      },
    });
    setStep("probe-results");
  }

  if (!ready) {
    return (
      <div className="pt-20 pb-24">
        <Kicker>Loading your record…</Kicker>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
        <DimensionRail current={STEP_DIMENSION[step]} />
        <Button variant="ghost" size="sm" onClick={onExit}>
          Close test
        </Button>
      </div>

      {/* ---------------- Intro ---------------- */}
      {step === "intro" && (
        <StepFrame
          step={step}
          kicker="Autonomy test — about 12 minutes, plus a 10-minute gap"
          title="Measure what you keep."
          lede="Three dimensions, all preset — no AI is called at any point, so every attempt gets the identical stimulus and your scores are comparable over time. Nothing here scores your assisted output."
          footer={
            <>
              <Button onClick={() => setStep("calibration")}>
                Begin — calibration first
              </Button>
              <Button variant="ghost" onClick={onExit}>
                Not now
              </Button>
            </>
          }
        >
          <ul className="flex flex-col">
            {[
              {
                label: "Calibration check",
                body: "Answer three questions and rate your confidence before any AI output is visible. Scored on how closely that sealed confidence tracked whether you were actually right — not on the answers alone.",
              },
              {
                label: "Automation bias probe",
                body: "Five AI recommendations, two of them subtly wrong. Accept or flag each. Scored on errors caught and false alarms together, so flagging everything gets you nothing.",
              },
              {
                label: "Retrieval gap",
                body: "Solve a problem with an AI scaffold in front of you. Ten minutes later the test reopens with a near-identical variant and no scaffold. Scored as the ratio between the two.",
              },
            ].map((d) => (
              <li key={d.label} className="border-b border-border py-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                  {d.label}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {d.body}
                </p>
              </li>
            ))}
          </ul>
        </StepFrame>
      )}

      {/* ---------------- Calibration: answer ---------------- */}
      {step === "calibration" && (
        <StepFrame
          step={step}
          kicker="Dimension 1 of 3 — calibration check"
          title="Answer first. Rate yourself honestly."
          lede="No AI output is visible on this screen, and your confidence is sealed with your answer. Guessing at confidence 2 costs you nothing; guessing at confidence 5 is what the score is looking for."
          footer={
            <>
              <Button
                disabled={!calibrationComplete}
                onClick={() => setStep("calibration-ai")}
              >
                <Lock aria-hidden /> Seal all three
              </Button>
              {!calibrationComplete && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Answer and rate every item to continue
                </span>
              )}
            </>
          }
        >
          <ol className="flex flex-col gap-10">
            {CALIBRATION_ITEMS.map((item, i) => (
              <li key={item.id} className="border-t border-border pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  {i + 1} / {CALIBRATION_ITEMS.length} · {item.domain}
                </p>
                <p className="mt-3 max-w-2xl text-base leading-7">
                  {item.question}
                </p>
                <div
                  role="radiogroup"
                  aria-label={`Answer for item ${i + 1}`}
                  className="mt-5 flex flex-col gap-2"
                >
                  {item.options.map((opt, oi) => {
                    const selected = choices[i] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setChoices((prev) =>
                            prev.map((v, vi) => (vi === i ? oi : v))
                          )
                        }
                        className={cn(
                          "flex items-start gap-3 border px-4 py-3 text-left text-sm leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                        )}
                      >
                        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em]">
                          {String.fromCharCode(97 + oi)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    How confident are you in that answer?
                  </p>
                  <ConfidencePicker
                    idPrefix={`cal-conf-${i}`}
                    value={confidences[i] ?? null}
                    onChange={(v) =>
                      setConfidences((prev) =>
                        prev.map((c, ci) => (ci === i ? v : c))
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        </StepFrame>
      )}

      {/* ---------------- Calibration: AI answer ---------------- */}
      {step === "calibration-ai" && (
        <StepFrame
          step={step}
          kicker="Dimension 1 of 3 — the AI's turn"
          title="Now the model answers."
          lede="Your answers are sealed and cannot change. Read these the way you would read any AI output — one of the three is confidently wrong, and nothing on this screen tells you which."
          footer={
            <Button onClick={() => setStep("calibration-truth")}>
              Reveal the verified answers
            </Button>
          }
        >
          <ol className="flex flex-col gap-8">
            {CALIBRATION_ITEMS.map((item, i) => (
              <li key={item.id} className="border-t border-border pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {i + 1} / {CALIBRATION_ITEMS.length} · {item.domain}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6">
                  {item.question}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    You sealed
                  </span>
                  <span>
                    ({String.fromCharCode(97 + (choices[i] ?? 0))}){" "}
                    {item.options[choices[i] ?? 0]}
                  </span>
                  <ConfidenceNotches value={confidences[i] ?? 1} />
                </p>
                <div className="mt-4">
                  <AiPanel>{item.aiAnswer}</AiPanel>
                </div>
              </li>
            ))}
          </ol>
        </StepFrame>
      )}

      {/* ---------------- Calibration: truth + score ---------------- */}
      {step === "calibration-truth" && (
        <StepFrame
          step={step}
          kicker="Dimension 1 of 3 — scored"
          title={
            cal.gap > 0.15
              ? "You ran ahead of your evidence."
              : cal.gap < -0.15
                ? "You knew more than you trusted."
                : "Your confidence tracked reality."
          }
          lede={`${cal.correct} of ${cal.total} correct. Calibration is not accuracy — it is whether your confidence moved with your correctness. The signed gap between the two is ${cal.gap > 0 ? "+" : ""}${cal.gap}.`}
          footer={
            <Button onClick={() => setStep("bias")}>
              Next — automation bias probe
            </Button>
          }
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <ol className="flex flex-col gap-8">
              {CALIBRATION_ITEMS.map((item, i) => {
                const correct = choices[i] === item.correctIndex;
                const conf = confidences[i] ?? 1;
                return (
                  <li key={item.id} className="border-t border-border pt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {i + 1} / {CALIBRATION_ITEMS.length} · {item.domain}
                    </p>
                    <div className="mt-3">
                      <Verdict ok={correct}>
                        {correct
                          ? `Correct, sealed at confidence ${conf}`
                          : `Wrong, sealed at confidence ${conf}`}
                      </Verdict>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                        Verified ·{" "}
                      </span>
                      {item.verified}
                    </p>
                    <p className="mt-2 font-mono text-[10px] leading-5 tracking-[0.06em] text-muted-foreground">
                      {item.source}
                    </p>
                    {!correct && conf >= 4 && (
                      <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-5 text-muted-foreground">
                        Confident and wrong — the single most expensive
                        combination when you are the one checking the AI.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="lg:pt-5">
              <ScoreDial score={cal.score} label="Calibration" />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Brier-style: each confidence rating is read as a probability
                and squared against the outcome. 100 means every rating matched
                reality; a confident wrong answer costs the most.
              </p>
            </div>
          </div>
        </StepFrame>
      )}

      {/* ---------------- Bias probe ---------------- */}
      {step === "bias" && (
        <StepFrame
          step={step}
          kicker="Dimension 2 of 3 — automation bias probe"
          title="Five recommendations. Two are wrong."
          lede="Each one is what an AI assistant handed you. Accept it or flag it. Flagging all five does not score well — false alarms count against you exactly as much as misses."
          footer={
            <>
              <Button
                disabled={!biasComplete}
                onClick={() => setStep("bias-review")}
              >
                Submit all five
              </Button>
              {!biasComplete && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {flags.filter((f) => f !== null).length} of {flags.length}{" "}
                  answered
                </span>
              )}
            </>
          }
        >
          <ol className="flex flex-col gap-6">
            {BIAS_ITEMS.map((item, i) => (
              <li key={item.id} className="border border-border p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {i + 1} / {BIAS_ITEMS.length} · {item.context}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6">
                  {item.recommendation}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={flags[i] === false ? "secondary" : "outline"}
                    aria-pressed={flags[i] === false}
                    onClick={() =>
                      setFlags((prev) =>
                        prev.map((v, vi) => (vi === i ? false : v))
                      )
                    }
                  >
                    <Check aria-hidden /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant={flags[i] === true ? "destructive" : "outline"}
                    aria-pressed={flags[i] === true}
                    onClick={() =>
                      setFlags((prev) =>
                        prev.map((v, vi) => (vi === i ? true : v))
                      )
                    }
                  >
                    <Flag aria-hidden /> Flag
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </StepFrame>
      )}

      {/* ---------------- Bias review ---------------- */}
      {step === "bias-review" && (
        <StepFrame
          step={step}
          kicker="Dimension 2 of 3 — scored"
          title={
            probe.caught === probe.errors && probe.falseFlags === 0
              ? "Both errors caught, nothing over-flagged."
              : probe.caught === probe.errors
                ? "Both errors caught — at the cost of false alarms."
                : probe.caught === 0
                  ? "Both planted errors went through."
                  : "One error caught, one waved through."
          }
          lede={`${probe.caught} of ${probe.errors} planted errors flagged · ${probe.falseFlags} of ${probe.sound} sound recommendations flagged in error. The score is the average of those two rates, which is why flagging everything cannot game it.`}
          footer={
            <Button onClick={() => setStep("retrieval")}>
              Next — retrieval gap
            </Button>
          }
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <ol className="flex flex-col gap-6">
              {BIAS_ITEMS.map((item, i) => {
                const flagged = flags[i] === true;
                const right = flagged === item.flawed;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "border p-5",
                      right ? "border-border" : "border-primary/60 bg-primary/[0.05]"
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {i + 1} / {BIAS_ITEMS.length} · {item.context}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        You {flagged ? "flagged" : "accepted"} ·{" "}
                        {item.flawed ? "flawed" : "sound"}
                      </p>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {item.recommendation}
                    </p>
                    <div className="mt-4">
                      <Verdict ok={right}>
                        {right
                          ? "Called correctly"
                          : item.flawed
                            ? "Missed — you accepted a flawed recommendation"
                            : "False alarm — this one was sound"}
                      </Verdict>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6">
                      {item.verdict}
                    </p>
                  </li>
                );
              })}
            </ol>
            <div className="lg:pt-1">
              <ScoreDial score={probe.score} label="Automation bias" />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Balanced accuracy: catch rate on the planted errors averaged
                with your pass rate on the sound recommendations. Blanket
                distrust and blanket acceptance both land near 50.
              </p>
            </div>
          </div>
        </StepFrame>
      )}

      {/* ---------------- Retrieval: assisted ---------------- */}
      {step === "retrieval" && (
        <StepFrame
          step={step}
          kicker="Dimension 3 of 3 — retrieval gap, assisted attempt"
          title={RETRIEVAL_ASSISTED.title}
          lede="Solve this with the AI scaffold in front of you — use it as much as you like. That is the point: this attempt establishes your assisted ceiling, and in ten minutes you will attempt the same shape of problem without it."
          footer={
            assistedPhase === "write" ? (
              <>
                <Button
                  disabled={assistedAnswer.trim().length < 40}
                  onClick={() => setAssistedPhase("score")}
                >
                  Submit assisted attempt
                </Button>
                {assistedAnswer.trim().length < 40 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Write at least a couple of sentences
                  </span>
                )}
              </>
            ) : (
              <>
                <Button onClick={finishFirstSitting}>
                  Lock in — start the 10-minute gap
                </Button>
                <Button variant="ghost" onClick={() => setAssistedPhase("write")}>
                  Back to my answer
                </Button>
              </>
            )
          }
        >
          <div className="flex flex-col gap-6">
            <p className="max-w-2xl border-l-2 border-primary pl-4 text-base leading-7">
              {RETRIEVAL_ASSISTED.problem}
            </p>

            <AiPanel title="Your AI's scaffold — preset, identical for every attempt">
              <div className="flex flex-col gap-3">
                {RETRIEVAL_AI_SCAFFOLD.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </AiPanel>

            {assistedPhase === "write" ? (
              <div>
                <label
                  htmlFor="assisted-answer"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Your answer
                </label>
                <Textarea
                  id="assisted-answer"
                  value={assistedAnswer}
                  onChange={(e) => setAssistedAnswer(e.target.value)}
                  rows={8}
                  className="mt-3 min-h-40"
                  placeholder="What is the smallest change, and what would it tell you?"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="border border-border bg-secondary/30 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Your assisted answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {assistedAnswer}
                  </p>
                </div>
                <RubricCheck
                  values={assistedRubric}
                  onToggle={(i) =>
                    setAssistedRubric((prev) =>
                      prev.map((v, vi) => (vi === i ? !v : v))
                    )
                  }
                />
              </div>
            )}
          </div>
        </StepFrame>
      )}

      {/* ---------------- Results (first sitting) ---------------- */}
      {step === "results" && test && (
        <ResultsView
          step={step}
          test={test}
          onExit={onExit}
          now={now}
          heading="Two dimensions closed. One left open."
          lede="Your Autonomy Score is provisional until the retrieval gap closes. Come back in ten minutes — the test will reopen straight into the unaided variant, and the score updates itself."
        />
      )}

      {/* ---------------- Probe waiting ---------------- */}
      {step === "probe-wait" && test && (
        <StepFrame
          step={step}
          kicker="Dimension 3 of 3 — retrieval gap, unaided attempt"
          title="Not yet."
          lede="The gap is the measurement. Testing you now would read what is still sitting in working memory, which tells you nothing about what you retained. Do something else and come back."
          footer={
            <Button variant="outline" onClick={onExit}>
              Return to modes
            </Button>
          }
        >
          <div className="rule-tick pt-4">
            <Kicker>Unlocks in</Kicker>
            <p
              className="mt-2 font-mono text-6xl tabular-nums leading-none tracking-tight"
              aria-live="off"
            >
              {formatCountdown(
                new Date(test.retrieval.dueAt).getTime() - now
              )}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              Your assisted attempt scored{" "}
              <span className="font-mono text-foreground">
                {test.retrieval.assistedPoints}/{RETRIEVAL_RUBRIC.length}
              </span>
              . The unaided variant is scored against the same four criteria.
            </p>
          </div>
        </StepFrame>
      )}

      {/* ---------------- Probe: unaided ---------------- */}
      {step === "probe" && test && (
        <StepFrame
          step={step}
          kicker="Dimension 3 of 3 — retrieval gap, unaided attempt"
          title={RETRIEVAL_UNAIDED.title}
          lede="No scaffold this time. Same shape of problem, same four criteria. Whatever structure you reproduce here is structure you actually hold."
          footer={
            unaidedPhase === "write" ? (
              <>
                <Button
                  disabled={unaidedAnswer.trim().length < 40}
                  onClick={() => setUnaidedPhase("score")}
                >
                  Submit unaided attempt
                </Button>
                {unaidedAnswer.trim().length < 40 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Write at least a couple of sentences
                  </span>
                )}
              </>
            ) : (
              <>
                <Button onClick={finishProbe}>Close the test</Button>
                <Button variant="ghost" onClick={() => setUnaidedPhase("write")}>
                  Back to my answer
                </Button>
              </>
            )
          }
        >
          <div className="flex flex-col gap-6">
            <p className="max-w-2xl border-l-2 border-primary pl-4 text-base leading-7">
              {RETRIEVAL_UNAIDED.problem}
            </p>

            {unaidedPhase === "write" ? (
              <div>
                <label
                  htmlFor="unaided-answer"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Your answer — unaided
                </label>
                <Textarea
                  id="unaided-answer"
                  value={unaidedAnswer}
                  onChange={(e) => setUnaidedAnswer(e.target.value)}
                  rows={8}
                  className="mt-3 min-h-40"
                  placeholder="What is the smallest change, and what would it tell you?"
                />
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Your assisted answer stays hidden until you submit. Looking it
                  up would measure your scrolling, not your memory.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="border border-border bg-secondary/30 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Your unaided answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {unaidedAnswer}
                  </p>
                </div>
                <RubricCheck
                  values={unaidedRubric}
                  onToggle={(i) =>
                    setUnaidedRubric((prev) =>
                      prev.map((v, vi) => (vi === i ? !v : v))
                    )
                  }
                />
              </div>
            )}
          </div>
        </StepFrame>
      )}

      {/* ---------------- Probe results ---------------- */}
      {step === "probe-results" && test && (
        <ResultsView
          step={step}
          test={test}
          onExit={onExit}
          now={now}
          heading={
            (scoreTest(test).retention ?? 0) >= 85
              ? "It held without the scaffold."
              : (scoreTest(test).retention ?? 0) >= 60
                ? "Most of it held."
                : "The scaffold was carrying more than it looked."
          }
          lede="All three dimensions closed. This score is now on your dashboard, and it only means something as a series — take it again in a week."
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function ResultsView({
  step,
  test,
  onExit,
  now,
  heading,
  lede,
}: {
  step: Step;
  test: AutonomyTestResult;
  onExit: () => void;
  now: number;
  heading: string;
  lede: string;
}) {
  const score = scoreTest(test);
  const cal = calibrationScore(test.calibration);
  const probe = biasScore(test.bias);
  const r = test.retrieval;
  /** null until the parent's clock effect has run — never read the clock in render */
  const waitLeft = now === 0 ? null : new Date(r.dueAt).getTime() - now;

  return (
    <StepFrame
      step={step}
      kicker={
        score.provisional
          ? "Autonomy score — provisional"
          : "Autonomy score — complete"
      }
      title={heading}
      lede={lede}
      footer={
        <>
          <Button onClick={onExit}>Return to modes</Button>
          {score.provisional && waitLeft !== null && waitLeft > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Unaided variant unlocks in {formatCountdown(waitLeft)}
            </span>
          )}
        </>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <ScoreDial
            score={score.composite}
            label="Autonomy score"
            provisional={score.provisional}
          />
          <p className="mt-4 font-display text-2xl italic tracking-tight text-foreground">
            {scoreBand(score.composite)}
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Weighted: calibration 35, automation bias 35, retrieval gap 30.
            {score.provisional
              ? " With the retrieval gap still open, the two closed dimensions are renormalised — expect the number to move."
              : ""}
          </p>
        </div>

        <div className="flex flex-col">
          <DimensionBar
            label="Calibration"
            score={score.calibration}
            detail={`${cal.correct}/${cal.total} correct · confidence ran ${
              cal.gap > 0 ? `${cal.gap} ahead of` : cal.gap < 0 ? `${Math.abs(cal.gap)} behind` : "level with"
            } accuracy`}
          />
          <DimensionBar
            label="Automation bias"
            score={score.bias}
            detail={`${probe.caught}/${probe.errors} planted errors caught · ${probe.falseFlags} false alarm${probe.falseFlags === 1 ? "" : "s"}`}
          />
          <DimensionBar
            label="Retrieval gap"
            score={score.retention}
            detail={
              score.retention === null
                ? `Assisted attempt scored ${r.assistedPoints}/${RETRIEVAL_RUBRIC.length}. Unaided variant still locked.`
                : `${r.unaidedPoints}/${RETRIEVAL_RUBRIC.length} unaided against ${r.assistedPoints}/${RETRIEVAL_RUBRIC.length} assisted`
            }
          />
          {!score.provisional && (
            <div className="mt-6 border border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Both attempts, side by side
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                    Assisted · {r.assistedPoints}/{RETRIEVAL_RUBRIC.length}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {r.assistedAnswer}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                    Unaided · {r.unaidedPoints}/{RETRIEVAL_RUBRIC.length}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {r.unaidedAnswer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StepFrame>
  );
}
