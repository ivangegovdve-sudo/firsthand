"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMode } from "@/lib/modes";
import { DRILLS, type Drill } from "@/lib/drills";
import {
  abandonSession,
  activeSession,
  newId,
  upsertSession,
  useStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = [5, 10, 15, 20];

function DrillCard({
  drill,
  onStart,
  disabled,
}: {
  drill: Drill;
  onStart: (drill: Drill, minutes: number) => void;
  disabled: boolean;
}) {
  const [minutes, setMinutes] = useState(drill.defaultMinutes);
  const [open, setOpen] = useState(false);

  return (
    <li className="border border-border p-5 transition-colors hover:border-muted-foreground/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl tracking-tight">{drill.title}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              Capability you keep:{" "}
            </span>
            {drill.capability}
          </p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)} disabled={disabled}>
            Begin <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Time box — the session ends explicitly, never drifts
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={cn(
                  "border px-3 py-1.5 font-mono text-xs transition-colors",
                  minutes === m
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {m} min
              </button>
            ))}
            <span className="mx-2 h-4 w-px bg-border" aria-hidden />
            <Button onClick={() => onStart(drill, minutes)} disabled={disabled}>
              Start — question appears with the clock running
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function LearnPage() {
  const router = useRouter();
  const store = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true), []);

  const mode = getMode("learn")!;
  const active = mounted
    ? store.sessions.find((s) => s.phase !== "complete" && s.mode === "learn")
    : undefined;

  function start(drill: Drill, minutes: number) {
    if (activeSession("learn")) return;
    const id = newId();
    upsertSession({
      id,
      mode: "learn",
      phase: "firstpass",
      startedAt: new Date().toISOString(),
      task: {
        title: drill.title,
        capability: drill.capability,
        timeLimitMin: minutes,
        drillId: drill.id,
      },
      ladder: [],
      verifications: [],
    });
    router.push("/learn/session");
  }

  return (
    <div className="flex flex-col">
      <section className="pt-16 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Learn mode · AI withholds: {mode.withholds.toLowerCase()}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
          You attempt first.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          {mode.useWhen} The model never answers before you do — it hints,
          critiques, and cites, one deliberate rung at a time.
        </p>
      </section>

      {active && (
        <section className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-primary/60 bg-primary/[0.06] p-4">
          <p className="text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              Session in progress ·{" "}
            </span>
            {active.task.title}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push("/learn/session")}>
              Resume
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => abandonSession(active.id)}
            >
              Abandon
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="drills-heading">
        <div className="rule-tick flex items-baseline justify-between pt-4 pb-4">
          <h2
            id="drills-heading"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Starter drills — the science of your own attention
          </h2>
        </div>
        <ul className="flex flex-col gap-4">
          {DRILLS.map((d) => (
            <DrillCard
              key={d.id}
              drill={d}
              onStart={start}
              disabled={!!active}
            />
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Each drill teaches one mechanism this app is built to counteract —
          you learn the evidence by attempting it, not by reading it.
        </p>
      </section>

      <section className="mt-16 grid gap-10 sm:grid-cols-2">
        <div className="rule-tick pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The protocol
          </h3>
          <ol className="mt-3 flex flex-col gap-2">
            {mode.protocol.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <span className="font-mono text-[11px] leading-6 text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="rule-tick pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Why this order
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode.evidence}</p>
        </div>
      </section>
    </div>
  );
}
