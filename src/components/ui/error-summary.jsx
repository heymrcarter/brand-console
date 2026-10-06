import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * Error summary. A box at the top of a form that lists every problem, with links to each one.
 * It takes keyboard focus when it appears, so screen readers read it first.
 */
export function ErrorSummary({ title = "There is a problem", errors = [], autoFocus = true, className }) {
  const ref = useRef(null); const id = useId();
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  if (!errors.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby={id}
      className={cn("flex flex-col gap-[calc(var(--gap)*0.5)] bg-card [padding:var(--pad)] [border-radius:var(--field-radius)] [border:var(--c-error-summary-border,4px)_solid_var(--destructive)] focus:[outline:3px_solid_var(--ring)] focus:[outline-offset:3px]", className)}>
      <h2 id={id} className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)]">{title}</h2>
      <ul className="m-0 pl-[1.2em] flex flex-col gap-[0.4em]">
        {errors.map((e, i) => <li key={i}><a href={e.href || "#"} className="text-destructive-text font-semibold underline underline-offset-4">{e.message}</a></li>)}
      </ul>
    </div>
  );
}
