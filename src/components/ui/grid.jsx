import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

const GAP = {
  none: "gap-0",
  sm: "[gap:calc(var(--gap)*0.5)]",
  md: "[gap:var(--gap)]",
  lg: "[gap:calc(var(--gap)*1.5)]",
};

/** Turns a number or {phone, tablet, computer} into three column counts. */
function resolve(columns, desktop) {
  if (typeof columns === "number") return { phone: Math.min(columns, 4), tablet: Math.min(columns, 8), computer: columns };
  const c = columns || {};
  const computer = c.computer ?? desktop;
  return { phone: c.phone ?? 4, tablet: c.tablet ?? Math.min(computer, 8), computer };
}

/**
 * Grid. Lines up content in columns that change with the screen size.
 * Use it for page layouts: 4 columns on phones and 12 (or 8) on computers.
 * It only changes layout. The reading order stays the same as the code order.
 */
export function Grid({ columns, gap = "md", as: As = "div", className, style, children, ...props }) {
  const desktop = Number(comp("grid").cols) || 12;
  const c = resolve(columns, desktop);
  return (
    <As
      className={cn(
        "grid min-w-0",
        "[grid-template-columns:repeat(var(--grid-phone),minmax(0,1fr))]",
        "md:[grid-template-columns:repeat(var(--grid-tablet),minmax(0,1fr))]",
        "lg:[grid-template-columns:repeat(var(--grid-computer),minmax(0,1fr))]",
        GAP[gap] || GAP.md,
        className
      )}
      style={{ "--grid-phone": c.phone, "--grid-tablet": c.tablet, "--grid-computer": c.computer, ...style }}
      {...props}
    >
      {children}
    </As>
  );
}

/**
 * Grid item. Says how many columns one thing spans, like half the page.
 * Pass a number, or {phone, tablet, computer}. A span bigger than the row fills the whole row.
 */
export function GridItem({ span, as: As = "div", className, style, children, ...props }) {
  const s = typeof span === "number" ? { phone: span, tablet: span, computer: span } : span || {};
  const v = (n) => (n == null ? "1 / -1" : `span ${n} / span ${n}`);
  return (
    <As
      className={cn(
        "min-w-0 [grid-column:var(--gi-phone)] md:[grid-column:var(--gi-tablet)] lg:[grid-column:var(--gi-computer)]",
        className
      )}
      style={{ "--gi-phone": s.phone == null || s.phone >= 4 ? "1 / -1" : v(s.phone), "--gi-tablet": v(s.tablet ?? s.phone), "--gi-computer": v(s.computer ?? s.tablet ?? s.phone), ...style }}
      {...props}
    >
      {children}
    </As>
  );
}
