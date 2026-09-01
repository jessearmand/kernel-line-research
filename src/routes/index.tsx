import { createFileRoute } from "@tanstack/react-router";
import { ComparisonMatrix } from "@/components/comparison-matrix";
import { HarnessPanel } from "@/components/harness-panel";
import { Hero, Spectrum } from "@/components/hero";
import { MacRuntime } from "@/components/mac-runtime";
import { MicrovmImpact } from "@/components/microvm-impact";
import { Picker } from "@/components/picker";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StackExplorer } from "@/components/stack-explorer";
import { SystemGrid } from "@/components/system-grid";
import { ThreatLab } from "@/components/threat-lab";

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
          title="The same attack, three different walls."
          lede="Click a layer. Then trace a kernel CVE upward from the agent. On a process sandbox or a container the pulse reaches the host kernel. On a microVM it stops at the guest."
        >
          <StackExplorer />
        </Section>
        <Section
          id="systems"
          eyebrow="03 · Six systems"
          title="Two wrappers, two runtimes, two harnesses."
          lede="yolobox and sbx wrap existing CLIs. microsandbox and hypeman are general VM runtimes. Claude Code and Codex sandbox themselves — and they are not the same sandbox."
        >
          <SystemGrid />
        </Section>
        <Section
          id="matrix"
          eyebrow="04 · Matrix"
          title="Architecture, performance, security, harness — side by side."
          lede="Toggle columns. On a phone, pick two. Scores elsewhere in this page are relative, not a benchmark."
        >
          <ComparisonMatrix />
        </Section>
        <Section
          id="threats"
          eyebrow="05 · Threats"
          title="Isolation is a claim until you name the failure."
          lede="A sandbox that survives rm -rf ~ can still lose a kernel CVE, a docker socket, or the repo you mounted. Pick a failure and read the blast radius."
        >
          <ThreatLab />
        </Section>
        <Section
          id="harness"
          eyebrow="06 · Harness"
          title="Who actually runs Claude, Codex, and a browser agent."
          lede="Compatibility is not transitive. A great untrusted-code runtime is a poor YOLO wrapper, and a great YOLO wrapper is a poor multi-tenant control plane."
        >
          <HarnessPanel />
        </Section>
        <Section
          id="mac"
          eyebrow="07 · Mac"
          title="Darwin is not a Linux kernel. Nested virt is the bill for pretending twice."
          lede="Incus containers need Linux, so a Mac first boots a Linux VM — no nested virt. Incus --vm needs KVM inside that VM, so nested virt, M3+, macOS 15+. Two Apple Containers are two machines on Darwin, not two machines inside a machine — HVF does not live in the Linux guest."
        >
          <MacRuntime />
        </Section>
        <Section
          id="microvm"
          eyebrow="08 · The kernel line"
          title="Impact of a MicroVM — and of refusing one."
          lede="Hardware virtualization changes which bugs can reach you. It does not change which files you chose to share, and it is heavier than a Seatbelt profile. Use it when the unit of trust is a machine, not a process."
        >
          <MicrovmImpact />
        </Section>
        <Section
          id="pick"
          eyebrow="09 · Pick"
          title="Tell it the job. It will not recommend a hypervisor for ls."
        >
          <Picker />
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
