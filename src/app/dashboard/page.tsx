"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  RETRIEVAL_RUBRIC,
  biasScore,
  calibrationScore,
  scoreBand,
  scoreTest,
} from "@/lib/autonomy";
import { CHART, LAST_WEEK, THIS_WEEK, WEEKS } from "@/lib/mock-data";
import { completeRecall, useStore } from "@/lib/store";
import type { AutonomyTestResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONO = "var(--font-geist-mono), monospace";

const AXIS_TICK = { fill: CHART.axis, fontSize: 11, fontFamily: MONO };

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
  labelPrefix = "Week of",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
  suffix?: string;
  labelPrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover px-3 py-2 shadow-none">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {labelPrefix} {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-1 flex items-center gap-2 text-sm">
          <span
            className="size-2"
            style={{ background: entry.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono tabular-nums">
            {entry.value}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  delta,
  deltaGoodWhen,
  caption,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta: number;
  deltaGoodWhen: "up" | "down";
  caption: string;
}) {
  const improving = deltaGoodWhen === "up" ? delta > 0 : delta < 0;
  return (
    <div className="rule-tick pt-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-4xl tabular-nums tracking-tight">
        {value}
        {suffix && (
          <span className="text-xl text-muted-foreground">{suffix}</span>
        )}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        <span className={cn("font-mono", improving ? "text-foreground" : "text-primary")}>
          {delta > 0 ? "+" : ""}
          {delta}
        </span>{" "}
        vs last week · {caption}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  question,
  legend,
  children,
}: {
  title: string;
  question: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
          {title}
        </h3>
        {legend && (
          <span className="flex items-center gap-4">
            {legend.map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                <span className="size-2" style={{ background: l.color }} aria-hidden />
                {l.label}
              </span>
            ))}
          </span>
        )}
      </div>
      <p className="mt-1 mb-4 text-xs leading-5 text-muted-foreground">{question}</p>
      <div className="h-52">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Autonomy score — real data from the test, not sample                */
/* ------------------------------------------------------------------ */

function AutonomyDimension({
  label,
  score,
  detail,
}: {
  label: string;
  score: number | null;
  detail: string;
}) {
  return (
    <div className="border-b border-border py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono tabular-nums">
          {score === null ? "—" : score}
        </span>
      </div>
      <div className="mt-2 h-1 w-full bg-border" role="presentation">
        <div
          className="h-1 bg-primary"
          style={{ width: `${score === null ? 0 : score}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function AutonomyTrend({ tests }: { tests: AutonomyTestResult[] }) {
  const data = tests.map((t, i) => ({
    attempt: `#${i + 1}`,
    score: scoreTest(t).composite,
    date: new Date(t.startedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  if (data.length < 2) {
    return (
      <div className="flex h-full min-h-40 items-center border border-border p-5">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          One attempt on record. A single autonomy score is a reading, not a
          trend — take the test again in a week and this becomes a line.
        </p>
      </div>
    );
  }

  return (
    <div className="h-52 border border-border p-5">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
        Autonomy score over attempts
      </p>
      <div className="h-[calc(100%-2rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
            />
            <YAxis
              domain={[0, 100]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip
              content={<ChartTooltip labelPrefix="Taken" />}
              cursor={{ stroke: CHART.reference }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Autonomy score"
              stroke={CHART.signal}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART.signal, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AutonomyBlock() {
  const store = useStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setNow(Date.now());
  }, []);

  if (!mounted) return null;

  const tests = store.autonomyTests;
  const latest = tests.length > 0 ? tests[tests.length - 1] : undefined;

  if (!latest) {
    return (
      <section aria-label="Autonomy score" className="mb-14">
        <div className="rule-tick flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="max-w-lg">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Autonomy score
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              No attempts yet. The test scores calibration, automation bias,
              and the gap between your assisted and unaided work into one
              number — the only figure on this page that starts as real data.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Take the test</Link>
          </Button>
        </div>
      </section>
    );
  }

  const score = scoreTest(latest);
  const previous =
    tests.length > 1 ? scoreTest(tests[tests.length - 2]).composite : null;
  const delta = previous === null ? null : score.composite - previous;
  const cal = calibrationScore(latest.calibration);
  const probe = biasScore(latest.bias);
  const r = latest.retrieval;
  const probeDue =
    !r.completedAt && now >= new Date(r.dueAt).getTime();

  return (
    <section aria-label="Autonomy score" className="mb-14">
      <div className="rule-tick flex items-baseline justify-between pt-4 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Autonomy score — your data
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {tests.length} attempt{tests.length === 1 ? "" : "s"} on record
        </p>
      </div>

      {probeDue && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-primary/60 bg-primary/[0.06] p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              Retrieval probe due — the score is still provisional
            </p>
            <p className="mt-1 text-sm">
              Ten minutes are up. The unaided variant is unlocked.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/">Finish the test</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Composite
          </p>
          <p className="mt-2 font-mono text-6xl tabular-nums leading-none tracking-tight text-primary">
            {score.composite}
            <span className="text-2xl text-muted-foreground">/100</span>
          </p>
          <p className="font-display mt-3 text-2xl italic tracking-tight">
            {score.provisional ? "Provisional" : scoreBand(score.composite)}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {delta === null
              ? "First attempt — the baseline you will be measured against."
              : `${delta > 0 ? "+" : ""}${delta} vs your previous attempt`}
            {score.provisional
              ? " · the retrieval gap is still open, so this number will move."
              : ""}
          </p>
        </div>

        <div className="flex flex-col">
          <AutonomyDimension
            label="Calibration"
            score={score.calibration}
            detail={`${cal.correct}/${cal.total} correct · confidence ${
              cal.gap > 0 ? `+${cal.gap} ahead of` : cal.gap < 0 ? `${cal.gap} behind` : "level with"
            } accuracy`}
          />
          <AutonomyDimension
            label="Automation bias"
            score={score.bias}
            detail={`${probe.caught}/${probe.errors} planted errors caught · ${probe.falseFlags} false alarm${probe.falseFlags === 1 ? "" : "s"}`}
          />
          <AutonomyDimension
            label="Retrieval gap"
            score={score.retention}
            detail={
              score.retention === null
                ? `Assisted ${r.assistedPoints}/${RETRIEVAL_RUBRIC.length} · unaided variant pending`
                : `${r.unaidedPoints}/${RETRIEVAL_RUBRIC.length} unaided vs ${r.assistedPoints}/${RETRIEVAL_RUBRIC.length} assisted`
            }
          />
        </div>

        <AutonomyTrend tests={tests} />
      </div>
    </section>
  );
}

function RecallStrip() {
  const store = useStore();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setNow(Date.now());
  }, []);

  if (!mounted) return null;

  const due = store.recallTests.filter(
    (t) => !t.completedAt && new Date(t.dueAt).getTime() <= now
  );
  const done = store.sessions.filter((s) => s.phase === "complete");

  return (
    <section aria-label="Your sessions" className="mt-14">
      <div className="rule-tick flex items-baseline justify-between pt-4 pb-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Your record — real data, not sample
        </h2>
      </div>

      {due.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {due.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-primary/60 bg-primary/[0.06] p-4"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  Recall due — answer unaided first
                </p>
                <p className="mt-1 text-sm">
                  {t.taskTitle}: can you still reproduce the reasoning without
                  any help?
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => completeRecall(t.id, true)}>
                  I could
                </Button>
                <Button size="sm" variant="destructive" onClick={() => completeRecall(t.id, false)}>
                  I couldn&apos;t
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border p-5">
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            No completed sessions yet. Your unaided scores, verification log,
            and calibration record start with the first drill.
          </p>
          <Button asChild>
            <Link href="/learn">Start a Learn session</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {done
            .slice(-6)
            .reverse()
            .map((s) => {
              const checked = s.verifications.filter((v) => v.verdict).length;
              const recall = store.recallTests.find((t) => t.sessionId === s.id);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3"
                >
                  <span className="text-sm">{s.task.title}</span>
                  <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {s.ladder.length}/4 rungs · conf {s.firstPass?.confidence}→
                    {s.synthesis?.postConfidence} · {s.synthesis?.selfGrade}
                    {checked > 0 ? ` · ${checked} claims checked` : ""}
                    {recall?.completedAt
                      ? ` · recall ${recall.passed ? "passed" : "failed"}`
                      : ""}
                  </span>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col pt-16">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Weekly dashboard
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
            What stays when the model leaves
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Firsthand never scores your assisted output — only retained
            capability: unaided recall, verification skill, and how honestly
            your confidence tracks your record.
          </p>
        </div>
      </header>

      <AutonomyBlock />

      <div className="rule-tick flex flex-wrap items-baseline justify-between gap-3 pt-4 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Weekly training metrics
        </p>
        <p className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Sample data — 8 weeks
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Unaided score"
          value={String(THIS_WEEK.unaidedScore)}
          delta={THIS_WEEK.unaidedScore - LAST_WEEK.unaidedScore}
          deltaGoodWhen="up"
          caption="delayed recall + transfer, no AI in the room"
        />
        <StatTile
          label="Verification accuracy"
          value={String(THIS_WEEK.verificationAccuracy)}
          suffix="%"
          delta={THIS_WEEK.verificationAccuracy - LAST_WEEK.verificationAccuracy}
          deltaGoodWhen="up"
          caption="planted errors caught when checking AI claims"
        />
        <StatTile
          label="Calibration gap"
          value={`+${THIS_WEEK.calibrationGap.toFixed(1)}`}
          delta={Number((THIS_WEEK.calibrationGap - LAST_WEEK.calibrationGap).toFixed(1))}
          deltaGoodWhen="down"
          caption="still overconfident — the gap is closing"
        />
        <StatTile
          label="First-pass-first"
          value={String(THIS_WEEK.firstPassRate)}
          suffix="%"
          delta={THIS_WEEK.firstPassRate - LAST_WEEK.firstPassRate}
          deltaGoodWhen="up"
          caption="AI consultations that came after a sealed attempt"
        />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Unaided score"
          question="When the AI is gone, what do you still hold? Weekly composite of delayed recall and unaided transfer."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={WEEKS} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.reference }} />
              <Line
                type="monotone"
                dataKey="unaidedScore"
                name="Unaided score"
                stroke={CHART.signal}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.signal, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Calibration gap"
          question="Sealed confidence minus outcome. Above zero is overconfidence; the goal is the line, not the floor."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={WEEKS} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis domain={[-2, 2]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.reference }} />
              <ReferenceLine
                y={0}
                stroke={CHART.reference}
                strokeDasharray="4 4"
                label={{
                  value: "calibrated",
                  position: "insideBottomRight",
                  fill: CHART.axis,
                  fontSize: 10,
                  fontFamily: MONO,
                }}
              />
              <Line
                type="monotone"
                dataKey="calibrationGap"
                name="Calibration gap"
                stroke={CHART.signal}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.signal, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="AI claims you checked"
          question="The verification loop: claims you traced to a source, and what you found."
          legend={[
            { label: "Held up", color: CHART.held },
            { label: "Didn't hold", color: CHART.signal },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKS} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(236,231,223,0.04)" }} />
              <Bar
                dataKey="claimsHeld"
                name="Held up"
                stackId="claims"
                fill={CHART.held}
                stroke={CHART.surface}
                strokeWidth={1}
              />
              <Bar
                dataKey="claimsFailed"
                name="Didn't hold"
                stackId="claims"
                fill={CHART.signal}
                stroke={CHART.surface}
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="First-pass-first rate"
          question="Of every AI consultation, how often your own attempt was sealed before the model spoke."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKS} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} />
              <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: "rgba(236,231,223,0.04)" }} />
              <Bar
                dataKey="firstPassRate"
                name="First-pass-first"
                fill={CHART.signal}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <details className="mt-8 border border-border">
        <summary className="cursor-pointer px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
          View the numbers as a table
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Week</th>
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Unaided</th>
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Verif. acc.</th>
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Held / failed</th>
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Calib. gap</th>
                <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">First-pass</th>
              </tr>
            </thead>
            <tbody>
              {WEEKS.map((w) => (
                <tr key={w.week} className="border-b border-border/50 font-mono tabular-nums">
                  <td className="px-5 py-2">{w.week}</td>
                  <td className="px-5 py-2">{w.unaidedScore}</td>
                  <td className="px-5 py-2">{w.verificationAccuracy}%</td>
                  <td className="px-5 py-2">
                    {w.claimsHeld} / {w.claimsFailed}
                  </td>
                  <td className="px-5 py-2">+{w.calibrationGap.toFixed(1)}</td>
                  <td className="px-5 py-2">{w.firstPassRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <RecallStrip />
    </div>
  );
}
