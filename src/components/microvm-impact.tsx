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
  const wide = i === 4 ? " md:col-span-2" : "";
  return `rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6${wide}`;
}
