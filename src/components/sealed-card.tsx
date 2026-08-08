"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { FirstPass } from "@/lib/types";
import { ConfidenceNotches } from "@/components/confidence";
import { OriginTag } from "@/components/origin";

function formatSealTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The sealed first pass — on record before any AI output was visible. */
export function SealedCard({
  firstPass,
  animateIn = false,
}: {
  firstPass: FirstPass;
  animateIn?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      aria-label="Your sealed first pass"
      initial={animateIn && !reduceMotion ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative border border-primary/70 bg-primary/[0.04] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OriginTag origin="yours" />
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
          Sealed · {formatSealTime(firstPass.sealedAt)}
        </p>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {firstPass.answer}
      </p>

      <div className="mt-4 border-t border-primary/20 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Your reasoning
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {firstPass.reasoning}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <ConfidenceNotches value={firstPass.confidence} />
      </div>

      {/* Corner seal mark */}
      <span
        aria-hidden
        className="absolute -top-px -right-px size-3 bg-primary"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />
    </motion.section>
  );
}
