import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const linkClass = "inline-flex items-center gap-1 text-link font-semibold underline underline-offset-4 [min-height:var(--control-h)] rounded-[4px] hover:decoration-2 focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";

/**
 * Breadcrumbs. A trail of links that shows where you are, like Home, then My plan, then Claims.
 * Use them on pages three or more levels deep. On phones, only a "Back to" link for the page one level up shows.
 */
export function Breadcrumbs({ items = [], sep, label = "Breadcrumb", className }) {
  const s = comp("breadcrumbs");
  const slash = (sep || s.sep || "chevron") === "slash";
  const parent = items.length > 1 ? items[items.length - 2] : null;
  const Sep = () => (
    <span aria-hidden="true" className="inline-flex items-center text-muted-foreground px-[.25em]">
      {slash ? "/" : <ChevronRight className="size-[1em]" />}
    </span>
  );
  return (
    <nav aria-label={label} className={cn("@container [font-size:var(--text-base)] [font-family:var(--font-ui,var(--font-body))]", className)}>
      <ol className="hidden @lg:flex flex-wrap items-center m-0 p-0 list-none gap-x-[.25em]">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="inline-flex items-center">
              {last ? <span aria-current="page" className="inline-flex items-center [min-height:var(--control-h)] text-foreground">{it.label}</span>
                    : <a href={it.href || "#"} className={linkClass}>{it.label}</a>}
              {!last && <Sep />}
            </li>
          );
        })}
      </ol>
      {parent && (
        <div className="@lg:hidden">
          <a href={parent.href || "#"} className={linkClass}>
            <ChevronLeft aria-hidden="true" className="size-[1.1em]" />
            Back to {parent.label}
          </a>
        </div>
      )}
    </nav>
  );
}
