import { useState } from "react";
import {
  FAMILIES,
  LAYERS,
  systemById,
  type Family,
  type LayerId,
  type SystemId,
} from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Origin = "open" | "rented";
type Wall = Family | "gvisor" | "isolate";

type Entry = {
  id: string;
  name: string;
  maker: string;
  origin: Origin;
  status: string;
  /** Where its wall sits on the five-family axis, or on one of the two off-axis primitives. */
  walls: { family: Wall; via: string }[];
  /** The layer this entry moves furthest; the reason it is on the page. */
  layer: LayerId;
  /** A full row elsewhere on the page, when there is one. */
  system?: SystemId;
  near: SystemId[];
  shape: string;
  adds: string[];
  watch: string[];
  sources: { label: string; href: string }[];
};

type RentedId = "cloudflare" | "vercel" | "e2b" | "modal" | "daytona" | "archil";

const ENTRIES: (Entry & { id: string })[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Sandboxes",
    maker: "Cloudflare",
    origin: "rented",
    status: "Workers Paid · docs rewritten Sep–Oct 2026; Sandbox SDK 0.x is now the legacy path",
    walls: [
      { family: "microvm", via: "Containers: Firecracker, own kernel" },
      { family: "isolate", via: "Dynamic Workers: a V8 isolate" },
    ],
    layer: "mediation",
    system: "cloudflare",
    near: ["hypeman", "openshell"],
    shape:
      "Two sandboxes behind one Worker. A Durable Object starts a Container from your image in a Firecracker microVM and execs into it; a Worker loader starts a Dynamic Worker for JavaScript, Python or Wasm that can only call the methods you hand it. Either way the only door in or out is your Worker.",
    adds: [
      "A sandbox Container starts with enableInternet: false. Hostnames you intercept are the only ones that resolve, and DNS never reaches a public resolver, so it cannot carry data out either.",
      "Outbound handlers in the Worker (outboundByHost, interceptOutboundHttps) add the token after the request leaves the VM, and can be swapped or revoked while it runs. A Dynamic Worker with globalOutbound: null cannot fetch at all.",
      "Lifetime follows the Durable Object: it runs while the object is active, then for setInactivityTimeout() (up to 6 hours). snapshotContainer() saves the writable root filesystem for 30 days; an R2 bucket mount outlives everything.",
      "Up to standard-4 (4 vCPU, 12 GiB, 20 GB) per instance, 1,500 vCPU and 6 TiB per account.",
    ],
    watch: [
      "No pause: when the instance stops, its processes and disk end with it, and the next start() is a new machine from the image or a snapshot.",
      "Handlers see ports 80 and 443 only, and every process inside has root's capabilities, so a second Linux user is not a wall. The sandbox name picks whose files you get: derive it from an authenticated identity.",
    ],
    sources: [
      { label: "Sandboxes on Cloudflare", href: "https://developers.cloudflare.com/sandbox/" },
      { label: "Lifetime", href: "https://developers.cloudflare.com/sandbox/concepts/lifetime/" },
      { label: "Security", href: "https://developers.cloudflare.com/sandbox/concepts/security/" },
      {
        label: "Outbound traffic",
        href: "https://developers.cloudflare.com/containers/configuration/outbound-traffic/",
      },
    ],
  },
  {
    id: "vercel",
    name: "Vercel Sandbox",
    maker: "Vercel",
    origin: "rented",
    status: "Hosted · JS and Python SDKs, sandbox CLI · all Vercel regions",
    walls: [{ family: "microvm", via: "Firecracker, own kernel" }],
    layer: "mediation",
    near: ["cloudflare", "docker-sbx"],
    shape:
      "A Firecracker microVM on the infrastructure that runs Vercel's builds, booted from an Ubuntu-based image that already ships claude, codex and opencode. It is built to run the agent itself as well as its code: sandbox sh, then claude, and the edits and installs stay in the VM.",
    adds: [
      "A network policy you change while processes run: allow-all, deny-all, or per-domain rules with wildcards. A rule can transform headers, so the API key is added on egress and never enters the VM, or forward a host to your own proxy.",
      "Persistent by default: stopping a sandbox snapshots its filesystem and the next call resumes it with a fresh session clock. Snapshots live 30 days from last use; Drives keep data across runs.",
      "Root, apt, Docker, FUSE and VPN clients inside the VM; separate Linux users per agent in one sandbox; up to 15 public ports.",
      "Billed on active CPU, so time spent waiting on a model is mostly memory cost. Secure Compute gives static egress IPs and VPC peering.",
    ],
    watch: [
      "A session defaults to 5 minutes and caps at 45 minutes on Hobby or 24 hours on Pro and Enterprise. The cap resets on resume, but memory does not survive a stop.",
      "Separate Linux users inside one VM share its kernel: a fence between your agents, not a wall between tenants.",
    ],
    sources: [
      { label: "vercel.com/sandbox", href: "https://vercel.com/sandbox" },
      { label: "Docs", href: "https://vercel.com/docs/sandbox" },
      {
        label: "Persistence",
        href: "https://vercel.com/docs/sandbox/concepts/persistent-sandboxes",
      },
    ],
  },
  {
    id: "e2b",
    name: "E2B",
    maker: "E2B",
    origin: "rented",
    status: "Hosted · Python and JS SDKs · infrastructure open source (e2b-dev/infra)",
    walls: [{ family: "microvm", via: "Firecracker VM per sandbox" }],
    layer: "lifecycle",
    near: ["hypeman", "cua-sandbox"],
    shape:
      "The longest-running sandbox API for agents and the one others copy: Perplexity's SPACE ships an E2B-compatible wrapper. Templates define the machine, a sandbox is a VM booted from one, and pause is the default way to keep it.",
    adds: [
      "Pause saves memory and filesystem (about 4 s per GiB of RAM), resume takes about a second, and paused sandboxes are kept until you kill them. Fork, snapshot and auto-resume on request build on it.",
      "Egress rules in network.allowOut / denyOut: domains matched on the Host header on port 80 and SNI on 443, CIDR on every other port.",
      "An egress proxy fills transform.headers from stored secrets (Secret.fill) outside the sandbox; a SOCKS5 proxy of your own is an option.",
      "E2B Desktop: an Xfce desktop template for computer use, already in the Workloads section.",
    ],
    watch: [
      "5-minute default timeout; continuous runtime caps at 1 hour on Hobby and 24 hours on Pro, reset by a pause.",
      "Domain rules ride on SNI and Host, and QUIC is not supported, so a client that fronts or skips SNI falls back to CIDR rules.",
    ],
    sources: [
      { label: "E2B docs", href: "https://docs.e2b.dev/" },
      { label: "Persistence", href: "https://docs.e2b.dev/sandbox/persistence" },
      { label: "Internet access", href: "https://docs.e2b.dev/network/internet-access" },
    ],
  },
  {
    id: "modal",
    name: "Modal Sandboxes",
    maker: "Modal",
    origin: "rented",
    status: "Hosted · Python, JS and Go SDKs",
    walls: [
      { family: "gvisor", via: "default runtime" },
      { family: "microvm", via: "runtime set to a VM, its own Linux kernel" },
    ],
    layer: "compute",
    near: ["cloudflare", "hypeman"],
    shape:
      "Containers created from code under a gVisor user-space kernel, or a VM runtime with a real Linux kernel when the job needs Docker, FUSE or nested cgroups. Modal's own coding-agent example keeps the LangGraph loop and its OpenAI key in a Modal Function and only the generated code in the sandbox, on a T4, through sb.exec.",
    adds: [
      "Network controls as create arguments: block_network, outbound_cidr_allowlist, outbound_domain_allowlist, inbound_cidr_allowlist, a sidecar proxy, and connect tokens for exposed ports.",
      "Three snapshots: filesystem and directory snapshots kept 30 days, and experimental memory snapshots that clone running processes but end the sandbox, expire in 7 days and do not work with GPUs.",
      "A 5-minute default lifetime, up to 24 hours, plus an idle timeout. The app's secrets are not passed into the sandbox unless you pass them.",
    ],
    watch: [
      "GPU sandboxes run only on gVisor and Docker-in-sandbox only on the VM runtime, so the feature you ask for picks the wall for you.",
      "No egress-side credential injection is documented: a secret you pass is an environment variable the sandbox can read.",
    ],
    sources: [
      { label: "Modal guide", href: "https://modal.com/docs/guide" },
      { label: "Coding agent with Modal Sandboxes", href: "https://modal.com/docs/examples/agent" },
      { label: "Sandbox networking", href: "https://modal.com/docs/guide/sandbox-networking" },
    ],
  },
  {
    id: "daytona",
    name: "Daytona",
    maker: "Daytona",
    origin: "rented",
    status: "Hosted · SDKs in Python, TypeScript, Ruby, Go, Java",
    walls: [
      { family: "container", via: "default class" },
      { family: "microvm", via: "Linux VM class, own kernel" },
      { family: "vm", via: "Windows, and macOS on dedicated Apple silicon" },
    ],
    layer: "fidelity",
    near: ["cloudflare", "cua-sandbox", "incus"],
    shape:
      "A rented computer whose class sets the kernel line. Container sandboxes are the default; Linux VM and Windows sandboxes are a separate class created from VM snapshots; macOS runs on reserved Mac hardware; GPU sandboxes take up to eight NVIDIA or AMD cards.",
    adds: [
      "VM sandboxes pause with memory intact and fork filesystem and memory into a fork tree you can branch again. Container sandboxes cannot pause or fork: stop keeps the disk, archive moves it to object storage.",
      "Nested KVM inside a Linux VM sandbox, on request, so an agent can run its own VMs.",
      "Lifecycle on timers: auto-stop after 15 idle minutes by default, then auto-archive, auto-delete, and a wall-clock TTL.",
      "Egress per sandbox with networkAllowList (IPv4 CIDR), domainAllowList or networkBlockAll, changeable while it runs.",
    ],
    watch: [
      "The overview promises each sandbox a dedicated kernel and in the next sentence makes Linux containers the default. Ask which class you are on before you read the wall.",
      "Lower tiers get an organisation-wide network restriction you cannot override per sandbox; higher tiers get full internet by default. Spot GPUs are evicted with no warning.",
    ],
    sources: [
      { label: "Daytona: Sandboxes", href: "https://www.daytona.io/docs/en/sandboxes.md" },
      { label: "Network limits", href: "https://www.daytona.io/docs/en/network-limits/" },
    ],
  },
  {
    id: "archil",
    name: "Archil",
    maker: "Archil",
    origin: "rented",
    status: "Hosted, or BYOC on any cloud or bare metal · compute in AWS regions",
    walls: [{ family: "microvm", via: "Firecracker per sandbox, KVM" }],
    layer: "work",
    near: ["cloudflare", "hypeman"],
    shape:
      "Storage first, compute second. The sandbox is a Firecracker microVM, but its root filesystem is a durable Archil disk, so the workspace outlives the VM, forks without copying, and can be read from outside over an S3 API. The same disk mounts in E2B, Daytona, Modal, Vercel Sandbox or a Kubernetes pod.",
    adds: [
      "Fork is a disk checkpoint (about 15 ms) and a branch (about 35 ms) whatever the disk size; pause writes memory to storage, so a paused sandbox can resume on another machine.",
      "One-shot serverless execution: one command per microVM against a disk, five minutes, only the disk survives.",
      "Egress denied by default on the Developer plan (a managed allowlist of registries, Git hosts and model APIs); a domain and CIDR firewall and an egress proxy that adds API keys on Team and up. No reach to other sandboxes, private networks or cloud metadata.",
    ],
    watch: [
      "Exposed ports are public with no authentication; use port tokens for private services.",
      "Forks share any extra mounted disk, so parallel branches write to the same data unless you split it. No nested virtualization; Docker inside the VM is fine.",
    ],
    sources: [
      {
        label: "Archil: Introduction",
        href: "https://docs.archil.com/getting-started/introduction.md",
      },
      {
        label: "Persistent sandboxes",
        href: "https://docs.archil.com/compute/sandboxes/introduction.md",
      },
    ],
  },
  {
    id: "strands-box",
    name: "Strands Box",
    maker: "AWS · Strands Agents",
    origin: "open",
    status: "Apache-2.0 · developer preview, Oct 2026 · macOS on Apple silicon, Linux planned",
    walls: [{ family: "process", via: "an OS sandbox that only funnels" }],
    layer: "mediation",
    near: ["nono", "openshell", "claude-code"],
    shape:
      "A kernel-enforced sandbox whose job is not to hold the policy but to make the policy layer the only way out. The agent's shell commands, Python, local MCP calls and network requests leave through Strands Shell, Monty, an MCP broker and an egress gateway, all in a trusted process outside the sandbox, all asking one Dogwood engine.",
    adds: [
      "Semantic and temporal rules over one event history: 'git push only if npm test exited 0 since the last git add, within 15 minutes', '60 calls to the AWS MCP server per hour'. A file read through Python can deny a later HTTP request.",
      "Default-deny for every operation the engine checks; a matching forbid beats a permit.",
      "The gateway checks method and path, injects API keys or SigV4 signatures, and the agent never holds the secret. Decisions are written as OTLP records.",
      "Programs the agent launches (git, cargo, a local MCP server) each get their own sandbox and their own file grants, with network through the gateway.",
    ],
    watch: [
      "A bigger trusted base by design: interpreters and protocol interceptors, written in Rust and fuzzed, are now inside the TCB. AWS's own advice for multi-tenant cloud use is to put Box inside a per-session microVM such as AgentCore Runtime.",
      "Direct filesystem grants in box.toml are enforced by the OS and produce no Dogwood decision. A rule only covers files the agent reaches through the interpreters.",
    ],
    sources: [
      {
        label: "Strands Box: The Big Picture",
        href: "https://strandsagents.com/blog/strands-box-the-big-picture/",
      },
      { label: "strands-agents/box", href: "https://github.com/strands-agents/box" },
    ],
  },
  {
    id: "space",
    name: "SPACE",
    maker: "Perplexity",
    origin: "open",
    status: "Apache-2.0 · Rust services, HTTP + SSE API · Kubernetes or direct workers",
    walls: [{ family: "microvm", via: "Firecracker per sandbox" }],
    layer: "lifecycle",
    near: ["hypeman", "microsandbox", "cloudflare"],
    shape:
      "The rented column, self-hosted: templates boot into Firecracker sandboxes with btrfs copy-on-write roots, commands run as sessions whose output streams on a separate data plane with a session-scoped token, and every lifecycle change is an asynchronous operation you poll.",
    adds: [
      "Two kinds of sleep with different promises. Pause keeps VM memory resident on the worker and is not a durable snapshot. Suspend writes memory, runtime state and root filesystem to object storage and releases the VM.",
      "Warm pools of booted sandboxes on Kubernetes, and base snapshots on a single node, so a create skips the cold boot.",
      "An E2B Compatibility Wrapper: the E2B SDK talks to your own fleet, with E2B's pause mapped to SPACE suspend.",
      "Egress as policy: Kubernetes NetworkPolicies confine sandboxes to the public internet and cluster DNS, operator profiles add allowances per tenant, and the gateway can intercept TLS with named exemptions.",
    ],
    watch: [
      "You run the fleet. Host-side services hold the privileges to create VMs, storage and networks, so the control plane is now your attack surface, and the workers need /dev/kvm.",
      "Snapshots, checkpoint and rollback are incubating and answer as if they do not exist unless enabled for your organisation.",
    ],
    sources: [
      { label: "perplexityai/SPACE", href: "https://github.com/perplexityai/SPACE" },
      {
        label: "SPACE architecture",
        href: "https://github.com/perplexityai/SPACE/blob/main/docs/architecture.md",
      },
    ],
  },
];

