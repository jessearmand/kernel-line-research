import { useState } from "react";
import { SYSTEM_CONTAINER_CASES } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SystemNeed() {
  const [id, setId] = useState(SYSTEM_CONTAINER_CASES[0].id);
  const cse = SYSTEM_CONTAINER_CASES.find((c) => c.id === id)!;

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {SYSTEM_CONTAINER_CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setId(c.id)}
            className={cn(
              "rounded-lg px-4 py-3 text-left transition-colors duration-150",
              id === c.id ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-bg-elevated",
            )}
          >
            <span className="block text-sm font-medium">{c.title}</span>
            <span className={cn("mt-1 block text-xs", id === c.id ? "text-accent-fg/70" : "text-muted")}>
              {c.verdict === "need" ? "Use a system container" : "Skip Incus"}
            </span>
          </button>
        ))}
      </div>

      <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <Badge tone={cse.verdict === "need" ? "ok" : "warn"}>
          {cse.verdict === "need" ? "system container" : "wrong wall"}
        </Badge>
        <h3 className="mt-3 text-xl font-medium tracking-tight">{cse.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg">{cse.need}</p>
        <dl className="mt-6 space-y-4 border-t border-border pt-4 text-sm">
          <div>
            <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">vs app container (Docker / yolobox)</dt>
            <dd className="mt-1 leading-relaxed text-muted">{cse.vsDocker}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">vs microVM</dt>
            <dd className="mt-1 leading-relaxed text-muted">{cse.vsMicrovm}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">vs process sandbox (nono / Claude / Codex)</dt>
            <dd className="mt-1 leading-relaxed text-muted">{cse.vsProcess}</dd>
          </div>
        </dl>
        {cse.sources?.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {cse.sources.map((s) => (
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
        ) : null}
      </article>
    </div>
  );
}
