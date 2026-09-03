import { useMemo, useState } from "react";
import { SYSTEMS, type SystemId } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Job = "wrap" | "embed" | "browser" | "pair" | "machine" | "mac";
type Threat = "accident" | "hostile" | "tenant";
type DockerNeed = "yes" | "no";
type Where = "laptop" | "cloud" | "embed";

const JOBS: { id: Job; label: string; hint: string }[] = [
  { id: "wrap", label: "Wrap a coding CLI", hint: "Claude, Codex, Gemini, Copilot, YOLO" },
  { id: "machine", label: "Agent needs a full Linux machine", hint: "apt, systemd, sudo, nested Docker" },
  { id: "embed", label: "Execute untrusted code", hint: "Your product runs model-written programs" },
  { id: "browser", label: "Browser agents at scale", hint: "Cloud Chromium, snapshots, tenants" },
  { id: "pair", label: "Interactive pair-programming", hint: "Stay in the repo, don't wrap anything" },
  { id: "mac", label: "Agent needs macOS or Windows", hint: "Xcode, codesign, MSVC, a real desktop" },
];

const THREATS: { id: Threat; label: string; hint: string }[] = [
  { id: "accident", label: "Accidents", hint: "rm, leaking ~/.ssh, a bad compose down" },
  { id: "hostile", label: "Hostile code", hint: "Prompt injection, untrusted tool output" },
  { id: "tenant", label: "Hostile tenants", hint: "Someone else's agent on your host" },
];

function recommend(job: Job, threat: Threat, docker: DockerNeed, where: Where): {
  winner: SystemId;
  also: SystemId[];
  why: string;
} {
  if (job === "mac") {
    return {
      winner: "ghostvm",
      also: threat === "accident" ? ["utm", "agent-sandbox-vm"] : ["agent-sandbox-vm", "utm"],
      why: "No Linux box runs Xcode. GhostVM gives each agent a whole macOS on Virtualization.framework, with clipboard, ports and file transfer each behind a prompt. UTM is the free general-purpose route to the same guest — and the route to a Windows or x86 guest. agent-sandbox-vm is the scripted clean room for MSVC builds: isolated switch by default, checkpoint restore per session, artifacts copied out. Apple caps you at two macOS guests, so this is a workstation answer, not a fleet.",
    };
  }
  if (job === "browser" || (threat === "tenant" && where !== "laptop")) {
    return {
      winner: "hypeman",
      also: ["microsandbox"],
      why: "You need a fleet, not a wrapper. hypeman is the control plane Kernel already runs for isolated browsers — snapshots, ingress, a choice of VMMs. microsandbox is the lighter embeddable sibling if you just need many local VMs. If you would rather rent than operate a hypervisor: E2B, Vercel Sandbox and Fly Machines sell Firecracker microVMs, Modal sells gVisor — same unit, someone else's fleet, and the question becomes who holds your secrets.",
    };
  }
  if (where === "cloud" && (job === "wrap" || job === "embed")) {
    return {
      winner: "cloudflare",
      also: threat === "tenant" ? ["hypeman", "microsandbox"] : ["hypeman", "docker-sbx"],
      why: "You want a fleet and you do not want to run a hypervisor. Cloudflare Sandbox is a Firecracker VM per sandbox ID, started from a Worker, with the credential-injecting egress proxy built in — the token stays in the Worker. Rootless Docker-in-Docker is documented for builds. hypeman if you would rather own the control plane, snapshots and GPU; sbx if the 'fleet' is actually one developer's laptop.",
    };
  }
  if (job === "machine") {
    return {
      winner: "incus",
      also: threat === "hostile" ? ["docker-sbx"] : ["yolobox", "docker-sbx"],
      why: "You wanted a laptop, not a process. Incus system containers are that shape: systemd, apt, sudo, nested Docker, CoW clones. Pere Villega's Sandbox for Claude is the worked example. Promote to sbx the moment the threat includes a kernel CVE — Incus LXC still shares the host kernel.",
    };
  }
  if (job === "embed") {
    return {
      winner: "microsandbox",
      also: ["hypeman"],
      why: "An SDK that boots a libkrun microVM as a child process is the shape of 'my agent has a sandbox tool'. hypeman if you outgrow the library and want a server, restore, and GPU. A hosted sandbox API — Cloudflare Sandbox, E2B, Vercel Sandbox, Modal — is the same tool with no hypervisor to run; pick it when your product is not on a machine that has /dev/kvm, and pick Cloudflare when the product is already a Worker.",
    };
  }
  if (job === "pair") {
    if (threat === "hostile") {
      return {
        winner: "codex",
        also: ["claude-code", "docker-sbx"],
        why: "Stay in the harness. Codex is default-on, network-off, kernel-enforced, and its approval layer can route escalations to a reviewer agent instead of you. Claude Code is faster to live with (allowlist proxy, richer hooks) and weaker on egress. nono if you want the same kernel fence around whichever CLI, with a tighter box per tool. Put any of them inside sbx if the threat includes a kernel bug or docker.sock.",
      };
    }
    return {
      winner: "claude-code",
      also: ["nono", "codex"],
      why: "You wanted low friction on a trusted machine. Claude's bash sandbox plus permission hooks is the least architecture you can run. nono if you want the fence around the whole CLI and each tool, not just bash. Switch Codex on if you want deny-by-default network without thinking about it.",
    };
  }
  // wrap
  if (docker === "yes" || threat !== "accident") {
    return {
      winner: "docker-sbx",
      also: threat === "accident" ? ["yolobox"] : ["microsandbox"],
      why: "Wrapping a YOLO CLI that must docker build is exactly why sbx exists: dedicated kernel, private daemon, proxy-injected secrets, live project mount. yolobox is the lighter accident fence if you do not need that engine and do not fear a kernel CVE.",
    };
  }
  return {
    winner: "nono",
    also: ["yolobox", "claude-code"],
    why: "You want YOLO on a laptop, no nested Docker, defending against carelessness. nono wraps whichever CLI in Landlock/Seatbelt with a tighter box per tool and phantom secrets — zero image, zero VM. yolobox if you also need to hide $HOME behind a container rootfs. Promote to sbx or Incus the moment the agent needs a machine or an engine.",
  };
}

