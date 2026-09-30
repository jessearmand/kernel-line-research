export type Family = "process" | "container" | "system" | "microvm";
export type Verdict = "contained" | "partial" | "exposed" | "n/a";
export type Score = 1 | 2 | 3 | 4 | 5;

export type SystemId =
  | "yolobox"
  | "docker-sbx"
  | "microsandbox"
  | "hypeman"
  | "claude-code"
  | "codex"
  | "nono"
  | "incus"
  | "openshell"
  | "discobox";

export type System = {
  id: SystemId;
  name: string;
  short: string;
  maker: string;
  family: Family;
  familyNote: string;
  oneLiner: string;
  role: "wrapper" | "runtime" | "harness";
  vmm: string;
  kernel: "shared" | "dedicated";
  openSource: string;
  platforms: string;
  startup: string;
  overhead: string;
  workspace: string;
  network: string;
  nestedDocker: string;
  harness: string;
  useCases: string[];
  notFor: string[];
  security: string;
  caveats: string[];
  scores: {
    isolation: Score;
    performance: Score;
    harnessFit: Score;
    untrustedCode: Score;
    laptopDx: Score;
  };
  layers: string[];
  sources: { label: string; href: string }[];
};

export type Threat = {
  id: string;
  title: string;
  prompt: string;
  why: string;
  outcomes: Record<SystemId, { verdict: Verdict; note: string }>;
};

export type ArchFamily = {
  id: Family;
  name: string;
  kernel: string;
  isolation: string;
  startup: string;
  overhead: string;
  escape: string;
  nestedDocker: string;
  bestFor: string;
  layers: { id: string; label: string; kind: "hw" | "host" | "boundary" | "guest" | "workload"; blurb: string }[];
};

export const FAMILIES: ArchFamily[] = [
  {
    id: "process",
    name: "Process sandbox",
    kernel: "Shared host kernel",
    isolation: "OS MAC / LSM policy on one process tree",
    startup: "Near zero",
    overhead: "Kilobytes",
    escape: "A kernel bug or a missed syscall is a host bug",
    nestedDocker: "Docker socket is a hole if reachable",
    bestFor: "Interactive local agents that should not pause for every bash call",
    layers: [
      { id: "hw", label: "Hardware", kind: "hw", blurb: "The physical CPU and RAM. No extra virtualization boundary is introduced." },
      { id: "host-kernel", label: "Host kernel", kind: "host", blurb: "One kernel for you and the agent. Seatbelt, Landlock, seccomp, and bubblewrap are policies this kernel enforces — they are not a second kernel." },
      { id: "policy", label: "Seatbelt / Landlock / bubblewrap", kind: "boundary", blurb: "A kernel-enforced allowlist on filesystem, network, and (on Linux) syscalls. Strong against accidents. Weak against a kernel exploit, and only as complete as the policy." },
      { id: "agent", label: "Agent process", kind: "workload", blurb: "Claude Code and Codex CLI themselves usually sit outside the tightest box. The sandbox wraps the shell they spawn, not always the whole harness." },
      { id: "bash", label: "Sandboxed bash child", kind: "workload", blurb: "The command the model wanted to run. Children inherit the box. Unix sockets, unsandboxed fallbacks, and non-bash tools are the usual bypasses." },
    ],
  },
  {
    id: "container",
    name: "Container",
    kernel: "Shared host kernel",
    isolation: "Namespaces, cgroups, seccomp",
    startup: "Hundreds of ms to a few seconds",
    overhead: "Tens to hundreds of MB",
    escape: "A kernel exploit escapes every container on the host",
    nestedDocker: "Needs the host socket or privileged Docker-in-Docker",
    bestFor: "YOLO local agents when the threat is carelessness, not a kernel 0-day. Anthropic's reference dev container (Docker + a default-deny iptables egress allowlist) is this family too — the shape Anthropic itself recommends for --dangerously-skip-permissions.",
    layers: [
      { id: "hw", label: "Hardware", kind: "hw", blurb: "Same silicon. Containers do not buy you VT-x / KVM isolation." },
      { id: "host-kernel", label: "Host kernel — shared", kind: "host", blurb: "The real boundary is this kernel. Namespaces look like a machine from inside; they are still the host's syscalls." },
      { id: "ns", label: "Namespaces · cgroups · seccomp", kind: "boundary", blurb: "PID, mount, net, user, IPC isolation plus resource caps and a syscall filter. Excellent accidental-damage control. Not a hypervisor." },
      { id: "rootfs", label: "Container rootfs", kind: "guest", blurb: "A separate filesystem view. yolobox keeps $HOME off this view so SSH keys never appear, while the project is bind-mounted at its real path." },
      { id: "agent", label: "Agent with sudo", kind: "workload", blurb: "Inside the box the agent is root. That is the point of YOLO mode — compilers, databases, and CLIs install themselves. The host is the thing you are protecting." },
    ],
  },
  {
    id: "system",
    name: "System container",
    kernel: "Shared host kernel",
    isolation: "Unprivileged LXC: full distro, user namespace, AppArmor, idmap",
    startup: "Milliseconds from a CoW snapshot; seconds from an image",
    overhead: "A full OS, still no second kernel",
    escape: "A kernel exploit escapes every container on the host — same as Docker",
    nestedDocker: "First-class with security.nesting=true, no host docker.sock",
    bestFor: "When the agent needs a machine — systemd, apt, sudo, nested Docker, long-lived boxes — not a process and not a microVM",
    layers: [
      { id: "hw", label: "Hardware", kind: "hw", blurb: "Still no hypervisor hop. System containers are a Linux kernel ABI, which is why a Mac must boot a Linux VM first." },
      { id: "host-kernel", label: "Host kernel — shared", kind: "host", blurb: "The same wall as Docker. Unprivileged uid 0 inside maps to 100000+ on the host, so an escape lands as an unprivileged user — until the bug is in this kernel." },
      { id: "lxc", label: "LXC · user ns · AppArmor · idmap", kind: "boundary", blurb: "liblxc, not runc. A system container is a machine-shaped namespace: own PID 1, own /sbin/init, own network namespace. Harder default than stock Docker. Not a dedicated kernel." },
      { id: "distro", label: "Full distro · systemd · apt", kind: "guest", blurb: "This is the product difference. The agent can apt install, sudo, start daemons, and ssh in. Docker's unit is a process; Incus's unit is a machine that still shares your kernel." },
      { id: "nested", label: "Nested Docker (optional)", kind: "guest", blurb: "security.nesting=true gives the instance its own dockerd. The host socket stays off. This is why people pick Incus over yolobox when the agent must compose." },
      { id: "agent", label: "Agent as a user on a machine", kind: "workload", blurb: "Claude Code, Codex, or anything else is just software you installed. Pere Villega's Sandbox for Claude is this layer: one Incus box per project, golden-image clone, agent inside." },
    ],
  },
  {
    id: "microvm",
    name: "MicroVM",
    kernel: "Dedicated guest kernel",
    isolation: "Hardware virtualization (KVM / HVF / WHP)",
    startup: "Sub-100ms (libkrun) to a few seconds (full agent VM)",
    overhead: "A few MB (libkrun) to a few GB (laptop agent VM)",
    escape: "A guest kernel bug dies in the guest. The remaining bets are VMM bugs.",
    nestedDocker: "A private daemon inside the VM — no host socket",
    bestFor: "Untrusted or fully autonomous agents, nested container builds, multi-tenant compute",
    layers: [
      { id: "hw", label: "Hardware virt (VT-x / AMD-V / Apple)", kind: "hw", blurb: "The CPU itself splits host and guest. This is the difference that actually changes the threat model." },
      { id: "host-kernel", label: "Host kernel + KVM / HVF / WHP", kind: "host", blurb: "The host still has a kernel, but guest syscalls never reach it. They hit the hypervisor interface." },
      { id: "vmm", label: "VMM — libkrun, Firecracker, Cloud Hypervisor, QEMU", kind: "boundary", blurb: "A small userspace monitor. Firecracker and Cloud Hypervisor are cloud-shaped. libkrun is embeddable and cross-platform. Docker sbx ships its own VMM in this family. hypeman can pick any of them." },
      { id: "guest-kernel", label: "Guest kernel — dedicated", kind: "guest", blurb: "Each sandbox boots its own Linux kernel. A kernel CVE inside the agent is now the guest's problem. This is the Kernel Line." },
      { id: "guest-user", label: "Guest userspace · private Docker", kind: "guest", blurb: "Docker sbx puts a whole engine here so the agent can docker build without touching the host daemon. microsandbox boots OCI images directly. hypeman snapshots this layer for millisecond restores." },
      { id: "agent", label: "Agent as root in the guest", kind: "workload", blurb: "Root inside a VM is ordinary. The VM is the box. The remaining shared surface is whatever you deliberately mounted — usually the project directory." },
    ],
  },
];

