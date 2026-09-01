import { useMemo, useState } from "react";
import { MATRIX_ROWS, SYSTEMS, type SystemId } from "@/lib/sandboxes";
import { cn } from "@/lib/utils";

const GROUPS = ["Architecture", "Performance", "Security", "Harness"] as const;

export function ComparisonMatrix() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Architecture");
  const [visible, setVisible] = useState<SystemId[]>(SYSTEMS.map((s) => s.id));
  const [left, setLeft] = useState<SystemId>("docker-sbx");
  const [right, setRight] = useState<SystemId>("claude-code");

  const cols = useMemo(() => SYSTEMS.filter((s) => visible.includes(s.id)), [visible]);
  const rows = MATRIX_ROWS.filter((r) => r.group === group);

  const toggle = (id: SystemId) => {
    setVisible((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={cn(
              "h-11 rounded-md px-4 text-sm font-medium transition-colors duration-150",
              group === g ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SYSTEMS.map((s) => {
          const on = visible.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "h-9 rounded-full px-3 font-mono text-[11px] tracking-wide uppercase transition-colors duration-150",
                on ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-subtle",
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl shadow-[var(--shadow-border)] md:block">
        <table className="min-w-[960px] w-full border-collapse text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="sticky left-0 bg-bg-elevated px-4 py-3 text-left font-mono text-[11px] tracking-wide text-subtle uppercase">
                {group}
              </th>
              {cols.map((s) => (
                <th key={s.id} className="px-4 py-3 text-left font-medium text-fg">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <th className="sticky left-0 bg-bg px-4 py-3 text-left font-normal text-muted">
                  {row.label}
                </th>
                {cols.map((s) => (
                  <td key={s.id} className="px-4 py-3 align-top text-fg">
                    {row.values[s.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-subtle">
            Left
            <select
              className="mt-1 h-11 w-full rounded-md bg-surface px-3 text-sm text-fg"
              value={left}
              onChange={(e) => setLeft(e.target.value as SystemId)}
            >
              {SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-subtle">
            Right
            <select
              className="mt-1 h-11 w-full rounded-md bg-surface px-3 text-sm text-fg"
              value={right}
              onChange={(e) => setRight(e.target.value as SystemId)}
            >
              {SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-bg-elevated shadow-[var(--shadow-border)]">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">{row.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <p className="text-fg">{row.values[left]}</p>
                <p className="text-fg">{row.values[right]}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
