import { useMemo, useState } from "react";
import { FAMILIES, FAMILY_SYSTEMS, SYSTEMS, type Family } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<string, string> = {
  hw: "text-subtle",
  host: "text-shared",
  boundary: "text-fg",
  guest: "text-accent",
  workload: "text-muted",
};

export function StackExplorer() {
  const [family, setFamily] = useState<Family>("microvm");
  const [layerId, setLayerId] = useState("guest-kernel");
  const [trace, setTrace] = useState<"idle" | "run">("idle");

  const fam = FAMILIES.find((f) => f.id === family)!;
  const layer = fam.layers.find((l) => l.id === layerId) ?? fam.layers[fam.layers.length - 1];
  const systems = FAMILY_SYSTEMS[family].map((id) => SYSTEMS.find((s) => s.id === id)!);

  const stopAt = useMemo(() => {
    if (family === "microvm") return "guest-kernel";
    return "host-kernel";
  }, [family]);

  const fire = () => {
    setTrace("idle");
    requestAnimationFrame(() => setTrace("run"));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFamily(f.id);
              setLayerId(f.layers[f.layers.length - 2]?.id ?? f.layers[0].id);
              setTrace("idle");
            }}
            className={cn(
              "h-11 rounded-md px-4 text-sm font-medium transition-colors duration-150",
              family === f.id ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl bg-bg-elevated p-3 shadow-[var(--shadow-border)] md:p-4">
          <p className="px-2 pb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            Click a layer · {fam.kernel}
          </p>
          <ol className="flex flex-col gap-1.5">
            {fam.layers.map((l, i) => {
              const active = l.id === layer.id;
              const isStop = l.id === stopAt;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setLayerId(l.id)}
                    className={cn(
                      "relative flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150",
                      active ? "bg-surface" : "hover:bg-surface/60",
                    )}
                  >
                    <span className={cn("text-sm font-medium", KIND_TONE[l.kind])}>{l.label}</span>
                    {isStop ? (
                      <Badge tone={family === "microvm" ? "micro" : "warn"}>
                        {family === "microvm" ? "the wall" : "shared"}
                      </Badge>
                    ) : null}
                    {trace === "run" ? (
                      <span
                        className="pointer-events-none absolute inset-0 rounded-md bg-accent/25"
                        style={{
                          animation: `pulse-hit 900ms var(--ease-out) ${i * 110}ms both`,
                          opacity: 0,
                        }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={fire}
            className="mt-3 h-11 w-full rounded-md bg-surface text-sm text-fg transition-colors duration-150 hover:bg-bg"
          >
            Trace a kernel CVE from the agent
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Layer</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight">{layer.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{layer.blurb}</p>
            <p className="mt-4 text-sm leading-relaxed text-fg">
              {family === "microvm"
                ? "A kernel CVE inside the agent dies in the guest unless the VMM is also wrong. That is the MicroVM impact: you moved the trusted computing base from 'every syscall on this laptop' to 'this VMM plus the hypervisor'."
                : "There is no second kernel. Namespaces, Seatbelt, and Landlock are all asking the same kernel that the attacker is already talking to. Isolation here is a policy, and policies have holes."}
            </p>
          </div>
          <div className="mt-8 border-t border-border pt-4">
            <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Lives here</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {systems.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#system-${s.id}`}
                    className="inline-flex h-9 items-center rounded-full bg-surface px-3 text-sm text-fg hover:bg-bg"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-hit {
          0% { opacity: 0; }
          25% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
