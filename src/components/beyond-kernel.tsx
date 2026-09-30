import { BEYOND_THREATS, LAYERS, type LayerId } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";

const layerName = (id: LayerId) => LAYERS.find((l) => l.id === id)!.name;

export function BeyondKernel() {
  return (
    <div className="mt-16">
      <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">Beyond the kernel line</p>
      <h3 className="mt-3 max-w-3xl text-xl font-medium tracking-tight">
        Failures a microVM does not see.
      </h3>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        These do not cross any boundary, so no row above can be graded on them. They matter most for agents that
        drive a screen. What helps is in the other layers.
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {BEYOND_THREATS.map((t) => (
          <article key={t.id} className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-medium tracking-tight">{t.title}</h4>
              <Badge tone={t.kernelHelps === "none" ? "bad" : "warn"}>
                kernel line helps: {t.kernelHelps}
              </Badge>
            </div>
            <p className="mt-3 text-sm italic leading-relaxed text-muted">{t.prompt}</p>
            <p className="mt-3 text-sm leading-relaxed text-fg">{t.why}</p>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
              {t.helps.map((h) => (
                <li key={h.control} className="text-sm leading-relaxed">
                  <span className="mr-2 font-mono text-[11px] tracking-wide text-subtle uppercase">
                    {layerName(h.layer)}
                  </span>
                  <span className="text-muted">{h.control}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
