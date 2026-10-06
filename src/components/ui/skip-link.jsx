import { cn } from "../../lib/utils";

/**
 * Skip link. A hidden link that shows when people press the Tab key. It jumps past the header to the main part of the page.
 * Put it first on every page. The target (usually `<main id="main">`) gets focus when people use it.
 */
export function SkipLink({ target = "main", children = "Skip to main content", className }) {
  const onClick = (e) => {
    const el = document.getElementById(target);
    if (!el) return;
    e.preventDefault();
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus();
    el.scrollIntoView({ block: "start" });
    if (window.history && window.history.replaceState) window.history.replaceState(null, "", "#" + target);
  };
  return (
    <a href={"#" + target} onClick={onClick}
      className={cn("sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:inline-flex focus:items-center",
        "bg-primary text-primary-foreground font-bold underline underline-offset-4 [font-family:var(--font-ui,var(--font-body))] [font-size:var(--text-base)]",
        "focus:[min-height:var(--control-h)] focus:[padding:0.6em_1em] [border-radius:var(--btn-radius)]",
        "focus:[outline:3px_solid_var(--ring)] focus:[outline-offset:2px]", className)}>
      {children}
    </a>
  );
}
