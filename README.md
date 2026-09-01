# Kernel Line

Interactive comparison of AI agent sandbox architectures: [yolobox](https://yolobox.dev), Docker sbx, microsandbox, Kernel hypeman, Claude Code, Codex, [nono](https://nono.sh), and Incus — plus Mac runtimes (nested virt, Apple Container).

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
