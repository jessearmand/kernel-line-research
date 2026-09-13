# Kernel Line

Interactive comparison of AI agent sandbox architectures: [yolobox](https://yolobox.dev), Docker sbx, microsandbox, Kernel hypeman, [Cloudflare Sandbox](https://developers.cloudflare.com/sandbox/), [GhostVM](https://ghostvm.org), [UTM](https://mac.getutm.app), [agent-sandbox-vm](https://github.com/glslang/agent-sandbox-vm), [Cua Sandbox](https://cua.ai/docs/concepts/how-sandboxes-work), [Lume](https://cua.ai/docs/concepts/how-lume-unattended-setup-works), Claude Code, Codex, [nono](https://nono.sh), Incus, and [code-on-incus](https://github.com/mensfeld/code-on-incus) — plus Mac runtimes (nested virt, Apple Container, macOS guests).

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
- When Linux system containers are the right unit — including Pere Villega's [Sandbox for Claude](https://github.com/pvillega/sandbox-claude) and Maciej Mensfeld's [code-on-incus](https://github.com/mensfeld/code-on-incus): `coi shell` for Claude Code, Codex, opencode, pi or omp in an Incus system container, host-side nftables egress (restricted / allowlist / open, per-host ports, DNS pinning), read-only `.git/hooks` pinned with `chattr +i`, slots for parallel agents, and a monitor that pauses the box on bulk reads and kills it on a reverse shell or a metadata hit, with a forensic copy before the kill
- Mac-specific: why Incus `--vm` needs nested virt, why two Apple Containers are sibling HVF VMs on Darwin, and why a macOS guest is capped at two per host and cannot nest
- The use case Linux VMs skip: GhostVM (macOS workspace per agent, vsock services gated by prompts and quarantine), UTM (QEMU + Apple Virtualization, any guest OS), and glslang's agent-sandbox-vm (Hyper-V / Virtualization.framework / Parallels clean room with checkpoint restore and artifact copy-out) for Xcode, codesign and MSVC jobs
- Computer-use sandboxes: Cua Sandbox gives an agent one machine with a code half (shell, PTY, sandboxed Python) and a GUI half (screenshots, accessibility tree, clicks), spanning a Docker XFCE container, a QEMU Linux VM, a Lume macOS guest, Hyper-V Windows and the Android emulator; Lume is the headless Virtualization.framework runtime underneath — macOS from an IPSW with the Data volume patched offline for SSH and autologin, OCI push/pull of VM images, clone as the only checkpoint, SIP flipped through Recovery, Apple's two-guest cap
- Threats beyond the kernel: reaching the host's localhost, persistence into the next session (git hooks, `.mcp.json`, Makefiles), and confused-deputy use of legitimately held credentials
- Design axes the kernel line does not settle: where the harness sits (inside the box vs. commands-only), work isolation (live mount vs. `--clone` / worktree / golden image), and the credential-injecting proxy as the one wall that works on every family
- Off-axis primitives and hosted sandboxes: gVisor (Modal, Claude Code on the web historically) and its nvproxy GPU path, Firecracker-as-a-service (E2B, Vercel Sandbox, Cloudflare Sandbox), and why your host is usually already a VM
- GPU as a matrix row: host device nodes (yolobox, Incus), experimental VFIO (Docker sbx: x86_64 Linux + NVIDIA, feature-flagged), VFIO or NVIDIA vGPU on QEMU / Cloud Hypervisor only (hypeman — Firecracker and the macOS backend cannot), paravirtualized Metal in macOS guests (GhostVM, Lume, UTM), and nothing at all in the rented rows
- Subtraction vs addition: process sandboxes and app containers (nono, sandbox-runtime, fence, landrun, yolobox, Litterbox) fence your machine; system containers, microVMs and full VMs hand the agent a machine — most sharp edges on the site are one side borrowing the other's promise
- Reference points from earlier write-ups folded in: Ry Walker's [Local AI Agent Sandboxes Compared](https://rywalker.com/research/local-agent-sandboxes), sbx's real resource defaults (all cores, half of host RAM, 32 GiB cap; 2 CPU / 4 GiB only in `--cloud`), and the correction that Docker's VMM is purpose-built rather than libkrun-derived
- Cloudflare Sandbox as the rented microVM row: a Worker calls `getSandbox()`, a Durable Object owns the ID, a Firecracker guest boots for it; `enableInternet = false` plus `outboundByHost` handlers keep credentials in the Worker; rootless Docker-in-Docker; disk dies at sleep unless backed up to R2
- What the egress proxy can see: Claude Code's and Codex's default proxies both allow on the CONNECT hostname and tunnel TLS untouched, so an allowed domain is an uninspected channel (Anthropic's docs name github.com and domain fronting); Codex's `mode = "limited"` clamps to GET/HEAD/OPTIONS through a process-local MITM CA and `[network.mitm.hooks]` match host + methods + path prefixes, verified in [openai/codex `codex-rs/network-proxy` @ 36f0dbe](https://github.com/openai/codex/blob/36f0dbe796d9bb1a18a0fc0640ed08b3e1d54564/codex-rs/network-proxy/README.md); Claude Code's `tlsTerminate` is experimental and only for credential masking; neither termination nor a method clamp stops a secret leaving in an allowed GET's query string
- Codex from the current docs: Seatbelt / bwrap+seccomp / native Windows sandbox, `read-only` · `workspace-write` · `danger-full-access`, protected `.git` `.agents` `.codex`, the `network_proxy` allowlist with DNS-rebinding checks, `untrusted` · `on-request` · `never` approvals and the `auto_review` reviewer agent, cloud's two-phase setup/agent model, and admin `requirements.toml`
