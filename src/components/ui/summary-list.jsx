import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const linkClass = "inline-flex items-center [min-height:var(--control-h)] [margin-block:calc((1lh_-_var(--control-h))/2)] py-0 px-[0.25em] -mx-[0.25em] cursor-pointer bg-transparent border-0 font-bold text-link underline underline-offset-4 [font-family:inherit] [font-size:inherit] [border-radius:calc(var(--radius)*0.5)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";
/**
 * Summary list. Rows of labels and answers, each with an optional Change link. Use it on review pages before people submit.
 * Each row: { key, value, href or onChange, actionLabel, actionHidden }.
 * The Change link has hidden words, like "Change phone number". On phones the answer moves under the label.
 * The Brand Console decides if lines show between rows.
 */
export function SummaryList({ rows = [], className }) {
  const lined = (comp("summary-list").lines || "on") === "on";
  return (
    <dl className={cn("@container m-0", className)}>
      {rows.map((r, i) => {
        const hidden = r.actionHidden ?? String(r.key).toLowerCase();
        const words = <>{r.actionLabel || "Change"}<span className="sr-only"> {hidden}</span></>;
        const act = r.href || r.onChange;
        return (
          <div key={r.id ?? i}
            className={cn("grid grid-cols-[minmax(0,1fr)_auto] @md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-start gap-x-[var(--gap)] gap-y-1 py-[calc(var(--gap)*0.7)]", lined && "border-b border-border")}>
            <dt className="col-start-1 row-start-1 font-bold">{r.key}</dt>
            <dd className="m-0 col-span-full row-start-2 @md:col-span-1 @md:col-start-2 @md:row-start-1 min-w-0 [overflow-wrap:anywhere]">{r.value}</dd>
            {act && (
              <dd className="m-0 col-start-2 row-start-1 @md:col-start-3 justify-self-end">
                {r.href ? <a href={r.href} onClick={r.onChange} className={linkClass}>{words}</a>
                  : <button type="button" onClick={r.onChange} className={linkClass}>{words}</button>}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
