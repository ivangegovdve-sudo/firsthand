import { cn } from "@/lib/utils";

/**
 * The origin boundary is Firsthand's signature: everything the user authors
 * is sealed in solid red; everything generated is quarantined behind a
 * dashed border and an AI tag. The two treatments never mix.
 */
export function OriginTag({ origin }: { origin: "yours" | "ai" }) {
  return origin === "yours" ? (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
      <span className="size-1.5 bg-primary" aria-hidden />
      Yours
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      <span
        className="size-1.5 border border-dashed border-muted-foreground"
        aria-hidden
      />
      AI-generated
    </span>
  );
}

export function AIBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-muted-foreground/40 bg-secondary/30 p-4",
        className
      )}
    >
      <OriginTag origin="ai" />
      <div className="mt-3 text-sm leading-6 text-foreground/90">{children}</div>
    </div>
  );
}
