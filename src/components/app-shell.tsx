"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Modes" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="group flex items-baseline gap-2">
            <span
              aria-hidden
              className="inline-block size-2 translate-y-[-1px] bg-primary transition-transform group-hover:rotate-45"
            />
            <span className="font-display text-xl italic tracking-tight text-foreground">
              Firsthand
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/learn") ||
                    pathname.startsWith("/decide") ||
                    pathname.startsWith("/create") ||
                    pathname.startsWith("/execute")
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative py-1 font-mono text-xs uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">{children}</main>

      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-6 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Firsthand — your judgment goes on record first
          </p>
          <p className="text-xs text-muted-foreground">
            Grounded in the cognitive-offloading literature. Every mechanism
            cited in-app.
          </p>
        </div>
      </footer>
    </div>
  );
}
