# Kernel Line

Interactive comparison of AI agent sandbox architectures: [yolobox](https://yolobox.dev), Docker sbx, microsandbox, Kernel hypeman, Claude Code, and Codex — plus Mac runtimes (Incus, Apple Container, nested virt).

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (port 8080 in this workspace).

## What it covers

- Isolation stack: process sandbox vs container vs microVM
- Harness compatibility (Claude Code, Codex, custom agents)
- Threat model (kernel CVE, `rm -rf ~`, docker socket, two concurrent boxes)
- Mac-specific: why Incus `--vm` needs nested virt, and why two Apple Containers are sibling HVF VMs on Darwin — not machines inside a machine
