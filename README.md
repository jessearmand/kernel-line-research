# Kernel Line

Interactive comparison of AI agent sandbox architectures: [yolobox](https://yolobox.dev), Docker sbx, microsandbox, Kernel hypeman, Claude Code, Codex, [nono](https://nono.sh), Incus, NVIDIA [OpenShell](https://github.com/NVIDIA/OpenShell), and [discobox](https://github.com/discobox-ai/discobox) — plus Mac runtimes (nested virt, Apple Container).

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (port 8080 in this workspace).

## What it covers

- Isolation stack: process sandbox vs app container vs system container vs microVM
- Harness compatibility (Claude Code, Codex, custom agents)
- Threat model (kernel CVE, `rm -rf ~`, docker socket, two concurrent boxes)
- When Linux system containers are the right unit — including Pere Villega's [Sandbox for Claude](https://github.com/pvillega/sandbox-claude)
- Mac-specific: why Incus `--vm` needs nested virt, and why two Apple Containers are sibling HVF VMs on Darwin
- Threats beyond the kernel: reaching the host's localhost, persistence into the next session (git hooks, `.mcp.json`, Makefiles), and confused-deputy use of legitimately held credentials
- Design axes the kernel line does not settle: where the harness sits (inside the box vs. commands-only), work isolation (live mount vs. `--clone` / worktree / golden image), and the credential-injecting proxy as the one wall that works on every family
- Control planes that span families: OpenShell (one policy, credential and prover layer over Docker, Podman, Kubernetes or a libkrun microVM) and discobox (a pool host that is a VM or the host Docker daemon depending on OS), and why their row is a deployment choice rather than a product property
- Policy verification (OpenShell's SMT prover), access-request loops as the new permission prompt, and git as the hand-back channel (discobox `apply`)
- Off-axis primitives and hosted sandboxes: gVisor (Modal, Claude Code on the web historically), Firecracker-as-a-service (E2B, Vercel Sandbox), and why your host is usually already a VM
