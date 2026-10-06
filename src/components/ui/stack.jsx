import { cn } from "../../lib/utils";

const GAP = {
  none: "gap-0",
  xs: "[gap:calc(var(--gap)*0.25)]",
  sm: "[gap:calc(var(--gap)*0.5)]",
  md: "[gap:var(--gap)]",
  lg: "[gap:calc(var(--gap)*1.5)]",
  xl: "[gap:calc(var(--gap)*2)]",
};
const ALIGN = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch", baseline: "items-baseline" };
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" };

/**
 * Stack. Puts things in a column or a row with even space between them.
 * Use it for all spacing between things instead of adding margins by hand.
 * It only changes layout. It never changes the reading order.
 */
export function Stack({ direction = "column", gap = "md", align, justify, wrap = false, as: As = "div", className, children, ...props }) {
  const row = direction === "row";
  return (
    <As
      className={cn(
        "flex min-w-0", row ? "flex-row" : "flex-col",
        GAP[gap] || GAP.md,
        ALIGN[align || (row ? "center" : "stretch")],
        justify && JUSTIFY[justify],
        wrap && "flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </As>
  );
}
