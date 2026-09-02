const POINTS = [
  {
    title: "What a MicroVM actually buys",
    body: "A dedicated guest kernel and a hardware privilege boundary. Guest syscalls never become host syscalls. Firecracker, Cloud Hypervisor, QEMU microvm, libkrun, and Docker's sbx VMM are different monitors on the same idea. The agent can be root. That is fine. Root is not the boundary anymore.",
  },
  {
    title: "What it does not buy",
    body: "It does not save the files you deliberately shared. Docker sbx and yolobox both mount the project at the real path; a confused rm is still a confused rm. It does not save you from a VMM bug. It does not make a 4 GB laptop VM free. And a snapshot restore that is fast is still a machine you have to patch.",
  },
  {
    title: "Why nested Docker forced Docker's hand",
    body: "Coding agents develop the way humans do: they build images and run compose. Doing that in a container means mounting the host socket or running privileged Docker-in-Docker — both punch the isolation story. Putting a private engine inside a microVM is the first design that lets the agent have Docker without having your Docker.",
  },
  {
    title: "The shared-kernel tools are not obsolete",
    body: "Seatbelt, Landlock, bubblewrap, a well-cut container, and unprivileged LXC are the right default when the operator is you, the threat is accident, and latency must be low. nono, Claude Code, and Codex ship that as a process. yolobox hides $HOME. Incus gives the agent a machine. Use them. Just do not confuse their policy with a hardware wall.",
  },
  {
    title: "Where the harness sits is a design axis",
    body: "Two shapes. Harness outside, tool children inside: Claude Code's Bash sandbox, Codex local, nono. The model's own API token, the conversation, MCP servers and hooks stay on the host — which means MCP servers and hooks run unsandboxed. Harness inside the box: yolobox, sbx, Incus, Claude Code on the web. Now the agent's own credential is inside the wall and can be exfiltrated with it, and sbx still routes local stdio MCP servers back to the host through a gateway. Neither shape is wrong. Know which one you bought.",
  },
  {
    title: "The proxy is the wall that works on every family",
    body: "The kernel line is orthogonal to secrets and egress. The pattern that actually keeps a token out of the agent is the same everywhere: a supervisor outside the box holds the real credential and injects it at the network boundary. nono's phantom tokens, sbx header injection, microsandbox's guest-never-sees-it, Claude Code's masked env vars with injectHosts and SigV4 re-signing, Claude Code on the web's separate GitHub-token proxy, Codex's allowlist network_proxy, Cloudflare's outboundByHost handlers running in the Worker. A process sandbox with a good proxy beats a microVM with the key baked into the image.",
  },
  {
    title: "Your host is probably already a VM",
    body: "The Mac section's lesson generalises. On macOS every Linux container sits in a Colima or Docker Desktop guest; on Windows, WSL2 is a Hyper-V utility VM; in CI and on most cloud instances you are inside someone's KVM or Nitro guest. A shared-kernel sandbox there shares that guest kernel, which is a smaller blast radius than the site's Linux-laptop rows suggest — but a microVM sandbox there needs nested virt (/dev/kvm in the guest, .metal or nested-enabled instances, an M3+ Mac), which is the bill the Mac section itemises. Firecracker inside a Firecracker guest without /dev/kvm is not a thing.",
  },
  {
    title: "Off the axis: user-space kernels and no kernel at all",
    body: "Two primitives do not fit the four rows. gVisor runs a Go kernel in user space that answers the workload's syscalls, so a Linux kernel LPE has no Linux kernel to land on — Modal, Cloud Run and Google's Agent Sandbox default to it, and it can sit on KVM or on a seccomp'd host process. V8 isolates and Wasm runtimes have no syscall surface to begin with; Cloudflare Workers and Deno Deploy live there. Both trade compatibility for a narrower attack surface. If you rent a sandbox — Cloudflare Sandbox, E2B, Vercel Sandbox, Fly (all Firecracker), Modal (gVisor) — the buyer question is which of these you got, and who holds the secrets. Cloudflare is the clean case: the Worker calling getSandbox is an isolate, the sandbox it gets is a microVM, and the egress handler between them is where the secret lives.",
  },
  {
    title: "The wall does not judge intent",
    body: "A prompt injection that makes the agent push a backdoor with the token you gave it never crosses any boundary on this page. Isolation bounds a compromised process; it does not authorise its actions. That job belongs to token scope, per-tool brokering (nono), permission hooks (Claude Code), approvals and the auto-review agent (Codex), a per-host egress handler that can refuse a method (Cloudflare), and a human reading the PR before it lands — Codex cloud's clone-then-PR is the strongest shape here precisely because it is not a sandbox feature.",
  },
  {
    title: "Pick the unit of isolation to match the unit of trust",
    body: "A bash child is the unit for pair-programming (Claude, Codex, nono). An app container is the unit for a YOLO CLI that is still a process (yolobox). A system container is the unit for a laptop-shaped agent that must apt and nest Docker (Incus, Pere Villega). A microVM is the unit for untrusted code, nested build with a kernel wall, or a tenant. A snapshotted VM fleet is the unit for browser agents.",
  },
];

export function MicrovmImpact() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {POINTS.map((p, i) => (
        <article
          key={p.title}
          className={cnArticle(i)}
        >
          <p className="font-mono text-[11px] text-subtle tabular-nums">0{i + 1}</p>
          <h3 className="mt-3 text-lg font-medium tracking-tight">{p.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
        </article>
      ))}
    </div>
  );
}

function cnArticle(i: number) {
  const wide = i === POINTS.length - 1 ? " md:col-span-2" : "";
  return `rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6${wide}`;
}
