import { useState } from "react";
import { ToggleGroup as T } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Filter chips. Small buttons that turn filters on and off above a list, like "In network" or "Video visits".
 * People can turn on more than one. A chip that is on shows a check mark, not only a color.
 * Always offer "Clear all", and show how many results match with `resultText`.
 *
 * options: list of strings or { value, label }. The shape comes from the Brand Console.
 */
export function FilterChips({ options = [], value, defaultValue = [], onValueChange, onClear, label = "Filters", resultText, clearLabel = "Clear all", className }) {
  const [inner, setInner] = useState(defaultValue);
  const sel = value !== undefined ? value : inner;
  const set = (next) => { if (value === undefined) setInner(next); onValueChange && onValueChange(next); };
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <T.Root type="multiple" value={sel} onValueChange={set} aria-label={label} className="flex flex-wrap items-center gap-2">
          {opts.map((o) => {
            const on = sel.includes(o.value);
            return (
              <T.Item key={o.value} value={o.value} disabled={o.disabled}
                className={cn("relative inline-flex items-center gap-[0.4em] whitespace-nowrap cursor-pointer select-none px-[1em] [min-height:calc(var(--control-h)*0.8)] [border-radius:var(--c-filter-chips-shape,999px)]",
                  "after:absolute after:content-[''] after:inset-x-0 after:[inset-block:calc(var(--control-h)*-0.1)]",
                  "[border:1.5px_solid_var(--input)] bg-card text-foreground font-semibold [font-family:var(--font-ui,var(--font-body))] [font-size:calc(var(--text-base)*0.95)]",
                  "data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:border-link hover:bg-muted data-[state=on]:hover:bg-secondary",
                  "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] disabled:opacity-50 disabled:cursor-not-allowed")}>
                {on && <Check aria-hidden="true" strokeWidth={3} className="size-[1em] shrink-0" />}
                {o.label}
              </T.Item>
            );
          })}
        </T.Root>
        <button type="button" onClick={() => { set([]); onClear && onClear(); }}
          className="cursor-pointer bg-transparent border-0 px-1 [min-height:var(--control-h)] text-link font-semibold underline underline-offset-[3px] [font-family:var(--font-ui,var(--font-body))] [font-size:var(--text-sm)] rounded-sm focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
          {clearLabel}
        </button>
      </div>
      {resultText != null && <p role="status" className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{resultText}</p>}
    </div>
  );
}