export const SYSTEMS: System[] = [
  {
    id: "yolobox",
    name: "yolobox",
    short: "Container YOLO box",
    maker: "Finbarr",
    family: "container",
    familyNote: "Docker/Podman container, or Apple Container on macOS Tahoe+. Not a microVM on Linux. On a Mac the 'container' is always sitting on a Linux VM — shared (Docker/Colima) or one-per-box (Apple Container). The README is explicit: protection from accidents, not a container-escape theorem.",
    oneLiner: "Launch Claude, Codex, Gemini, or Copilot in a container that never mounts your home.",
    role: "wrapper",
    vmm: "None — container runtime",
    kernel: "shared",
    openSource: "Open source",
    platforms: "Anything that runs Docker",
    startup: "Container start; seconds on first pull, fast after",
    overhead: "One developer container",
    workspace: "Project bind-mounted at the real host path. $HOME off by default. Persistent volumes for tools.",
    network: "On by default. --no-network available.",
    nestedDocker: "Not the design. Host docker.sock would punch through. On Apple Container there is no dockerd at all — a second container is a second VM, and derived image builds are unsupported.",
    harness: "First-class wraps: claude --dangerously-skip-permissions, codex --dangerously-bypass-approvals-and-sandbox, gemini/copilot --yolo, OpenCode native.",
    useCases: [
      "Local YOLO coding without the agent seeing ~/.ssh, cloud creds, or other repos",
      "Agents that must apt-get / npm i -g / spin a database inside the box",
      "Session continuity on the real project path",
    ],
    notFor: [
      "Hostile or multi-tenant untrusted code",
      "A kernel-exploit threat model",
      "Nested docker build against the host engine",
    ],
    security: "Accident fence. The project tree is live and writable. Forwarded env and the host kernel are in the blast radius. For hostile code the project itself says use rootless Podman or a VM.",
    caveats: [
      "Does not protect the mounted project, forwarded secrets, or the host kernel",
      "Network is open unless you turn it off",
      "Shares every kernel CVE with the host. On a Mac the kernel you lose is the Colima / Docker Desktop guest — which holds every other container and whatever the VM shares from Darwin (Docker Desktop shares /Users by default)",
      "Apple Container cannot build derived images, cannot --platform, and does not share a kernel with a sibling container",
    ],
    scores: { isolation: 2, performance: 4, harnessFit: 5, untrustedCode: 2, laptopDx: 5 },
    layers: ["hw", "host-kernel", "ns", "rootfs", "agent"],
    sources: [
      { label: "yolobox.dev", href: "https://yolobox.dev/" },
      { label: "github.com/finbarr/yolobox", href: "https://github.com/finbarr/yolobox" },
    ],
  },
  {
    id: "incus",
    name: "Incus",
    short: "Linux system containers",
    maker: "Linux Containers",
    family: "system",
    familyNote: "System containers share the host kernel and run a full distro (PID 1 = /sbin/init). That is not Docker, and it is not a microVM. Incus --vm is a different product: QEMU, dedicated kernel, nested virt on a Mac. This row is the LXC path.",
    oneLiner: "Give the agent a machine — apt, systemd, sudo, nested Docker — without paying for a second kernel.",
    role: "runtime",
    vmm: "None for containers (liblxc). QEMU/KVM only if you pass --vm.",
    kernel: "shared",
    openSource: "Apache-2.0",
    platforms: "Linux native. macOS via a Linux VM (Colima, OrbStack) — Darwin cannot host LXC.",
    startup: "Image launch in seconds; btrfs/zfs CoW clone in milliseconds from a golden snapshot.",
    overhead: "A full OS, densely packed. No hypervisor tax on the LXC path.",
    workspace: "Instance disk, profiles, snapshots. Bind-mount the project if you want a live tree; golden images if you want disposable machines.",
    network: "Per-instance nic on an Incus bridge. Isolated from siblings unless you wire it. Docker on the same host is a known iptables fight.",
    nestedDocker: "Yes, the documented path: security.nesting=true, host-loaded kernel modules, optional /.dockerenv. No host docker.sock. This is a reason people pick Incus over an app container.",
    harness: "Not a Claude/Codex wrapper. You install the agent inside the machine. Pere Villega's Sandbox for Claude is the worked example: `sandbox my-api --claude` drops you into Claude Code in its own Incus box.",
    useCases: [
      "Pere Villega, Sandbox for Claude — one Incus system container per project, btrfs golden images, nested Docker, tmux of several Claudes. The agent needs a laptop, not a process: apt, systemd, sudo, compose.",
      "Nested Docker without handing over the host socket",
      "Dense long-lived Linux tenancy: labs, CI runners, VPS-shaped boxes, snapshots, profiles",
    ],
    notFor: [
      "Kernel isolation of untrusted codegen — still the host kernel",
      "A drop-in yolobox/nono wrap of a CLI on Darwin",
      "Millisecond embeddable sandboxes (that's microsandbox or nono)",
    ],
    security: "Unprivileged by default: container root is a high host uid. AppArmor, seccomp, idmaps. Stronger accident and escape-to-user story than stock Docker. A kernel CVE is still a host CVE. Privileged containers and security.nesting widen the hole — do not treat nesting as a microVM.",
    caveats: [
      "Linux ABI. On a Mac you first boot OrbStack/Colima; Incus --vm then needs nested virt (M3+, macOS 15+)",
      "Nesting Docker can stomp iptables/sysctl for other instances",
      "OCI application containers exist in Incus too — do not confuse those with system containers",
    ],
    scores: { isolation: 3, performance: 4, harnessFit: 3, untrustedCode: 2, laptopDx: 3 },
    layers: ["hw", "host-kernel", "lxc", "distro", "nested", "agent"],
    sources: [
      { label: "Incus containers vs VMs", href: "https://linuxcontainers.org/incus/docs/main/explanation/containers_and_vms/" },
      { label: "Incus FAQ: Docker inside", href: "https://linuxcontainers.org/incus/docs/main/faq/" },
      { label: "Pere Villega: Sandbox for Claude", href: "https://perevillega.com/posts/2026-03-03-ai-sandbox-coding-agents/" },
      { label: "github.com/pvillega/sandbox-claude", href: "https://github.com/pvillega/sandbox-claude" },
    ],
  },
  {
    id: "docker-sbx",
    name: "Docker sbx",
    short: "Laptop microVM + private daemon",
    maker: "Docker",
    family: "microvm",
    familyNote: "Each agent session is a microVM with its own kernel and a private Docker daemon. The VMM is Docker's, in the libkrun lineage, on the platform hypervisor — not Firecracker, so it can be native on macOS and Windows.",
    oneLiner: "Treat the coding agent like a human developer: full docker build, no path back to the host.",
    role: "wrapper",
    vmm: "Custom VMM (libkrun family) on HVF / WHP / KVM",
    kernel: "dedicated",
    openSource: "Free standalone CLI, no Docker Desktop required; VMM not open",
    platforms: "macOS, Windows, Linux (Ubuntu packages; KVM)",
    startup: "MicroVM boot; typically a short wait, then a full Linux userland",
    overhead: "Commonly capped around 2 vCPU / 4 GB on laptops",
    workspace: "Filesystem passthrough (virtiofs) at the same absolute host path. Live, bidirectional, no sync daemon. `--clone` flips it: the repo is mounted read-only and the agent works on a private in-VM clone. Everything else stops at the VM.",
    network: "Host-side proxy, deny-by-default policy; UDP and ICMP blocked. No route to host localhost or the host daemon. Injects auth headers so raw secrets never enter the VM.",
    nestedDocker: "Yes — private engine inside the VM. No host socket, no DinD privilege dance.",
    harness: "First-class: Claude Code, Codex, Gemini CLI, Copilot, OpenCode, Kiro, Docker Agent.",
    useCases: [
      "Autonomous local agents that need docker compose, tests, and a real Linux box",
      "Keeping YOLO/dangerous mode without giving the model your kernel or your daemon",
      "Credential injection from outside the VM",
    ],
    notFor: [
      "Embeddable in-process SDK for your own product",
      "Multi-tenant cloud browsers (that's hypeman / Kernel)",
      "Protecting the project files themselves — the mount is live",
    ],
    security: "Hardware boundary plus no path back to the host, except the workspace you mounted. Policies are set before the agent runs, not by the model. The remaining shared surface is that workspace.",
    caveats: [
      "The project directory is a live bind mount unless you pass --clone — rm in the repo is real, and git hooks, Makefiles, package.json scripts edited inside run on your host later",
      "Local stdio MCP servers run on the host through the MCP gateway, not inside the VM — they are trusted host integrations",
      "The shared agent-skills store is mounted read-write across sandboxes: one box can edit what another box's agent reads next",
      "Laptop RAM/CPU budget is a hard cap",
      "Closed VMM; you are in Docker's release train",
    ],
    scores: { isolation: 4, performance: 3, harnessFit: 5, untrustedCode: 4, laptopDx: 4 },
    layers: ["hw", "host-kernel", "vmm", "guest-kernel", "guest-user", "agent"],
    sources: [
      { label: "docs.docker.com/ai/sandboxes", href: "https://docs.docker.com/ai/sandboxes/" },
      { label: "Why MicroVMs (Docker blog)", href: "https://www.docker.com/blog/why-microvms-the-architecture-behind-docker-sandboxes/" },
    ],
  },
  {
    id: "microsandbox",
    name: "microsandbox",
    short: "Embeddable libkrun runtime",
    maker: "Super Rad Company (formerly Zerocore AI)",
    family: "microvm",
    familyNote: "Hardware-isolated microVMs via libkrun. Local-first and embeddable — spawn a VM as a child process, no long-running orchestrator required. OCI images from any registry.",
    oneLiner: "Virtual machines that feel like containers, with an SDK your agent can call.",
    role: "runtime",
    vmm: "libkrun (KVM / HVF / WHP)",
    kernel: "dedicated",
    openSource: "Open source",
    platforms: "Linux + KVM, macOS Apple Silicon, Windows + WHP",
    startup: "Reported under 100 ms on Apple Silicon; typically sub-200 ms",
    overhead: "Claimed around 5 MB per instance for the VMM path",
    workspace: "Configured per sandbox (volumes, OCI layers). Designed for disposable and long-running named sandboxes.",
    network: "Configurable; libkrun Transparent Socket Impersonation. Secrets designed not to enter the guest in usable form.",
    nestedDocker: "Runs OCI images as VMs. A general untrusted-workload runtime, not a private Docker Desktop inside the guest.",
    harness: "Not a Claude/Codex wrapper. TypeScript, Rust, Python, Go, Ruby SDKs, CLI (msb), Agent Skills / MCP so agents create their own boxes.",
    useCases: [
      "In-product execution of model-written code",
      "Plugins, CI jobs, scrapers, Playwright, disposable GitHub runners",
      "Agents that must open a sandbox as a tool",
    ],
    notFor: [
      "Drop-in `sbx run claude` on a laptop workspace",
      "Production browser-as-a-service with GPU and live restore (hypeman's job)",
      "Policy-only sandboxing of a local IDE agent",
    ],
    security: "Hardware isolation with a dedicated kernel. Built for untrusted workloads rather than wrapping a trusted developer CLI. Secret handling is a first-class claim: keys should not be extractable from the guest.",
    caveats: [
      "You bring the workload image and lifecycle",
      "Harness compatibility is via SDK, not YOLO flags",
      "Cloud offering has been a separate, evolving product",
    ],
    scores: { isolation: 5, performance: 5, harnessFit: 3, untrustedCode: 5, laptopDx: 3 },
    layers: ["hw", "host-kernel", "vmm", "guest-kernel", "guest-user", "agent"],
    sources: [
      { label: "github.com/superradcompany/microsandbox", href: "https://github.com/superradcompany/microsandbox" },
      { label: "libkrun", href: "https://github.com/containers/libkrun" },
    ],
  },
  {
    id: "hypeman",
    name: "hypeman",
    short: "Multi-hypervisor OCI runtime",
    maker: "Kernel (kernel.sh)",
    family: "microvm",
    familyNote: "Open-source VM runtime with a Docker-like CLI. One control plane, four hypervisors: Cloud Hypervisor, Firecracker, QEMU on Linux; Virtualization.framework on macOS. Powers Kernel's browser isolation in production.",
    oneLiner: "docker run, but the unit is a VM — snapshots, ingress, vGPU, and a remote API.",
    role: "runtime",
    vmm: "Cloud Hypervisor · Firecracker · QEMU · Apple Virtualization.framework",
    kernel: "dedicated",
    openSource: "MIT, written in Go",
    platforms: "Linux (KVM) and macOS (Apple Silicon). Server + CLI, local or remote.",
    startup: "Cold boot in the microVM range; standby/restore and UFFD-paged forks for millisecond-class resume. Kernel claims sandboxed Chromium in <30 ms from snapshots.",
    overhead: "Depends on guest image and hypervisor. Production-shaped, not a 5 MB library.",
    workspace: "OCI image as guest rootfs. Standby snapshots memory+disk. VM forking for copies. Not a live bind of your laptop $HOME.",
    network: "Built-in ingress, TLS, subdomain routing, optional egress MITM proxy.",
    nestedDocker: "OCI-in-VM is the product. GPU via vGPU / VFIO. A full engine inside the guest is a guest concern.",
    harness: "Infrastructure, not an agent wrapper. Kernel uses it so each browser agent gets a dedicated VM. You pull nginx:alpine and get a VM, not a namespace.",
    useCases: [
      "Multi-tenant untrusted browser and agent compute",
      "Self-hosted sandbox fleet with snapshot restore",
      "Teams that want Firecracker or Cloud Hypervisor without writing the orchestrator",
    ],
    notFor: [
      "Wrapping Claude Code on a developer laptop",
      "Kubernetes-native microVMs (Kata is that niche)",
      "Zero-daemon embeddable library (that's microsandbox)",
    ],
    security: "Hardware isolation with a choice of battle-tested VMMs. Production dogfooding at Kernel (browser-as-a-service). Server is a privileged control plane — protect that API.",
    caveats: [
      "Daemon architecture (systemd / launchd), not a child-process library",
      "Younger than Firecracker itself; Kernel-heavy contributors",
      "Wrong tool if all you needed was Seatbelt around bash",
    ],
    scores: { isolation: 5, performance: 4, harnessFit: 2, untrustedCode: 5, laptopDx: 2 },
    layers: ["hw", "host-kernel", "vmm", "guest-kernel", "guest-user", "agent"],
    sources: [
      { label: "github.com/kernel/hypeman", href: "https://github.com/kernel/hypeman" },
      { label: "kernel.sh", href: "https://www.kernel.sh/" },
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    short: "Seatbelt / bubblewrap + hooks",
    maker: "Anthropic",
    family: "process",
    familyNote: "Local: OS-level sandbox on the Bash tool (Seatbelt on macOS, bubblewrap on Linux/WSL2) plus a domain-allowlist network proxy. Permissions/hooks are a second layer. Claude Code on the web is a different box entirely: an Anthropic-managed VM per session — a Firecracker guest kernel with a vsock init, host-local connections blocked, an allowlist egress proxy, and a separate proxy that holds the GitHub token outside the sandbox (observed Sep 2026; gVisor had been seen earlier).",
    oneLiner: "Don't approve every ls. Let the kernel police bash, and let hooks police the rest of the harness.",
    role: "harness",
    vmm: "None locally. Cloud sessions are a different, heavier box.",
    kernel: "shared",
    openSource: "Sandbox primitives as @anthropic-ai/sandbox-runtime; harness is Anthropic's",
    platforms: "macOS, Linux, WSL2. Native Windows is not supported.",
    startup: "Process spawn. Effectively free.",
    overhead: "A proxy and a sandbox profile. No VM, no container.",
    workspace: "Writes to cwd and added dirs. Reads most of the filesystem except denied/protected paths (.claude, git metadata, shell rc, credentials you mask).",
    network: "On, through a userspace proxy with an allowlist. New domains prompt or auto-classify. Not default-deny.",
    nestedDocker: "A reachable docker.sock is a documented class of bypass. The sandbox is not a VM.",
    harness: "This is the harness. Sandbox covers Bash and children. Read/Edit/WebFetch are in-process and follow the permission model. MCP servers and hooks are separate processes that run unconstrained on the host. sandbox-runtime wraps the entire process — tools, hooks, MCP — if you want one boundary.",
    useCases: [
      "Interactive local pair-programming with auto-allowed bash",
      "Org-managed allowlists and credential masking on egress",
      "Low-friction default on a trusted developer machine",
    ],
    notFor: [
      "Untrusted tenants on a shared host",
      "Assuming the whole Claude process is jailed",
      "Native Windows without WSL2",
    ],
    security: "Kernel-enforced for bash, application-enforced for everything else. Complementary, not interchangeable. A kernel bug is a host bug. Unix sockets, Apple Events, and allowUnsandboxedCommands are the sharp edges.",
    caveats: [
      "Filesystem isolation can be disabled; unsandboxed fallback exists unless you lock it",
      "MCP servers and hooks run on the host outside the Bash box — a repo-supplied .mcp.json is host code execution, which is why the sandbox refuses writes to it",
      "Computer-use is the host desktop",
      "Read of the rest of the disk is wide by default",
      "Ubuntu 24.04+ AppArmor blocks bubblewrap's user namespaces until you add a bwrap profile; without it the sandbox silently degrades unless failIfUnavailable is set",
    ],
    scores: { isolation: 2, performance: 5, harnessFit: 5, untrustedCode: 2, laptopDx: 5 },
    layers: ["hw", "host-kernel", "policy", "agent", "bash"],
    sources: [
      { label: "Claude Code sandboxing docs", href: "https://code.claude.com/docs/en/sandboxing" },
      { label: "sandbox-runtime", href: "https://github.com/anthropic-experimental/sandbox-runtime" },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    short: "Kernel sandbox, two surfaces",
    maker: "OpenAI",
    family: "process",
    familyNote: "Local CLI is default-on OS sandboxing: Seatbelt on macOS, bubblewrap (Landlock + seccomp fallback) on Linux, restricted tokens on Windows. Modes: read-only, workspace-write, danger-full-access. Cloud Codex clones the repo into an isolated environment with network off by default — a different, thicker box.",
    oneLiner: "Local: the kernel says no. Cloud: the machine isn't yours. Network starts off.",
    role: "harness",
    vmm: "None locally. Cloud tasks run in an isolated clone (container / VM-class isolation, not your laptop kernel).",
    kernel: "shared",
    openSource: "CLI sandboxing is visible in the Codex repo (linux-sandbox / bubblewrap). Cloud isolation is OpenAI's.",
    platforms: "macOS, Linux/WSL2, Windows (restricted tokens). Cloud via the Codex app.",
    startup: "Local spawn is free. Cloud pays clone + provision cost.",
    overhead: "Local: policy. Cloud: an ephemeral machine.",
    workspace: "Local workspace-write is the project tree, with .git and .codex carved out read-only. Cloud works on a clone and comes back as a PR — your laptop FS is out of the blast radius.",
    network: "Disabled by default on both surfaces. Explicit allowlist to punch out.",
    nestedDocker: "Local docker.sock is the same socket-bypass class as any process sandbox. Cloud has whatever the image ships, not your daemon.",
    harness: "This is the harness. Default-on, harder to leave off than Claude's bash sandbox. Smaller hook surface; the kernel does more of the work.",
    useCases: [
      "Hands-off local edits with a real kernel fence and no network",
      "Delegated cloud tasks whose blast radius is a throwaway clone",
      "When you want deny-by-default more than a rich hook model",
    ],
    notFor: [
      "Native nested docker against the host engine",
      "Assuming cloud isolation if you actually launched the CLI",
      "A programmable 30-event governance layer (that's Claude Code)",
    ],
    security: "The important split: CLI is a process sandbox on a shared kernel; cloud is environment isolation. Do not cite one when you mean the other. Default-deny network is the standout local control versus Claude Code.",
    caveats: [
      "Linux without bubblewrap degrades; commands then fail closed or prompt",
      "danger-full-access is not a sandbox",
      "Cloud isolation does not protect a local CLI session",
    ],
    scores: { isolation: 3, performance: 5, harnessFit: 5, untrustedCode: 3, laptopDx: 4 },
    layers: ["hw", "host-kernel", "policy", "agent", "bash"],
    sources: [
      { label: "Codex sandboxing", href: "https://developers.openai.com/codex/security/" },
      { label: "codex linux-sandbox", href: "https://github.com/openai/codex/blob/main/codex-rs/linux-sandbox/README.md" },
    ],
  },
  {
    id: "nono",
    name: "nono",
    short: "Capability shell · Landlock / Seatbelt",
    maker: "nolabs (Luke Hinds)",
    family: "process",
    familyNote: "A kernel-enforced capability shell, not a container and not a VM. Landlock on Linux, Seatbelt on macOS. The split vs Claude Code / Codex: the agent gets a session sandbox, and each tool call gets a narrower, invocation-scoped child sandbox the agent cannot widen. Secrets stay with the supervisor as phantom tokens.",
    oneLiner: "Zero-setup wrap of any agent: session sandbox plus a brokered sandbox per tool, with secrets that never enter the child.",
    role: "wrapper",
    vmm: "None — Landlock / Seatbelt. No daemon, no image, no VM.",
    kernel: "shared",
    openSource: "Apache-2.0",
    platforms: "macOS, Linux, Windows via WSL2",
    startup: "Process spawn. Claimed zero latency, zero disk.",
    overhead: "A policy and a proxy. Kilobytes, not a machine.",
    workspace: "Profile grants, usually the project tree. Tool children get their own filesystem and credential slice — they do not inherit the agent's --allow.",
    network: "nono proxy, L7 method/path policy. Real credentials injected at the boundary and zeroised on exit. The child sees a phantom token.",
    nestedDocker: "Not a container runtime. Deny docker.sock in the profile or it is the same Unix-socket hole as any process sandbox.",
    harness: "Wraps Claude Code, Codex, OpenCode, Copilot, Pi, Hermes, OpenClaw, Goose, Qwen. Signed profiles from registry.nono.sh. Fork and extend; no harness rewrite.",
    useCases: [
      "Wrap whichever CLI you actually use, today, with no image and no VM",
      "Per-tool least privilege: gh/git/kubectl in a tighter box than the agent session",
      "Keep GitHub/cloud tokens off the agent's filesystem",
    ],
    notFor: [
      "A kernel-exploit or multi-tenant threat model",
      "Giving the agent a private Docker engine",
      "A full-machine environment (that's Incus, not a process policy)",
    ],
    security: "Kernel-enforced, irreversible once applied — there is no API to unsandbox from inside. Stronger than Claude's bash-only box because tools are brokered separately. Still a policy on the host kernel. A Landlock/Seatbelt miss or a kernel bug is a host bug.",
    caveats: [
      "The workspace you granted is live and writable",
      "Policy quality is the product — a sloppy profile is Seatbelt with extra steps",
      "Windows is WSL2, not a native job object sandbox",
    ],
    scores: { isolation: 3, performance: 5, harnessFit: 5, untrustedCode: 2, laptopDx: 5 },
    layers: ["hw", "host-kernel", "policy", "agent", "bash"],
    sources: [
      { label: "nono.sh", href: "https://nono.sh/" },
      { label: "github.com/nolabs-ai/nono", href: "https://github.com/nolabs-ai/nono" },
    ],
  },
  {
    id: "openshell",
    name: "OpenShell",
    short: "Policy gateway over Docker · K8s · microVM",
    maker: "NVIDIA",
    family: "container",
    familyNote:
      "A control plane, not one primitive. A gateway owns policy, providers and identity; a compute driver builds the boundary — Docker, Podman, a Kubernetes pod (Kata via runtimeClass if you ask), or a libkrun microVM. The same supervisor and policy engine run over all of them, so the kernel line is a driver setting: shared on Docker, Podman and Kubernetes, dedicated on the VM driver. Inside, a capability-free non-root workload gets Landlock, seccomp and a network namespace whose only exit is a supervisor that sits on the trusted side and holds the real credentials.",
    oneLiner:
      "Declare what each agent may touch in a policy. A supervisor outside the workload enforces it, injects credentials only at approved endpoints, and a prover checks policy changes before they apply.",
    role: "runtime",
    vmm: "Driver-chosen: none (Docker, Podman, K8s) · libkrun on KVM / Apple Hypervisor (VM driver) · Kata via runtimeClass",
    kernel: "shared",
    openSource: "Apache-2.0",
    platforms: "Linux x86_64 / arm64; macOS Apple Silicon via Docker Desktop; Windows WSL 2 (experimental). Native Windows via MXC: announced, not shipped.",
    startup: "Container or pod start plus a supervisor handshake; the agent is held until the boundary is confirmed. MicroVM boot on the VM driver.",
    overhead: "A gateway, a supervisor per sandbox, and a proxy. Container-weight on Docker/Podman; VM-weight (vcpus, mem_mib) on the VM driver.",
    workspace: "A private sandbox filesystem: image, `sandbox upload` / download, named volumes. Bind-mounting a host path is an explicit opt-in that turns off resource admission, and the docs warn it can bypass filesystem policy.",
    network: "Deny-by-default. The only exit is the supervisor: no NIC in the VM driver, networking off on the Docker container, NetworkPolicy on Kubernetes (your CNI must enforce it). Rules are per host, port and calling binary, with optional L7 for REST, GraphQL and WebSocket. Loopback, link-local and metadata addresses are always blocked.",
    nestedDocker: "Not a documented workflow. The workload runs non-root with no Linux capabilities and no docker.sock; the gateway, not the agent, holds the runtime socket. Safe by absence, not a feature.",
    harness: "Any CLI you put in the image. The docs cover Claude Code, OpenCode, Codex and Copilot CLI (the quickstart runs OpenCode). Python, TypeScript, Go and Rust SDKs drive the gateway; NVIDIA's NemoClaw is a blueprint on top.",
    useCases: [
      "Governed fleets: many agents behind one gateway, OIDC roles and per-team workspaces, Helm on Kubernetes",
      "Credentials that work only at approved endpoints and only for the named binary: gh gets the GitHub token, nothing else does",
      "Agents that ask for more access at runtime: the advisor proposes a rule, a human (or the prover-gated auto-approve) accepts it, no restart",
      "Verifiable delegation: a boundary check proves a subagent's policy stays inside its parent's maximum",
    ],
    notFor: [
      "Untrusted code on the Docker, Podman or default Kubernetes drivers — the kernel is still the host's",
      "An agent that needs apt, systemd or a nested Docker engine",
      "A ten-minute wrap of one CLI where a gateway is more machinery than the threat",
    ],
    security:
      "Two layers that do not depend on each other: the runtime boundary the driver builds, and the mediation the supervisor applies. The workload holds no gateway token and no provider credential; if the supervisor drops, the sandbox freezes the agent. Binary identity is SHA-256 pinned on first use. Filesystem and process controls are fixed at creation; network and provider bindings change live. The prover uses an SMT solver and only covers the policy features its model represents.",
    caveats: [
      "Kernel line depends on the driver: only the VM driver or a Kata runtimeClass gives a dedicated kernel",
      "The VM driver's own README says Experimental while the support matrix lists MicroVM as supported — read both",
      "Landlock baseline needs Linux 6.2+ (ABI 3); startup fails rather than degrade",
      "L7 rules default to audit: they log but do not block until you set enforce. Endpoints with no request rules allow any method and path",
      "The gateway holds the runtime socket on the Docker driver — it is the trusted component to protect",
      "Docker Desktop needs host networking and no Enhanced Container Isolation; WSL 2 is experimental",
    ],
    scores: { isolation: 3, performance: 4, harnessFit: 4, untrustedCode: 3, laptopDx: 3 },
    layers: ["hw", "host-kernel", "ns", "rootfs", "agent"],
    sources: [
      { label: "OpenShell architecture", href: "https://docs.nvidia.com/openshell/latest/about/architecture" },
      { label: "github.com/NVIDIA/OpenShell", href: "https://github.com/NVIDIA/OpenShell" },
      { label: "RFC 0012: isolation backend", href: "https://github.com/NVIDIA/OpenShell/blob/main/rfc/0012-isolation-backend/README.md" },
    ],
  },
  {
    id: "discobox",
    name: "discobox",
    short: "Parallel agent boxes, git as the sync layer",
    maker: "discobox-ai",
    family: "system",
    familyNote:
      "yolobox's workflow (wrap Claude Code, Codex or OpenCode, passwordless sudo) with Incus's shape: each box is a systemd Linux container with nested Docker, a desktop and a browser. The difference is the pool. Boxes live inside a pool, which is one runtime host, and boxes in a pool share its kernel by design — the project's own ADR says mutually untrusted work belongs in different pools. The pool host is the kernel line, and it depends on the OS: a Virtualization.framework VM on macOS, a WSL Containers VM on Windows, the host's own Docker daemon on Linux by default, or a libkrun microVM or cloud VM if you opt in.",
    oneLiner:
      "Give each agent session its own box with its own clone of the repo, and get the work back as ordinary git commits.",
    role: "wrapper",
    vmm: "Per pool: Virtualization.framework (macOS) · WSL Containers (Windows) · host Docker daemon (Linux default) · libkrun / KVM, cloud VM, Kata (opt-in)",
    kernel: "shared",
    openSource: "Apache-2.0",
    platforms: "macOS, Linux, Windows. The client installs with brew or a script; the server is downloaded on first use.",
    startup: "The first pool fetches a guest image and boots a VM or daemon; later boxes start inside a warm pool. Idle boxes stop themselves when their terminals go quiet.",
    overhead: "One pool VM or daemon, then a full-OS container per box, with a pool-wide BuildKit cache.",
    workspace: "Not a mount. The box clones your repo at the commit you have checked out, and origin inside is read-only. `discobox apply` cherry-picks committed work back in a scratch worktree, all-or-nothing; or push a PR from inside the box.",
    network: "Boxes sit on an internal network whose only exit is the pool's MITM proxy: a per-box mTLS identity, destination policy, DNS through the pool, and an audit row per request. Every allowed CONNECT is intercepted; there is no passthrough tunnel.",
    nestedDocker: "Yes. dockerd runs in the box, builds go through the pool's BuildKit, and a runc wrapper puts the proxy CA into every nested container so their egress stays on the same proxy.",
    harness: "Claude Code, Codex and OpenCode ship as harness images; other terminal agents can be packaged into one. VS Code or Zed over SSH, a VNC desktop, and an OpenAPI / CLI surface for automation.",
    useCases: [
      "Several agent sessions on one repository at once, each in its own box, while your own checkout stays yours",
      "Agents that need a full machine plus a desktop, a browser and nested Docker",
      "Credentials the agent requests and a human grants for a host scope and an expiry; the real value never enters the box",
      "Designed, not confirmed shipped: a sandbox that is itself a macOS or Windows VM, for work that only runs there (ADR 0144, 0145)",
    ],
    notFor: [
      "Hostile code on Linux with the default provider — the pool is the host's Docker daemon and box containers are created privileged",
      "Hostile tenants inside one pool — by its own design they share a kernel",
      "Embedding as a library in your own product",
    ],
    security:
      "Egress and credentials are the real controls: per-box mTLS identity, audited MITM, ephemeral sentinels bound to a host and a five-minute window, human grants with an expiry, and control-plane checks that never trust the box. An LLM judge compares a credential-bearing command to the English grant, but it runs inside the box, so the project itself calls it a guardrail, not a boundary. Kernel isolation is whatever the pool host is: a VM on macOS and Windows, the host on the Linux default.",
    caveats: [
      "Linux default provider is `docker`: the pool agent and its sibling boxes run on the host daemon. libkrun is opt-in and needs /dev/kvm",
      "Box containers are created privileged (systemd, nested Docker); the rootless / userns default in ADR 0004 is still marked Proposed",
      "Boxes in one pool share a kernel, a proxy and a BuildKit",
      "Under active development; every release starts as a prerelease",
      "The judge is a guardrail inside the box, not a trust boundary",
    ],
    scores: { isolation: 3, performance: 3, harnessFit: 4, untrustedCode: 2, laptopDx: 4 },
    layers: ["hw", "host-kernel", "lxc", "distro", "nested", "agent"],
    sources: [
      { label: "github.com/discobox-ai/discobox", href: "https://github.com/discobox-ai/discobox" },
      { label: "ADR 0003: the pool", href: "https://github.com/discobox-ai/discobox/blob/main/docs/adr/0003-promote-pool-to-a-first-class-primitive.md" },
      { label: "ADR 0004: userns isolation profiles", href: "https://github.com/discobox-ai/discobox/blob/main/docs/adr/0004-user-namespaces-are-the-default-isolation.md" },
      { label: "ADR 0079: the local judge", href: "https://github.com/discobox-ai/discobox/blob/main/docs/adr/0079-a-local-judge-gates-every-wrapped-credential-use.md" },
    ],
  },
];

export const THREATS: Threat[] = [
  {
    id: "rm-home",
    title: "rm -rf on home",
    prompt: "The agent runs rm -rf ~/* after a confused instruction.",
    why: "The original YOLO-mode nightmare. Distinguishes accident fences from actual host isolation.",
    outcomes: {
      yolobox: { verdict: "contained", note: "Home is not mounted. Only the container home dies." },
      "docker-sbx": { verdict: "contained", note: "Guest home is the VM. Host $HOME is outside unless you mounted it." },
      microsandbox: { verdict: "contained", note: "Guest filesystem. Host home never appeared." },
      hypeman: { verdict: "contained", note: "OCI guest disk. Your laptop home is not in the picture." },
      "claude-code": { verdict: "partial", note: "Sandboxed bash cannot write outside the workspace by default. Unsandboxed fallback, disabled FS isolation, or a non-bash tool can still reach home." },
      codex: { verdict: "contained", note: "workspace-write cannot touch $HOME. danger-full-access can. Cloud clone never saw your home." },
      nono: { verdict: "contained", note: "Home is outside the grant unless the profile added it. A tool sandbox cannot widen that grant from inside." },
      incus: { verdict: "contained", note: "The instance has its own rootfs. Host $HOME appears only if you bind-mounted it (Pere Villega's default is that you did not)." },
      openshell: { verdict: "contained", note: "Landlock leaves only listed paths writable, system paths are read-only, and the sandbox has its own rootfs. Host home appears only through an admission-disabled bind mount." },
      discobox: { verdict: "contained", note: "The box has its own filesystem and a clone of the repo. Nothing of your $HOME is mounted." },
    },
  },
  {
    id: "kernel-cve",
    title: "Kernel exploit in the sandbox",
    prompt: "A compromised agent triggers a known Linux kernel LPE from inside the box.",
    why: "This is the actual MicroVM thesis. Shared-kernel designs lose together.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Shared host kernel. A kernel bug is a host bug. yolobox says so." },
      "docker-sbx": { verdict: "contained", note: "Guest kernel. Escape now requires a VMM/hypervisor bug, not a generic kernel LPE." },
      microsandbox: { verdict: "contained", note: "Dedicated guest kernel via libkrun. Same hardware story." },
      hypeman: { verdict: "contained", note: "Guest kernel on Firecracker, Cloud Hypervisor, QEMU, or Apple virt." },
      "claude-code": { verdict: "exposed", note: "Seatbelt/bubblewrap are policies on the host kernel." },
      codex: { verdict: "partial", note: "Local CLI: host kernel, exposed. Cloud task: contained in OpenAI's isolated environment." },
      nono: { verdict: "exposed", note: "Landlock and Seatbelt are still this kernel. no daemon, no VM — and no second kernel." },
      incus: { verdict: "exposed", note: "System containers share the host kernel. Unprivileged uid maps soften an escape-to-root; they do not stop a kernel LPE. Incus --vm would contain this; that is not this row." },
      openshell: { verdict: "partial", note: "Docker, Podman and K8s drivers: exposed — Landlock and seccomp are this kernel. VM driver or a Kata runtimeClass: contained. The driver decides, not the product." },
      discobox: { verdict: "partial", note: "The pool host decides. macOS and Windows pools contain it to the pool VM, which holds every box in that pool. On Linux the default pool is the host Docker daemon: exposed. Boxes in one pool lose together." },
    },
  },
  {
    id: "docker-sock",
    title: "Docker socket takeover",
    prompt: "The agent talks to /var/run/docker.sock and starts a privileged container on the host.",
    why: "The classic container-escape-by-API. Coding agents want docker build, which is exactly why this shows up.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "If the host socket is mounted, the host is owned. The design does not give you a private daemon." },
      "docker-sbx": { verdict: "contained", note: "Private daemon inside the VM. docker build is a guest operation. This is Docker's headline feature." },
      microsandbox: { verdict: "contained", note: "No host socket. Workloads are VMs (OCI), not clients of your engine." },
      hypeman: { verdict: "contained", note: "The control plane is hypeman's API, not the host docker socket." },
      "claude-code": { verdict: "exposed", note: "Unix sockets are a documented bypass class if reachable from the sandbox." },
      codex: { verdict: "partial", note: "Local: same socket class if present. Cloud: not your daemon." },
      nono: { verdict: "partial", note: "Deny the socket in the profile and it is closed. Allow docker or mount the socket and it is the same hole as Claude Code." },
      incus: { verdict: "contained", note: "The point of security.nesting: a dockerd inside the instance, not /var/run/docker.sock on the host." },
      openshell: { verdict: "contained", note: "The workload has no capabilities and no runtime socket; the gateway holds it, so the gateway is what you protect." },
      discobox: { verdict: "partial", note: "The host socket goes to the pool agent, not the box, and the box runs its own dockerd. On the Linux default the box is a privileged container on that same daemon, so no-socket is policy, not a wall." },
    },
  },
  {
    id: "secrets",
    title: "Secret exfil",
    prompt: "Prompt injection tells the agent to cat ~/.aws/credentials and curl them out.",
    why: "Filesystem visibility plus egress. Most 'sandboxes' fail one of the two.",
    outcomes: {
      yolobox: { verdict: "partial", note: "Home (and those keys) are invisible. Project .env and forwarded env are still there. Network is on." },
      "docker-sbx": { verdict: "partial", note: "Host creds stay out; proxy can inject headers without giving the guest the secret. Workspace secrets are in the mount. Egress is policy." },
      microsandbox: { verdict: "contained", note: "Designed so secrets are not extractable from the guest. You still must not copy .env into the image." },
      hypeman: { verdict: "contained", note: "No host home. Egress can be proxied. Anything baked into the OCI image is guest-visible." },
      "claude-code": { verdict: "partial", note: "Credential file/env deny or mask, plus proxy substitution. Default disk reads are wide. Network is allowlist, not off." },
      codex: { verdict: "contained", note: "Default-deny network is the winning control. Local still sees the workspace. Cloud sees only the clone." },
      nono: { verdict: "contained", note: "Phantom tokens: the child never holds GH_TOKEN. The proxy injects the real secret at the boundary and zeroises it. Workspace .env is still your problem." },
      incus: { verdict: "partial", note: "Host creds stay out unless you passed them in. Egress is whatever the instance's nic can reach — Incus is not a secret proxy." },
      openshell: { verdict: "contained", note: "Providers keep credentials in the gateway. The sandbox holds placeholders and the supervisor injects the real value only on requests to approved endpoints from approved binaries, with SSRF and metadata blocked. Workspace .env is still yours." },
      discobox: { verdict: "contained", note: "Managed credentials are sentinels; the proxy swaps the real value only for its bound host, under grants that expire. The judge inside the box is a guardrail only. Anything you put in the clone is visible." },
    },
  },
  {
    id: "workspace-rm",
    title: "Wipe the repo",
    prompt: "The agent deletes source, git history, or .env in the project it was asked to edit.",
    why: "Almost everyone bind-mounts or clones the work. Isolation of the host is not isolation of the work.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Live bind mount at the real path. The repo is the shared surface." },
      "docker-sbx": { verdict: "exposed", note: "Same by default: passthrough mount, instant and bidirectional. `--clone` mounts the repo read-only and works on a private clone — then only the clone dies." },
      microsandbox: { verdict: "partial", note: "Depends on how you mounted volumes. Default posture is disposable guests, not a live worktree." },
      hypeman: { verdict: "partial", note: "Works on an OCI guest. Your laptop repo is only at risk if you exported it in." },
      "claude-code": { verdict: "exposed", note: "The workspace is the point. git metadata has some protection; source files do not." },
      codex: { verdict: "partial", note: "Local workspace-write: exposed. Cloud clone: the laptop copy survives; you review a PR." },
      nono: { verdict: "exposed", note: "The grant is the worktree. Tool sandboxes do not snapshot your git history." },
      incus: { verdict: "partial", note: "On a golden-image clone the laptop repo is safe until you bind-mounted it. Pere Villega bind-mounts the project — then a wipe is real, like yolobox." },
      openshell: { verdict: "partial", note: "The default is a private copy or volume, not your checkout. A bind mount is possible and documented as bypassing workspace isolation. What you download back is a diff to read." },
      discobox: { verdict: "contained", note: "Your checkout is never mounted. The box clones it, origin is read-only, and nothing lands until you run apply, which cherry-picks only committed work, all-or-nothing." },
    },
  },
  {
    id: "nested-build",
    title: "docker build the app",
    prompt: "The agent needs to build and run the project's compose stack to finish the task.",
    why: "Why Docker even built sbx. Shared-kernel wrappers usually cheat with a socket.",
    outcomes: {
      yolobox: { verdict: "partial", note: "Can install tools and run processes in the container on Docker/Podman. Apple Container cannot build derived images and has no in-guest dockerd — compose/build dies. A real engine on Docker means a dangerous socket or a nested daemon you now maintain." },
      "docker-sbx": { verdict: "contained", note: "This is the product. Private engine, compose, build — guest-only." },
      microsandbox: { verdict: "partial", note: "You can boot an image that contains a daemon, or run the build as a VM. It is not a drop-in Docker Desktop." },
      hypeman: { verdict: "contained", note: "OCI-in-VM plus optional GPU. You are already in the 'run a machine' business." },
      "claude-code": { verdict: "exposed", note: "Uses whatever Docker is on the host. Isolation and docker.sock do not mix." },
      codex: { verdict: "partial", note: "Local: host Docker, same tension. Cloud: only if the environment image provides an engine." },
      nono: { verdict: "exposed", note: "Wraps the CLI, does not give it an engine. Compose means the host Docker or a denied socket." },
      incus: { verdict: "contained", note: "This is a primary Incus use case. Nested dockerd in the system container; host socket stays off. Heavier than sbx, cheaper than a dedicated kernel." },
      openshell: { verdict: "partial", note: "Not a documented workflow. No capabilities and no docker.sock: safe, but not a feature. An image with its own engine would be yours to build." },
      discobox: { verdict: "partial", note: "A primary use: dockerd in the box, builds through the pool BuildKit, and a runc wrapper carries the proxy CA into nested containers. No host socket, but the wall behind it is only as strong as the pool host." },
    },
  },
  {
    id: "multitenant",
    title: "Noisy / hostile neighbor",
    prompt: "Two untrusted tenants on one host. One is malicious.",
    why: "Laptop wrappers were not designed for this. Runtimes were.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Shared kernel, developer-laptop tool." },
      "docker-sbx": { verdict: "partial", note: "Strong per-agent VM, but a laptop product with a live workspace mount — not a tenant control plane." },
      microsandbox: { verdict: "contained", note: "The intended audience: untrusted workloads, many boxes, hardware isolation." },
      hypeman: { verdict: "contained", note: "This is Kernel's production path for browser agents, with snapshots and ingress." },
      "claude-code": { verdict: "exposed", note: "A single-user IDE harness." },
      codex: { verdict: "partial", note: "Local: no. Cloud: OpenAI is the multi-tenant operator, not you." },
      nono: { verdict: "exposed", note: "A laptop wrapper. Shared kernel, one operator." },
      incus: { verdict: "partial", note: "This is what Incus clustering and unprivileged LXC are for — dense tenancy on Linux. Still the host kernel. Hostile tenants that need a kernel wall want --vm or a microVM." },
      openshell: { verdict: "partial", note: "Built for it above the kernel: OIDC roles, per-workspace resources, one JWT per sandbox generation. The kernel is still shared on Docker, Podman and default K8s; hostile tenants want the VM driver or Kata." },
      discobox: { verdict: "partial", note: "By its own design boxes in one pool share a kernel and mutually untrusted work belongs in different pools. A pool per tenant fixes it, at the price of a host each." },
    },
  },
  {
    id: "two-boxes",
    title: "Two boxes at once",
    prompt: "A second yolobox session, or the agent docker-runs postgres next to itself.",
    why: "On Linux this is just another namespace. On a Mac it depends whether the runtime is one Linux VM with an engine, or one VM per container.",
    outcomes: {
      yolobox: {
        verdict: "partial",
        note: "Docker/Podman: yes, different --name, same engine. Apple Container: two sibling HVF VMs on Darwin can run — they are not nested inside each other, and yolobox cannot compose them (no dockerd, no derived image). Nested Apple Container inside a VM is impossible: HVF lives on Darwin.",
      },
      "docker-sbx": {
        verdict: "contained",
        note: "Each sbx session is already its own VM with a private engine. Two agents are two VMs. Nested compose lives inside one guest, not as a sibling on the host.",
      },
      microsandbox: {
        verdict: "contained",
        note: "Many child VMs is the point. They do not share a kernel or a Docker daemon unless you image one.",
      },
      hypeman: {
        verdict: "contained",
        note: "A fleet control plane. Concurrent VMs, snapshots, ingress — this is the job.",
      },
      "claude-code": {
        verdict: "n/a",
        note: "Not a container runtime. Two CLI sessions are two process trees on the host.",
      },
      codex: {
        verdict: "n/a",
        note: "Same. Local sessions share the host. Cloud tasks are separate clones.",
      },
      nono: {
        verdict: "n/a",
        note: "Two `nono run` are two process trees. Cheap. They are not machines.",
      },
      incus: {
        verdict: "contained",
        note: "Many system containers per host is the design. Pere Villega's `sandbox backend frontend --claude` is two Incus boxes in tmux, each with its own Docker. On a Mac they still share the one Colima/OrbStack Linux VM.",
      },
      openshell: { verdict: "contained", note: "Each sandbox has its own supervisor identity and network fence, many per gateway. On a Mac with Docker Desktop they share one Linux VM; with the VM driver each is its own VM." },
      discobox: { verdict: "contained", note: "The headline use: many boxes, each its own clone, services and Docker, never seeing each other. In one pool they share its kernel, and on a Mac that pool is one VM." },
    },
  },
  {
    id: "localhost",
    title: "Reach the host's localhost",
    prompt: "The agent curls 127.0.0.1:11434 (Ollama), the local Postgres, the IDE's debug port, or 169.254.169.254 on a cloud host.",
    why: "A filesystem wall says nothing about the host's network neighbours. Unauthenticated local services and cloud metadata endpoints are the usual second hop. Docker sbx and Claude Code on the web both block host-local connections by design — that tells you how often it bites.",
    outcomes: {
      yolobox: { verdict: "partial", note: "Bridge network. Host services bound to 127.0.0.1 are out of reach; anything on 0.0.0.0 or host.docker.internal is in. Cloud metadata is reachable from a container unless you filter it." },
      "docker-sbx": { verdict: "contained", note: "All TCP goes through the host proxy under a deny-by-default policy; there is no route to host localhost. UDP and ICMP are dropped." },
      microsandbox: { verdict: "partial", note: "Guest network stack; what it can reach on the host is what you configured. The default is not 'nothing'." },
      hypeman: { verdict: "partial", note: "Guest nic behind hypeman's networking. The egress proxy is optional; on a cloud host, filter the metadata endpoint yourself." },
      "claude-code": { verdict: "partial", note: "Sandboxed Bash can only leave through the proxy, and 127.0.0.1 is not on the allowlist unless you add it. MCP servers, hooks, and WebFetch run on the host and see every local port." },
      codex: { verdict: "contained", note: "Local sandbox blocks network at the syscall level; localhost is off with everything else until you enable network. Cloud tasks have no route to your laptop at all." },
      nono: { verdict: "partial", note: "The L7 proxy and Landlock TCP rules can deny localhost; whether they do is the profile. A permissive profile leaves the host's ports open." },
      incus: { verdict: "partial", note: "Own network namespace on an Incus bridge. 127.0.0.1-bound host services are unreachable; anything bound on the bridge or 0.0.0.0 is not. Same shape as yolobox." },
      openshell: { verdict: "contained", note: "Loopback, link-local and unspecified addresses are always blocked and cannot be allowlisted. Private ranges need an exact declared host or allowed_ips. The workload's only way out is the supervisor." },
      discobox: { verdict: "partial", note: "The only exit is the pool proxy, which applies destination policy and audits every request. Whether private ranges are denied by default is policy I did not verify." },
    },
  },
  {
    id: "persist",
    title: "Persist into the next session",
    prompt: "The agent edits .git/hooks, .mcp.json, .claude/settings.json, .envrc, a Makefile, or package.json scripts. Your next commit, next Claude run, or next npm install executes it — unsandboxed.",
    why: "Every wrapper isolates this session. The repo is the channel to the next one. Docker's own sbx docs list git hooks, CI config, IDE tasks, Makefiles and package.json scripts as the live-mount risk, and Claude Code's sandbox refuses writes to its config paths for exactly this reason.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Live mount. A planted .git/hooks/post-commit runs on the host the next time you commit from outside the box. yolobox does not carve anything out of the tree." },
      "docker-sbx": { verdict: "partial", note: "Direct mode: exposed, the docs say so and tell you to check .git/hooks because git diff does not show them. --clone: the plant stays in the in-VM clone until you merge it." },
      microsandbox: { verdict: "contained", note: "Disposable guests. Nothing reaches the host unless you mounted a host directory in — then it is a live mount like everyone else." },
      hypeman: { verdict: "contained", note: "State persists in the guest snapshot, which is the point. Your laptop repo was never in the VM." },
      "claude-code": { verdict: "partial", note: "Denies writes to .claude/*, .mcp.json, .git/hooks and .git/config, shell rc, .vscode/.idea — no allowWrite can lift it. .envrc, Makefile, package.json, CI config are still writable, and disabling filesystem isolation drops the whole list." },
      codex: { verdict: "partial", note: ".git and .codex are read-only in workspace-write, so hooks are covered. Anything else in the tree is fair game. Cloud: the plant arrives as a PR you review." },
      nono: { verdict: "partial", note: "The grant is the tree; deny .git/hooks and dotfiles in the profile and it is closed. The default profile is what you audit." },
      incus: { verdict: "partial", note: "Golden-image clone: the plant dies with the box. Bind-mounted project (the Villega default): live mount, same as yolobox." },
      openshell: { verdict: "partial", note: "The default is a private copy, so a planted hook never reaches your checkout until you sync it back. System paths are read-only under Landlock; the workspace is writable, so what you download is yours to read." },
      discobox: { verdict: "contained", note: "Hooks live in the box's own clone and never travel: apply moves commits, not .git/hooks. A committed Makefile or package.json change arrives as a commit you can read." },
    },
  },
  {
    id: "legit-creds",
    title: "Confused deputy with real credentials",
    prompt: "Prompt injection makes the agent push a backdoor with the GitHub token it was given, or deletes a bucket with the cloud creds it legitimately holds.",
    why: "No wall stops an authorised action. The kernel line bounds what a compromised process can reach; it does not judge intent. The controls are token scope, per-tool brokering, and a human gate before the effect lands.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Forwarded env and mounted creds are the agent's to use. Blast radius equals token scope." },
      "docker-sbx": { verdict: "partial", note: "The guest never sees the raw token, but it can make any request the proxy will sign. Scope the token; the proxy is a courier, not a judge." },
      microsandbox: { verdict: "partial", note: "Secrets are kept out of the guest; calls the host makes on the guest's behalf are still authorised calls. Same answer: scope." },
      hypeman: { verdict: "partial", note: "An egress MITM proxy can enforce method and path policy. Whatever the policy allows, the tenant can do." },
      "claude-code": { verdict: "partial", note: "Permission rules and hooks are the gate — a PreToolUse hook can refuse git push. Masked env vars keep the secret out of Bash but still let allowed commands use it." },
      codex: { verdict: "partial", note: "Approvals gate the command locally. Cloud comes back as a PR: the strongest shape, because a human sees the diff before it lands." },
      nono: { verdict: "partial", note: "The best of the wrappers: gh gets the token only inside its own child sandbox, and the L7 policy can allow read-PR while denying push. The policy is still yours to write." },
      incus: { verdict: "exposed", note: "Whatever you put in the machine is the machine's. Incus has no credential proxy." },
      openshell: { verdict: "partial", note: "The same shape as nono with more machinery: per-binary, per-endpoint credentials, L7 method and path rules (read a PR, deny push), operator approval for new access, and a prover that blocks auto-approval of new credentialed reach. Policy is still yours to write, and L7 rules only log until you enforce." },
      discobox: { verdict: "partial", note: "Credentials are requested, granted by a human for a host and an expiry, and used as sentinels; a judge compares the command to the English grant. The judge runs in the box, so it is a guardrail. Grant scope bounds the damage." },
    },
  },
];