const RENTED: { id: RentedId; name: string }[] = [
  { id: "cloudflare", name: "Cloudflare" },
  { id: "vercel", name: "Vercel" },
  { id: "e2b", name: "E2B" },
  { id: "modal", name: "Modal" },
  { id: "daytona", name: "Daytona" },
  { id: "archil", name: "Archil" },
];

const NONE = "Not documented";

/** The rented sandboxes on one table: where you call them from, the machine, its state, its network. */
const ROWS: { group: string; label: string; values: Record<RentedId, string> }[] = [
  {
    group: "Operating environment",
    label: "You call it from",
    values: {
      cloudflare:
        "A Worker: a Durable Object starts the Container, a Worker loader starts a Dynamic Worker",
      vercel: "Anywhere: JS or Python SDK, sandbox CLI",
      e2b: "Anywhere: Python or JS SDK",
      modal: "Python, JS or Go SDK, often from a Modal Function",
      daytona: "Five SDKs, REST, CLI, dashboard",
      archil: "TypeScript or Python SDK, REST, AI SDK / Mastra / LangChain tools",
    },
  },
  {
    group: "Operating environment",
    label: "Identity",
    values: {
      cloudflare: "Worker bindings; no API key reaches the sandbox path",
      vercel: "Project OIDC token (automatic on Vercel), or an access token",
      e2b: "API key",
      modal: "Modal token",
      daytona: "API key",
      archil: "API key",
    },
  },
  {
    group: "Operating environment",
    label: "Runs where",
    values: {
      cloudflare: "Cloudflare's network, placed by the Durable Object scheduler (public beta)",
      vercel:
        "Any Vercel region, default iad1; failover regions; static IPs and VPC peering via Secure Compute",
      e2b: "E2B's cloud; the infrastructure is open source",
      modal: "Modal's cloud",
      daytona: "Shared, dedicated or custom regions; shared GPUs pooled in one 'earth' region",
      archil: "AWS us-east-1, us-west-2, eu-west-1; BYOC on any cloud or bare metal",
    },
  },
  {
    group: "Machine",
    label: "Wall",
    values: {
      cloudflare: "Firecracker microVM per Container; V8 isolate per Dynamic Worker",
      vercel: "Firecracker microVM",
      e2b: "Firecracker VM",
      modal: "gVisor by default; VM runtime with its own kernel",
      daytona: "Container by default; Linux VM and Windows classes; macOS hardware",
      archil: "Firecracker microVM on KVM",
    },
  },
  {
    group: "Machine",
    label: "Guest",
    values: {
      cloudflare: "Your linux/amd64 image; or JS, Python, Wasm in an isolate",
      vercel:
        "Ubuntu-based image with Node, Python 3.14, claude, codex, opencode; or any OCI Linux image",
      e2b: "Templates built from a Dockerfile-like spec; Desktop (Xfce) template",
      modal: "Any image built in code",
      daytona: "Any tagged image or snapshot; Windows and macOS classes",
      archil: "Any x86-64 OCI image, default node:24-bookworm, runs as root",
    },
  },
  {
    group: "Machine",
    label: "Size",
    values: {
      cloudflare: "Up to 4 vCPU, 12 GiB, 20 GB per instance",
      vercel: "Up to 4 / 8 / 32 vCPU (Hobby / Pro / Enterprise), 2 GB RAM per vCPU",
      e2b: "Set per template",
      modal: "cpu and memory per sandbox; bursts above the request",
      daytona: "1 vCPU, 1 GB, 3 GiB default; 4 vCPU, 8 GB, 10 GB org max",
      archil: "1–32 vCPU, 0.25–64 GiB",
    },
  },
  {
    group: "Machine",
    label: "Docker and GPU",
    values: {
      cloudflare: `Rootless Docker-in-Docker was documented for SDK 0.x; GPU ${NONE.toLowerCase()}`,
      vercel: `Docker and FUSE supported; GPU ${NONE.toLowerCase()}`,
      e2b: `Docker template documented; GPU ${NONE.toLowerCase()}`,
      modal: "Docker on the VM runtime only; GPUs on gVisor only",
      daytona:
        "GPU class: up to 8 of H100 to B300, RTX 4090/5090, MI355X; nested KVM in Linux VMs on request",
      archil: "Docker and Compose inside the VM; no nested virt; no GPU documented",
    },
  },
  {
    group: "State",
    label: "Session limit",
    values: {
      cloudflare: "While the Durable Object is active, then setInactivityTimeout() up to 6 h",
      vercel: "5 min default; 45 min (Hobby) or 24 h (Pro) per session, reset on resume",
      e2b: "5 min default; 1 h (Hobby) or 24 h (Pro) continuous, reset on pause",
      modal: "5 min default, up to 24 h, plus idle_timeout",
      daytona: "Auto-stop after 15 idle min by default; can run indefinitely",
      archil: "24 h per session, then it pauses; idle pause after 30 min",
    },
  },
  {
    group: "State",
    label: "Stop keeps",
    values: {
      cloudflare: "Nothing: disk and processes end with the instance",
      vercel: "Filesystem, by default (snapshot on stop)",
      e2b: "Kill ends it; onTimeout: 'pause' keeps it",
      modal: "Nothing unless snapshotted; Volumes persist",
      daytona: "Filesystem; memory is lost",
      archil: "Root disk, always: it is an Archil disk",
    },
  },
  {
    group: "State",
    label: "Memory pause and fork",
    values: {
      cloudflare: "No pause",
      vercel: "No memory pause; many sandboxes from one snapshot",
      e2b: "Pause with memory, kept indefinitely; fork; auto-resume on request",
      modal: "Experimental memory snapshots that end the sandbox",
      daytona: "VM classes only: pause, and fork with memory into a fork tree",
      archil: "Pause with memory to storage; fork in ~50 ms",
    },
  },
  {
    group: "State",
    label: "Snapshots",
    values: {
      cloudflare: "snapshotContainer(): root filesystem, 30 days, stored by you",
      vercel: "Filesystem, 30 days from last use, or forever; Drives",
      e2b: "Snapshots and filesystem-only snapshots",
      modal: "Filesystem and directory 30 days; memory 7 days",
      daytona: "Snapshot from a VM sandbox; archive a stopped container",
      archil: "Disk checkpoints and branches",
    },
  },
  {
    group: "Network",
    label: "Egress default",
    values: {
      cloudflare:
        "Off for a sandbox Container; a Dynamic Worker inherits the Worker's unless globalOutbound: null",
      vercel: "Whatever networkPolicy you set: allow-all, deny-all or rules",
      e2b: "On; allowInternetAccess: false turns it off",
      modal: "On; block_network=True turns it off",
      daytona: "Restricted org-wide on lower tiers; full on higher tiers",
      archil: "Deny, except a managed allowlist (Developer plan)",
    },
  },
  {
    group: "Network",
    label: "Egress rules",
    values: {
      cloudflare:
        "allowedHosts, deniedHosts, per-host handlers, changeable live; ports 80/443 only",
      vercel: "Per-domain rules with wildcards, changeable live; forward a host to your proxy",
      e2b: "allowOut / denyOut: domains by Host and SNI on 80/443, CIDR elsewhere",
      modal: "CIDR and domain allowlists, sidecar proxy",
      daytona: "CIDR allowlist, domain allowlist or block-all, changeable live",
      archil: "Domain and CIDR firewall from default deny (Team and up)",
    },
  },
  {
    group: "Network",
    label: "Credentials",
    values: {
      cloudflare: "Added by a handler in your Worker after the request leaves",
      vercel: "Header transform injects the secret on egress",
      e2b: "Egress proxy fills headers from stored secrets",
      modal: `Env vars you pass; egress injection ${NONE.toLowerCase()}`,
      daytona: `Secrets as env vars; egress injection ${NONE.toLowerCase()}`,
      archil: "Egress proxy brokers API keys (Team and up)",
    },
  },
  {
    group: "Network",
    label: "Inbound",
    values: {
      cloudflare: "Only through your Worker; previews belong on their own hostname",
      vercel: "Up to 15 ports on sandbox URLs",
      e2b: "Public URL per port; public traffic can be restricted at create",
      modal: "Encrypted ports, inbound CIDR allowlist, connect tokens",
      daytona: "Preview URLs per port",
      archil: "Public exposed ports, or private ones behind port tokens",
    },
  },
];

