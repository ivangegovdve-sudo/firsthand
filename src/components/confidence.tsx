"use client";

import { cn } from "@/lib/utils";

export const CONFIDENCE_LABELS = [
  "Guessing",
  "Unsure",
  "Leaning",
  "Confident",
  "Certain",
] as const;

export function ConfidencePicker({
  value,
  onChange,
  idPrefix,
}: {
  value: number | null;
  onChange: (v: number) => void;
  idPrefix: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Confidence, 1 to 5"
      className="grid grid-cols-5 gap-1"
    >
      {CONFIDENCE_LABELS.map((label, i) => {
        const v = i + 1;
        const selected = value === v;
        return (
          <button
            key={v}
            id={`${idPrefix}-${v}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={cn(
              "flex flex-col items-center gap-1 border px-1 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
            )}
          >
            <span className="font-mono text-sm">{v}</span>
            <span className="text-[10px] leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ConfidenceNotches({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={`Confidence ${value} of 5 — ${CONFIDENCE_LABELS[value - 1]}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-2.5 w-1",
            i < value ? "bg-primary" : "bg-border"
          )}
        />
      ))}
      <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {CONFIDENCE_LABELS[value - 1]}
      </span>
    </span>
  );
}
