import { useState } from "react";
import { LAYERS, systemById, type Layer, type LayerId } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_TONE = { owns: "ok", helps: "warn", silent: "default" } as const;
const ROLE_LABEL = { owns: "microVM owns it", helps: "microVM helps", silent: "microVM silent" } as const;

export function LayerStack() {
  const [id, setId] = useState<LayerId>("fidelity");
  const layer: Layer = LAYERS.find((l) => l.id === id)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)]">
      <div className="rounded-xl bg-bg-elevated p-3 shadow-[var(--shadow-border)] md:p-4">
        <p className="px-2 pb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
          Click a layer · the kernel line is layer 1
        </p>
        <ol className="flex flex-col gap-1.5">
          {LAYERS.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                aria-pressed={l.id === id}
                onClick={() => setId(l.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150",
                  l.id === id ? "bg-surface" : "hover:bg-surface/60",
                )}
              >
                <span className="mt-0.5 font-mono text-[11px] text-subtle tabular-nums">0{l.n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{l.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{l.asks}</span>
                </span>
                <Badge tone={ROLE_TONE[l.microvm]} className="mt-0.5 shrink-0">
                  {ROLE_LABEL[l.microvm]}
                </Badge>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Layer 0{layer.n}</p>
        <h3 className="mt-2 text-xl font-medium tracking-tight">{layer.name}</h3>
        <p className="mt-1 text-sm text-muted">{layer.asks}</p>

        <ul className="mt-5 space-y-3">
          {layer.points.map((p) => (
            <li key={p} className="text-sm leading-relaxed text-fg">
              {p}
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "mt-6 rounded-lg p-4 text-sm leading-relaxed",
            layer.microvm === "owns" ? "bg-ok/10" : layer.microvm === "helps" ? "bg-warn/10" : "bg-surface",
          )}
        >
          <Badge tone={ROLE_TONE[layer.microvm]}>{ROLE_LABEL[layer.microvm]}</Badge>
          <p className="mt-2 text-fg">{layer.microvmNote}</p>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Who leads here</p>
          <ul className="mt-3 space-y-2">
            {layer.leaders.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <a href={`#system-${l.id}`} className="font-medium text-fg hover:underline">
                  {systemById(l.id).name}
                </a>
                <span className="text-muted">{l.why}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 font-mono text-[11px] tracking-wide text-subtle uppercase">What is still open</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{layer.gap}</p>
        </div>
      </article>
    </div>
  );
}
