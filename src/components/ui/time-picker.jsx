import { useId, useMemo } from "react";
// TODO: TimePicker still uses Radix Select. Move it to plain React like Select (see docs/radix-migration-plan.md).
import { Select as S } from "radix-ui";
import { Check, Clock } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

const toMinutes = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
const pad = (n) => String(n).padStart(2, "0");
/** Turns minutes after midnight into a value like "14:30". */
const toValue = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
/** Turns "14:30" into "2:30 PM" (or "14:30" for 24-hour time). */
export function timeLabel(value, format = "12h") {
  const m = toMinutes(value), h = Math.floor(m / 60) % 24, mm = pad(m % 60);
  if (format === "24h") return `${pad(h)}:${mm}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Time picker. A list of times to pick from, like 10:30 AM.
 * Only show times people can pick: set `min` and `max` to the opening hours, and list
 * any taken times in `unavailable`. Values look like "14:30"; people see "2:30 PM".
 */
export function TimePicker({
  label, hint, error, optional, value, defaultValue, onValueChange, min = "09:00", max = "17:00",
  step, unavailable = [], format = "12h", placeholder = "Choose a time", name, disabled, className,
}) {
  const s = comp("time-picker");
  const every = Math.max(5, Number(step ?? s.step ?? 30));
  const fid = useId();
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  const times = useMemo(() => {
    const out = [], skip = new Set(unavailable.map((t) => toValue(toMinutes(t))));
    for (let m = toMinutes(min); m <= toMinutes(max); m += every) { const v = toValue(m); if (!skip.has(v)) out.push(v); }
    return out;
  }, [min, max, every, unavailable]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <S.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
        <S.Trigger id={fid}
          className={cn(inputClass, "flex items-center justify-between gap-2 text-left cursor-pointer max-w-[14em] data-[placeholder]:text-muted-foreground")}
          aria-invalid={error ? true : undefined} aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}>
          <S.Value placeholder={placeholder} />
          <S.Icon><Clock aria-hidden="true" className="size-[1.1em] text-foreground" /></S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content position="popper" sideOffset={6}
            className="z-50 min-w-[var(--radix-select-trigger-width)] max-h-[min(360px,var(--radix-select-content-available-height))] overflow-auto bg-card text-foreground border border-border p-1 [border-radius:var(--field-radius)] [box-shadow:var(--menu-shadow)] [font-family:var(--font-body)] [font-size:var(--text-base)]">
            <S.Viewport>
              {times.length === 0 && <p className="m-0 [padding:10px_12px] text-muted-foreground">There are no open times.</p>}
              {times.map((t) => (
                <S.Item key={t} value={t}
                  className="relative flex items-center gap-2 cursor-pointer outline-none [min-height:calc(var(--control-h)*0.9)] [padding-inline:calc(var(--control-h)*0.24)] rounded-[calc(var(--field-radius)*0.7)] data-[highlighted]:bg-muted data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground data-[state=checked]:font-semibold">
                  <span className="inline-flex size-[1em] shrink-0">
                    <S.ItemIndicator><Check aria-hidden="true" className="size-[1em]" /></S.ItemIndicator>
                  </span>
                  <S.ItemText>{timeLabel(t, format)}</S.ItemText>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </S.Portal>
      </S.Root>
    </div>
  );
}
