import { useId } from "react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { FieldError, inputClass } from "./field-parts";

/**
 * Date input for dates people already know, like a birth date.
 * Three plain number boxes. Never make people scroll back years in a calendar.
 * errorField says which box is wrong: "month", "day", or "year".
 */
export function DateInput({ legend, hint = "For example, 3 27 1952", error, errorField, value = {}, onChange, className }) {
  const s = comp("date-input"); const id = useId();
  const labels = s.labels === "short" ? ["MM", "DD", "YYYY"] : ["Month", "Day", "Year"];
  const parts = [["month", labels[0], 2], ["day", labels[1], 2], ["year", labels[2], 4]];
  return (
    <fieldset className={cn("m-0 p-0 border-0 min-w-0 flex flex-col gap-1.5", className)} aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}>
      <legend className="p-0 mb-1 [font-weight:var(--label-weight)]">{legend}</legend>
      <p id={`${id}-hint`} className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{hint}</p>
      <FieldError id={`${id}-err`}>{error}</FieldError>
      <div className="flex flex-wrap gap-[var(--gap)]">
        {parts.map(([k, l, w]) => (
          <div key={k} className="flex flex-col gap-1">
            <label htmlFor={`${id}-${k}`} className="font-normal">{l}</label>
            <input id={`${id}-${k}`} inputMode="numeric" pattern="[0-9]*" autoComplete={`bday-${k}`} maxLength={w}
              value={value[k] ?? ""} onChange={(e) => onChange && onChange({ ...value, [k]: e.target.value.replace(/\D/g, "") })}
              aria-invalid={error && (!errorField || errorField === k) ? true : undefined}
              className={cn(inputClass, w === 4 ? "w-[calc(4ch+2.4em)]" : "w-[calc(2ch+2.4em)]")} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
