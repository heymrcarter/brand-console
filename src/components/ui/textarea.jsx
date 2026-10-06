import { useId, useState } from "react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

/**
 * Text area. A big box for longer answers, like a note to a doctor.
 * Shows how many characters are left when maxLength is set.
 */
export function Textarea({ label, hint, error, optional, maxLength, rows, id, className, defaultValue = "", value, onChange, ...props }) {
  const s = comp("textarea");
  const auto = useId(); const fid = id || auto;
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const left = maxLength ? maxLength - String(text).length : null;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined, cntId = maxLength ? fid + "-count" : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <textarea id={fid} rows={rows || s.rows || 5} value={text} onChange={(e) => { setInner(e.target.value); onChange && onChange(e); }}
        className={cn(inputClass, "h-auto py-[0.6em] [line-height:var(--lh)] resize-y")}
        aria-invalid={error || (left !== null && left < 0) ? true : undefined}
        aria-describedby={[hintId, errId, cntId].filter(Boolean).join(" ") || undefined} {...props} />
      {maxLength && s.count !== "hide" && (
        <p id={cntId} aria-live="polite" className={cn("m-0 [font-size:var(--text-sm)]", left < 0 ? "text-destructive-text font-semibold" : "text-muted-foreground")}>
          {left >= 0 ? `You have ${left} character${left === 1 ? "" : "s"} left.` : `You have ${-left} character${left === -1 ? "" : "s"} too many.`}
        </p>
      )}
    </div>
  );
}
