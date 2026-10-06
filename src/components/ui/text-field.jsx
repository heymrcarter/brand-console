import { forwardRef, useId } from "react";
import { cn } from "../../lib/utils";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

const WIDTHS = { full: "w-full", 2: "max-w-[calc(2ch+2.6em)]", 4: "max-w-[calc(4ch+2.6em)]", 10: "max-w-[calc(10ch+2.6em)]", 20: "max-w-[calc(20ch+2.6em)]" };

/**
 * Text field. A box where people type, with a label above it and help text.
 * Always give it a label. Put help text under the label, not inside the box.
 */
/** The ref points to the <input>. Other props (name, value, onChange, and so on) go to the <input> too. */
export const TextField = forwardRef(function TextField({ label, hint, error, optional, width = "full", id, className, ...props }, ref) {
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <input ref={ref} id={fid} className={cn(inputClass, WIDTHS[width])} aria-invalid={error ? true : undefined} aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined} {...props} />
    </div>
  );
});
TextField.displayName = "TextField";
