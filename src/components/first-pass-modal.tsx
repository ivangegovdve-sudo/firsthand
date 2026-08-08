"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfidencePicker } from "@/components/confidence";
import type { FirstPass } from "@/lib/types";

/**
 * The non-skippable gate: nothing AI-generated is shown until the user's
 * answer, confidence, and reasoning are sealed. Escape and outside clicks
 * are disabled by design; the only exits are sealing or abandoning the
 * session entirely.
 */
export function FirstPassModal({
  open,
  prompt,
  onSeal,
  onAbandon,
}: {
  open: boolean;
  prompt: string;
  onSeal: (fp: FirstPass) => void;
  onAbandon: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  const ready =
    answer.trim().length > 0 && reasoning.trim().length > 0 && confidence !== null;

  function seal() {
    if (!ready || confidence === null) return;
    onSeal({
      answer: answer.trim(),
      confidence,
      reasoning: reasoning.trim(),
      sealedAt: new Date().toISOString(),
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            First pass — before any AI
          </p>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            What do you think?
          </DialogTitle>
          <DialogDescription>{prompt}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-answer">Your answer</Label>
            <Textarea
              id="fp-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Commit to a position, even a tentative one."
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-confidence-1">How confident are you?</Label>
            <ConfidencePicker
              idPrefix="fp-confidence"
              value={confidence}
              onChange={setConfidence}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-reasoning">Your reasoning</Label>
            <Textarea
              id="fp-reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why do you believe that? What would change your mind?"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              disabled={!ready}
              onClick={seal}
              className="w-full"
            >
              Seal my first pass
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sealing is permanent for this session. The ladder unlocks only
              after your judgment is on record.
            </p>
          </div>

          <div className="border-t border-border pt-3 text-center">
            {confirmingAbandon ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Discard this session?
                </span>
                <Button variant="destructive" size="sm" onClick={onAbandon}>
                  Abandon
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingAbandon(false)}
                >
                  Keep going
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingAbandon(true)}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Abandon session — the only way out without sealing
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
