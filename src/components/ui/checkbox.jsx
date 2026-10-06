import { useId } from "react";
import { Checkbox as C } from "radix-ui";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";
import { FieldError } from "./field-parts";

/**
 * Checkbox. A small box people tick. They can pick more than one.
 * The whole label is part of the tap area. Box size grows with the text size.
 */
export function Checkbox({ label, hint, error, checked, defaultChecked, onCheckedChange, disabled, id, className }) {
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-[0.7em] py-[0.3em]">
        <C.Root id={fid} checked={checked} defaultChecked={defaultChecked} onCheckedChange={onCheckedChange} disabled={disabled}
          aria-invalid={error ? true : undefined} aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
          className={cn("peer shrink-0 inline-flex items-center justify-center cursor-pointer bg-card [width:var(--c-checkbox-size,1.5em)] [height:var(--c-checkbox-size,1.5em)] [border:2px_solid_var(--input)] [border-radius:var(--c-checkbox-radius,4px)] text-primary-foreground",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary-edge data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary-edge",
            "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] disabled:opacity-50 aria-invalid:border-destructive-text")}>
          <C.Indicator className="flex">
            {checked === "indeterminate" ? <Minus aria-hidden="true" strokeWidth={3.5} className="size-[0.8em]" /> : <Check aria-hidden="true" strokeWidth={3.5} className="size-[0.8em]" />}
          </C.Indicator>
        </C.Root>
        <label htmlFor={fid} className="cursor-pointer pt-[calc((var(--c-checkbox-size,1.5em)-1.5em)/2)]">
          {label}
          {hint && <span id={hintId} className="block [font-size:var(--text-sm)] text-muted-foreground">{hint}</span>}
        </label>
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}
