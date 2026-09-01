import { useState } from "react";
import { SYSTEMS, THREATS, type Verdict } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<Verdict, "ok" | "warn" | "bad" | "default"> = {
  contained: "ok",
  partial: "warn",
  exposed: "bad",
  "n/a": "default",
};

export function ThreatLab() {
  const [id, setId] = useState(THREATS[1].id);
  const threat = THREATS.find((t) => t.id === id)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-2">
        {THREATS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setId(t.id)}
            className={cn(
              "rounded-lg px-4 py-3 text-left transition-colors duration-150",
              id === t.id ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-bg-elevated",
            )}
          >
            <span className="block text-sm font-medium">{t.title}</span>
            <span className={cn("mt-1 block text-xs", id === t.id ? "text-accent-fg/70" : "text-muted")}>
              {t.prompt}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Why it matters</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{threat.why}</p>
        <ul className="mt-6 space-y-3">
          {SYSTEMS.map((s) => {
            const o = threat.outcomes[s.id];
            return (
              <li
                key={s.id}
                className="rounded-lg bg-bg px-4 py-3 shadow-[var(--shadow-border)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Badge tone={TONE[o.verdict]}>{o.verdict}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{o.note}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
