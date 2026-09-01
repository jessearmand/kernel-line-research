export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">Sources · Sep 2026</p>
        <ul className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-2">
          <li>
            <a className="hover:text-fg" href="https://yolobox.dev/">
              yolobox.dev and github.com/finbarr/yolobox
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://www.docker.com/blog/why-microvms-the-architecture-behind-docker-sandboxes/">
              Docker: Why MicroVMs / docs.docker.com/ai/sandboxes
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://github.com/superradcompany/microsandbox">
              microsandbox · libkrun
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://github.com/kernel/hypeman">
              kernel/hypeman · kernel.sh
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://code.claude.com/docs/en/sandboxing">
              Claude Code sandboxing · sandbox-runtime
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://developers.openai.com/codex/security/">
              Codex security / linux-sandbox
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://linuxcontainers.org/incus/docs/main/container-environment/">
              Incus container environment · Colima Incus runtime
            </a>
          </li>
          <li>
            <a className="hover:text-fg" href="https://github.com/apple/container">
              apple/container · yolobox Apple runtime limits
            </a>
          </li>
        </ul>
        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-subtle">
          Scores are relative and qualitative. Startup numbers are vendor-reported or typical of
          the primitive, not a benchmark we ran. Cloud Codex isolation is a different box from
          the local CLI — the app treats them as two surfaces of one product.
        </p>
      </div>
    </footer>
  );
}