export const SCORE_LABELS = {
  isolation: "Isolation depth",
  performance: "Startup / weight",
  harnessFit: "Harness fit",
  untrustedCode: "Untrusted code",
  laptopDx: "Laptop DX",
} as const;

export const HARNESSES = [
  {
    id: "claude",
    name: "Claude Code",
    cells: {
      yolobox: "Wrap + skip-permissions",
      "docker-sbx": "First-class sbx run",
      microsandbox: "Run inside a guest if you image it",
      hypeman: "Run inside a guest if you image it",
      "claude-code": "Native",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
      openshell: "Install in the image + a provider profile",
      discobox: "Harness image",
    } as Record<SystemId, string>,
  },
  {
    id: "codex",
    name: "Codex CLI",
    cells: {
      yolobox: "Wrap + bypass approvals",
      "docker-sbx": "First-class sbx run",
      microsandbox: "Run inside a guest if you image it",
      hypeman: "Run inside a guest if you image it",
      "claude-code": "—",
      codex: "Native",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
      openshell: "Install in the image + a provider profile",
      discobox: "Harness image",
    } as Record<SystemId, string>,
  },
  {
    id: "gemini",
    name: "Gemini CLI / Copilot",
    cells: {
      yolobox: "Wrap + --yolo",
      "docker-sbx": "First-class",
      microsandbox: "Bring your own image",
      hypeman: "Bring your own image",
      "claude-code": "—",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
      openshell: "Copilot CLI documented; others by image",
      discobox: "Package it in an image",
    } as Record<SystemId, string>,
  },
  {
    id: "opencode",
    name: "OpenCode",
    cells: {
      yolobox: "Native wrap",
      "docker-sbx": "First-class",
      microsandbox: "Bring your own image",
      hypeman: "Bring your own image",
      "claude-code": "—",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
      openshell: "The quickstart agent",
      discobox: "Harness image",
    } as Record<SystemId, string>,
  },
  {
    id: "custom",
    name: "Custom agent / SDK",
    cells: {
      yolobox: "Not the point",
      "docker-sbx": "Possible, not the DX",
      microsandbox: "First-class SDKs + MCP",
      hypeman: "First-class OCI + API",
      "claude-code": "No",
      codex: "No",
      nono: "Any CLI via a profile",
      incus: "OCI or a full distro",
      openshell: "Any process; SDKs drive the gateway",
      discobox: "Package an image; drive via OpenAPI / CLI",
    } as Record<SystemId, string>,
  },
  {
    id: "browser",
    name: "Browser agent",
    cells: {
      yolobox: "No",
      "docker-sbx": "No",
      microsandbox: "Playwright-in-VM possible",
      hypeman: "Kernel's production path",
      "claude-code": "Computer-use is the host",
      codex: "Not this product",
      nono: "No",
      incus: "If you image a browser into the machine",
      openshell: "Not a documented path",
      discobox: "Desktop + Chromium in the box (VNC)",
    } as Record<SystemId, string>,
  },
  {
    id: "desktop",
    name: "Computer use (full desktop)",
    cells: {
      yolobox: "Not the point. Headless unless you add a display",
      "docker-sbx": "Not documented",
      microsandbox: "Bring a desktop image",
      hypeman: "Kernel's browser path: snapshots + ingress",
      "claude-code": "Computer use drives the host desktop, unsandboxed",
      codex: "Not this product",
      nono: "No",
      incus: "Image a desktop into the machine",
      openshell: "Not a documented path",
      discobox: "Xfce desktop + Chromium over noVNC, in the box",
    } as Record<SystemId, string>,
  },
];

