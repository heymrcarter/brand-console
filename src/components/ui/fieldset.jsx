import { useId } from "react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { ErrorMessage } from "./error-message";

/**
 * Fieldset (question group). A group of fields that answer one question, like an address.
 * Write the legend as the question. Screen readers read it before each field in the group.
 */
export function Fieldset({ legend, hint, error, headingLevel = 3, children, id, className }) {
  const s = comp("fieldset"); const big = (s.legend || "h3") === "h3";
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  const H = `h${Math.min(6, Math.max(1, headingLevel))}`;
  return (
    <fieldset id={fid} aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
      className={cn("m-0 p-0 border-0 min-w-0 flex flex-col [gap:var(--gap)]",
        error && "[border-inline-start:4px_solid_var(--destructive-text)] [padding-inline-start:calc(var(--gap)*0.8)]", className)}>
      <legend className="p-0 mb-[calc(var(--gap)*0.5)] float-left w-full">
        {big
          ? <H className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-weight:var(--heading-w)] [font-size:var(--text-h3)] leading-tight text-foreground">{legend}</H>
          : <span className="block [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))] text-foreground">{legend}</span>}
      </legend>
      {(hint || error) && (
        <div className="clear-both flex flex-col gap-1.5 -mt-[calc(var(--gap)*0.5)]">
          {hint && <p id={hintId} className="m-0 [font-size:var(--text-sm)] text-muted-foreground leading-snug">{hint}</p>}
          <ErrorMessage id={errId}>{error}</ErrorMessage>
        </div>
      )}
      <div className="clear-both flex flex-col [gap:var(--gap)] min-w-0">{children}</div>
    </fieldset>
  );
}
