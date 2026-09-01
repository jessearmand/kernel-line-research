import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] tracking-wide uppercase",
  {
    variants: {
      tone: {
        default: "bg-surface text-muted",
        accent: "bg-accent text-accent-fg",
        micro: "bg-accent/15 text-accent",
        shared: "bg-shared/15 text-shared",
        ok: "bg-ok/15 text-ok",
        warn: "bg-warn/15 text-warn",
        bad: "bg-bad/15 text-bad",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
