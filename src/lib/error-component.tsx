import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  // Router 1.170.4x types `error` as unknown; anything thrown can land here.
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-bad" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-medium tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {message || "An unexpected error occurred. Try reloading the page."}
      </p>
    </main>
  );
}
