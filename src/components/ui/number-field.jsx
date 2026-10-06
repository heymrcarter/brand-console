import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";
import { IconButton } from "./icon-button";

/** Keeps numbers and one dot. Removes $, commas, and spaces. */
function clean(text, decimals) {
  let t = String(text).replace(/[^\d.]/g, "");
  if (!decimals) return t.replace(/\./g, "");
  const i = t.indexOf(".");
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, "").slice(0, decimals);
  return t;
}
const toNumber = (t) => (t === "" || t === "." ? null : Number(t));
const LIMIT = "aria-disabled:opacity-45 aria-disabled:cursor-not-allowed";
const show = (n, kind) => (n === null || n === undefined || Number.isNaN(n) ? "" : kind === "currency" ? Number(n).toFixed(2) : String(n));

/**
 * Number field. A box for amounts, like how many refills or how much to pay.
 * `kind` is "count", "currency", or "percent". Money shows a dollar sign so people do not type it.
 * Counts can show plus and minus buttons. Say the limits in the help text.
 */
export function NumberField({
  label, hint, error, optional, kind = "count", value, defaultValue, onValueChange,
  min = 0, max, step = 1, stepper, name, disabled, id, className, ...props
}) {
  const s = comp("number");
  const showStepper = kind === "count" && (stepper ?? (s.stepper ?? "show") !== "hide");
  const decimals = kind === "currency" ? 2 : kind === "percent" ? 1 : 0;
  const auto = useId(); const fid = id || auto;
  const errId = error ? fid + "-err" : undefined, hintId = fid + "-hint";
  const [text, setText] = useState(() => show(value ?? defaultValue, kind));
  const [said, setSaid] = useState("");

  // When the app changes the value, show it in the box.
  useEffect(() => {
    if (value !== undefined && toNumber(clean(text, decimals)) !== value) setText(show(value, kind));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = toNumber(clean(text, decimals));
  const send = (n) => onValueChange && onValueChange(n);
  const type = (e) => { const t = clean(e.target.value, decimals); setText(t); send(toNumber(t)); };
  const tidy = () => { if (kind === "currency" && num !== null) setText(show(num, kind)); };
  const bump = (dir) => {
    let n = (num ?? min ?? 0) + dir * step;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    setText(show(n, kind)); send(n); setSaid(`The amount is now ${n}.`);
  };

  // At a limit the button looks turned off but keeps keyboard focus, so people do not get lost.
  const atMin = min !== undefined && num !== null && num <= min;
  const atMax = max !== undefined && num !== null && num >= max;
  const hintText = hint !== undefined ? hint
    : max !== undefined && kind === "count" ? `You can pick from ${min} to ${max}.` : undefined;
  const describedBy = [hintText && hintId, errId].filter(Boolean).join(" ") || undefined;
  const unit = kind === "currency" ? " (in dollars)" : kind === "percent" ? " (percent)" : "";

  const input = (
    <input id={fid} type="text" name={name} value={text} disabled={disabled}
      inputMode={decimals ? "decimal" : "numeric"} pattern={decimals ? undefined : "[0-9]*"} autoComplete="off"
      onChange={type} onBlur={tidy}
      onKeyDown={(e) => {
        if (kind !== "count") return;
        if (e.key === "ArrowUp") { e.preventDefault(); bump(1); } else if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
      }}
      aria-invalid={error ? true : undefined} aria-describedby={describedBy}
      className={cn(inputClass, "tabular-nums",
        kind === "currency" && "[padding-inline-start:calc(var(--control-h)*0.28+1em)]",
        kind === "percent" && "[padding-inline-end:calc(var(--control-h)*0.28+1.2em)]",
        showStepper && "text-center")}
      {...props} />
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}{unit && <span className="sr-only">{unit}</span>}</FieldLabel>
      <FieldHint id={hintText ? hintId : undefined}>{hintText}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      {showStepper ? (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Minus} label="Take away one" showLabel={false} tooltip={false} aria-controls={fid}
            disabled={disabled} aria-disabled={atMin || undefined} className={LIMIT} onClick={() => !atMin && bump(-1)} />
          <div className="w-[4.5em] shrink-0">{input}</div>
          <IconButton icon={Plus} label="Add one" showLabel={false} tooltip={false} aria-controls={fid}
            disabled={disabled} aria-disabled={atMax || undefined} className={LIMIT} onClick={() => !atMax && bump(1)} />
        </div>
      ) : (
        <div className={cn("relative", kind === "count" ? "w-[5em]" : "max-w-[12em]")}>
          {kind === "currency" && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center [padding-inline-start:calc(var(--control-h)*0.28)] text-muted-foreground">$</span>
          )}
          {input}
          {kind === "percent" && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 flex items-center [padding-inline-end:calc(var(--control-h)*0.28)] text-muted-foreground">%</span>
          )}
        </div>
      )}
      {/* Reads the new amount out loud after someone presses plus or minus. */}
      {showStepper && <span role="status" className="sr-only">{said}</span>}
    </div>
  );
}
