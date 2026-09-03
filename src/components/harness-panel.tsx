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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            t: "Wrappers",
            d: "nono, yolobox, and Docker sbx launch someone else's CLI. nono is a process policy. yolobox is an app container — as is Anthropic's reference dev container with its iptables egress allowlist. sbx is a microVM with a private engine. In all three the harness and its own API token live inside the box.",
          },
          {
            t: "Harness sandboxes",
            d: "Claude Code and Codex sandbox themselves — the harness stays outside, only the commands go in. Claude's box covers Bash; MCP servers and hooks run on the host unless you use sandbox-runtime. Codex leans on default-on kernel policy, default-off network with an allowlist proxy once opened, read-only .git / .agents / .codex, and an approval layer (untrusted, on-request, never, or a reviewer agent). Wrap either with nono/yolobox/sbx for a thicker outer box.",
          },
          {
            t: "System containers",
            d: "Incus is not a wrap. You install the agent inside a full Linux machine. Pere Villega's Sandbox for Claude is that pattern: one Incus box per project, nested Docker, CoW clones.",
          },
          {
            t: "Runtimes",
            d: "microsandbox and hypeman run OCI as a VM on hardware you own. Cloudflare Sandbox runs it as a Firecracker VM on Cloudflare's, with your Worker as the control plane and the egress proxy. You image Claude Code or OpenCode into any of them; their native client is your code, not Anthropic's CLI.",
          },
          {
            t: "Full VMs",
            d: "GhostVM, UTM and agent-sandbox-vm boot a whole macOS or Windows guest and you install the agent inside like on any Mac or PC. Nothing here wraps a CLI; the host-side handles are vmctl remote exec, utmctl, PowerShell Direct or prlctl exec. The harness and its login live in the guest, which is why the products push one workspace per client.",
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
