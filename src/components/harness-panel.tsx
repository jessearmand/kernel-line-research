import { HARNESSES, SYSTEMS } from "@/lib/sandboxes";

export function HarnessPanel() {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl shadow-[var(--shadow-border)]">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            t: "Wrappers",
            d: "nono, yolobox, and Docker sbx launch someone else's CLI. nono is a process policy. yolobox is an app container. sbx is a microVM with a private engine.",
          },
          {
            t: "Harness sandboxes",
            d: "Claude Code and Codex sandbox themselves. You wrap them with nono/yolobox/sbx only if you want a thicker outer box. Claude leans on hooks + bash. Codex leans on default-on kernel policy and default-off network.",
          },
          {
            t: "System containers",
            d: "Incus is not a wrap. You install the agent inside a full Linux machine. Pere Villega's Sandbox for Claude is that pattern: one Incus box per project, nested Docker, CoW clones.",
          },
          {
            t: "Runtimes",
            d: "microsandbox and hypeman run OCI as a VM. You image Claude into them if you want; their native client is your code, not Anthropic's CLI.",
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
