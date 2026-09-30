import { useMemo, useState } from "react";
import { SYSTEMS, kernelLabel, type SystemId } from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Job = "wrap" | "embed" | "browser" | "pair" | "machine" | "mac" | "windows" | "desktop" | "gpu";
type Threat = "accident" | "hostile" | "tenant";
type DockerNeed = "yes" | "no";
type Where = "laptop" | "cloud" | "embed";

const JOBS: { id: Job; label: string; hint: string }[] = [
  { id: "wrap", label: "Wrap a coding CLI", hint: "Claude, Codex, Gemini, Copilot, YOLO" },
  { id: "machine", label: "Agent needs a full Linux machine", hint: "apt, systemd, sudo, nested Docker" },
  { id: "embed", label: "Execute untrusted code", hint: "Your product runs model-written programs" },
  { id: "browser", label: "Browser agents at scale", hint: "Cloud Chromium, snapshots, tenants" },
  { id: "pair", label: "Interactive pair-programming", hint: "Stay in the repo, don't wrap anything" },
  { id: "mac", label: "Agent needs macOS", hint: "Xcode, codesign, Simulator, Safari" },
  { id: "windows", label: "Agent needs Windows", hint: "MSVC, kernel debugging, a Windows desktop" },
  { id: "desktop", label: "Computer-use agent", hint: "A Linux desktop: screenshots, clicks, a browser" },
  { id: "gpu", label: "GPU or heavy compute", hint: "Local models, simulators, big builds" },
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
  if (job === "desktop") {
    if (threat !== "accident" || where !== "laptop") {
      return {
        winner: "hypeman",
        also: ["cua-sandbox", "microsandbox", "discobox"],
        why: "A hostile page or a fleet of desktops wants a wall per session and fast restore. hypeman runs a VM per browser with snapshots and ingress; microsandbox is the embeddable sibling; Cua Sandbox is the rented version with a computer-use API. The wall is the smaller half of the job: also plan an egress allowlist, a fresh profile with no signed-in accounts, a human gate on consequential actions, and keeping the agent loop outside the box. Hosted desktops (E2B Desktop, Cua Fleets) sell the same shape if you would rather not run it.",
      };
    }
    return {
      winner: "discobox",
      also: ["cua-sandbox", "incus", "hypeman"],
      why: "On a laptop the useful parts are the desktop, the viewer and the audit trail. discobox ships an Xfce desktop and Chromium over noVNC in every box, a per-box proxy with audited requests, and credentials as sentinels. Its wall is its pool host, and on Linux by default that is your own Docker daemon, so keep sensitive logins off the machine and allowlist egress. Cua Sandbox is the computer-use-first alternative: a screenshot, click and type API over a Docker container, a QEMU VM or a Lume macOS guest. Anthropic's own computer-use demo is the same shape as discobox's: a container with X, VNC and Firefox.",
    };
  }
  if (job === "gpu") {
    if (where === "cloud") {
      return {
        winner: "openshell",
        also: ["hypeman", "incus"],
        why: "You are scheduling accelerators for other people. OpenShell takes GPUs through CDI on Docker and Podman, as a Kubernetes resource limit, or as one VFIO device on its VM driver, under one policy. Its default drivers share the host kernel, so use Kata or the VM driver for hostile tenants.",
      };
    }
    if (threat !== "accident") {
      return {
        winner: "hypeman",
        also: ["openshell", "incus"],
        why: "A kernel wall around a GPU means a VMM that does VFIO passthrough. Firecracker and qemu-microvm cannot pass PCI, and hypeman's macOS backend refuses VFIO, so pick QEMU or Cloud Hypervisor on Linux. VFIO hands a whole GPU to one VM, so expect a density cost; NVIDIA vGPU slices a card across VMs, and wants QEMU.",
      };
    }
    return {
      winner: "yolobox",
      also: ["incus", "docker-sbx"],
      why: "For accidents, a container with the GPU passed in is the light path: yolobox passes host device nodes with --gpus. It shares the host kernel and driver stack. Incus has a gpu device for containers and VMs. sbx's GPU support is experimental VFIO, x86_64 Linux and NVIDIA only, whole card, feature-flagged, so it is not the laptop answer.",
    };
  }
  if (job === "mac") {
    const dockerNote =
      docker === "yes"
        ? " A macOS guest cannot host a VM on any chip, so Docker cannot run inside the workspace — run a Linux VM as a sibling on the host and reach it over the network."
        : "";
    const fleetNote =
      where === "cloud"
        ? " There is no fleet answer here: Apple caps concurrent macOS guests at two per host, so this stays a workstation."
        : "";
    if (threat === "accident") {
      return {
        winner: "ghostvm",
        also: ["lume", "utm", "agent-sandbox-vm"],
        why:
          "No Linux box runs Xcode. GhostVM gives each agent a whole macOS on Virtualization.framework, with clipboard, ports and file transfer each behind a prompt. Lume is the headless, scriptable one — IPSW in, SSH out, OCI images, a REST API — and what Cua's computer-use sandboxes sit on. UTM is the free general-purpose route to the same guest with fewer conveniences." +
          dockerNote +
          fleetNote,
      };
    }
    return {
      winner: "agent-sandbox-vm",
      also: ["ghostvm", "lume", "utm"],
      why:
        "Hostile code on a Mac wants the clean-room shape: glslang's vmctl boots a macOS guest on Virtualization.framework with the network isolated by default, restores the base snapshot before each session, and copies artifacts out. GhostVM is the nicer workspace once you accept NAT egress and gated host channels; Lume gives the same clone-a-seed-per-job shape headless over SSH, with the network still open; UTM is the free manual route." +
        dockerNote +
        fleetNote,
    };
  }
  if (job === "windows") {
    return {
      winner: "agent-sandbox-vm",
      also: ["utm"],
      why:
        "MSVC, KDNET and test-signed drivers need a Windows guest, and GhostVM only boots macOS. agent-sandbox-vm is built for this: a Hyper-V Gen 2 VM on a Windows host driven over PowerShell Direct, or Windows 11 ARM64 under Parallels on a Mac — isolated switch by default, checkpoint restore per session, artifacts copied out. UTM gives you a manual Windows guest (ARM64 virtualized, x86 emulated slowly) with no agent plumbing." +
        (docker === "yes"
          ? " Docker Desktop inside a Windows guest needs nested virt: Hyper-V exposes it, Parallels can, Virtualization.framework does not."
          : "") +
        (where === "cloud" ? " This is a workstation answer; a Windows fleet is Hyper-V or a cloud you rent, not this page." : ""),
    };
  }
  if (job === "browser" || (threat === "tenant" && where !== "laptop")) {
    return {
      winner: "hypeman",
      also: job === "browser" ? ["cua-sandbox", "microsandbox"] : ["microsandbox"],
      why: "You need a fleet, not a wrapper. hypeman is the control plane Kernel already runs for isolated browsers — snapshots, ingress, a choice of VMMs. microsandbox is the lighter embeddable sibling if you just need many local VMs. If the agent must drive a whole desktop rather than a Chromium, Cua Sandbox is the computer-use shape: shell, PTY and GUI actions on one machine, from a Docker container up to a Lume macOS guest, locally or from a Fleet pool. If you would rather rent than operate a hypervisor: E2B, Vercel Sandbox and Fly Machines sell Firecracker microVMs, Modal sells gVisor — same unit, someone else's fleet, and the question becomes who holds your secrets.",
    };
  }
  if (where === "cloud" && (job === "embed" || ((job === "wrap" || job === "pair") && threat !== "accident"))) {
    return {
      winner: "cloudflare",
      also: threat === "tenant" ? ["hypeman", "microsandbox"] : ["openshell", "hypeman", "docker-sbx"],
      why: "You want a fleet and you do not want to run a hypervisor. Cloudflare Sandbox is a Firecracker VM per sandbox ID, started from a Worker, with the credential-injecting egress proxy built in — the token stays in the Worker. Rootless Docker-in-Docker is documented for builds. hypeman if you would rather own the control plane, snapshots and GPU; sbx if the 'fleet' is actually one developer's laptop.",
    };
  }
  if (where === "cloud" && (job === "wrap" || job === "pair")) {
    return {
      winner: "openshell",
      also: ["hypeman", "docker-sbx"],
      why: "You are governing a trusted team's agents, so the unit is a policy, not a box. If the code is hostile the wall matters more: Cloudflare Sandbox or hypeman. OpenShell puts one gateway with OIDC roles and per-team workspaces over Kubernetes, Docker or a microVM, keeps credentials on the trusted side, and lets an agent ask for more access that a human or the prover-gated auto-approve grants. Its kernel line is a driver choice: the default drivers share the host kernel, so pick the VM driver or Kata for hostile tenants.",
    };
  }
  if (job === "machine") {
    return {
      winner: "code-on-incus",
      also: threat === "hostile" ? ["incus", "docker-sbx"] : ["incus", "discobox", "yolobox", "docker-sbx"],
      why: "You wanted a laptop, not a process. Incus system containers are that shape: systemd, apt, sudo, nested Docker, CoW clones. code-on-incus packages it — coi shell puts the agent in the box with nftables egress modes and a monitor that pauses on bulk reads and kills on a reverse shell. Plain Incus if you would rather script it yourself, as Pere Villega did. discobox is the other packaged version, aimed at several boxes on one repo with the work coming back as git commits. On a Mac the Linux VM is part of the pick: coi runs on Colima or Lima (MIT) as well as OrbStack, and OrbStack is closed source and free only for personal use, so an all-open-source stack is Incus on Colima with coi. Promote to sbx the moment the threat includes a kernel CVE — Incus LXC still shares the host kernel.",
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
      also: threat === "accident" ? ["discobox", "yolobox"] : ["microsandbox", "openshell"],
      why: "Wrapping a YOLO CLI that must docker build is exactly why sbx exists: dedicated kernel, private daemon, proxy-injected secrets, live project mount. yolobox is the lighter accident fence if you do not need that engine and do not fear a kernel CVE.",
    };
  }
  return {
    winner: "nono",
    also: ["openshell", "yolobox", "claude-code"],
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
          <Badge>{kernelLabel(winner)}</Badge>
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
