import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

/**
 * Container. Keeps a page from getting too wide, so lines of text are easy to read.
 * Use size "reading" for pages with a lot of text, "page" for dashboards and tables, and "full" to fill the screen.
 */
export function Container({ size = "page", as: As = "div", className, style, children, ...props }) {
  const reading = Number(comp("container").reading) || 720;
  const max = size === "reading" ? `${reading}px` : size === "full" ? "none" : "1200px";
  return (
    <As
      className={cn("mx-auto w-full min-w-0 [max-width:var(--container-max)] [padding-inline:var(--pad)]", className)}
      style={{ "--container-max": max, ...style }}
      {...props}
    >
      {children}
    </As>
  );
}
