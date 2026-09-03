import { useState } from "react";
import { SYSTEMS, SCORE_LABELS, type Score, type System, type SystemId } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function familyTone(family: System["family"]) {
  if (family === "microvm" || family === "vm") return "micro" as const;
  if (family === "container") return "warn" as const;
  if (family === "system") return "ok" as const;
  return "shared" as const;
}

function ScoreRow({ label, value }: { label: string; value: Score }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[11px] tracking-wide text-subtle uppercase">
        {label}
      </span>
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i < value ? "bg-accent" : "bg-border-strong")}
          />
        ))}
      </div>
      <span className="w-4 font-mono text-xs text-muted tabular-nums">{value}</span>
    </div>
  );
}

function SystemBody({ system }: { system: System }) {
  return (
    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
      <p className="text-sm leading-relaxed text-muted">{system.familyNote}</p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        {[
          ["VMM", system.vmm],
          ["Kernel", system.kernel === "dedicated" ? "Dedicated guest" : "Shared host"],
          ["Source", system.openSource],
          ["Platforms", system.platforms],
          ["Startup", system.startup],
          ["Weight", system.overhead],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">{k}</dt>
            <dd className="mt-1 text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3">
        {(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((k) => (
          <ScoreRow key={k} label={SCORE_LABELS[k]} value={system.scores[k]} />
        ))}
      </div>
      <Block title="Workspace" body={system.workspace} />
      <Block title="Network" body={system.network} />
      <Block title="Nested Docker" body={system.nestedDocker} />
      <Block title="Harness" body={system.harness} />
      <Block title="Security model" body={system.security} />
      <div>
        <h4 className="font-mono text-[11px] tracking-wide text-subtle uppercase">Use when</h4>
        <ul className="mt-2 space-y-1.5 text-sm text-fg">
          {system.useCases.map((u) => (
            <li key={u} className="border-l border-accent/40 pl-3">
              {u}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-mono text-[11px] tracking-wide text-subtle uppercase">Not for</h4>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          {system.notFor.map((u) => (
            <li key={u} className="border-l border-border pl-3">
              {u}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-mono text-[11px] tracking-wide text-subtle uppercase">Caveats</h4>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          {system.caveats.map((u) => (
            <li key={u}>— {u}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3 pb-4">
        {system.sources.map((s) => (
          <a
            key={s.href}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="font-mono text-[11px] tracking-wide text-subtle uppercase">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-fg">{body}</p>
    </div>
  );
}

export function SystemGrid() {
  const [open, setOpen] = useState<SystemId | null>(null);
  const current = SYSTEMS.find((s) => s.id === open);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {SYSTEMS.map((s) => (
          <article
            key={s.id}
            id={`system-${s.id}`}
            className="scroll-mt-28 rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium tracking-tight">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.short}</p>
              </div>
              <Badge tone={familyTone(s.family)}>{s.family}</Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-fg">{s.oneLiner}</p>
            <p className="mt-3 font-mono text-[11px] text-subtle uppercase">
              {s.maker} · {s.role} · {s.kernel} kernel
            </p>
            <div className="mt-5 space-y-2">
              <ScoreRow label="Isolation" value={s.scores.isolation} />
              <ScoreRow label="Untrusted" value={s.scores.untrustedCode} />
              <ScoreRow label="Harness" value={s.scores.harnessFit} />
            </div>
            <Button variant="outline" className="mt-6 w-full" onClick={() => setOpen(s.id)}>
              Architecture notes
            </Button>
          </article>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {current ? (
          <SheetContent aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>{current.name}</SheetTitle>
              <SheetDescription>
                {current.maker} · {current.family} · {current.role}
              </SheetDescription>
            </SheetHeader>
            <SystemBody system={current} />
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}
