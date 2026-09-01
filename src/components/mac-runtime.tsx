import { useState } from "react";
import {
  MAC_HOSTS,
  MAC_PLACEMENTS,
  MAC_PLACEMENT_VERDICT,
  type MacHostId,
  type MacPlacement,
} from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<string, string> = {
  hw: "text-subtle",
  host: "text-shared",
  boundary: "text-fg",
  guest: "text-accent",
  workload: "text-muted",
};

function virtTone(v: "no" | "yes" | "n/a") {
  if (v === "yes") return "warn" as const;
  if (v === "no") return "ok" as const;
  return "default" as const;
}

export function MacRuntime() {
  const [id, setId] = useState<MacHostId>("apple-container");
  const [layerId, setLayerId] = useState("hvf");
  const [place, setPlace] = useState<MacPlacement>("nested");
  const host = MAC_HOSTS.find((h) => h.id === id)!;
  const layer = host.layers.find((l) => l.id === layerId) ?? host.layers[host.layers.length - 1];
  const verdict = MAC_PLACEMENT_VERDICT[id][place];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-[11px] tracking-wide text-subtle uppercase">
          Where do the two machines sit?
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MAC_PLACEMENTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlace(p.id)}
              className={cn(
                "rounded-lg px-4 py-3 text-left transition-colors duration-150",
                place === p.id ? "bg-fg text-bg" : "bg-surface text-fg hover:bg-bg-elevated",
              )}
            >
              <span className="block text-sm font-medium">{p.name}</span>
              <span className={cn("mt-1 block text-xs", place === p.id ? "text-bg/70" : "text-muted")}>
                {p.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {MAC_HOSTS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => {
              setId(h.id);
              setLayerId(h.layers[h.layers.length - 2]?.id ?? h.layers[0].id);
            }}
            className={cn(
              "rounded-lg px-4 py-3 text-left transition-colors duration-150",
              id === h.id ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-bg-elevated",
            )}
          >
            <span className="block text-sm font-medium">{h.name}</span>
            <span className={cn("mt-1 block text-xs", id === h.id ? "text-accent-fg/70" : "text-muted")}>
              Nested virt {h.nestedVirt === "yes" ? "required" : h.nestedVirt === "no" ? "not required" : "not used"}
            </span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "rounded-xl p-5 shadow-[var(--shadow-border)] md:p-6",
          verdict.ok ? "bg-ok/10" : "bg-warn/10",
        )}
      >
        <Badge tone={verdict.ok ? "ok" : "warn"}>{verdict.ok ? "can" : "cannot"}</Badge>
        <h3 className="mt-3 text-xl font-medium tracking-tight">{verdict.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg">{verdict.body}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="rounded-xl bg-bg-elevated p-3 shadow-[var(--shadow-border)] md:p-4">
          <p className="px-2 pb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            Click a layer
          </p>
          <ol className="flex flex-col gap-1.5">
            {host.layers.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setLayerId(l.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150",
                    l.id === layer.id ? "bg-surface" : "hover:bg-surface/60",
                  )}
                >
                  <span className={cn("text-sm font-medium", KIND_TONE[l.kind])}>{l.label}</span>
                  {(l.id === "kvm" || (l.id === "hvf" && host.id === "apple-container")) ? (
                    <Badge tone={host.nestedVirt === "yes" ? "warn" : "micro"}>
                      {host.nestedVirt === "yes" ? "nested" : "siblings"}
                    </Badge>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={virtTone(host.nestedVirt)}>
              nested virt {host.nestedVirt}
            </Badge>
            <Badge>
              {host.id === "apple-container"
                ? "VM per container"
                : host.id === "incus-vm"
                  ? "VM in a VM"
                  : "shared Linux VM"}
            </Badge>
          </div>
          <h3 className="mt-4 text-xl font-medium tracking-tight">{layer.label}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{layer.blurb}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg">{host.nestedVirtNote}</p>
          <dl className="mt-6 space-y-4 border-t border-border pt-4 text-sm">
            <div>
              <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">Two boxes</dt>
              <dd className="mt-1 leading-relaxed text-fg">{host.twoBoxes}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">yolobox</dt>
              <dd className="mt-1 leading-relaxed text-fg">{host.yoloboxFit}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {host.sources.map((s) => (
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
      </div>
    </div>
  );
}
