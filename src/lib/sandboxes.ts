export type Family = "process" | "container" | "microvm";
export type Verdict = "contained" | "partial" | "exposed" | "n/a";
export type Score = 1 | 2 | 3 | 4 | 5;

export type SystemId =
  | "yolobox"
  | "docker-sbx"
  | "microsandbox"
  | "hypeman"
  | "claude-code"
  | "codex";

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
    bestFor: "YOLO local agents when the threat is carelessness, not a kernel 0-day",
    layers: [
      { id: "hw", label: "Hardware", kind: "hw", blurb: "Same silicon. Containers do not buy you VT-x / KVM isolation." },
      { id: "host-kernel", label: "Host kernel — shared", kind: "host", blurb: "The real boundary is this kernel. Namespaces look like a machine from inside; they are still the host's syscalls." },
      { id: "ns", label: "Namespaces · cgroups · seccomp", kind: "boundary", blurb: "PID, mount, net, user, IPC isolation plus resource caps and a syscall filter. Excellent accidental-damage control. Not a hypervisor." },
      { id: "rootfs", label: "Container rootfs", kind: "guest", blurb: "A separate filesystem view. yolobox keeps $HOME off this view so SSH keys never appear, while the project is bind-mounted at its real path." },
      { id: "agent", label: "Agent with sudo", kind: "workload", blurb: "Inside the box the agent is root. That is the point of YOLO mode — compilers, databases, and CLIs install themselves. The host is the thing you are protecting." },
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
      "Shares every kernel CVE with the host (or with the Mac's Linux VM)",
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
    openSource: "CLI releases; VMM not open",
    platforms: "macOS, Windows, Linux (Ubuntu packages; KVM)",
    startup: "MicroVM boot; typically a short wait, then a full Linux userland",
    overhead: "Commonly capped around 2 vCPU / 4 GB on laptops",
    workspace: "Filesystem passthrough at the same absolute host path. Live, bidirectional, no sync daemon. Everything else stops at the VM.",
    network: "Host-side proxy. Blocks host localhost. Can inject auth headers so secrets never enter the VM.",
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
      "The project directory is still a live bind mount — rm in the repo is real",
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
    familyNote: "Local: OS-level sandbox on the Bash tool (Seatbelt on macOS, bubblewrap on Linux/WSL2) plus a domain-allowlist network proxy. Permissions/hooks are a second layer. Cloud Claude Code uses a stronger isolated backend (gVisor has been observed).",
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
    harness: "This is the harness. Sandbox covers Bash and children. Read/Edit/computer-use follow the permission model, not the same box. sandbox-runtime can wrap the entire process if you want that.",
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
      "Computer-use is the host desktop",
      "Read of the rest of the disk is wide by default",
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
    workspace: "Local workspace-write is the project tree. Cloud works on a clone and comes back as a PR — your laptop FS is out of the blast radius.",
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
    },
  },
  {
    id: "workspace-rm",
    title: "Wipe the repo",
    prompt: "The agent deletes source, git history, or .env in the project it was asked to edit.",
    why: "Almost everyone bind-mounts or clones the work. Isolation of the host is not isolation of the work.",
    outcomes: {
      yolobox: { verdict: "exposed", note: "Live bind mount at the real path. The repo is the shared surface." },
      "docker-sbx": { verdict: "exposed", note: "Same: passthrough mount, instant and bidirectional. The VM does not snapshot your tree." },
      microsandbox: { verdict: "partial", note: "Depends on how you mounted volumes. Default posture is disposable guests, not a live worktree." },
      hypeman: { verdict: "partial", note: "Works on an OCI guest. Your laptop repo is only at risk if you exported it in." },
      "claude-code": { verdict: "exposed", note: "The workspace is the point. git metadata has some protection; source files do not." },
      codex: { verdict: "partial", note: "Local workspace-write: exposed. Cloud clone: the laptop copy survives; you review a PR." },
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
    },
  },
  {
    group: "Security",
    id: "net",
    label: "Network default",
    values: {
      yolobox: "On",
      "docker-sbx": "Proxied, host-localhost blocked",
      microsandbox: "Configured per sandbox",
      hypeman: "Ingress + optional egress proxy",
      "claude-code": "Allowlist proxy",
      codex: "Off",
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
    },
  },
];

export function systemById(id: SystemId) {
  return SYSTEMS.find((s) => s.id === id)!;
}

export const FAMILY_SYSTEMS: Record<Family, SystemId[]> = {
  process: ["claude-code", "codex"],
  container: ["yolobox"],
  microvm: ["docker-sbx", "microsandbox", "hypeman"],
};

export type MacHostId = "docker-vm" | "incus-lxc" | "incus-vm" | "apple-container";

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
      "Incus is not a Docker CLI. yolobox talks docker/podman/container. You would run yolobox against Docker, or run the agent as an Incus instance yourself — different product surface.",
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
};


