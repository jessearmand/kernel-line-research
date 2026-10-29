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

type Entry = {
  id: string;
  name: string;
  maker: string;
  origin: Origin;
  status: string;
  /** Where its wall sits on the five-family axis; "gvisor" is the off-axis user-space kernel. */
  walls: { family: Family | "gvisor"; via: string }[];
  /** The layer this entry moves furthest; the reason it is on the page. */
  layer: LayerId;
  near: SystemId[];
  shape: string;
  adds: string[];
  watch: string[];
  sources: { label: string; href: string }[];
};

const ENTRIES: Entry[] = [
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
      "A self-hosted sandbox platform, the shape you otherwise rent from E2B: templates boot into Firecracker sandboxes with btrfs copy-on-write roots, commands run as sessions whose output streams on a separate data plane with a session-scoped token, and every lifecycle change is an asynchronous operation you poll.",
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
  {
    id: "daytona",
    name: "Daytona",
    maker: "Daytona",
    origin: "rented",
    status: "Hosted · SDKs in Python, TypeScript, Ruby, Go, Java",
    walls: [
      { family: "container", via: "default class" },
      { family: "microvm", via: "Linux VM class" },
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
      "Linked sandboxes: ephemeral children on the parent's runner, joined on a private link network with DNS by sandbox name.",
    ],
    watch: [
      "The overview promises each sandbox a dedicated kernel and in the next sentence makes Linux containers the default. Ask which class you are on before you read the wall.",
      "Spot GPU sandboxes can be evicted with no warning and no webhook.",
    ],
    sources: [{ label: "Daytona: Sandboxes", href: "https://www.daytona.io/docs/en/sandboxes.md" }],
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
      "Nested virtualization is an experimental option on VM sandboxes, Enterprise plan only.",
    ],
    sources: [
      { label: "Modal guide", href: "https://modal.com/docs/guide" },
      { label: "Coding agent with Modal Sandboxes", href: "https://modal.com/docs/examples/agent" },
      { label: "Sandbox networking", href: "https://modal.com/docs/guide/sandbox-networking" },
    ],
  },
  {
    id: "archil",
    name: "Archil",
    maker: "Archil",
    origin: "rented",
    status: "Hosted, or BYOC on any cloud or bare metal · disks in AWS and GCP regions",
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
];

const ORIGINS: { id: Origin | "all"; label: string; hint: string }[] = [
  { id: "all", label: "All five", hint: "Placed on one axis" },
  { id: "open", label: "New in open source", hint: "Strands Box, SPACE" },
  { id: "rented", label: "Rented, longer running", hint: "Daytona, Modal, Archil" },
];

const WALL_NAME: Record<Family | "gvisor", string> = {
  ...(Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])) as Record<Family, string>),
  gvisor: "gVisor (off-axis)",
};

const WALL_TONE: Record<Family | "gvisor", "shared" | "micro" | "warn"> = {
  process: "shared",
  container: "shared",
  system: "shared",
  microvm: "micro",
  vm: "micro",
  gvisor: "warn",
};

const AXIS: (Family | "gvisor")[] = ["process", "container", "system", "gvisor", "microvm", "vm"];

const TAKEAWAYS = [
  {
    title: "Policy climbs above the wall",
    body: "Marc Brooker's case for Box is a claim about altitude. A VMM sees TLS ciphertext and block offsets, which is perfect for blunt rules (all traffic to this gateway) and useless for 'only push tested code'. Syscalls see open and connect. Only an interpreter, a broker or a proxy sees git push or an MCP tool call. So Box uses the kernel sandbox as a funnel and recommends a microVM under it for tenants: two layers, each doing what it can see. OpenShell makes the same split.",
  },
  {
    title: "Rented fleets sell the kernel line as a class",
    body: "Daytona's container and VM classes and Modal's gVisor and VM runtimes put two rows of this page behind one API. The features decide the row: memory pause and fork are VM-only on Daytona, GPUs are gVisor-only and Docker is VM-only on Modal. The old buyer question, which primitive did I rent, is now asked per sandbox, not per vendor.",
  },
  {
    title: "State is where they compete",
    body: "Every entry here has a wall. What differs is the lifecycle: SPACE's pause versus suspend, Daytona's fork trees, Modal's memory snapshots, Archil's disk that outlives the VM. Archil and SPACE also pull the work layer loose from the compute layer, one with a disk that mounts in other vendors' sandboxes and one with an E2B-compatible API on your own fleet.",
  },
];

export function Landscape() {
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const shown = ENTRIES.filter((e) => origin === "all" || e.origin === origin);

  return (
    <div className="space-y-8">
      <div className="grid gap-2 sm:grid-cols-3">
        {ORIGINS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={o.id === origin}
            onClick={() => setOrigin(o.id)}
            className={cn(
              "rounded-lg px-4 py-3 text-left transition-colors duration-150",
              o.id === origin
                ? "bg-accent text-accent-fg"
                : "bg-surface text-fg hover:bg-bg-elevated",
            )}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            <span
              className={cn(
                "mt-1 block text-xs",
                o.id === origin ? "text-accent-fg/70" : "text-muted",
              )}
            >
              {o.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">
          Where each wall sits
        </p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {AXIS.map((w) => {
            const here = shown.flatMap((e) =>
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

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((e) => {
          const layer = LAYERS.find((l) => l.id === e.layer)!;
          return (
            <article
              key={e.id}
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

              <p className="mt-5 font-mono text-[11px] tracking-wide text-subtle uppercase">
                Watch for
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
                {e.watch.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="font-mono text-[11px] tracking-wide text-subtle uppercase">
                  Nearest here
                </span>
                {e.near.map((id) => (
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
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {TAKEAWAYS.map((t, i) => (
          <article key={t.title} className="rounded-xl bg-surface p-5 md:p-6">
            <p className="font-mono text-[11px] text-subtle tabular-nums">0{i + 1}</p>
            <h3 className="mt-3 text-lg font-medium tracking-tight">{t.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
