"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { AutonomyTest } from "@/components/autonomy-test";
import { Button } from "@/components/ui/button";
import { scoreBand, scoreTest } from "@/lib/autonomy";
import { MODES } from "@/lib/modes";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function RestraintNotches({ level }: { level: number }) {
  return (
    <span
      className="flex items-center gap-1"
      title={`AI restraint: ${level} of 4`}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-3 w-1",
            i < level ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </span>
  );
}

/** The swappable panel's default face: hero, mode ladder, mechanism strip. */
function HomePanel({ onStartTest }: { onStartTest: () => void }) {
  const store = useStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  const tests = store.autonomyTests;
  const latest = tests.length > 0 ? tests[tests.length - 1] : undefined;
  const open = tests.filter((t) => !t.retrieval.completedAt).slice(-1)[0];
  const probeDue =
    open !== undefined && now >= new Date(open.retrieval.dueAt).getTime();

  const cta = !mounted
    ? { label: "Take the test", urgent: false }
    : probeDue
      ? { label: "Retrieval probe due — finish the test", urgent: true }
      : open
        ? { label: "Test in progress — check the gap", urgent: false }
        : latest
          ? { label: "Retake the test", urgent: false }
          : { label: "Take the test", urgent: false };

  const score = latest ? scoreTest(latest) : null;

  return (
    <div className="flex flex-col">
      {/* Hero — the thesis */}
      <section className="pt-20 pb-16 sm:pt-28">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          A training instrument for cognitive autonomy
        </p>
        <h1 className="font-display max-w-3xl text-balance text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Keep the thinking.
          <br />
          <span className="italic text-primary">Delegate the rest.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground">
          AI erodes a skill only when it replaces the operation you needed to
          practice — retrieval, judgment, divergence. Firsthand structures
          every AI interaction so your first pass goes on record{" "}
          <span className="text-foreground">before the model says a word.</span>
        </p>
      </section>

      {/* Autonomy test — the diagnostic, swaps this panel out */}
      <section
        aria-labelledby="test-heading"
        className={cn(
          "flex flex-wrap items-center justify-between gap-6 border p-5 sm:p-6",
          cta.urgent ? "border-primary/60 bg-primary/[0.06]" : "border-border"
        )}
      >
        <div className="max-w-xl">
          <p
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.18em]",
              cta.urgent ? "text-primary" : "text-muted-foreground"
            )}
          >
            Autonomy test — three dimensions, twelve minutes
          </p>
          <h2
            id="test-heading"
            className="font-display mt-3 text-2xl tracking-tight sm:text-3xl"
          >
            Before you train, measure.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Calibration, automation bias, and the retrieval gap between your
            assisted and unaided work — scored into one number, tracked over
            time. All content is preset; no AI is called.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          {mounted && score && (
            <div className="sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Your last score
              </p>
              <p className="font-mono text-4xl tabular-nums leading-none tracking-tight text-primary">
                {score.composite}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {score.provisional ? "Provisional" : scoreBand(score.composite)}
              </p>
            </div>
          )}
          <Button onClick={onStartTest}>{cta.label}</Button>
        </div>
      </section>

      {/* Mode ladder — ordered by how much the AI withholds */}
      <section aria-labelledby="modes-heading" className="mt-16">
        <div className="rule-tick flex items-baseline justify-between pt-4 pb-2">
          <h2
            id="modes-heading"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Choose a mode for this task
          </h2>
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            Ordered by AI restraint
          </p>
        </div>

        <ul className="flex flex-col">
          {MODES.map((mode) => (
            <li key={mode.id} className="border-b border-border">
              <Link
                href={`/${mode.id}`}
                className="group grid grid-cols-1 gap-4 py-8 outline-none transition-colors focus-visible:bg-secondary/60 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:py-9"
              >
                <div className="flex items-baseline gap-4">
                  <h3 className="font-display text-3xl tracking-tight transition-colors group-hover:text-primary">
                    {mode.name}
                  </h3>
                  {mode.live ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                      Live
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Next
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    AI withholds:{" "}
                    <span className="text-foreground">{mode.withholds}</span>
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {mode.tagline}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <RestraintNotches level={mode.restraint} />
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Why this exists — mechanism strip */}
      <section className="mt-20 grid gap-10 sm:grid-cols-3">
        <div className="rule-tick pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The mechanism
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Offloading a cognitive operation reduces later unaided access to
            it. Assisted output rises while retained capability falls — the
            gap stays invisible until the AI is gone.
          </p>
        </div>
        <div className="rule-tick pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The countermeasure
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Generate before you consult. Verify before you trust. Log your
            judgment before the recommendation. Each mode enforces one of
            these at the workflow level.
          </p>
        </div>
        <div className="rule-tick pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The measure
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Firsthand never scores your assisted output. It tracks what stays
            when the model leaves: unaided recall, verification accuracy, and
            the gap between your confidence and the record.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [panel, setPanel] = useState<"home" | "test">("home");
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={panel}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {panel === "home" ? (
        <HomePanel onStartTest={() => setPanel("test")} />
      ) : (
        <AutonomyTest onExit={() => setPanel("home")} />
      )}
    </motion.div>
  );
}