export const MATRIX_ROWS: {
  group: string;
  id: string;
  label: string;
  values: Record<SystemId, string>;
}[] = [
  {
    group: "Architecture",
    id: "primitive",
    label: "Primitive",
    values: {
      yolobox: "Docker container",
      "docker-sbx": "libkrun-family microVM",
      microsandbox: "libkrun microVM",
      hypeman: "CH / Firecracker / QEMU / HVF",
      "claude-code": "Seatbelt + bubblewrap",
      codex: "Seatbelt + bwrap / Landlock",
      nono: "Landlock + Seatbelt + tool broker",
      incus: "Unprivileged LXC",
      openshell: "Landlock + seccomp + netns, in a container, pod or libkrun VM",
      discobox: "systemd container inside a pool (VM or host daemon)",
    },
  },
  {
    group: "Architecture",
    id: "kernel",
    label: "Kernel",
    values: {
      yolobox: "Shared host",
      "docker-sbx": "Dedicated guest",
      microsandbox: "Dedicated guest",
      hypeman: "Dedicated guest",
      "claude-code": "Shared host",
      codex: "Shared locally; isolated in cloud",
      nono: "Shared host",
      incus: "Shared host (LXC). Dedicated if --vm",
      openshell: "Shared (Docker, Podman, K8s). Dedicated with the VM driver or Kata",
      discobox: "Shared with its pool. Pool = VM on macOS / Windows, the host on Linux default",
    },
  },
  {
    group: "Architecture",
    id: "role",
    label: "Role",
    values: {
      yolobox: "Agent wrapper",
      "docker-sbx": "Agent wrapper",
      microsandbox: "Embeddable runtime",
      hypeman: "Sandbox infrastructure",
      "claude-code": "Harness (built-in)",
      codex: "Harness (built-in)",
      nono: "Agent wrapper",
      incus: "Machine runtime",
      openshell: "Policy control plane",
      discobox: "Agent wrapper + box manager",
    },
  },
  {
    group: "Architecture",
    id: "daemon",
    label: "Control plane",
    values: {
      yolobox: "Docker engine on the host",
      "docker-sbx": "sbx + in-guest dockerd",
      microsandbox: "None required (child process)",
      hypeman: "hypeman server (systemd / launchd)",
      "claude-code": "None",
      codex: "None locally; OpenAI cloud for app",
      nono: "None (child process + proxy)",
      incus: "incusd on Linux",
      openshell: "Gateway (gRPC, OIDC, Helm) + a supervisor per sandbox",
      discobox: "discobox-server + a pool-agent per pool",
    },
  },
  {
    group: "Architecture",
    id: "placement",
    label: "Harness placement",
    values: {
      yolobox: "Whole CLI inside — its API token too",
      "docker-sbx": "Whole CLI inside the VM; stdio MCP servers on the host via gateway",
      microsandbox: "Your agent outside; the sandbox is a tool it calls",
      hypeman: "Your agent outside; the guest is the unit",
      "claude-code": "Harness outside; Bash children inside. MCP + hooks on the host",
      codex: "Harness outside; commands inside (local). Everything inside (cloud)",
      nono: "Supervisor outside; agent session + each tool child inside",
      incus: "Whole CLI inside the machine",
      openshell: "Agent inside; supervisor and credentials outside",
      discobox: "Whole CLI inside; credentials arrive as sentinels via the pool proxy",
    },
  },
  {
    group: "Performance",
    id: "start",
    label: "Startup",
    values: {
      yolobox: "Container start",
      "docker-sbx": "MicroVM + full userland",
      microsandbox: "<100–200 ms",
      hypeman: "Cold microVM; ms restore",
      "claude-code": "Process spawn",
      codex: "Spawn / cloud provision",
      nono: "Process spawn",
      incus: "Launch, or ms CoW clone",
      openshell: "Container / pod start; VM boot on the VM driver",
      discobox: "Pool boots once, then box start; idle boxes self-stop",
    },
  },
  {
    group: "Performance",
    id: "weight",
    label: "Weight",
    values: {
      yolobox: "One container",
      "docker-sbx": "~2 vCPU / 4 GB cap",
      microsandbox: "~5 MB VMM path",
      hypeman: "Guest-sized",
      "claude-code": "Policy only",
      codex: "Policy / ephemeral machine",
      nono: "Policy only",
      incus: "A full OS, no hypervisor",
      openshell: "Container-weight; VM-weight on the VM driver",
      discobox: "A pool VM or daemon plus a full-OS container per box",
    },
  },
  {
    group: "Security",
    id: "boundary",
    label: "Real wall",
    values: {
      yolobox: "Container policy + mount hygiene",
      "docker-sbx": "Hypervisor + no host path",
      microsandbox: "Hypervisor",
      hypeman: "Hypervisor + fleet controls",
      "claude-code": "MAC policy on bash",
      codex: "MAC policy; cloud machine",
      nono: "MAC policy on session + each tool",
      incus: "User ns + AppArmor; still this kernel",
      openshell: "Driver boundary + Landlock / seccomp + supervisor-mediated egress",
      discobox: "Pool host + per-box proxy identity. Boxes share the pool kernel",
    },
  },
  {
    group: "Security",
    id: "work",
    label: "Work isolation",
    values: {
      yolobox: "Live bind mount",
      "docker-sbx": "Live mount, or --clone (read-only repo + in-VM clone)",
      microsandbox: "Volumes you choose; disposable by default",
      hypeman: "Guest disk, snapshots, forks",
      "claude-code": "Live cwd; git worktree per session optional",
      codex: "Local: live tree, .git read-only. Cloud: clone → PR",
      nono: "Live grant",
      incus: "Golden-image CoW clone, or bind-mount",
      openshell: "Private copy or volume; upload / download; bind mount is opt-in",
      discobox: "Own git clone; origin read-only; `apply` cherry-picks commits back",
    },
  },
  {
    group: "Security",
    id: "net",
    label: "Network default",
    values: {
      yolobox: "On",
      "docker-sbx": "Deny-by-default proxy, host-localhost blocked",
      microsandbox: "Configured per sandbox",
      hypeman: "Ingress + optional egress proxy",
      "claude-code": "Allowlist proxy (Bash only)",
      codex: "Off",
      nono: "L7 proxy, phantom tokens",
      incus: "Bridged nic",
      openshell: "Deny-by-default per host / port / binary, L7 optional, metadata blocked",
      discobox: "Internal net → pool MITM proxy (mTLS per box, audited)",
    },
  },
  {
    group: "Harness",
    id: "yolo",
    label: "YOLO agent CLIs",
    values: {
      yolobox: "The product",
      "docker-sbx": "The product",
      microsandbox: "Image it yourself",
      hypeman: "Image it yourself",
      "claude-code": "Is the CLI",
      codex: "Is the CLI",
      nono: "Wraps the CLI",
      incus: "Install it in the machine",
      openshell: "Install it in the image; policy is the fence",
      discobox: "Claude Code, Codex, OpenCode as harness images",
    },
  },
  {
    group: "Harness",
    id: "sdk",
    label: "Embed in your app",
    values: {
      yolobox: "No",
      "docker-sbx": "No",
      microsandbox: "SDKs + MCP",
      hypeman: "HTTP API + CLI",
      "claude-code": "sandbox-runtime only",
      codex: "No",
      nono: "No — wrap, don't embed",
      incus: "REST API + CLI",
      openshell: "Python · TypeScript · Go · Rust SDKs + gRPC",
      discobox: "OpenAPI + CLI. Not an embeddable library",
    },
  },
  {
    group: "Environment",
    id: "gpu",
    label: "GPU",
    values: {
      yolobox: "--gpus passes GPUs to the container",
      "docker-sbx": "GPU passthrough is a documented option",
      microsandbox: "Not documented",
      hypeman: "vGPU / VFIO on the VMMs that support it",
      "claude-code": "The host's GPU, unisolated",
      codex: "Local: the host's GPU, unisolated",
      nono: "The host's GPU, unisolated",
      incus: "GPU devices into containers and VMs",
      openshell: "Docker / Podman: CDI. K8s: nvidia.com/gpu. VM driver: one GPU via VFIO",
      discobox: "Not documented; GPU allocation is only in an unimplemented proposal",
    },
  },
  {
    group: "Environment",
    id: "state",
    label: "State & restore",
    values: {
      yolobox: "Persistent volumes for tools; container stop / start",
      "docker-sbx": "Everything persists until sbx rm",
      microsandbox: "Disposable, or named long-running sandboxes",
      hypeman: "Memory + disk snapshots; UFFD forks; ms restore",
      "claude-code": "Transcript only; no machine state",
      codex: "Local: none. Cloud: a fresh clone per task",
      nono: "None: it is a process",
      incus: "Snapshots; btrfs / zfs CoW clones in ms",
      openshell: "Driver storage and restart policy; no process-memory restore",
      discobox: "Stop and start; export a box as its spec + durable tree",
    },
  },
  {
    group: "Environment",
    id: "guestos",
    label: "Guest OS",
    values: {
      yolobox: "Linux. Apple Container on a Mac is still Linux",
      "docker-sbx": "Linux guest",
      microsandbox: "Linux guest",
      hypeman: "Linux guests from OCI images",
      "claude-code": "The host OS: macOS, Linux, WSL2",
      codex: "The host OS; Windows via restricted tokens",
      nono: "The host OS: macOS, Linux, WSL2",
      incus: "Linux containers; other kernels via --vm",
      openshell: "Linux. Native Windows (MXC) announced",
      discobox: "Linux boxes. macOS / Windows guests designed, not confirmed shipped",
    },
  },
];

