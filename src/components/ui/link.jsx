import { ArrowRight, ChevronLeft, ExternalLink } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Icon } from "./icon";

const FOCUS = "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] rounded-[2px]";
const WEIGHT = { 400: "font-normal", 500: "font-medium", 600: "font-semibold", 700: "font-bold" };

/**
 * Link. Words people click to go to another page, like "View your claims".
 * Use a link to go somewhere and a button to do something. Never write "click here".
 * Kinds: "inline" sits in a sentence, "standalone" sits on its own line, "action" starts a main task,
 * and "back" goes one step back. Use `as` to render your router's link.
 */
export function Link({ href, variant = "inline", external = false, as: Comp = "a", className, children, ...props }) {
  const s = comp("link");
  const underline = (s.underline ?? "always") === "hover"
    ? "no-underline hover:underline focus-visible:underline"
    : "underline";
  const weight = WEIGHT[s.weight ?? 600] || "font-semibold";
  const ext = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const newTab = external && <span className="sr-only"> (opens a new tab)</span>;
  const common = { href, ...ext, ...props };

  if (variant === "action") {
    return (
      <Comp {...common}
        className={cn("group inline-flex items-center gap-[0.6em] [min-height:var(--control-h)] font-bold text-foreground no-underline hover:underline underline-offset-4 [font-size:calc(var(--text-base)*1.15)] [font-family:var(--font-ui,var(--font-body))]", FOCUS, className)}>
        <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full size-[1.8em] [background:var(--btn-bg)] [color:var(--btn-fg)] group-hover:[background:var(--btn-bg-hover)]">
          <Icon as={ArrowRight} size="1.1em" />
        </span>
        <span>{children}{newTab}</span>
      </Comp>
    );
  }

  const row = variant === "standalone" || variant === "back";
  return (
    <Comp {...common}
      className={cn("text-link underline-offset-[3px] decoration-[max(1px,0.07em)] [font-family:var(--font-ui,var(--font-body))]", underline, weight,
        row && "inline-flex items-center gap-[0.4em] [min-height:var(--control-h)]", FOCUS, className)}>
      {variant === "back" && <Icon as={ChevronLeft} />}
      {children}
      {external && <Icon as={ExternalLink} size="0.95em" className={row ? "" : "ml-[0.25em]"} />}
      {newTab}
    </Comp>
  );
}