const WALL_NAME: Record<Wall, string> = {
  ...(Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])) as Record<Family, string>),
  gvisor: "gVisor (off-axis)",
  isolate: "V8 isolate (off-axis)",
};

const WALL_TONE: Record<Wall, "shared" | "micro" | "warn"> = {
  process: "shared",
  container: "shared",
  system: "shared",
  isolate: "warn",
  gvisor: "warn",
  microvm: "micro",
  vm: "micro",
};

const AXIS: Wall[] = ["process", "container", "system", "isolate", "gvisor", "microvm", "vm"];

const RENTED_TAKEAWAYS = [
  {
    title: "Where you call it from is the operating environment",
    body: "Cloudflare's sandbox exists only behind a Worker: no API key, no public endpoint, and the Worker is the sole door in and out. Vercel ties a sandbox to a project's OIDC identity and regions; Modal's natural caller is a Modal Function. E2B, Daytona and Archil are APIs you call from anywhere with a key. That choice decides where the credential lives before any egress rule does.",
  },
  {
    title: "Credentials moved to the egress side, for four of six",
    body: "Cloudflare's handlers, Vercel's header transforms, E2B's Secret.fill and Archil's broker all add the key after the request leaves the VM, so code inside never holds it. Modal and Daytona give you allowlists but no documented injection, so a key you pass is a key the agent can read. All of them decide on a hostname: Cloudflare sees only ports 80 and 443, E2B reads Host and SNI, and an allowed host is still a way out.",
  },
  {
    title: "The kernel line is a class, and the features pick it",
    body: "Cloudflare offers a microVM or an isolate, Modal gVisor or a VM, Daytona a container or a VM. The features you ask for choose for you: memory pause and fork are VM-only on Daytona, GPUs gVisor-only and Docker VM-only on Modal, Linux at all means a Container on Cloudflare. Ask which class a given sandbox got, not which vendor.",
  },
  {
    title: "State is where they compete",
    body: "Every wall here is a hypervisor or close to one. What differs is what comes back: nothing on Cloudflare without a snapshot, the filesystem on Vercel by default, memory on E2B and Archil and Daytona's VMs, an experiment on Modal. Archil also pulls the work loose from the compute, with a disk that mounts in four of the other five.",
  },
];

