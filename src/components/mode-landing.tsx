import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMode } from "@/lib/modes";
import type { ModeId } from "@/lib/types";

/** Landing template for modes that are specified but not yet interactive. */
export function ModeLanding({ id }: { id: ModeId }) {
  const mode = getMode(id)!;

  return (
    <div className="flex flex-col">
      <section className="pt-16 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {mode.name} mode · AI withholds: {mode.withholds.toLowerCase()}
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-balance text-4xl tracking-tight sm:text-5xl">
          {mode.tagline}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          {mode.useWhen}
        </p>
      </section>

      <section className="mb-10 flex flex-wrap items-center justify-between gap-4 border border-border p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
            Ships next
          </p>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            The protocol below is final — the interactive session is being
            built on the same spine as Learn mode.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/learn">Train in Learn mode meanwhile</Link>
        </Button>
      </section>

      <section className="grid gap-10 sm:grid-cols-2">
        <div className="rule-tick pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The protocol
          </h2>
          <ol className="mt-3 flex flex-col gap-2">
            {mode.protocol.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-6 text-muted-foreground"
              >
                <span className="font-mono text-[11px] leading-6 text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="rule-tick pt-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            The evidence
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {mode.evidence}
          </p>
        </div>
      </section>
    </div>
  );
}
