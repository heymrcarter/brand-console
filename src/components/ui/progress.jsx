import { useId } from "react";
import { Progress as P } from "radix-ui";
import { cn } from "../../lib/utils";

function valueText(value, max, show) {
  if (value == null) return "Working on it";
  if (show === "count") return `${value} of ${max}`;
  return `${Math.round((value / max) * 100)}%`;
}

/**
 * Progress bar. A bar that fills up to show how much of a task is done, like a form or an upload.
 * Always show words with it, like "Step 2 of 4" or "60% uploaded".
 * The thickness comes from the Brand Console.
 */
export function Progress({ value, max = 100, label, hint, show, className }) {
  const id = useId();
  const mode = show === false ? false : show || (max === 100 ? "percent" : "count");
  const text = valueText(value, max, mode || (max === 100 ? "percent" : "count"));
  const pct = value == null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-[6px] min-w-0", className)}>
      {(label || mode || hint) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--gap)] gap-y-1">
          <span className="flex flex-wrap items-baseline gap-x-[0.5em]">
            {label && <b id={id + "-label"} className="[font-family:var(--font-ui,var(--font-body))]">{label}</b>}
            {mode && value != null && <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">{text}</span>}
          </span>
          {hint && <span className="text-muted-foreground [font-size:var(--text-sm)]">{hint}</span>}
        </div>
      )}
      <P.Root value={value ?? null} max={max} getValueLabel={() => text}
        aria-labelledby={label ? id + "-label" : undefined} aria-label={label ? undefined : "Progress"}
        className="relative block w-full overflow-hidden rounded-full bg-muted [height:var(--c-progress-height,12px)]">
        <P.Indicator className="block h-full w-full rounded-full [background:var(--primary-edge)] transition-transform duration-300 motion-reduce:transition-none"
          style={{ transform: `translateX(-${100 - pct}%)` }} />
      </P.Root>
    </div>
  );
}