export function systemById(id: SystemId) {
  return SYSTEMS.find((s) => s.id === id)!;
}

export const FAMILY_SYSTEMS: Record<Family, SystemId[]> = {
  process: ["claude-code", "codex", "nono"],
  container: ["yolobox", "openshell"],
  system: ["incus", "discobox"],
  microvm: ["docker-sbx", "microsandbox", "hypeman", "openshell", "discobox"],
};

export const SYSTEM_CONTAINER_CASES: {
  id: string;
  title: string;
  verdict: "need" | "skip";
  need: string;
  vsDocker: string;
  vsMicrovm: string;
  vsProcess: string;
  sources?: { label: string; href: string }[];
}[] = [
  {
    id: "villega",
    title: "Pere Villega · Sandbox for Claude",
    verdict: "need",
    need: "The agent must feel like a laptop: apt install, systemd, sudo, a nested Docker daemon, several long-lived boxes. `sandbox my-api --claude` drops Claude Code into its own Incus system container. `sandbox backend frontend --claude` is a tmux of two machines, each with its own dockerd. Golden images are btrfs CoW clones — milliseconds, not a rebuild.",
    vsDocker: "Docker's unit is a process. You fake a machine with compose, privileged, and a custom image. Incus's unit is already a distro with PID 1 = init.",
    vsMicrovm: "sbx / libkrun also give you a machine, plus a dedicated kernel. Use them when the threat includes a kernel CVE. Villega is optimizing for density and clone time on a Linux host he already operates, not for hardware isolation.",
    vsProcess: "nono, Claude's bash sandbox, and Codex never become a machine. They cannot apt, cannot nest Docker, cannot snapshot a full OS.",
    sources: [
      { label: "I built yet another sandbox", href: "https://perevillega.com/posts/2026-03-03-ai-sandbox-coding-agents/" },
      { label: "pvillega/sandbox-claude", href: "https://github.com/pvillega/sandbox-claude" },
    ],
  },
  {
    id: "discobox",
    title: "discobox · one repo, many parallel boxes",
    verdict: "need",
    need: "Several agent sessions on one repository, each needing a real machine: systemd, sudo, nested Docker, a desktop and a browser. Every box clones the repo and its origin is read-only. `discobox apply` cherry-picks the commits back, or the box pushes a PR. Credentials arrive as sentinels through a per-box mTLS proxy.",
    vsDocker: "yolobox is one box on your checkout. discobox is N boxes on N clones, each with its own services, ports and Docker, so parallel agents stop fighting over a branch and a port.",
    vsMicrovm: "sbx gives one VM per session. discobox amortises: one VM per pool (macOS, Windows, or opt-in libkrun), many system containers inside it, sharing that kernel on purpose. On Linux the default pool is the host Docker daemon, so the kernel wall only arrives when you opt into a libkrun or Kata pool.",
    vsProcess: "nono, Claude and Codex wrap a bash child. discobox gives the agent the whole machine and moves the boundary to the network and to git.",
    sources: [
      { label: "github.com/discobox-ai/discobox", href: "https://github.com/discobox-ai/discobox" },
      { label: "ADR 0003: the pool", href: "https://github.com/discobox-ai/discobox/blob/main/docs/adr/0003-promote-pool-to-a-first-class-primitive.md" },
    ],
  },
  {
    id: "nested-docker",
    title: "Nested Docker, no host socket",
    verdict: "need",
    need: "The agent must docker build / compose, and you will not mount /var/run/docker.sock. Incus documents this: security.nesting=true, host-loaded kernel modules, optional /.dockerenv. The dockerd lives in the instance.",
    vsDocker: "Docker-in-Docker is privileged or a socket mount. Both punch the isolation story yolobox is selling.",
    vsMicrovm: "Docker sbx is the dedicated-kernel version of this idea. Pick Incus when you already live on LXC and will accept a shared kernel; pick sbx when you will not.",
    vsProcess: "A process sandbox that can see docker.sock has already lost.",
  },
  {
    id: "tenancy",
    title: "Dense long-lived Linux tenancy",
    verdict: "need",
    need: "Labs, CI runners, student VMs, VPS-shaped boxes. Snapshots, profiles, clustering, idmaps. Many full OSes on one kernel. Firecracker is built for short sandboxes; Incus is built for machines you keep.",
    vsDocker: "App containers are a poor VPS. You end up reimplementing systemd.",
    vsMicrovm: "A fleet of hypeman/Firecracker VMs is the stronger wall and the higher bill. Incus --vm is that bill inside Incus.",
    vsProcess: "Irrelevant. Process sandboxes are not tenancy.",
  },
  {
    id: "not-kernel",
    title: "When it is the wrong wall",
    verdict: "skip",
    need: "Untrusted codegen, a kernel 0-day, Darwin without a Linux VM, or 'just wrap this CLI for an afternoon'. System containers share the host kernel. That is the same family as Docker, with a thicker userspace.",
    vsDocker: "If all you needed was hide $HOME and sudo, yolobox is less machinery.",
    vsMicrovm: "This is the job. sbx, microsandbox, hypeman — or Incus --vm if you already operate Incus and accept QEMU.",
    vsProcess: "nono / Claude / Codex if the unit of isolation is a bash child, not a machine.",
  },
];

