import { createFileRoute } from "@tanstack/react-router";
import { BeyondKernel } from "@/components/beyond-kernel";
import { ComparisonMatrix } from "@/components/comparison-matrix";
import { HarnessPanel } from "@/components/harness-panel";
import { Hero, Spectrum } from "@/components/hero";
import { LayerStack } from "@/components/layer-stack";
import { MacRuntime } from "@/components/mac-runtime";
import { MicrovmImpact } from "@/components/microvm-impact";
import { Picker } from "@/components/picker";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StackExplorer } from "@/components/stack-explorer";
import { SystemGrid } from "@/components/system-grid";
import { SystemNeed } from "@/components/system-need";
import { ThreatLab } from "@/components/threat-lab";
import { WorkloadLens } from "@/components/workload-lens";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader />
      <main>
        <Hero />
        <Spectrum />
        <Section
          id="stack"
          eyebrow="02 · Stack"
          title="The same attack, four different walls."
          lede="Click a layer. Then trace a kernel CVE upward from the agent. On a process sandbox, an app container, or a system container the pulse reaches the host kernel. On a microVM it stops at the guest."
        >
          <StackExplorer />
        </Section>
        <Section
          id="layers"
          eyebrow="03 · Layers"
          title="The kernel line is one layer of six."
          lede="It decides whether a compromise reaches your host. It does not decide what kind of machine the agent gets, what survives, what it may reach, what comes back, or who can watch. Heavier agents make those the hard part."
        >
          <LayerStack />
        </Section>
        <Section
          id="workloads"
          eyebrow="04 · Workloads"
          title="Heavier work changes which layer breaks first."
          lede="A coding CLI in a repo is the easy case for a wall. A browser, a desktop, a macOS app or a GPU job moves the difficulty to fidelity, state and observation, where a microVM is silent or in the way. Pick a workload."
        >
          <WorkloadLens />
        </Section>
        <Section
          id="systems"
          eyebrow="05 · Ten systems"
          title="Wrappers, harnesses, a machine runtime, two VM runtimes, two control planes."
          lede="nono, yolobox, sbx and discobox wrap existing CLIs. Claude Code and Codex sandbox themselves. Incus is the machine you install an agent into — Pere Villega's Sandbox for Claude is the worked example. microsandbox and hypeman are general VM runtimes. OpenShell is a policy gateway over Docker, Kubernetes or a microVM, and discobox is a box manager over a pool host that is a VM or a Docker daemon depending on your OS."
        >
          <SystemGrid />
        </Section>
        <Section
          id="need"
          eyebrow="06 · System containers"
          title="When the agent needs a Linux machine, not a process."
          lede="App containers (Docker, yolobox) isolate a process. System containers (Incus LXC) isolate a distro that still shares your kernel. Click a job. The Pere Villega setup is the canonical 'I wanted a laptop' case."
        >
          <SystemNeed />
        </Section>
        <Section
          id="matrix"
          eyebrow="07 · Matrix"
          title="Architecture, performance, environment, security, harness — side by side."
          lede="Toggle columns. On a phone, pick two. The Environment group covers what the kernel line does not: GPU, state and restore, guest OS. Scores elsewhere in this page are relative, not a benchmark."
        >
          <ComparisonMatrix />
        </Section>
        <Section
          id="threats"
          eyebrow="08 · Threats"
          title="Isolation is a claim until you name the failure."
          lede="A sandbox that survives rm -rf ~ can still lose a kernel CVE, a docker socket, the repo you mounted, the host's localhost, the next session via a planted git hook, or an authorised push with a real token. Pick a failure and read the blast radius."
        >
          <ThreatLab />
          <BeyondKernel />
        </Section>
        <Section
          id="harness"
          eyebrow="09 · Harness"
          title="Who actually runs Claude, Codex, a browser agent, and a desktop."
          lede="Compatibility is not transitive. A great untrusted-code runtime is a poor YOLO wrapper, and a great YOLO wrapper is a poor multi-tenant control plane."
        >
          <HarnessPanel />
        </Section>
        <Section
          id="mac"
          eyebrow="10 · Mac"
          title="Darwin is not a Linux kernel. Nested virt is the bill for pretending twice."
          lede="Incus containers need Linux, so a Mac first boots a Linux VM — no nested virt. Incus --vm needs KVM inside that VM, so nested virt, M3+, macOS 15+. Two Apple Containers are two machines on Darwin, not two machines inside a machine — HVF does not live in the Linux guest. And a macOS agent is the opposite case: the sandbox is a macOS VM, capped at two running per Mac."
        >
          <MacRuntime />
        </Section>
        <Section
          id="microvm"
          eyebrow="11 · The kernel line"
          title="Inside the kernel line: what a microVM buys, and what it costs."
          lede="Hardware virtualization changes which bugs can reach you. It does not change which files you chose to share, what the agent may reach, or what the machine can be. Use it when the unit of trust is a machine, not a process."
        >
          <MicrovmImpact />
        </Section>
        <Section
          id="pick"
          eyebrow="12 · Pick"
          title="Tell it the job. It will not recommend a hypervisor for ls."
        >
          <Picker />
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
