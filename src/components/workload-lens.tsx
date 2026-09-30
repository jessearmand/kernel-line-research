import { useState } from "react";
import { LAYERS, REFERENCE_SETUPS, WORKLOADS, systemById, type Need } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NEED_LABEL: Record<Need, string> = { decisive: "decisive", matters: "matters", minor: "minor" };
const NEED_FILL: Record<Need, number> = { decisive: 3, matters: 2, minor: 1 };

function NeedMeter({ need }: { need: Need }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("h-1.5 w-6 rounded-full", i < NEED_FILL[need] ? "bg-accent" : "bg-border-strong")}
        />
      ))}
    </div>
  );
}

export function WorkloadLens() {
  const [id, setId] = useState(WORKLOADS[3].id);
  const w = WORKLOADS.find((x) => x.id === id)!;
  const refs = REFERENCE_SETUPS.filter((r) => w.refs.includes(r.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {WORKLOADS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === id}
            onClick={() => setId(x.id)}
            className={cn(
              "rounded-lg px-4 py-3 text-left transition-colors duration-150",
              x.id === id ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-bg-elevated",
            )}
          >
            <span className="block text-sm font-medium">{x.name}</span>
            <span className={cn("mt-1 block text-xs", x.id === id ? "text-accent-fg/70" : "text-muted")}>
              {x.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
          <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Is a microVM enough?</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-medium tracking-tight">{w.name}</h3>
            <Badge tone={w.role.tone}>{w.role.label}</Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg">{w.verdict}</p>

          <p className="mt-6 font-mono text-[11px] tracking-wide text-subtle uppercase">What breaks first</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
            {w.breaks.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          <p className="mt-6 font-mono text-[11px] tracking-wide text-subtle uppercase">A workable stack</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{w.stack}</p>

          <div className="mt-6 border-t border-border pt-4">
            <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">On this page</p>
            {w.fits.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {w.fits.map((f) => (
                  <li key={f}>
                    <a
                      href={`#system-${f}`}
                      className="inline-flex h-9 items-center rounded-full bg-surface px-3 text-sm text-fg hover:bg-bg"
                    >
                      {systemById(f).name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">None of the ten ships this today.</p>
            )}
          </div>
        </article>

        <aside className="h-fit rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
          <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Which layer carries it</p>
          <ul className="mt-4 space-y-3">
            {LAYERS.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <span className="w-5 font-mono text-[11px] text-subtle tabular-nums">0{l.n}</span>
                <span className="flex-1 text-sm text-fg">{l.name}</span>
                <NeedMeter need={w.needs[l.id]} />
                <span className="w-16 text-right font-mono text-[11px] text-muted">
                  {NEED_LABEL[w.needs[l.id]]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-subtle">
            My read of each workload from the sources on this page. Not measured, and yours may differ.
          </p>
        </aside>
      </div>

      {refs.length ? (
        <div>
          <p className="mb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">Real setups for this</p>
          <div className="grid gap-3 md:grid-cols-2">
            {refs.map((r) => (
              <article key={r.id} className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-medium tracking-tight">{r.name}</h4>
                  <Badge>{r.boundary}</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{r.shape}</p>
                <p className="mt-3 text-sm leading-relaxed text-fg">{r.teaches}</p>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
                >
                  Source
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