export type MacHostId = "docker-vm" | "incus-lxc" | "incus-vm" | "apple-container" | "macos-guest";

export type MacHost = {
  id: MacHostId;
  name: string;
  model: string;
  nestedVirt: "no" | "yes" | "n/a";
  nestedVirtNote: string;
  twoBoxes: string;
  yoloboxFit: string;
  kernelStory: string;
  layers: { id: string; label: string; kind: "hw" | "host" | "boundary" | "guest" | "workload"; blurb: string }[];
  sources: { label: string; href: string }[];
};

export const MAC_HOSTS: MacHost[] = [
  {
    id: "docker-vm",
    name: "Docker · Colima · OrbStack",
    model: "One Linux VM. Many containers share that guest kernel and one engine.",
    nestedVirt: "no",
    nestedVirtNote:
      "The VM is the only virtualization hop. Containers inside are namespaces on the Linux guest — the same trick as on a Linux laptop. Nested virt is not involved.",
    twoBoxes:
      "Yes. A second yolobox, a postgres sidecar, compose — they are processes on the same guest kernel, addressed through the same dockerd. Distinct --name only.",
    yoloboxFit:
      "The intended yolobox path. Derived images, --platform, exclude/copy_as, persistent volumes all go through a real engine.",
    kernelStory:
      "macOS has no LXC. Docker Desktop / Colima / OrbStack hide that by booting one Linux VM via Virtualization.framework (or QEMU) and running every container inside it.",
    layers: [
      { id: "hw", label: "Apple Silicon / Intel", kind: "hw", blurb: "The physical Mac. Darwin cannot run LXC or cgroup containers natively — those are Linux kernel APIs." },
      { id: "darwin", label: "Darwin kernel", kind: "host", blurb: "No namespaces-as-Linux, no cgroups v2 as a container runtime, no AppArmor. This is why every Linux container on a Mac is already a VM somewhere." },
      { id: "hvf", label: "Virtualization.framework / QEMU", kind: "boundary", blurb: "One hypervisor hop. Colima vz, Docker Desktop, OrbStack all sit here." },
      { id: "linux-vm", label: "One Linux VM", kind: "guest", blurb: "One guest kernel for the whole engine. This is the kernel yolobox actually shares on a Mac, even when people say 'it's just a container'." },
      { id: "dockerd", label: "dockerd / containerd", kind: "guest", blurb: "The shared control plane. docker run, compose, a second yolobox --name other — all clients of this daemon." },
      { id: "ctr", label: "yolobox + siblings", kind: "workload", blurb: "Namespaces on the guest. Two boxes are cheap and they can talk on docker0." },
    ],
    sources: [
      { label: "Colima runtimes", href: "https://colima.run/docs/runtimes/" },
    ],
  },
  {
    id: "incus-lxc",
    name: "Incus containers",
    model: "Colima Linux VM, then LXC system containers sharing that guest kernel.",
    nestedVirt: "no",
    nestedVirtNote:
      "Incus containers are LXC. They need a Linux kernel, which the Colima VM provides. They do not need KVM inside that VM. Nested virtualization is not required.",
    twoBoxes:
      "Yes, and they are system containers (full /sbin/init), not app containers. Many per VM, near-zero extra virt overhead. This is what the Incus container-environment docs describe: /proc, /sys, LXCFS, /dev/incus/sock, PID 1 = /sbin/init.",
    yoloboxFit:
      "Incus is not a Docker CLI. yolobox talks docker/podman/container. Pere Villega's Sandbox for Claude is the Incus-native wrap: install Claude inside the system container instead of wrapping the CLI from Darwin.",
    kernelStory:
      "Incus is Linux-native (LXC + optional QEMU/KVM). Darwin cannot host it. Colima `colima start --runtime incus` is a Linux VM with Incus installed. The container-environment page is the guest view of that LXC box — it assumes the kernel under it is Linux.",
    layers: [
      { id: "hw", label: "Apple Silicon / Intel", kind: "hw", blurb: "Same Mac. Still no LXC on Darwin." },
      { id: "darwin", label: "Darwin kernel", kind: "host", blurb: "Incus cannot run here. The container-environment contract (/sbin/init, cgroup mounts, LXCFS, AppArmor) is a Linux ABI." },
      { id: "hvf", label: "Virtualization.framework (one hop)", kind: "boundary", blurb: "Colima vz (or QEMU) boots Ubuntu/Debian. Nested virt is off. You only needed a Linux kernel, not a hypervisor inside a hypervisor." },
      { id: "linux-vm", label: "Colima Linux VM + Incus daemon", kind: "guest", blurb: "incusd on the guest. This kernel is what every Incus container will share — the 'host kernel' from the container-environment doc's point of view." },
      { id: "lxc", label: "LXC system containers", kind: "workload", blurb: "incus launch images:ubuntu/24.04. Full distro, own PID 1, shared guest kernel. No nested virt. Many at once." },
    ],
    sources: [
      { label: "Incus container environment", href: "https://linuxcontainers.org/incus/docs/main/container-environment/" },
      { label: "Colima Incus runtime", href: "https://colima.run/docs/runtimes/" },
    ],
  },
  {
    id: "incus-vm",
    name: "Incus VMs (--vm)",
    model: "A KVM virtual machine inside the Colima Linux VM.",
    nestedVirt: "yes",
    nestedVirtNote:
      "Required. The guest must expose KVM. On Apple Silicon that is nested virtualization in Virtualization.framework: M3 or newer, macOS 15 Sequoia or later, isNestedVirtualizationEnabled. M1/M2 cannot do it. Colima documents this as the Incus-VM restriction.",
    twoBoxes:
      "Yes, if nested virt works — each Incus VM is a real VM on the nested hypervisor. Heavier than LXC, and you paid for a hypervisor twice (HVF then KVM).",
    yoloboxFit:
      "Wrong layer for yolobox. This is how you run untrusted full machines on a Mac Incus host, not how you wrap Claude.",
    kernelStory:
      "Incus has two instance types. Containers share the Linux kernel. `--vm` boots another kernel with QEMU/KVM. On a Mac the Linux kernel is already in a VM, so `--vm` is VM-in-VM. That is nested virt, and it is a hardware + OS feature, not an Incus bug.",
    layers: [
      { id: "hw", label: "M3 / M4 (nested virt capable)", kind: "hw", blurb: "Apple only wired nested virt for M3 and later. M1/M2 have no HVF nested-virt flag. macOS 15+ is required." },
      { id: "darwin", label: "Darwin + HVF (isNestedVirtualizationEnabled)", kind: "host", blurb: "The outer hypervisor must advertise a virtual CPU that itself can be a hypervisor. That is the whole feature." },
      { id: "linux-vm", label: "Colima Linux VM with KVM", kind: "guest", blurb: "kvm-ok must pass inside Colima. Without nested virt, /dev/kvm is missing and Incus --vm fails while Incus containers still work." },
      { id: "kvm", label: "Nested KVM / QEMU", kind: "boundary", blurb: "The second hypervisor hop. This is the line Colima warns about. You now have HVF wrapping KVM wrapping a guest kernel." },
      { id: "incus-vm", label: "Incus VM guest kernel", kind: "workload", blurb: "incus launch images:ubuntu/24.04 --vm. A dedicated kernel, useful for things LXC cannot isolate, paid for with nested virt." },
    ],
    sources: [
      { label: "Colima: Incus VMs need nested virt", href: "https://colima.run/docs/runtimes/" },
      { label: "Apple isNestedVirtualizationSupported", href: "https://developer.apple.com/documentation/virtualization/vzgenericplatformconfiguration/isnestedvirtualizationsupported" },
    ],
  },
  {
    id: "apple-container",
    name: "Apple Container",
    model: "One lightweight HVF VM per OCI container. vminitd as PID 1. No dockerd.",
    nestedVirt: "n/a",
    nestedVirtNote:
      "Not used, and nested would not help. Each container is already a Virtualization.framework VM on Darwin. The guest is a thin Linux (vminitd). There is no HVF inside that guest, so you cannot run Apple Container inside Apple Container, Colima, or Incus. Two boxes are sibling VMs on the Mac, not machines inside a machine.",
    twoBoxes:
      "Sibling VMs: yes. Two `container run` are two HVF guests on Darwin — that is the design, no nested virt required. Nested: no. Apple Container is a Darwin client; you cannot stash it inside another VM. yolobox still cannot compose those siblings: no dockerd, no shared docker0, no derived-image build, virtiofs-on-the-same-path is sharp, macOS 15 networking was broken (26 is better). A fixed --name still collides.",
    yoloboxFit:
      "yolobox --runtime container is auto-detected on Tahoe+. One prebuilt box works. A second yolobox with a different name is a second VM on the Mac — it can run, it is not 'inside' the first. What fails is treating them as compose: derived images, --platform, exclude/copy_as, and docker-from-inside-the-agent.",
    kernelStory:
      "Apple flipped Docker's Mac model. Docker: one VM, many containers. Apple Container: one VM per container (Containerization + vminitd). Isolation is closer to Kata/libkrun than to runc. yolobox was written against runc-shaped engines, so the second container stops being a cheap sibling.",
    layers: [
      { id: "hw", label: "Apple Silicon", kind: "hw", blurb: "Apple Container is Apple-silicon only. macOS 26 is the supported line; 15 had networking holes." },
      { id: "darwin", label: "Darwin kernel", kind: "host", blurb: "Still no LXC. The runtime never pretends otherwise — it just makes the VM hop per container instead of once." },
      { id: "hvf", label: "HVF — sibling VMs, not nested", kind: "boundary", blurb: "container run is a new lightweight VM on Darwin. A second container is a second sibling on the same hypervisor. They are two machines on the Mac, not two machines inside a machine." },
      { id: "guest-k", label: "Thin guest Linux kernel", kind: "guest", blurb: "vminitd over vsock. No dockerd. No Darwin. No Virtualization.framework. Nested virt on M3+ would expose KVM in this Linux — still not Apple Container, and dockerd still dies on missing nf_tables." },
      { id: "yolo", label: "yolobox VM A · VM B beside it", kind: "workload", blurb: "Two Apple Containers can run at once as siblings. yolobox has no engine to compose them, so postgres-next-to-the-agent is your problem, not a docker-compose.yml." },
    ],
    sources: [
      { label: "apple/container", href: "https://github.com/apple/container" },
      { label: "apple/containerization", href: "https://github.com/apple/containerization" },
      { label: "yolobox configuration (Apple container limits)", href: "https://yolobox.dev/configuration" },
    ],
  },
  {
    id: "macos-guest",
    name: "macOS guest (Lume, Tart)",
    model: "A macOS VM on Virtualization.framework. Apple's license and the framework cap it at two running per Mac.",
    nestedVirt: "n/a",
    nestedVirtNote:
      "Not used. The guest is macOS itself, booted from an Apple restore image on the host's hypervisor. The nested-virtualization switch this page cites belongs to the generic (Linux) platform configuration; I found none for macOS guests.",
    twoBoxes:
      "Two, then Virtualization.framework refuses the third with 'maximum supported number of active virtual machines'. Linux VMs are not counted against the limit.",
    yoloboxFit:
      "None. yolobox wraps Linux containers. A macOS guest is the target for Xcode builds, native apps and desktop computer use, which no Linux container or microVM can host.",
    kernelStory:
      "Linux containers and Linux microVMs cannot be this machine. A macOS agent needs a macOS kernel, so the sandbox is a full VM of the real OS: heavy, licensed, capped, and assembled from Apple's restore image on your own hardware. discobox's design records describe the same pattern for Windows guests on Hyper-V.",
    layers: [
      { id: "hw", label: "Apple Silicon", kind: "hw", blurb: "Any Apple Silicon Mac. The license permits up to two virtualized macOS instances per Apple-branded computer." },
      { id: "darwin", label: "Darwin host", kind: "host", blurb: "Runs your own session and the hypervisor. The guest is a second macOS, not a container of this one." },
      { id: "hvf", label: "Virtualization.framework", kind: "boundary", blurb: "Runs the guest natively and enforces the two-macOS-guest limit. Linux guests on the same host are not counted." },
      { id: "guest-macos", label: "macOS guest kernel", kind: "guest", blurb: "A dedicated Darwin kernel from Apple's restore image. This is the only wall a macOS desktop agent can have, and it costs a whole OS." },
      { id: "apps", label: "Desktop, apps, agent", kind: "workload", blurb: "The agent drives real macOS apps. Nothing here is a Linux ABI, so none of the container tooling on this page applies." },
    ],
    sources: [
      { label: "Eclectic Light: how Apple limits VMs", href: "https://eclecticlight.co/2022/08/04/virtualisation-on-apple-silicon-macs-8-how-apple-limits-vms/" },
      { label: "Cua Lume: local macOS and Linux VMs", href: "https://github.com/trycua/cua" },
    ],
  },
];

