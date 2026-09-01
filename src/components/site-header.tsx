import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#spectrum", label: "Spectrum" },
  { href: "#stack", label: "Stack" },
  { href: "#systems", label: "Six systems" },
  { href: "#matrix", label: "Matrix" },
  { href: "#threats", label: "Threats" },
  { href: "#harness", label: "Harness" },
  { href: "#mac", label: "Mac" },
  { href: "#pick", label: "Pick" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled ? "border-border bg-bg/90 backdrop-blur-md" : "bg-bg/40",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <a href="#top" className="flex shrink-0 items-center gap-2 text-fg">
          <span className="block h-2.5 w-8 bg-accent" aria-hidden />
          <span className="font-medium tracking-tight">Kernel Line</span>
        </a>
        <nav className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-sm px-2.5 py-2 font-mono text-[11px] tracking-wide text-muted uppercase transition-colors duration-150 hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
