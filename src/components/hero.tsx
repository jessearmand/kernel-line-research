import { FAMILIES } from "@/lib/sandboxes";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--color-fg) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-fg) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 md:px-6 md:pt-24 md:pb-20">
        <p className="font-mono text-xs tracking-[0.22em] text-subtle uppercase">
          Isolation architectures · 2026
        </p>
        <h1 className="mt-5 max-w-4xl text-3xl font-medium tracking-tight text-fg md:text-[length:var(--text-3xl)] md:leading-[1.08]">
          The kernel is the real wall.
          <span className="mt-2 block text-muted">Everything else is a policy.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
          yolobox, Docker sbx, microsandbox, and Kernel hypeman sit on three different
          isolation primitives. Claude Code and Codex add a fourth: a harness that
          sandboxes itself. This is a working comparison of those architectures, not a
          vendor scorecard.
        </p>
        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border md:grid-cols-4">
          {[
            { k: "Shared kernel", v: "Process + container" },
            { k: "Dedicated kernel", v: "MicroVM" },
            { k: "Wrappers", v: "yolobox · sbx" },
            { k: "Runtimes", v: "msb · hypeman" },
          ].map((item) => (
            <div key={item.k} className="bg-bg-elevated px-4 py-4 md:px-5 md:py-5">
              <dt className="font-mono text-[11px] tracking-wide text-subtle uppercase">{item.k}</dt>
              <dd className="mt-1.5 text-sm text-fg">{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Spectrum() {
  return (
    <section id="spectrum" className="scroll-mt-24 border-t border-border py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">01 · Spectrum</p>
        <h2 className="mt-3 max-w-3xl text-2xl font-medium tracking-tight">
          Three families. Six products. One question: whose kernel is it?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          A process sandbox and a container both ask the host kernel to please isolate a
          workload. A microVM boots a second kernel so that question never reaches the
          host. That is the entire argument, and it has costs.
        </p>
        <ol className="mt-10 grid gap-3 md:grid-cols-3">
          {FAMILIES.map((fam, i) => (
            <li
              key={fam.id}
              className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] md:p-6"
            >
              <p className="font-mono text-[11px] text-subtle tabular-nums">0{i + 1}</p>
              <h3 className="mt-3 text-lg font-medium tracking-tight">{fam.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{fam.isolation}</p>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-subtle">Kernel</dt>
                  <dd className="text-right text-fg">{fam.kernel}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-subtle">Start</dt>
                  <dd className="text-right text-fg">{fam.startup}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-subtle">Escape</dt>
                  <dd className="text-right text-fg">{fam.escape}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