export type MacPlacement = "sibling" | "nested";

export const MAC_PLACEMENTS: {
  id: MacPlacement;
  name: string;
  hint: string;
}[] = [
  {
    id: "sibling",
    name: "Two machines on the Mac",
    hint: "Sibling HVF VMs. No nested virt.",
  },
  {
    id: "nested",
    name: "Two machines inside a machine",
    hint: "VM-in-VM. Nested virt.",
  },
];

export const MAC_PLACEMENT_VERDICT: Record<
  MacHostId,
  Record<MacPlacement, { ok: boolean; title: string; body: string }>
> = {
  "docker-vm": {
    sibling: {
      ok: true,
      title: "Not two machines — two namespaces in one VM",
      body: "Docker Desktop / Colima already paid for one Linux VM. The second yolobox is a container on that guest kernel, talking to the same dockerd. Cheap, composable, no nested virt.",
    },
    nested: {
      ok: false,
      title: "Not how this runtime works",
      body: "Putting Docker inside a VM that is already inside HVF is nested virt plus a second engine. Colima/Desktop do not do this. You would be recreating Incus --vm for no gain.",
    },
  },
  "incus-lxc": {
    sibling: {
      ok: true,
      title: "Many system containers, one Colima VM",
      body: "LXC siblings share the Linux guest kernel. That is the container-environment page. Nested virt is off.",
    },
    nested: {
      ok: false,
      title: "LXC is not a hypervisor",
      body: "An Incus container cannot host KVM without nested virt and the --vm path. Containers stay on this side of the line.",
    },
  },
  "incus-vm": {
    sibling: {
      ok: true,
      title: "Two Incus VMs = two nested guests",
      body: "Once nested virt is on (M3+, macOS 15+), Incus can launch multiple --vm instances. They are machines inside the Colima machine. That is the expensive shape.",
    },
    nested: {
      ok: true,
      title: "This is the nested-virt product",
      body: "HVF wraps Linux+KVM, KVM wraps the instance. Two of those guests are two machines inside one machine. Apple Container cannot occupy this slot — it is not a KVM client.",
    },
  },
  "apple-container": {
    sibling: {
      ok: true,
      title: "Yes — two HVF VMs, side by side on Darwin",
      body: "A second Apple Container is already a second machine on the Mac. Nested virt is not involved. yolobox can start two named boxes this way. What it cannot do is compose them: no dockerd, no docker0, no derived image, no docker-from-inside-the-agent.",
    },
    nested: {
      ok: false,
      title: "No. Apple Container does not live inside a machine",
      body: "container talks to Virtualization.framework on Darwin. The guest is thin Linux + vminitd — no Darwin, no HVF, no Apple Container CLI. You cannot run Apple Container inside Colima, Incus, or another Apple Container. Nested virt on M3+ would only expose KVM in that Linux guest, which is Incus --vm's world, not Apple's.",
    },
  },
  "macos-guest": {
    sibling: {
      ok: true,
      title: "Yes: up to two, side by side",
      body: "Two macOS guests can run beside each other on one Mac. A third is refused by the framework, not by your tooling. Linux VMs beside them are unlimited.",
    },
    nested: {
      ok: false,
      title: "Not as far as I can find",
      body: "The nested-virtualization switch on this page is on the generic (Linux) platform configuration. A macOS guest is not a place to run Colima or Incus. If the agent needs Linux, run a Linux VM beside it, not inside it.",
    },
  },
};

export type LayerId = "compute" | "fidelity" | "lifecycle" | "mediation" | "work" | "observe";

export type Layer = {
  id: LayerId;
  n: number;
  name: string;
  asks: string;
  microvm: "owns" | "helps" | "silent";
  microvmNote: string;
  points: string[];
  leaders: { id: SystemId; why: string }[];
  gap: string;
};

export const LAYERS: Layer[] = [
  {
    id: "compute",
    n: 1,
    name: "Compute boundary",
    asks: "Whose kernel is it?",
    microvm: "owns",
    microvmNote: "This is the layer a microVM owns outright. It is the only row where a guest kernel bug stays in the guest.",
    points: [
      "Four families answer it: process policy, app container, system container, microVM. Shared kernel for the first three, a dedicated one for the last.",
      "The row is more a deployment choice than a product property. OpenShell picks it per driver (Docker, Podman, Kubernetes, libkrun VM). discobox picks it per pool host: a VM on macOS and Windows, the host's Docker daemon on Linux by default.",
      "How many sandboxes share each kernel is part of the answer: one VM per machine (Docker Desktop), per pool (discobox), or per sandbox (sbx, microsandbox, Apple Container).",
    ],
    leaders: [
      { id: "docker-sbx", why: "A VM and a private engine per session" },
      { id: "microsandbox", why: "libkrun VM as a child process" },
      { id: "hypeman", why: "Your choice of VMM, fleet-shaped" },
      { id: "openshell", why: "The same policy over a container or a VM, by driver" },
    ],
    gap: "It says nothing about what the guest can reach through its network, its mount, or its screen.",
  },
  {
    id: "fidelity",
    n: 2,
    name: "Machine fidelity",
    asks: "Is it enough like a real machine for the job?",
    microvm: "helps",
    microvmNote: "The lightest VMMs stay small by giving devices up. Choosing one is choosing which machines you cannot have.",
    points: [
      "OS and architecture. A Linux microVM cannot be a macOS or Windows machine. Those need Virtualization.framework or Hyper-V guests, and Apple allows two running macOS guests per Mac.",
      "Accelerators. Firecracker's device model is virtio network, block and vsock, with no GPU passthrough. Cloud Hypervisor and QEMU pass GPUs through with VFIO, containers take them through CDI, Incus passes GPUs into containers and VMs, and OpenShell's VM driver takes one.",
      "A display and a browser. Anthropic's computer-use demo is Xvfb, a window manager, x11vnc, noVNC and Firefox in a container. discobox ships an Xfce desktop over noVNC in each box. E2B Desktop ships Xfce in its sandbox.",
      "Nested Docker, systemd, real core counts: what makes the agent's machine feel like a laptop.",
    ],
    leaders: [
      { id: "discobox", why: "A desktop and Chromium over noVNC, plus nested Docker" },
      { id: "incus", why: "A full distro and GPU devices; you image the desktop in" },
      { id: "hypeman", why: "vGPU and VFIO, and Kernel's browser path" },
      { id: "openshell", why: "GPUs through CDI, Kubernetes, or one VFIO device" },
    ],
    gap: "Most rows on this page are Linux-only and headless, with no accelerator, unless you build that in.",
  },
  {
    id: "lifecycle",
    n: 3,
    name: "State & lifecycle",
    asks: "What survives, how fast does it come back, and what does idle cost?",
    microvm: "helps",
    microvmNote: "A microVM makes snapshots cheap to take. Snapshot, fork and restore are features of the runtime around it, not of the isolation.",
    points: [
      "Image, snapshot, fork, restore, warm pool, idle timeout, persistence. hypeman snapshots memory and disk with UFFD-paged forks for millisecond resume. Incus clones btrfs or zfs snapshots in milliseconds. sbx keeps a sandbox until you remove it. discobox stops idle boxes on its own and exports a box as its spec plus durable tree.",
      "OpenShell's restart policy replaces the runtime but does not restore process memory.",
      "Warm state is the product for browsers and desktops. It is also a liability: a restored memory snapshot brings back the signed-in session and every secret that was in memory.",
    ],
    leaders: [
      { id: "hypeman", why: "Standby snapshots and forks are the headline feature" },
      { id: "incus", why: "CoW clones from a golden snapshot" },
      { id: "discobox", why: "Idle self-stop and exportable boxes" },
      { id: "docker-sbx", why: "Persists until removed" },
    ],
    gap: "Restoring a session is fast. Knowing what you just restored, and for whom, is on you.",
  },
  {
    id: "mediation",
    n: 4,
    name: "Mediation",
    asks: "What can it reach, and what may it use when it gets there?",
    microvm: "silent",
    microvmNote: "A hardware boundary changes none of this. A microVM with open egress and a token baked into the image loses to a Seatbelt profile with a good proxy.",
    points: [
      "Egress and credentials converge on a proxy outside the box that holds the real value: nono's phantom tokens, sbx's header injection, OpenShell's providers that resolve only for an approved binary at an approved endpoint, discobox's ephemeral sentinels bound to a host and a five-minute window, Claude Code's masked variables.",
      "The permission prompt moved from 'may this command run' to 'may this process reach this endpoint or use this credential'. Claude Code asks for a domain. OpenShell's advisor has the blocked agent propose a rule scoped to host, port, binary, method and path, which a prover risk-checks and a human approves. discobox has the agent request a grant with a host scope and an expiry.",
      "OpenShell also verifies the policy itself with an SMT solver: a boundary check that a subagent's policy stays inside its parent's maximum. It reports features its model does not cover instead of ignoring them.",
      "The harness's own key follows the same rule. yolobox and Incus forward it in. sbx, discobox and OpenShell keep the real value outside and inject it at the boundary.",
      "No wall judges intent. A push with a token you legitimately gave the agent never crosses a boundary.",
    ],
    leaders: [
      { id: "openshell", why: "Per-binary, per-endpoint policy, a prover, an advisor" },
      { id: "nono", why: "Phantom tokens and a broker per tool" },
      { id: "docker-sbx", why: "Deny-by-default proxy that injects credentials" },
      { id: "discobox", why: "Per-box mTLS identity, audited MITM, grants that expire" },
      { id: "claude-code", why: "Allowlist proxy plus a hook model" },
    ],
    gap: "A proxy that swaps a header keeps an API key out of the box. It does nothing once the agent is signed in to a site through the browser.",
  },
  {
    id: "work",
    n: 5,
    name: "Work & data",
    asks: "What crosses in, what comes out, and how do you get it back?",
    microvm: "silent",
    microvmNote: "The VM does not snapshot your tree. sbx and yolobox both mount the project live by default.",
    points: [
      "Live mount, private clone, uploaded copy, golden-image clone. A live mount puts files that run later inside the blast radius: git hooks, Makefiles, package.json scripts.",
      "discobox clones the repo, keeps origin read-only, and cherry-picks only committed work back. sbx --clone mounts the repo read-only and works on a private clone. OpenShell defaults to a private copy or volume. Codex cloud returns a PR.",
      "This layer assumes the work is a repo. A computer-use agent's work is often an account, a form or a spreadsheet, where there is nothing to clone and merge.",
    ],
    leaders: [
      { id: "discobox", why: "Clone in, cherry-pick out" },
      { id: "docker-sbx", why: "--clone gives a private copy of the repo" },
      { id: "openshell", why: "Private copy or volume by default" },
      { id: "codex", why: "Cloud tasks come back as a PR" },
    ],
    gap: "For a desktop agent the deliverable is a side effect in someone else's system. There is no diff to review.",
  },
  {
    id: "observe",
    n: 6,
    name: "Observation & control",
    asks: "Can you see it, stop it, and prove what it did?",
    microvm: "silent",
    microvmNote: "Nothing in a hypervisor gives you this. It is built above it.",
    points: [
      "Audit, live view, human takeover, approvals, replay. discobox audits every request at its proxy and serves a noVNC desktop where a box drawn on screen becomes something the agent can read. OpenShell emits OCSF audit events and holds rule proposals for review. Claude Code exposes hooks.",
      "Anthropic's computer-use demo streams the X desktop beside the agent chat. For a desktop agent the screen is the audit log and the control surface at once.",
      "It is also a leak: the screen holds whatever was on it, and every screenshot is model input.",
    ],
    leaders: [
      { id: "discobox", why: "Per-request audit and a live, annotatable desktop" },
      { id: "openshell", why: "OCSF audit and a human review queue for access" },
      { id: "claude-code", why: "Hooks around every tool call" },
    ],
    gap: "Recording the screen records whatever was on it: the credentials, the customer data.",
  },
];

