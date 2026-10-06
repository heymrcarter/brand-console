import { useId } from "react";
import { RadioGroup as R } from "radix-ui";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { FieldError } from "./field-parts";

/**
 * Radio buttons. People pick exactly one of 2 to 6 choices.
 * The brand team picks "tiles" (bigger, easier to tap) or a plain list.
 */
export function RadioGroup({ legend, hint, error, options = [], value, defaultValue, onValueChange, layout = "stacked", className }) {
  const s = comp("radio"); const tiles = s.style !== "plain" && layout !== "inline";
  const gid = useId();
  return (
    <fieldset className={cn("m-0 p-0 border-0 min-w-0 flex flex-col gap-[calc(var(--gap)*0.5)]", className)} aria-describedby={[hint && gid + "-hint", error && gid + "-err"].filter(Boolean).join(" ") || undefined}>
      <legend className="p-0 mb-1 [font-weight:var(--label-weight)]">{legend}</legend>
      {hint && <p id={gid + "-hint"} className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{hint}</p>}
      <FieldError id={gid + "-err"}>{error}</FieldError>
      <R.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} className={cn("flex", layout === "inline" ? "flex-row flex-wrap gap-[var(--gap)]" : "flex-col gap-[calc(var(--gap)*0.6)]")}>
        {options.map((o) => {
          const id = `${gid}-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className={cn("flex items-start gap-[0.7em] cursor-pointer",
              tiles ? "bg-card [border:2px_solid_var(--border)] [border-radius:var(--field-radius)] [padding:calc(var(--gap)*0.6)_calc(var(--gap)*0.8)] has-[[data-state=checked]]:border-link has-[[data-state=checked]]:bg-secondary" : "py-[0.3em]")}>
              <R.Item id={id} value={o.value}
                className="shrink-0 inline-flex items-center justify-center rounded-full bg-card cursor-pointer [width:var(--c-checkbox-size,1.5em)] [height:var(--c-checkbox-size,1.5em)] [border:2px_solid_var(--input)] data-[state=checked]:border-primary-edge focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
                <R.Indicator className="block size-1/2 rounded-full bg-primary-edge" />
              </R.Item>
              <span className="min-w-0">
                <span className={tiles ? "font-bold" : ""}>{o.label}</span>
                {o.hint && <span className="block [font-size:var(--text-sm)] text-muted-foreground">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </R.Root>
    </fieldset>
  );
}
