import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MODES } from "@/lib/modes";
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

export default function Home() {
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

      {/* Mode ladder — ordered by how much the AI withholds */}
      <section aria-labelledby="modes-heading">
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
