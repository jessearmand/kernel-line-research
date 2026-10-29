import {
  DELIVERY_LABELS,
  SYSTEMS,
  type Delivery,
  type Openness,
  type System,
} from "@/lib/sandboxes";
import { Badge } from "@/components/ui/badge";

const ORDER: Delivery[] = ["local", "self-hosted", "service"];

const OPENNESS_TONE: Record<Openness, "ok" | "warn" | "shared"> = {
  open: "ok",
  partial: "warn",
  closed: "shared",
};

const OPENNESS_SHORT: Record<Openness, string> = {
  open: "open",
  partial: "partly open",
  closed: "closed",
};

function Member({ s, via }: { s: System; via?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm leading-snug">
      <span>
        <a
          href={`#system-${s.id}`}
          className={via ? "text-muted hover:underline" : "font-medium text-fg hover:underline"}
        >
          {s.name}
        </a>
        {via ? <span className="block text-xs text-subtle">{via}</span> : null}
      </span>
      {via ? null : (
        <Badge tone={OPENNESS_TONE[s.openness]} className="shrink-0">
          {OPENNESS_SHORT[s.openness]}
        </Badge>
      )}
    </li>
  );
}

/** Every system by who supplies the machine, with how much of it you can read and run. */
export function DeliveryMap() {
  return (
    <div className="mb-10 space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {ORDER.map((d) => {
          const primary = SYSTEMS.filter((s) => s.delivery === d);
          const also = SYSTEMS.flatMap((s) =>
            (s.deliveryAlso ?? []).filter((x) => x.model === d).map((x) => ({ s, via: x.via })),
          );
          return (
            <section
              key={d}
              className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-medium tracking-tight">{DELIVERY_LABELS[d].name}</h3>
                <span className="font-mono text-xs text-subtle tabular-nums">{primary.length}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{DELIVERY_LABELS[d].hint}</p>
              <ul className="mt-4 space-y-2.5">
                {primary.map((s) => (
                  <Member key={s.id} s={s} />
                ))}
              </ul>
              {also.length ? (
                <>
                  <p className="mt-5 font-mono text-[11px] tracking-wide text-subtle uppercase">
                    Also offered this way
                  </p>
                  <ul className="mt-2 space-y-2">
                    {also.map(({ s, via }) => (
                      <Member key={s.id} s={s} via={via} />
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        Partly open usually means the SDK, CLI or local runtime is open and the platform that runs
        the machine is not; GhostVM publishes its source with the licence still undetermined.
      </p>
    </div>
  );
}