const OPEN_TAKEAWAY = {
  title: "Policy climbs above the wall",
  body: "Marc Brooker's case for Box is a claim about altitude. A VMM sees TLS ciphertext and block offsets, which is perfect for blunt rules (all traffic to this gateway) and useless for 'only push tested code'. Syscalls see open and connect. Only an interpreter, a broker or a proxy sees git push or an MCP tool call. So Box uses the kernel sandbox as a funnel and recommends a microVM under it for tenants: two layers, each doing what it can see. SPACE is the other half of that pairing, the rented column's microVM fleet run on your own hardware.",
};

function EntryCard({ e }: { e: Entry }) {
  const layer = LAYERS.find((l) => l.id === e.layer)!;
  return (
    <article
      id={`landscape-${e.id}`}
      className="scroll-mt-28 rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-medium tracking-tight">{e.name}</h3>
        <Badge tone={e.origin === "open" ? "ok" : "default"}>
          {e.origin === "open" ? "Open source" : "Rented"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-subtle">
        {e.maker} · {e.status}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-fg">{e.shape}</p>

      <p className="mt-5 font-mono text-[11px] tracking-wide text-subtle uppercase">
        Moves layer {layer.n} · {layer.name}
      </p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
        {e.adds.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <p className="mt-5 font-mono text-[11px] tracking-wide text-subtle uppercase">Watch for</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
        {e.watch.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="font-mono text-[11px] tracking-wide text-subtle uppercase">
          {e.system ? "Full row" : "Nearest here"}
        </span>
        {(e.system ? [e.system, ...e.near] : e.near).map((id) => (
          <a
            key={id}
            href={`#system-${id}`}
            className="inline-flex h-8 items-center rounded-full bg-surface px-3 text-sm text-fg hover:bg-bg"
          >
            {systemById(id).name}
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-subtle">
        {e.sources.map((s, i) => (
          <span key={s.href}>
            {i ? " · " : ""}
            <a href={s.href} className="hover:text-fg">
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </article>
  );
}

function Takeaway({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <article className="rounded-xl bg-surface p-5 md:p-6">
      <p className="font-mono text-[11px] text-subtle tabular-nums">0{n}</p>
      <h3 className="mt-3 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </article>
  );
}

function RentedTable() {
  const [left, setLeft] = useState<RentedId>("cloudflare");
  const [right, setRight] = useState<RentedId>("vercel");
  const groups = [...new Set(ROWS.map((r) => r.group))];

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-xl shadow-[var(--shadow-border)] md:block">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="sticky left-0 w-40 bg-bg-elevated px-4 py-3" />
              {RENTED.map((v) => (
                <th key={v.id} className="px-4 py-3 text-left font-medium text-fg">
                  <a href={`#landscape-${v.id}`} className="hover:underline">
                    {v.name}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g}>
              <tr className="border-t border-border-strong bg-bg-elevated">
                <th
                  colSpan={RENTED.length + 1}
                  className="px-4 py-2 text-left font-mono text-[11px] font-normal tracking-wide text-subtle uppercase"
                >
                  {g}
                </th>
              </tr>
              {ROWS.filter((r) => r.group === g).map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th className="sticky left-0 bg-bg px-4 py-3 text-left align-top font-normal text-muted">
                    {row.label}
                  </th>
                  {RENTED.map((v) => (
                    <td
                      key={v.id}
                      className={cn(
                        "px-4 py-3 align-top leading-snug",
                        row.values[v.id].includes(NONE.toLowerCase()) || row.values[v.id] === NONE
                          ? "text-muted"
                          : "text-fg",
                      )}
                    >
                      {row.values[v.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Left", left, setLeft],
              ["Right", right, setRight],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="text-xs text-subtle">
              {label}
              <select
                className="mt-1 h-11 w-full rounded-md bg-surface px-3 text-sm text-fg"
                value={value}
                onChange={(ev) => set(ev.target.value as RentedId)}
              >
                {RENTED.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-bg-elevated shadow-[var(--shadow-border)]">
          {ROWS.map((row) => (
            <li key={row.label} className="px-4 py-3">
              <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">
                {row.group} · {row.label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm leading-snug">
                <p className="text-fg">{row.values[left]}</p>
                <p className="text-fg">{row.values[right]}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Landscape() {
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const onAxis = ENTRIES.filter((e) => origin === "all" || e.origin === origin);
  const rented = ENTRIES.filter((e) => e.origin === "rented");
  const open = ENTRIES.filter((e) => e.origin === "open");

  return (
    <div className="space-y-12">
      <div className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">
            Where each wall sits
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All eight"],
                ["rented", "Rented"],
                ["open", "Open source"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={origin === id}
                onClick={() => setOrigin(id)}
                className={cn(
                  "h-9 rounded-full px-3 font-mono text-[11px] tracking-wide uppercase transition-colors duration-150",
                  origin === id
                    ? "bg-accent text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {AXIS.map((w) => {
            const here = onAxis.flatMap((e) =>
              e.walls.filter((x) => x.family === w).map((x) => ({ e, via: x.via })),
            );
            return (
              <li key={w} className="rounded-lg bg-surface p-3">
                <Badge tone={WALL_TONE[w]}>{WALL_NAME[w]}</Badge>
                <ul className="mt-3 space-y-2">
                  {here.length ? (
                    here.map(({ e, via }) => (
                      <li key={e.id + via} className="text-sm leading-snug">
                        <a
                          href={`#landscape-${e.id}`}
                          className="font-medium text-fg hover:underline"
                        >
                          {e.name}
                        </a>
                        <span className="block text-xs text-muted">{via}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-subtle">None of these</li>
                  )}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">
            Rented · six fleets
          </p>
          <h3 className="mt-2 max-w-3xl text-xl font-medium tracking-tight">
            Same question, six operating environments: what do you call, what boots, what survives,
            what leaves.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Each cell is what the vendor's current docs say. "Not documented" means the docs read
            did not say, not that the feature is missing.
          </p>
        </div>
        <RentedTable />
        <div className="grid gap-3 lg:grid-cols-2">
          {rented.map((e) => (
            <EntryCard key={e.id} e={e} />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {RENTED_TAKEAWAYS.map((t, i) => (
            <Takeaway key={t.title} n={i + 1} {...t} />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">
            New in open source · two
          </p>
          <h3 className="mt-2 max-w-3xl text-xl font-medium tracking-tight">
            A policy engine above a kernel fence, and the rented column you can run yourself.
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {open.map((e) => (
            <EntryCard key={e.id} e={e} />
          ))}
        </div>
        <Takeaway n={RENTED_TAKEAWAYS.length + 1} {...OPEN_TAKEAWAY} />
      </div>
    </div>
  );
}
