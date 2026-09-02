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
  | "cloudflare";

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
    id: "cloudflare",
    name: "Cloudflare Sandbox",
    short: "Rented Firecracker VM per sandbox ID",
    maker: "Cloudflare",
    family: "microvm",
    familyNote: "The Sandbox SDK is a TypeScript API over Cloudflare Containers. A Worker calls getSandbox(binding, id); a Durable Object owns that ID; a container instance boots for it in its own VM — Firecracker on KVM, per Cloudflare's launch — wherever the image is pre-fetched. Not a laptop wrapper. You rent the fleet instead of operating hypeman.",
    oneLiner: "getSandbox('user-123').exec('npm test') — a Firecracker guest on Cloudflare's network, with the secrets held by your Worker.",
    role: "runtime",
    vmm: "Firecracker on KVM, operated by Cloudflare. You never see the hypervisor; you see a Durable Object.",
    kernel: "dedicated",
    openSource: "SDK, base images and the HTTP bridge are open (cloudflare/sandbox-sdk). The platform is Cloudflare's.",
    platforms: "Cloudflare Workers Paid. linux/amd64 images only. wrangler dev runs the container locally with Docker plus a TPROXY sidecar that mirrors the egress proxy.",
    startup: "Cold start commonly 1–3 s, image-size dependent. Sleeps after 10 min idle by default and the next call is a fresh container. keepAlive pins it; a backup restores a directory as a copy-on-write overlay instead of re-cloning.",
    overhead: "Instance types from lite (1/16 vCPU, 256 MiB, 2 GB) to standard-4 (4 vCPU, 12 GiB, 20 GB); custom sizes from 1 vCPU. Account ceiling 1,500 vCPU / 6 TiB / 30 TB concurrent. Billed like Containers: active CPU, memory, disk, egress.",
    workspace: "/workspace, /tmp, /home inside the guest. Disk is ephemeral — sleep wipes it. Persist with createBackup / restoreBackup to R2, or mount an S3-compatible bucket by FUSE. gitCheckout clones your repo in; nothing on your laptop is ever mounted.",
    network: "On by default. enableInternet = false makes it deny-by-default: ports 80/443 only, DNS pinned to Cloudflare resolvers. allowedHosts / deniedHosts with globs; outbound and outboundByHost handlers run in the Worker as a programmable egress proxy that injects credentials the guest never holds. HTTPS is intercepted with an ephemeral CA the runtime trusts at boot. Inbound only through preview URLs, tunnels, or the Worker.",
    nestedDocker: "Documented: FROM docker:dind-rootless plus the musl sandbox binary, dockerd --iptables=false, --network=host per inner container. Rootless only, no privileged mode, images lost at sleep. Enough for docker build in a pipeline; not a Docker Desktop in the guest.",
    harness: "Not a wrapper. Tutorials run Claude Code and the OpenAI Agents SDK inside; an -opencode image variant ships OpenCode; Devin Outposts and Claude Managed Agents deploy one sandbox per session. The sandbox bridge exposes it over HTTP to any language.",
    useCases: [
      "Your product runs model-written code and has no /dev/kvm — an agent tool call becomes a VM on Cloudflare's fleet",
      "Per-user cloud dev environments, code interpreters, CI clones: one sandbox ID per user or task, a preview URL per port",
      "Keeping the GitHub or API token in the Worker: outboundByHost injects it per request and per containerId, and revokes it after setup",
    ],
    notFor: [
      "Wrapping Claude Code around the repo on your laptop (that's sbx, yolobox, nono)",
      "Long-lived machines with local state — disk dies at sleep; keepAlive and R2 are workarounds, not a VPS",
      "Inbound TCP/UDP from end users, iptables, privileged containers, or arm64 images",
    ],
    security: "A hardware boundary you rent: one VM per sandbox, quotas enforced, and no path to a host of yours because there is no host of yours. Sessions inside a sandbox share the filesystem and processes — terminal tabs, not tenants; the documented rule is one sandbox per user. Sandbox IDs are not credentials, and preview or quick-tunnel URLs are bearer-by-URL.",
    caveats: [
      "Everything in the guest is ephemeral by default; a sleep is a reset, not a pause",
      "Outbound handlers see HTTP/HTTPS only; with internet on, other ports leave unfiltered",
      "Placement follows the first request; a restart can land the container in another region",
      "SDK 1.0 (@cloudflare/sandbox@next) drops sessions and string exec; keep the npm package and the image on the same release line",
    ],
    scores: { isolation: 5, performance: 3, harnessFit: 3, untrustedCode: 5, laptopDx: 2 },
    layers: ["hw", "host-kernel", "vmm", "guest-kernel", "guest-user", "agent"],
    sources: [
      { label: "Sandbox SDK concepts", href: "https://developers.cloudflare.com/sandbox/concepts/" },
      { label: "Security model", href: "https://developers.cloudflare.com/sandbox/concepts/security/" },
      { label: "Handle outbound traffic", href: "https://developers.cloudflare.com/sandbox/guides/outbound-traffic/" },
      { label: "Lifecycle of a Container (own VM)", href: "https://developers.cloudflare.com/containers/concepts/architecture/" },
      { label: "Run Claude Code on a Sandbox", href: "https://developers.cloudflare.com/sandbox/tutorials/claude-code/" },
      { label: "Containers public beta (Firecracker)", href: "https://blog.cloudflare.com/containers-are-available-in-public-beta-for-simple-global-and-programmable/" },
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
    familyNote: "Local surfaces — CLI, IDE extension, ChatGPT desktop app — run every spawned command in an OS sandbox: Seatbelt via sandbox-exec on macOS, bwrap plus seccomp on Linux and WSL2 (WSL1 dropped at 0.115), a native restricted-token sandbox on Windows. Modes: read-only, workspace-write, danger-full-access. Codex cloud is a different box: OpenAI-managed containers, a setup phase with network, an agent phase offline by default, environment secrets removed before the agent starts.",
    oneLiner: "Local: the kernel says no. Cloud: the machine isn't yours. Network starts off on both.",
    role: "harness",
    vmm: "None locally. Cloud tasks run in OpenAI-managed containers — isolation you rent, not your laptop kernel.",
    kernel: "shared",
    openSource: "CLI and sandbox live in openai/codex (codex-rs, linux-sandbox). The auto-review guardian policy is in the repo too. Cloud isolation is OpenAI's.",
    platforms: "macOS, Linux, WSL2, native Windows (unelevated or elevated sandbox, private desktop). Cloud via ChatGPT and the Codex app.",
    startup: "Local spawn is free. Cloud pays clone + provision cost.",
    overhead: "Local: policy. Cloud: an ephemeral machine.",
    workspace: "workspace-write = cwd plus /tmp plus writable_roots, with .git, .agents and .codex carved out read-only — recursively, and a .git pointer file's real gitdir too. Cloud works on a clone and comes back as a PR; your laptop FS is out of the blast radius.",
    network: "Off by default in workspace-write. sandbox_workspace_write.network_access turns it on; features.network_proxy then makes it allowlist-first — deny wins, loopback and private ranges blocked unless allow_local_binding, DNS-rebinding checks, Unix sockets allowlisted. Cloud: off in the agent phase; per-environment domain allowlist plus optional GET/HEAD/OPTIONS-only.",
    nestedDocker: "Local docker.sock is a Unix socket: allowlist-off under the proxy unless you add it. OpenAI's reference devcontainer is the documented answer — let Docker be the outer wall and run --sandbox danger-full-access inside. Cloud: whatever the environment image ships.",
    harness: "This is the harness. Sandbox and approval policy are two layers: untrusted / on-request / never, a granular policy per category, and approvals_reviewer = auto_review, which sends escalations to a reviewer agent that fails closed. Admins pin all of it in requirements.toml.",
    useCases: [
      "Hands-off local edits with a kernel fence and no network, by default, on every surface",
      "Delegated cloud tasks whose blast radius is a throwaway clone and whose output is a PR",
      "Fleet policy that is enforced, not suggested: allowed_sandbox_modes, experimental_network allow/deny lists, cached-only web search, keyring credentials",
    ],
    notFor: [
      "Native nested docker against the host engine",
      "Assuming cloud isolation if you actually launched the CLI",
      "A programmable 30-event hook layer (that's Claude Code) — Codex has rules, approvals and a reviewer agent instead",
    ],
    security: "The important split: local is a process sandbox on a shared kernel; cloud is OpenAI's container. Do not cite one when you mean the other. Default-deny network, and an allowlist proxy with rebinding checks once you open it, is the standout local control versus Claude Code. The proxy filters commands only — web search, MCP, connectors, the browser and the model call itself have separate controls.",
    caveats: [
      "Linux without bwrap falls back to a bundled helper that needs unprivileged user namespaces; Ubuntu 24.04 needs the bwrap-userns-restrict AppArmor profile loaded",
      "danger-full-access / --yolo is not a sandbox; inside a devcontainer it means a hostile repo can read Codex's own credentials",
      "Network on with network_proxy off is unrestricted egress; adding domain rules does not enable the proxy",
      "Cloud isolation does not protect a local CLI session",
    ],
    scores: { isolation: 3, performance: 5, harnessFit: 5, untrustedCode: 3, laptopDx: 4 },
    layers: ["hw", "host-kernel", "policy", "agent", "bash"],
    sources: [
      { label: "Codex sandboxing", href: "https://learn.chatgpt.com/docs/sandboxing" },
      { label: "Agent approvals & security", href: "https://learn.chatgpt.com/docs/agent-approvals-security" },
      { label: "Codex cloud internet access", href: "https://learn.chatgpt.com/docs/cloud/internet-access" },
      { label: "Running Codex safely at OpenAI", href: "https://openai.com/index/running-codex-safely/" },
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
      cloudflare: { verdict: "contained", note: "The guest is a Firecracker VM on Cloudflare's fleet; your laptop was never mounted. /workspace, /tmp and /home are the guest's, and they vanish at sleep anyway." },
      "claude-code": { verdict: "partial", note: "Sandboxed bash cannot write outside the workspace by default. Unsandboxed fallback, disabled FS isolation, or a non-bash tool can still reach home." },
      codex: { verdict: "contained", note: "workspace-write cannot touch $HOME. danger-full-access can. Cloud clone never saw your home." },
      nono: { verdict: "contained", note: "Home is outside the grant unless the profile added it. A tool sandbox cannot widen that grant from inside." },
      incus: { verdict: "contained", note: "The instance has its own rootfs. Host $HOME appears only if you bind-mounted it (Pere Villega's default is that you did not)." },
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
      cloudflare: { verdict: "contained", note: "Each container instance runs in its own VM — Firecracker per Cloudflare's launch. A kernel LPE lands in the guest; the remaining bets are the VMM and Cloudflare's host." },
      "claude-code": { verdict: "exposed", note: "Seatbelt/bubblewrap are policies on the host kernel." },
      codex: { verdict: "partial", note: "Local CLI: host kernel, exposed. Cloud task: contained in OpenAI's isolated environment." },
      nono: { verdict: "exposed", note: "Landlock and Seatbelt are still this kernel. no daemon, no VM — and no second kernel." },
      incus: { verdict: "exposed", note: "System containers share the host kernel. Unprivileged uid maps soften an escape-to-root; they do not stop a kernel LPE. Incus --vm would contain this; that is not this row." },
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
      cloudflare: { verdict: "contained", note: "No host socket. Docker-in-Docker is docker:dind-rootless inside the guest with iptables off; the outer engine is Cloudflare's and unreachable." },
      "claude-code": { verdict: "exposed", note: "Unix sockets are a documented bypass class if reachable from the sandbox." },
      codex: { verdict: "partial", note: "Local: a Unix socket, allowlist-off once network_proxy is on, the same hole if you open it. Cloud: not your daemon." },
      nono: { verdict: "partial", note: "Deny the socket in the profile and it is closed. Allow docker or mount the socket and it is the same hole as Claude Code." },
      incus: { verdict: "contained", note: "The point of security.nesting: a dockerd inside the instance, not /var/run/docker.sock on the host." },
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
      cloudflare: { verdict: "contained", note: "Outbound handlers keep the credential in the Worker and inject it per host; the guest never holds it. enableInternet = false plus allowedHosts is deny-by-default with DNS pinned. Anything you pass as env or clone in as .env is guest-visible." },
      "claude-code": { verdict: "partial", note: "Credential file/env deny or mask, plus proxy substitution. Default disk reads are wide. Network is allowlist, not off." },
      codex: { verdict: "contained", note: "Default-deny network is the winning control; with network on, the allowlist proxy (deny wins, rebinding checks) keeps it. Local still sees the workspace. Cloud strips environment secrets before the agent phase and sees only the clone." },
      nono: { verdict: "contained", note: "Phantom tokens: the child never holds GH_TOKEN. The proxy injects the real secret at the boundary and zeroises it. Workspace .env is still your problem." },
      incus: { verdict: "partial", note: "Host creds stay out unless you passed them in. Egress is whatever the instance's nic can reach — Incus is not a secret proxy." },
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
      cloudflare: { verdict: "contained", note: "The work is a clone made by gitCheckout inside the guest. Your repo survives; you review what the Worker sends back. createBackup to R2 if you want the clone to survive too." },
      "claude-code": { verdict: "exposed", note: "The workspace is the point. git metadata has some protection; source files do not." },
      codex: { verdict: "partial", note: "Local workspace-write: exposed. Cloud clone: the laptop copy survives; you review a PR." },
      nono: { verdict: "exposed", note: "The grant is the worktree. Tool sandboxes do not snapshot your git history." },
      incus: { verdict: "partial", note: "On a golden-image clone the laptop repo is safe until you bind-mounted it. Pere Villega bind-mounts the project — then a wipe is real, like yolobox." },
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
      cloudflare: { verdict: "partial", note: "Documented path: docker:dind-rootless, dockerd --iptables=false, --network=host per inner container. Rootless only, no privileged mode, images die at sleep. docker build in a pipeline works; compose with its own networks does not." },
      "claude-code": { verdict: "exposed", note: "Uses whatever Docker is on the host. Isolation and docker.sock do not mix." },
      codex: { verdict: "partial", note: "Local: host Docker, same tension — OpenAI's reference devcontainer puts Docker outside as the wall instead. Cloud: only if the environment image provides an engine." },
      nono: { verdict: "exposed", note: "Wraps the CLI, does not give it an engine. Compose means the host Docker or a denied socket." },
      incus: { verdict: "contained", note: "This is a primary Incus use case. Nested dockerd in the system container; host socket stays off. Heavier than sbx, cheaper than a dedicated kernel." },
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
      cloudflare: { verdict: "contained", note: "Cloudflare is the operator: one VM per sandbox ID, quotas enforced. Sessions inside one sandbox are not a boundary — the documented rule is one sandbox per user." },
      "claude-code": { verdict: "exposed", note: "A single-user IDE harness." },
      codex: { verdict: "partial", note: "Local: no. Cloud: OpenAI is the multi-tenant operator, not you." },
      nono: { verdict: "exposed", note: "A laptop wrapper. Shared kernel, one operator." },
      incus: { verdict: "partial", note: "This is what Incus clustering and unprivileged LXC are for — dense tenancy on Linux. Still the host kernel. Hostile tenants that need a kernel wall want --vm or a microVM." },
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
      cloudflare: { verdict: "contained", note: "getSandbox with a second ID is a second VM, placed wherever the image is pre-fetched. Thousands at once inside the account ceiling; the two guests only meet through your Worker." },
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
      cloudflare: { verdict: "contained", note: "There is no host localhost to reach — your Worker is the control plane, not a network neighbour, and there is no cloud metadata endpoint. With internet off, only 80/443 leave, through the handler, and DNS goes only to Cloudflare resolvers." },
      "claude-code": { verdict: "partial", note: "Sandboxed Bash can only leave through the proxy, and 127.0.0.1 is not on the allowlist unless you add it. MCP servers, hooks, and WebFetch run on the host and see every local port." },
      codex: { verdict: "contained", note: "Local: network is off at the syscall level by default; once on, the proxy's allow_local_binding = false blocks loopback, link-local and private ranges, and any hostname that resolves there. Cloud tasks have no route to your laptop at all." },
      nono: { verdict: "partial", note: "The L7 proxy and Landlock TCP rules can deny localhost; whether they do is the profile. A permissive profile leaves the host's ports open." },
      incus: { verdict: "partial", note: "Own network namespace on an Incus bridge. 127.0.0.1-bound host services are unreachable; anything bound on the bridge or 0.0.0.0 is not. Same shape as yolobox." },
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
      cloudflare: { verdict: "contained", note: "Disk is ephemeral: the plant dies at sleep unless you createBackup it, and a restored backup restores the hook too. The only road to your repo is a push through the handler you wrote." },
      "claude-code": { verdict: "partial", note: "Denies writes to .claude/*, .mcp.json, .git/hooks and .git/config, shell rc, .vscode/.idea — no allowWrite can lift it. .envrc, Makefile, package.json, CI config are still writable, and disabling filesystem isolation drops the whole list." },
      codex: { verdict: "partial", note: ".git, .agents and .codex are read-only in workspace-write, so hooks and agent config are covered. Anything else in the tree is fair game. Cloud: the plant arrives as a PR you review." },
      nono: { verdict: "partial", note: "The grant is the tree; deny .git/hooks and dotfiles in the profile and it is closed. The default profile is what you audit." },
      incus: { verdict: "partial", note: "Golden-image clone: the plant dies with the box. Bind-mounted project (the Villega default): live mount, same as yolobox." },
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
      cloudflare: { verdict: "partial", note: "The best-shaped courier: outboundByHost is per host and per containerId, can filter by method, and setOutboundByHost / removeOutboundByHost revoke it after setup. Whatever the handler signs is still an authorised call." },
      "claude-code": { verdict: "partial", note: "Permission rules and hooks are the gate — a PreToolUse hook can refuse git push. Masked env vars keep the secret out of Bash but still let allowed commands use it." },
      codex: { verdict: "partial", note: "Approvals gate the command locally, and auto_review can hand the escalation to a reviewer agent that denies critical-risk actions and fails closed. Cloud comes back as a PR: the strongest shape, because a human sees the diff before it lands." },
      nono: { verdict: "partial", note: "The best of the wrappers: gh gets the token only inside its own child sandbox, and the L7 policy can allow read-PR while denying push. The policy is still yours to write." },
      incus: { verdict: "exposed", note: "Whatever you put in the machine is the machine's. Incus has no credential proxy." },
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
      cloudflare: "Tutorial: clone the repo, run Claude Code in the guest",
      "claude-code": "Native",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
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
      cloudflare: "Bring your own image; OpenAI Agents SDK tutorial",
      "claude-code": "—",
      codex: "Native",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
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
      cloudflare: "Bring your own image",
      "claude-code": "—",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
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
      cloudflare: "-opencode base image variant",
      "claude-code": "—",
      codex: "—",
      nono: "Wrap + signed profile",
      incus: "Install inside the machine",
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
      cloudflare: "First-class: getSandbox() from a Worker, HTTP bridge",
      "claude-code": "No",
      codex: "No",
      nono: "Any CLI via a profile",
      incus: "OCI or a full distro",
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
      cloudflare: "Chromium in your image; Browser Rendering is the separate product",
      "claude-code": "Computer-use is the host",
      codex: "Not this product",
      nono: "No",
      incus: "If you image a browser into the machine",
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
      cloudflare: "Firecracker VM per Container, rented",
      "claude-code": "Seatbelt + bubblewrap",
      codex: "Seatbelt + bwrap/seccomp; Windows sandbox",
      nono: "Landlock + Seatbelt + tool broker",
      incus: "Unprivileged LXC",
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
      cloudflare: "Dedicated guest",
      "claude-code": "Shared host",
      codex: "Shared locally; isolated in cloud",
      nono: "Shared host",
      incus: "Shared host (LXC). Dedicated if --vm",
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
      cloudflare: "Hosted sandbox runtime",
      "claude-code": "Harness (built-in)",
      codex: "Harness (built-in)",
      nono: "Agent wrapper",
      incus: "Machine runtime",
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
      cloudflare: "Cloudflare: Worker + Durable Object per sandbox",
      "claude-code": "None",
      codex: "None locally; requirements.toml from admins; OpenAI cloud",
      nono: "None (child process + proxy)",
      incus: "incusd on Linux",
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
      cloudflare: "Your Worker outside; the guest is the unit; egress handlers run in the Worker",
      "claude-code": "Harness outside; Bash children inside. MCP + hooks on the host",
      codex: "Harness outside; commands inside (local). Everything inside (cloud)",
      nono: "Supervisor outside; agent session + each tool child inside",
      incus: "Whole CLI inside the machine",
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
      cloudflare: "1–3 s cold; sleeps at 10 min",
      "claude-code": "Process spawn",
      codex: "Spawn / cloud provision",
      nono: "Process spawn",
      incus: "Launch, or ms CoW clone",
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
      cloudflare: "1/16–4 vCPU, 256 MiB–12 GiB",
      "claude-code": "Policy only",
      codex: "Policy / ephemeral machine",
      nono: "Policy only",
      incus: "A full OS, no hypervisor",
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
      cloudflare: "Hypervisor, Cloudflare-operated",
      "claude-code": "MAC policy on bash",
      codex: "MAC policy; cloud machine",
      nono: "MAC policy on session + each tool",
      incus: "User ns + AppArmor; still this kernel",
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
      cloudflare: "Clone in the guest; R2 backup or FUSE mount",
      "claude-code": "Live cwd; git worktree per session optional",
      codex: "Local: live tree, .git read-only. Cloud: clone → PR",
      nono: "Live grant",
      incus: "Golden-image CoW clone, or bind-mount",
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
      cloudflare: "On; enableInternet=false + allowedHosts + outbound handlers",
      "claude-code": "Allowlist proxy (Bash only)",
      codex: "Off; allowlist proxy when on",
      nono: "L7 proxy, phantom tokens",
      incus: "Bridged nic",
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
      cloudflare: "Image it in; Claude Code tutorial",
      "claude-code": "Is the CLI",
      codex: "Is the CLI",
      nono: "Wraps the CLI",
      incus: "Install it in the machine",
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
      cloudflare: "TypeScript SDK + HTTP bridge",
      "claude-code": "sandbox-runtime only",
      codex: "No",
      nono: "No — wrap, don't embed",
      incus: "REST API + CLI",
    },
  },
];

export function systemById(id: SystemId) {
  return SYSTEMS.find((s) => s.id === id)!;
}

export const FAMILY_SYSTEMS: Record<Family, SystemId[]> = {
  process: ["claude-code", "codex", "nono"],
  container: ["yolobox"],
  system: ["incus"],
  microvm: ["docker-sbx", "microsandbox", "hypeman", "cloudflare"],
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
    vsMicrovm: "A fleet of hypeman/Firecracker VMs is the stronger wall and the higher bill. Incus --vm is that bill inside Incus. Cloudflare Sandbox is the same wall rented by the CPU-millisecond — but its disk dies at sleep, which is the opposite of a machine you keep.",
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