function Chip<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; hint: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-4 py-3 text-left transition-colors duration-150",
            value === o.id ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-bg-elevated",
          )}
        >
          <span className="block text-sm font-medium">{o.label}</span>
          <span className={cn("mt-1 block text-xs", value === o.id ? "text-accent-fg/70" : "text-muted")}>
            {o.hint}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Picker() {
  const [job, setJob] = useState<Job>("wrap");
  const [threat, setThreat] = useState<Threat>("accident");
  const [docker, setDocker] = useState<DockerNeed>("yes");
  const [where, setWhere] = useState<Where>("laptop");
  const result = useMemo(
    () => recommend(job, threat, docker, where),
    [job, threat, docker, where],
  );
  const winner = SYSTEMS.find((s) => s.id === result.winner)!;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-8">
        <fieldset>
          <legend className="mb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            What are you doing
          </legend>
          <Chip options={JOBS} value={job} onChange={setJob} />
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            What are you defending against
          </legend>
          <Chip options={THREATS} value={threat} onChange={setThreat} />
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            Nested docker build
          </legend>
          <Chip
            options={[
              { id: "yes", label: "Required", hint: "compose, images, a real engine" },
              { id: "no", label: "Not required", hint: "Language tooling is enough" },
            ]}
            value={docker}
            onChange={setDocker}
          />
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-mono text-[11px] tracking-wide text-subtle uppercase">
            Where it runs
          </legend>
          <Chip
            options={[
              { id: "laptop", label: "Developer laptop", hint: "One human, one checkout" },
              { id: "embed", label: "Inside a product", hint: "Library / child process" },
              { id: "cloud", label: "A fleet", hint: "Many tenants, restore, ingress" },
            ]}
            value={where}
            onChange={setWhere}
          />
        </fieldset>
      </div>
      <aside className="h-fit rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6">
        <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Start here</p>
        <h3 className="mt-2 text-2xl font-medium tracking-tight">{winner.name}</h3>
        <p className="mt-1 text-sm text-muted">{winner.short}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={winner.family === "microvm" || winner.family === "vm" ? "micro" : winner.family === "container" ? "warn" : winner.family === "system" ? "ok" : "shared"}>
            {winner.family}
          </Badge>
          <Badge>{winner.kernel} kernel</Badge>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-fg">{result.why}</p>
        {result.also.length ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">Also consider</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {result.also.map((id) => {
                const s = SYSTEMS.find((x) => x.id === id)!;
                return (
                  <li key={id}>
                    <a href={`#system-${id}`} className="text-fg hover:underline">
                      {s.name}
                    </a>
                    <span className="text-subtle"> — {s.short}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
