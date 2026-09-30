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
    title: "What it costs: fidelity",
    body: "The wall's price is the machine you can no longer have. Firecracker's device model is virtio network, block and vsock, with no GPU passthrough, and it stays small on purpose. hypeman inherits that: Firecracker and qemu-microvm cannot pass PCI, its macOS backend refuses VFIO, and vGPU wants QEMU. Cloud Hypervisor and QEMU pass a whole GPU through with VFIO, at a density cost of one GPU per VM, and Docker's sbx offers only an experimental, feature-flagged VFIO path on x86_64 Linux with NVIDIA. Containers reach GPUs through CDI or device nodes, with the shared kernel and driver stack that implies. Choosing a VMM is choosing which devices you can have, before the OS question in the card after next.",
  },
  {
    title: "Why nested Docker forced Docker's hand",
    body: "Coding agents develop the way humans do: they build images and run compose. Doing that in a container means mounting the host socket or running privileged Docker-in-Docker — both punch the isolation story. Putting a private engine inside a microVM is the first design that lets the agent have Docker without having your Docker. Once the agent runs its own containers, the egress policy has to follow it in: discobox puts the pool proxy's CA into every nested container with a runc wrapper, because each build step and each docker run has its own trust store and would otherwise either fail TLS or route around the proxy.",
  },
  {
    title: "The shared-kernel tools are not obsolete",
    body: "Seatbelt, Landlock, bubblewrap, a well-cut container, and unprivileged LXC are the right default when the operator is you, the threat is accident, and latency must be low. nono, Claude Code, and Codex ship that as a process. yolobox hides $HOME. Incus gives the agent a machine. Use them. Just do not confuse their policy with a hardware wall.",
  },
  {
    title: "Your host is probably already a VM",
    body: "The Mac section's lesson generalises. On macOS every Linux container sits in a Colima or Docker Desktop guest; on Windows, WSL2 is a Hyper-V utility VM; in CI and on most cloud instances you are inside someone's KVM or Nitro guest. A shared-kernel sandbox there shares that guest kernel, which is a smaller blast radius than the site's Linux-laptop rows suggest — but a microVM sandbox there needs nested virt (/dev/kvm in the guest, .metal or nested-enabled instances, an M3+ Mac), which is the bill the Mac section itemises. Firecracker inside a Firecracker guest without /dev/kvm is not a thing.",
  },
  {
    title: "Off the axis: user-space kernels and no kernel at all",
    body: "Two primitives do not fit the four rows. gVisor runs a Go kernel in user space that answers the workload's syscalls, so a Linux kernel LPE has no Linux kernel to land on — Modal, Cloud Run and Google's Agent Sandbox default to it, and it can sit on KVM or on a seccomp'd host process. Its nvproxy (runsc --nvproxy) is the one GPU story on this list that is neither passthrough nor paravirtual: the sandbox forwards a filtered set of NVIDIA ioctls to the host driver, T4 through H100 supported. V8 isolates and Wasm runtimes have no syscall surface to begin with; Cloudflare Workers and Deno Deploy live there. Both trade compatibility for a narrower attack surface. If you rent a sandbox — Cloudflare Sandbox, E2B, Vercel Sandbox, Fly (all Firecracker), Modal (gVisor) — the buyer question is which of these you got, and who holds the secrets. Cloudflare is the clean case: the Worker calling getSandbox is an isolate, the sandbox it gets is a microVM, and the egress handler between them is where the secret lives.",
  },
  {
    title: "The guest OS is a use case, not a detail",
    body: "Every Linux sandbox on this page — microVM, container, process — hands the agent a Linux userland. That is the wrong machine when the job is an iOS build, a signed macOS app, a Simulator run, or an MSVC binary with a kernel debugger attached. GhostVM, UTM's Apple backend, Cua's Lume and glslang's vmctl boot macOS on Virtualization.framework; Hyper-V and Parallels boot Windows. Cua Sandbox puts a computer-use API on top of any of them — the agent clicks and types in the same machine it runs code in, which is the other thing a Linux container's headless userland never gave you. Same hardware wall as a microVM, a different OS behind it, and a different bill: gigabytes and tens of seconds per guest, Apple's licence capping macOS guests at two per host, no nesting inside a macOS guest, and every convenience — clipboard, VirtioFS, port forwarding, file transfer — a hole you chose. This is a workstation answer, not a fleet primitive, and no Linux runtime substitutes for it.",
  },
  {
    title: "Two products share the word sandbox",
    body: "Subtraction: nono, Claude Code's Seatbelt profile, Codex's bwrap+seccomp, sandbox-runtime, fence, landrun — and the app containers, yolobox and Litterbox, which are a namespace fence around a process on your kernel with your files bind-mounted in. A fence around your machine, everything else on it left as you had it. Addition: sbx, microsandbox, hypeman, Cloudflare, GhostVM, Lume, Incus, code-on-incus — a machine you hand over, nothing of yours inside it unless you mounted it. The first cannot survive a kernel bug and does not need a kernel. The second cannot see your Metal GPU, your keychain, or your dockerd, and the whole product is deciding which of those to pass back through. Most of the rough edges on this site — live mounts, docker.sock, the Mac GPU, two-guest caps — are one side borrowing the other's promise. OpenShell can be either, by driver: a Landlock-and-seccomp fence inside a container is subtraction, its VM driver is addition. discobox is addition, with the machine's kernel set by the pool host.",
  },
  {
    title: "The kernel line is becoming a setting, not a product",
    body: "OpenShell and discobox break the one-product-one-family reading of this page. Both put one policy and credential layer over swappable isolation. OpenShell runs the same supervisor and policy engine over a Docker container, a Podman container, a Kubernetes pod (Kata if you set the runtimeClass), or a libkrun microVM, and its own RFC says the runtime builds the boundary but never decides what is allowed. discobox makes isolation a pool attribute and picks a different pool host per OS. The five families still describe a deployment. They no longer describe a product: ask which driver or which pool you will actually run before reading its row.",
  },
  {
    title: "How many sandboxes share each kernel",
    body: "Once a VM is in the picture the question is per what. One VM per machine: Docker Desktop, Colima, OrbStack. One VM per pool: discobox on a Mac or Windows PC, many boxes inside sharing that kernel on purpose. One VM per sandbox: sbx, microsandbox, hypeman, Apple Container, OpenShell's VM driver. discobox's own design record states the principle that this page has been circling: what shares a kernel and a cache with my sandbox must be a declared, user-visible fact, and mutually untrusted work belongs in a different pool. A VM you share with your other agents is a wall against the host, not against them.",
  },
  {
    title: "Pick the unit of isolation to match the unit of trust",
    body: "A bash child is the unit for pair-programming (Claude, Codex, nono). An app container is the unit for a YOLO CLI that is still a process (yolobox). A system container is the unit for a laptop-shaped agent that must apt and nest Docker (Incus, Pere Villega, code-on-incus, discobox). A microVM is the unit for untrusted code, a nested build with a kernel wall, or a tenant. A snapshot-restorable VM is the unit for a browser session. A full-OS guest is the unit for a desktop or a macOS or Windows app. A GPU job's unit is set by the VMM, not by the threat. Match the unit to what is being trusted, then check the other five layers.",
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
