import { HARNESSES, SYSTEMS } from "@/lib/sandboxes";

export function HarnessPanel() {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl shadow-[var(--shadow-border)]">
        <table className="min-w-[800px] w-full border-collapse text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left font-mono text-[11px] tracking-wide text-subtle uppercase">
                Agent
              </th>
              {SYSTEMS.map((s) => (
                <th key={s.id} className="px-4 py-3 text-left font-medium">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HARNESSES.map((h) => (
              <tr key={h.id} className="border-t border-border">
                <th className="px-4 py-3 text-left font-medium text-fg">{h.name}</th>
                {SYSTEMS.map((s) => (
                  <td key={s.id} className="px-4 py-3 text-muted">
                    {h.cells[s.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            t: "Wrappers",
            d: "yolobox and Docker sbx exist to launch someone else's CLI in YOLO mode. Compatibility is the product: skip-permissions flags, real project paths, a box the agent can sudo inside.",
          },
          {
            t: "Harness sandboxes",
            d: "Claude Code and Codex sandbox themselves. You don't wrap them unless you want a thicker outer box. Claude leans on hooks + a bash sandbox. Codex leans on a default-on kernel policy and default-off network.",
          },
          {
            t: "Runtimes",
            d: "microsandbox and hypeman do not care which model you picked. They run OCI (or an SDK exec) as a VM. You image Claude into them if you want; their native client is your code, not Anthropic's CLI.",
          },
        ].map((x) => (
          <article key={x.t} className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
            <h3 className="text-base font-medium tracking-tight">{x.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{x.d}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
