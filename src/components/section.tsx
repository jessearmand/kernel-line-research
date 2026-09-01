import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28 border-t border-border py-16 md:py-24", className)}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-2xl font-medium tracking-tight text-fg">{title}</h2>
        {lede ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{lede}</p> : null}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
