"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfidenceNotches, CONFIDENCE_LABELS } from "@/components/confidence";
import { FirstPassModal } from "@/components/first-pass-modal";
import { HintLadder } from "@/components/hint-ladder";
import { SealedCard } from "@/components/sealed-card";
import { SynthesisPanel } from "@/components/synthesis-panel";
import { getDrill } from "@/lib/drills";
import {
  abandonSession,
  activeSession,
  scheduleRecall,
  upsertSession,
  useStore,
} from "@/lib/store";
import type {
  FirstPass,
  LadderLevelId,
  RecallInterval,
  Session,
  Synthesis,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SessionClock({ session }: { session: Session }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadline =
    new Date(session.startedAt).getTime() + session.task.timeLimitMin * 60_000;
  const remaining = deadline - now;
  const over = remaining < 0;

  return (
    <div className="text-right">
      <p
        className={cn(
          "font-mono text-2xl tabular-nums",
          over ? "text-primary" : "text-foreground"
        )}
        aria-live="off"
      >
        {over ? `+${formatClock(remaining)}` : formatClock(remaining)}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {over ? "Over the box — wrap up" : `of ${session.task.timeLimitMin} min box`}
      </p>
    </div>
  );
}

const GRADE_SCORE = { correct: 5, partial: 3, wrong: 1 } as const;

function Summary({ session }: { session: Session }) {
  const fp = session.firstPass!;
  const syn = session.synthesis!;
  const held = session.verifications.filter((v) => v.verdict === "held").length;
  const failed = session.verifications.filter((v) => v.verdict === "failed").length;
  const unchecked = session.verifications.filter((v) => !v.verdict).length;
  const gap = syn.selfGrade ? fp.confidence - GRADE_SCORE[syn.selfGrade] : 0;

  const durationMin = session.completedAt
    ? Math.max(
        1,
        Math.round(
          (new Date(session.completedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            60_000
        )
      )
    : session.task.timeLimitMin;

  return (
    <section aria-label="Session summary" className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          Session complete — ended explicitly, as always
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight">
          {session.task.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {durationMin} min of a {session.task.timeLimitMin} min box ·{" "}
          {session.ladder.length}/4 rungs used
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rule-tick pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Calibration
          </h2>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Sealed</span>
              <ConfidenceNotches value={fp.confidence} />
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">After ladder</span>
              <ConfidenceNotches value={syn.postConfidence} />
            </span>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {gap > 0
                ? `Overconfident by ${gap} — you sealed at "${CONFIDENCE_LABELS[fp.confidence - 1]}" and graded yourself ${syn.selfGrade}.`
                : gap < 0
                  ? `Underconfident by ${Math.abs(gap)} — you knew more than you trusted.`
                  : "Well calibrated — confidence matched the outcome."}
            </p>
          </div>
        </div>

        <div className="rule-tick pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Verification
          </h2>
          <p className="mt-3 font-mono text-2xl tabular-nums">
            {held + failed}
            <span className="text-muted-foreground">
              /{session.verifications.length}
            </span>
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            claims checked — {held} held, {failed} didn&apos;t
            {unchecked > 0 ? `, ${unchecked} taken on trust` : ""}
          </p>
        </div>

        <div className="rule-tick pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Recall test
          </h2>
          <p className="mt-3 text-sm leading-6">
            Scheduled in{" "}
            <span className="font-mono text-primary">
              {session.recallInterval === "10m"
                ? "10 minutes"
                : session.recallInterval === "1d"
                  ? "1 day"
                  : "1 week"}
            </span>
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            It appears on your dashboard when due. Answer unaided — that score
            is the one that counts.
          </p>
        </div>
      </div>

      <SealedCard firstPass={fp} />

      <div className="border border-border p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
          Your synthesis
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
          {syn.explanation}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard">See your dashboard</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to modes</Link>
        </Button>
      </div>
    </section>
  );
}

export default function LearnSessionPage() {
  const router = useRouter();
  const store = useStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [justSealed, setJustSealed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const active = activeSession("learn");
    if (active) setSessionId(active.id);
  }, []);

  const session = store.sessions.find((s) => s.id === sessionId);
  const drill = session?.task.drillId ? getDrill(session.task.drillId) : undefined;

  if (!mounted) {
    return <div className="pt-24" aria-busy="true" />;
  }

  if (!session || !drill) {
    return (
      <div className="flex flex-col items-start gap-4 pt-24">
        <h1 className="font-display text-3xl tracking-tight">
          No session in progress
        </h1>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Sessions start from a drill, with a goal and a time box. Nothing here
          runs on autopilot.
        </p>
        <Button asChild>
          <Link href="/learn">Choose a drill</Link>
        </Button>
      </div>
    );
  }

  function update(patch: Partial<Session>) {
    if (!session) return;
    upsertSession({ ...session, ...patch });
  }

  function seal(fp: FirstPass) {
    setJustSealed(true);
    update({ firstPass: fp, phase: "ladder" });
  }

  function unlock(level: LadderLevelId, aiResponse: string) {
    if (!session || !drill) return;
    const patch: Partial<Session> = {
      ladder: [
        ...session.ladder,
        { level, unlockedAt: new Date().toISOString(), aiResponse },
      ],
    };
    if (level === "evidence" && session.verifications.length === 0) {
      patch.verifications = drill.evidence.map((e) => ({
        claim: e.claim,
        source: e.source,
      }));
    }
    update(patch);
  }

  function verdict(i: number, v: "held" | "failed") {
    if (!session) return;
    update({
      verifications: session.verifications.map((c, idx) =>
        idx === i ? { ...c, verdict: c.verdict === v ? undefined : v } : c
      ),
    });
  }

  function complete(synthesis: Synthesis, recall: RecallInterval) {
    if (!session) return;
    const done: Session = {
      ...session,
      synthesis,
      recallInterval: recall,
      phase: "complete",
      completedAt: new Date().toISOString(),
    };
    upsertSession(done);
    scheduleRecall(done, recall);
  }

  if (session.phase === "complete") {
    return (
      <div className="pt-16 pb-8">
        <Summary session={session} />
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-12 pb-8">
      {/* Session header — goal and time always visible */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Learn session · {session.phase === "firstpass" ? "first pass" : session.phase}
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            {session.task.title}
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              Keeping:{" "}
            </span>
            {session.task.capability}
          </p>
        </div>
        <SessionClock session={session} />
      </header>

      {/* The question, always visible once sealed */}
      <section className="border-b border-border py-8">
        <p className="font-display max-w-2xl text-balance text-2xl leading-snug tracking-tight">
          {drill.prompt}
        </p>
      </section>

      {session.phase === "firstpass" && (
        <FirstPassModal
          open
          prompt={drill.prompt}
          onSeal={seal}
          onAbandon={() => {
            abandonSession(session.id);
            router.push("/learn");
          }}
        />
      )}

      {session.phase !== "firstpass" && session.firstPass && (
        <div className="flex flex-col gap-8 pt-8">
          <SealedCard firstPass={session.firstPass} animateIn={justSealed} />

          {session.phase === "ladder" && (
            <>
              <HintLadder
                drill={drill}
                steps={session.ladder}
                verifications={session.verifications}
                onUnlock={unlock}
                onVerdict={verdict}
              />
              <div className="flex items-center justify-between border-t border-border pt-6">
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                  Done climbing? The session ends with your own words, not the
                  model&apos;s.
                </p>
                <Button size="lg" onClick={() => update({ phase: "synthesis" })}>
                  End session — write synthesis
                </Button>
              </div>
            </>
          )}

          {session.phase === "synthesis" && <SynthesisPanel onComplete={complete} />}
        </div>
      )}
    </div>
  );
}
