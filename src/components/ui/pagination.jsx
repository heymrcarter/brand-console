import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { buttonVariants } from "./button";

/** Page numbers to show, with "gap" where some are skipped. Always shows the first and last page. */
export function pageList(page, pages) {
  const want = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 2) want.add(3);
  if (page >= pages - 1) want.add(pages - 2);
  const nums = [...want].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    const prev = nums[i - 1];
    if (prev && n - prev === 2) out.push(prev + 1);
    else if (prev && n - prev > 2) out.push("gap");
    out.push(n);
  });
  return out;
}

const pageClass = "inline-flex items-center justify-center cursor-pointer font-semibold [font-family:var(--font-ui,var(--font-body))] [min-width:var(--control-h)] [height:var(--control-h)] px-2 [border-radius:var(--btn-radius)] " +
  "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";

/**
 * Pagination. Links that move between pages of a long list, like your claims.
 * Always say how many items there are, and spell out Previous and Next. On narrow screens it shows only the current page number.
 */
export function Pagination({ page = 1, total = 0, pageSize = 20, onPageChange, hrefFor, itemLabel = "items", label = "Pages", variant, className }) {
  const s = comp("pagination");
  const simple = (variant || s.style || "numbers") === "simple";
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const to = Math.min(total, cur * pageSize);

  // A plain function (not a component) so focus stays put when the page changes.
  const go = (n, c, children, disabled = false) => {
    if (hrefFor && !disabled) return <a href={hrefFor(n)} onClick={onPageChange ? (e) => { e.preventDefault(); onPageChange(n); } : undefined} className={c}>{children}</a>;
    return <button type="button" disabled={disabled} onClick={() => onPageChange && onPageChange(n)} className={c}>{children}</button>;
  };
  const stepKind = simple ? "outline" : "ghost";

  return (
    <nav aria-label={label} className={cn("@container flex flex-col gap-2 [font-size:var(--text-base)]", className)}>
      <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground" aria-live="polite">
        {total === 0 ? `There are no ${itemLabel} to show.` : `Showing ${from} to ${to} of ${total} ${itemLabel}.`}
      </p>
      <ul className="m-0 p-0 list-none flex flex-wrap items-center gap-1.5">
        <li>
          {go(cur - 1, cn(buttonVariants({ variant: stepKind }), !simple && "[padding-inline:0.4em]"), <>
            <ChevronLeft aria-hidden="true" className="size-[1.1em]" />
            Previous<span className="sr-only"> page</span>
          </>, cur <= 1)}
        </li>
        {simple ? (
          <li className="px-2 text-foreground">Page {cur} of {pages}</li>
        ) : pageList(cur, pages).map((n, i) => n === "gap" ? (
          <li key={"g" + i} aria-hidden="true" className="px-1 text-muted-foreground @max-md:hidden">…</li>
        ) : (
          <li key={n} className={n === cur ? undefined : "@max-md:hidden"}>
            {n === cur ? (
              <span aria-current="page" className={cn(pageClass, "cursor-default bg-primary text-primary-foreground [box-shadow:0_0_0_2px_var(--primary-edge)]")}>
                <span className="sr-only">Page</span> {n}
              </span>
            ) : (
              go(n, cn(pageClass, "bg-transparent border-0 text-link underline underline-offset-4 hover:bg-muted"), <><span className="sr-only">Page</span> {n}</>)
            )}
          </li>
        ))}
        <li>
          {go(cur + 1, cn(buttonVariants({ variant: stepKind }), !simple && "[padding-inline:0.4em]"), <>
            Next<span className="sr-only"> page</span>
            <ChevronRight aria-hidden="true" className="size-[1.1em]" />
          </>, cur >= pages)}
        </li>
      </ul>
    </nav>
  );
}
