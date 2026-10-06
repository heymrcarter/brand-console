import { Separator } from "radix-ui";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Divider. A thin line that separates two parts of a page.
 * Use space first. Add a line only when two parts could be mixed up. A short word, like "or", can sit in the middle.
 */
export function Divider({ label, decorative = true, orientation = "horizontal", weight, className }) {
  const s = comp("divider");
  const w = Number(weight ?? s.weight ?? 1) || 1;
  const size = `var(--c-divider-weight,${w}px)`;
  const thick = weight != null ? `${w}px` : size;
  const vertical = orientation === "vertical";

  if (label && !vertical) {
    return (
      <div className={cn("flex items-center gap-3 w-full text-muted-foreground [font-size:var(--text-sm)] [font-family:var(--font-ui,var(--font-body))]", className)}>
        <Separator.Root decorative className="flex-1 bg-border" style={{ height: thick }} />
        <span>{label}</span>
        <Separator.Root decorative className="flex-1 bg-border" style={{ height: thick }} />
      </div>
    );
  }
  return (
    <Separator.Root decorative={decorative} orientation={orientation}
      className={cn("shrink-0 bg-border", vertical ? "self-stretch" : "w-full", className)}
      style={vertical ? { width: thick } : { height: thick }} />
  );
}
