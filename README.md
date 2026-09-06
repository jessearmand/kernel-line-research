# Kernel Line

Interactive comparison of AI agent sandbox architectures: [yolobox](https://yolobox.dev), Docker sbx, microsandbox, Kernel hypeman, [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/), [GhostVM](https://ghostvm.org), [UTM](https://mac.getutm.app), [agent-sandbox-vm](https://github.com/glslang/agent-sandbox-vm), [Cua Sandbox](https://cua.ai/docs/concepts/how-sandboxes-work), [Lume](https://cua.ai/docs/concepts/how-lume-unattended-setup-works), Claude Code, Codex, [nono](https://nono.sh), and Incus — plus Mac runtimes (nested virt, Apple Container, macOS guests).

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (port 8080 in this workspace).

## What it covers

- Isolation stack: process sandbox vs app container vs system container vs microVM vs full VM (a macOS or Windows guest)
- Harness compatibility (Claude Code, Codex, custom agents)
- Threat model (kernel CVE, `rm -rf ~`, docker socket, two concurrent boxes)
- When Linux system containers are the right unit — including Pere Villega's [Sandbox for Claude](https://github.com/pvillega/sandbox-claude)
- Mac-specific: why Incus `--vm` needs nested virt, why two Apple Containers are sibling HVF VMs on Darwin, and why a macOS guest is capped at two per host and cannot nest
- The use case Linux VMs skip: GhostVM (macOS workspace per agent, vsock services gated by prompts and quarantine), UTM (QEMU + Apple Virtualization, any guest OS), and glslang's agent-sandbox-vm (Hyper-V / Virtualization.framework / Parallels clean room with checkpoint restore and artifact copy-out) for Xcode, codesign and MSVC jobs
- Computer-use sandboxes: Cua Sandbox gives an agent one machine with a code half (shell, PTY, sandboxed Python) and a GUI half (screenshots, accessibility tree, clicks), spanning a Docker XFCE container, a QEMU Linux VM, a Lume macOS guest, Hyper-V Windows and the Android emulator; Lume is the headless Virtualization.framework runtime underneath — macOS from an IPSW with the Data volume patched offline for SSH and autologin, OCI push/pull of VM images, clone as the only checkpoint, SIP flipped through Recovery, Apple's two-guest cap
- Threats beyond the kernel: reaching the host's localhost, persistence into the next session (git hooks, `.mcp.json`, Makefiles), and confused-deputy use of legitimately held credentials
- Design axes the kernel line does not settle: where the harness sits (inside the box vs. commands-only), work isolation (live mount vs. `--clone` / worktree / golden image), and the credential-injecting proxy as the one wall that works on every family
- Off-axis primitives and hosted sandboxes: gVisor (Modal, Claude Code on the web historically), Firecracker-as-a-service (E2B, Vercel Sandbox, Cloudflare Sandbox), and why your host is usually already a VM
- Cloudflare Sandbox as the rented microVM row: a Worker calls `getSandbox()`, a Durable Object owns the ID, a Firecracker guest boots for it; `enableInternet = false` plus `outboundByHost` handlers keep credentials in the Worker; rootless Docker-in-Docker; disk dies at sleep unless backed up to R2
- Codex from the current docs: Seatbelt / bwrap+seccomp / native Windows sandbox, `read-only` · `workspace-write` · `danger-full-access`, protected `.git` `.agents` `.codex`, the `network_proxy` allowlist with DNS-rebinding checks, `untrusted` · `on-request` · `never` approvals and the `auto_review` reviewer agent, cloud's two-phase setup/agent model, and admin `requirements.toml`