export type Need = "decisive" | "matters" | "minor";

export type Workload = {
  id: string;
  name: string;
  hint: string;
  needs: Record<LayerId, Need>;
  role: { tone: "ok" | "warn" | "bad" | "default"; label: string };
  verdict: string;
  breaks: string[];
  stack: string;
  fits: SystemId[];
  refs: string[];
};

export const WORKLOADS: Workload[] = [
  {
    id: "coding",
    name: "Coding CLI agent",
    hint: "Claude Code or Codex in a repo",
    needs: { compute: "matters", fidelity: "minor", lifecycle: "minor", mediation: "decisive", work: "decisive", observe: "matters" },
    role: { tone: "default", label: "Often more wall than the risk" },
    verdict: "The kernel wall is rarely what fails. The repo, the token and the egress decide the outcome, and a microVM is silent on all three.",
    breaks: [
      "A live mount of the repo: hooks and build scripts run on your host next time",
      "A forwarded token with wide scope",
      "Open egress carrying a prompt-injected instruction out",
    ],
    stack: "A process sandbox or a container, a credential proxy, and a clone-based hand-back. Step up to a microVM when the agent needs its own Docker engine or the code is hostile.",
    fits: ["nono", "claude-code", "codex", "docker-sbx", "discobox", "openshell"],
    refs: [],
  },
  {
    id: "untrusted",
    name: "Run model-written code",
    hint: "Your product executes it",
    needs: { compute: "decisive", fidelity: "minor", lifecycle: "matters", mediation: "decisive", work: "minor", observe: "matters" },
    role: { tone: "ok", label: "The microVM is the answer" },
    verdict: "This is the microVM's home ground: hostile code, many short runs, nothing of yours mounted. Egress and secrets still decide whether the run can hurt anyone else.",
    breaks: [
      "Secrets baked into the image",
      "Open egress from a guest with no policy",
      "A shared kernel in a multi-tenant container pool",
    ],
    stack: "A libkrun or Firecracker guest per run, no host mounts, an egress allowlist, secrets injected outside the guest, a hard lifetime.",
    fits: ["microsandbox", "hypeman", "docker-sbx"],
    refs: [],
  },
  {
    id: "browser",
    name: "Browser agent",
    hint: "Chromium sessions, at scale",
    needs: { compute: "decisive", fidelity: "matters", lifecycle: "decisive", mediation: "decisive", work: "minor", observe: "matters" },
    role: { tone: "warn", label: "Necessary, not sufficient" },
    verdict: "The wall is table stakes. The product is warm sessions that resume in milliseconds and a page that cannot talk the agent into anything.",
    breaks: [
      "Cold-start latency with no snapshot and restore",
      "Cookies and logins persisting into the next session",
      "Page content that instructs the agent",
    ],
    stack: "One VM per session with memory snapshots and fast restore, a fresh profile each time, an egress proxy, and a live view for takeover.",
    fits: ["hypeman", "microsandbox", "discobox"],
    refs: ["hypeman-browser", "discobox-desktop"],
  },
  {
    id: "desktop",
    name: "Computer-use agent",
    hint: "A full Linux desktop, screenshots and clicks",
    needs: { compute: "matters", fidelity: "decisive", lifecycle: "matters", mediation: "decisive", work: "matters", observe: "decisive" },
    role: { tone: "warn", label: "Necessary at best, far from sufficient" },
    verdict: "Anthropic's own reference is a container, and its README lists four controls: a dedicated machine, no sensitive data, a domain allowlist, and a human confirming consequential actions. Only the first is a boundary.",
    breaks: [
      "Pixels as instructions: text in a page or an image steers the agent",
      "A signed-in browser profile is a credential no header-swapping proxy covers",
      "The screen and the model's context are an egress channel",
      "The irreversible click",
      "The agent loop running inside the machine it controls",
    ],
    stack: "A disposable dedicated machine (a VM if the target is hostile, a container if it is not), an X display with a viewer, a fresh profile with no sensitive logins, an egress allowlist, a human gate on consequential actions, and the loop kept outside the box.",
    fits: ["discobox", "hypeman", "incus", "microsandbox"],
    refs: ["anthropic-demo", "e2b-desktop", "cua-fleets", "discobox-desktop"],
  },
  {
    id: "native",
    name: "App agent on macOS or Windows",
    hint: "Xcode, .NET, a native app",
    needs: { compute: "matters", fidelity: "decisive", lifecycle: "matters", mediation: "matters", work: "matters", observe: "decisive" },
    role: { tone: "bad", label: "Not the primitive" },
    verdict: "A Linux microVM cannot be this machine. The sandbox is a full-OS guest on Virtualization.framework or Hyper-V, Apple caps macOS guests at two running per Mac, and the vendors do not allow redistributing the images.",
    breaks: [
      "Two macOS guests per Mac, enforced by the framework",
      "The template is assembled on your machine from the vendor's image",
      "None of the ten systems here ships this today",
    ],
    stack: "A local macOS guest (Lume, Tart) or a hosted desktop fleet. Or accept no isolation and drive real apps through accessibility, as Cua Driver does, and let mediation and approval carry the whole safety story.",
    fits: [],
    refs: ["cua-lume", "cua-driver", "cua-fleets"],
  },
  {
    id: "gpu",
    name: "GPU or heavy compute",
    hint: "Local models, simulators, big builds",
    needs: { compute: "matters", fidelity: "decisive", lifecycle: "matters", mediation: "matters", work: "matters", observe: "minor" },
    role: { tone: "warn", label: "Depends on the VMM" },
    verdict: "The lightest VMMs give GPUs up. The ones that pass them through cost you density. Containers reach GPUs through CDI with the shared kernel and driver stack that implies.",
    breaks: [
      "Firecracker has no GPU passthrough",
      "VFIO gives a VM one whole GPU, which limits density (OpenShell's VM driver takes one)",
      "A GPU container shares the host kernel and its driver stack",
    ],
    stack: "Cloud Hypervisor or QEMU with VFIO when you need a kernel wall. A container with CDI and tight mediation when you do not. Kubernetes with Kata if you already run it.",
    fits: ["hypeman", "openshell", "incus", "docker-sbx", "yolobox"],
    refs: [],
  },
];

export type ReferenceSetup = {
  id: string;
  name: string;
  boundary: string;
  shape: string;
  teaches: string;
  href: string;
};

export const REFERENCE_SETUPS: ReferenceSetup[] = [
  {
    id: "anthropic-demo",
    name: "Anthropic computer-use demo",
    boundary: "Docker container",
    shape: "Ubuntu with Xvfb, mutter, x11vnc, noVNC and Firefox. The agent loop runs inside the container it controls.",
    teaches: "The reference is a container, and its README says the components are weakly separated. It recommends a dedicated VM or container, no sensitive data, a domain allowlist, and human confirmation.",
    href: "https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo",
  },
  {
    id: "e2b-desktop",
    name: "E2B Desktop",
    boundary: "Firecracker microVM (hosted)",
    shape: "An Xfce desktop template with an SDK for screenshots, input and streaming apps.",
    teaches: "A microVM per desktop with the display, the input API and the stream as the product. Layers 2 and 6 are what you are buying.",
    href: "https://github.com/e2b-dev/desktop",
  },
  {
    id: "cua-fleets",
    name: "Cua Fleets",
    boundary: "Isolated cloud desktops",
    shape: "Hosted desktops you provision, drive and screenshot. Omarchy (Linux) is one of its examples.",
    teaches: "Someone else runs fidelity, lifecycle and observation. You bring the agent and the policy.",
    href: "https://github.com/trycua/cua",
  },
  {
    id: "cua-lume",
    name: "Cua Lume",
    boundary: "Local macOS and Linux VMs on Apple Silicon",
    shape: "A vanilla macOS VM built from an Apple restore image, driven over SSH.",
    teaches: "The only way to sandbox a macOS desktop, subject to Apple's two-running-macOS-guests limit.",
    href: "https://github.com/trycua/cua",
  },
  {
    id: "cua-driver",
    name: "Cua Driver",
    boundary: "None: it operates apps on your own machine",
    shape: "CLI, MCP and SDKs that inspect and operate native apps and browsers on macOS, Windows and Linux, with background delivery so your pointer is not taken.",
    teaches: "The unsandboxed pole. With no wall at all, mediation and approval are the whole safety story.",
    href: "https://github.com/trycua/cua",
  },
  {
    id: "hypeman-browser",
    name: "Kernel browsers on hypeman",
    boundary: "A VM per browser (Firecracker, Cloud Hypervisor, QEMU or Virtualization.framework)",
    shape: "Standby snapshots and UFFD-paged forks. Kernel claims sandboxed Chromium in under 30 ms from snapshots.",
    teaches: "For browsers, restore latency is the design constraint that the isolation choice serves.",
    href: "https://github.com/kernel/hypeman",
  },
  {
    id: "discobox-desktop",
    name: "discobox desktop",
    boundary: "A systemd box in a pool",
    shape: "Xfce on an Xorg dummy display, x11vnc, and a noVNC viewer. A region drawn on screen becomes something the agent can read.",
    teaches: "Viewer, takeover and an audit proxy are built in. The kernel wall is whatever the pool host is.",
    href: "https://github.com/discobox-ai/discobox",
  },
];

export type BeyondThreat = {
  id: string;
  title: string;
  prompt: string;
  kernelHelps: "none" | "little";
  why: string;
  helps: { layer: LayerId; control: string }[];
};

export const BEYOND_THREATS: BeyondThreat[] = [
  {
    id: "pixels",
    title: "Pixels are instructions",
    prompt: "A web page, an email or an image on screen says: ignore the task, open the account page, paste the token.",
    kernelHelps: "none",
    why: "Anthropic's computer-use README warns that Claude will sometimes follow commands found in content even when they conflict with the user's, including instructions in webpages or images. The attacker writes on the same screen the agent reads.",
    helps: [
      { layer: "mediation", control: "Allowlist egress to the domains the task needs" },
      { layer: "observe", control: "A human confirms consequential actions" },
      { layer: "lifecycle", control: "A fresh, minimal environment per task" },
    ],
  },
  {
    id: "session",
    title: "The signed-in session is the credential",
    prompt: "The browser profile is logged in to mail, a bank, a cloud console.",
    kernelHelps: "none",
    why: "A proxy that swaps an API key or header keeps a token out of the box. Cookies and SSO sessions live in the browser, and the agent acts as the user on any page that profile can open.",
    helps: [
      { layer: "lifecycle", control: "A fresh profile per task; never restore a signed-in snapshot across tenants" },
      { layer: "mediation", control: "Task-scoped accounts and destination allowlists" },
      { layer: "work", control: "Keep account logins off the machine, as Anthropic's README advises" },
    ],
  },
  {
    id: "screen",
    title: "The screen leaves the box",
    prompt: "Screenshots stream to the model API. A viewer, the clipboard or a recording carries the screen to people and logs.",
    kernelHelps: "little",
    why: "For a computer-use agent, what is on the display is the data. Every screenshot is model input, and every recording keeps it.",
    helps: [
      { layer: "work", control: "Keep sensitive data off the machine entirely" },
      { layer: "observe", control: "Decide who may attach to the viewer and how long recordings live" },
      { layer: "mediation", control: "Egress only to the model endpoint and the task's domains" },
    ],
  },
  {
    id: "click",
    title: "An irreversible click",
    prompt: "Accept the terms. Submit the payment. Send the email.",
    kernelHelps: "none",
    why: "A wall bounds what a compromised process can reach. It does not know that this click cannot be undone, or that the agent was asked to make it.",
    helps: [
      { layer: "observe", control: "A human confirms financial, consent and outbound-message actions" },
      { layer: "mediation", control: "Method and path rules that deny the write" },
      { layer: "lifecycle", control: "Snapshots undo local state, not the world" },
    ],
  },
  {
    id: "loop",
    title: "The loop lives in the box it controls",
    prompt: "The agent process holds the model key and decides its own actions inside the machine it steers.",
    kernelHelps: "little",
    why: "Anthropic's demo README says its components are weakly separated: the agent loop runs in the container Claude controls. A page that takes over the session takes the loop's credentials with it.",
    helps: [
      { layer: "mediation", control: "Inject the model credential at a proxy so the box holds a placeholder" },
      { layer: "compute", control: "Keep the loop outside and give the box only actions" },
    ],
  },
  {
    id: "runaway",
    title: "The runaway session",
    prompt: "The agent retries the same captcha for six hours.",
    kernelHelps: "none",
    why: "Cost and time are resources no boundary meters. A desktop session is expensive to leave running.",
    helps: [
      { layer: "lifecycle", control: "Idle timeouts and hard lifetimes" },
      { layer: "observe", control: "Step and spend budgets enforced outside the box" },
    ],
  },
];
