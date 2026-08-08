"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIBox } from "@/components/origin";
import { LADDER_LEVELS, type Drill } from "@/lib/drills";
import type { ClaimCheck, LadderLevelId, LadderStep } from "@/lib/types";
import { cn } from "@/lib/utils";

function Reveal({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function rungContent(drill: Drill, level: LadderLevelId): string {
  switch (level) {
    case "hint":
      return drill.hint;
    case "critique":
      return drill.critique;
    case "evidence":
      return drill.evidenceIntro;
    case "answer":
      return drill.answer;
  }
}

/**
 * Progressive disclosure: hint → critique → evidence → full answer.
 * Every rung requires an explicit request, in order. The full answer
 * additionally requires a second confirming click.
 */
export function HintLadder({
  drill,
  steps,
  verifications,
  onUnlock,
  onVerdict,
}: {
  drill: Drill;
  steps: LadderStep[];
  verifications: ClaimCheck[];
  onUnlock: (level: LadderLevelId, aiResponse: string) => void;
  onVerdict: (claimIndex: number, verdict: "held" | "failed") => void;
}) {
  const [confirmingAnswer, setConfirmingAnswer] = useState(false);
  const unlocked = new Set(steps.map((s) => s.level));

  return (
    <section aria-label="Help ladder">
      <div className="rule-tick flex items-baseline justify-between pt-4 pb-1">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          The ladder
        </h2>
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">
          {unlocked.size}/4 rungs used
        </p>
      </div>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Each rung is a deliberate step. Using fewer is not cheating — it is
        the goal.
      </p>

      <ol className="flex flex-col gap-3">
        {LADDER_LEVELS.map((rung, idx) => {
          const isUnlocked = unlocked.has(rung.id);
          const prevUnlocked = idx === 0 || unlocked.has(LADDER_LEVELS[idx - 1].id);
          const available = !isUnlocked && prevUnlocked;
          const isAnswer = rung.id === "answer";

          return (
            <li
              key={rung.id}
              className={cn(
                "border p-4 transition-colors",
                isUnlocked
                  ? "border-border bg-secondary/20"
                  : available
                    ? "border-border"
                    : "border-border/50 opacity-50"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "font-mono text-[11px] uppercase tracking-[0.16em]",
                      isUnlocked ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Rung {idx + 1} — {rung.name}
                  </span>
                </div>

                {!isUnlocked &&
                  (available ? (
                    isAnswer && confirmingAnswer ? (
                      <span className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onUnlock(rung.id, rungContent(drill, rung.id));
                            setConfirmingAnswer(false);
                          }}
                        >
                          Yes — I attempted first
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingAnswer(false)}
                        >
                          Not yet
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isAnswer
                            ? setConfirmingAnswer(true)
                            : onUnlock(rung.id, rungContent(drill, rung.id))
                        }
                      >
                        {isAnswer ? "Show the full answer" : `Reveal ${rung.name.toLowerCase()}`}
                      </Button>
                    )
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Locked
                    </span>
                  ))}
              </div>

              {!isUnlocked && (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {rung.gives}
                </p>
              )}

              <AnimatePresence initial={false}>
                {isUnlocked && (
                  <Reveal>
                    <div className="pt-3">
                      <AIBox>
                        <p className="whitespace-pre-wrap">
                          {rungContent(drill, rung.id)}
                        </p>
                      </AIBox>

                      {rung.id === "evidence" && (
                        <ul className="mt-3 flex flex-col gap-3">
                          {verifications.map((check, i) => (
                            <li
                              key={i}
                              className="border border-dashed border-muted-foreground/40 p-4"
                            >
                              <p className="text-sm leading-6">{check.claim}</p>
                              <p className="mt-2 font-mono text-[11px] leading-5 text-muted-foreground">
                                {check.source}
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Your check:
                                </span>
                                <Button
                                  variant={check.verdict === "held" ? "secondary" : "ghost"}
                                  size="xs"
                                  aria-pressed={check.verdict === "held"}
                                  className={cn(
                                    check.verdict === "held" &&
                                      "border-foreground/30 text-foreground"
                                  )}
                                  onClick={() => onVerdict(i, "held")}
                                >
                                  <Check data-icon="inline-start" /> Held up
                                </Button>
                                <Button
                                  variant={check.verdict === "failed" ? "destructive" : "ghost"}
                                  size="xs"
                                  aria-pressed={check.verdict === "failed"}
                                  onClick={() => onVerdict(i, "failed")}
                                >
                                  <X data-icon="inline-start" /> Didn&apos;t hold
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Reveal>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
