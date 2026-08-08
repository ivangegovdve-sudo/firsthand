"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfidencePicker } from "@/components/confidence";
import type { RecallInterval, Synthesis } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADES: { id: NonNullable<Synthesis["selfGrade"]>; label: string }[] = [
  { id: "correct", label: "Held up" },
  { id: "partial", label: "Partly right" },
  { id: "wrong", label: "Wrong" },
];

const INTERVALS: { id: RecallInterval; label: string; hint: string }[] = [
  { id: "10m", label: "10 minutes", hint: "same sitting" },
  { id: "1d", label: "1 day", hint: "overnight" },
  { id: "1w", label: "1 week", hint: "durable" },
];

export function SynthesisPanel({
  onComplete,
}: {
  onComplete: (synthesis: Synthesis, recall: RecallInterval) => void;
}) {
  const [explanation, setExplanation] = useState("");
  const [postConfidence, setPostConfidence] = useState<number | null>(null);
  const [selfGrade, setSelfGrade] = useState<Synthesis["selfGrade"]>();
  const [recall, setRecall] = useState<RecallInterval | null>(null);

  const ready =
    explanation.trim().length > 0 &&
    postConfidence !== null &&
    selfGrade !== undefined &&
    recall !== null;

  return (
    <section aria-label="Synthesis" className="flex flex-col gap-6">
      <div className="rule-tick pt-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Synthesis — in your own words
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The explanation you write yourself is the part you keep. Three
          sentences, include one thing you are still uncertain about.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="syn-explanation">Final explanation</Label>
        <Textarea
          id="syn-explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Your own words — not the model's. End with the uncertainty you'd check next."
          rows={5}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="syn-confidence-1">Confidence now, after the ladder</Label>
        <ConfidencePicker
          idPrefix="syn-confidence"
          value={postConfidence}
          onChange={setPostConfidence}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Your sealed first pass — how did it hold up?</Label>
        <div className="grid grid-cols-3 gap-1">
          {GRADES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelfGrade(g.id)}
              aria-pressed={selfGrade === g.id}
              className={cn(
                "border px-2 py-2 text-sm transition-colors",
                selfGrade === g.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Delayed recall — when should Firsthand test you unaided?</Label>
        <div className="grid grid-cols-3 gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.id}
              type="button"
              onClick={() => setRecall(iv.id)}
              aria-pressed={recall === iv.id}
              className={cn(
                "flex flex-col items-center gap-0.5 border px-2 py-2 transition-colors",
                recall === iv.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm">{iv.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {iv.hint}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Retrieval after a delay is the best-replicated move in learning
          science. The test appears on your dashboard when due.
        </p>
      </div>

      <Button
        size="lg"
        disabled={!ready}
        onClick={() => {
          if (!ready || postConfidence === null || !recall) return;
          onComplete(
            {
              explanation: explanation.trim(),
              postConfidence,
              selfGrade,
            },
            recall
          );
        }}
      >
        Complete session
      </Button>
    </section>
  );
}
