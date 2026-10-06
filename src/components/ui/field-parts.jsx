import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/utils";

/** The label above a field. Marks optional fields with the word "(optional)". */
export function FieldLabel({ htmlFor, children, optional, as: As = "label", className }) {
  return (
    <As htmlFor={As === "label" ? htmlFor : undefined} className={cn("block [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))] text-foreground", className)}>
      {children}
      {optional && <>{" "}<span className="font-normal text-muted-foreground">(optional)</span></>}
    </As>
  );
}
/** Help text under the label. */
export function FieldHint({ id, children }) {
  if (!children) return null;
  return <p id={id} className="m-0 [font-size:var(--text-sm)] text-muted-foreground leading-snug">{children}</p>;
}
/** Says what is wrong and how to fix it. Never uses color alone. */
export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="m-0 flex items-start gap-1.5 [font-size:var(--text-sm)] font-semibold text-destructive-text leading-snug">
      <CircleAlert aria-hidden="true" className="mt-[.15em] size-[1.1em] shrink-0" />
      <span><span className="sr-only">Error:</span> {children}</span>
    </p>
  );
}
/** Shared look for boxes people type into. */
export const inputClass =
  "w-full min-w-0 bg-card text-foreground [font-family:var(--font-body)] [font-size:var(--text-base)] [height:var(--control-h)] " +
  "[padding-inline:calc(var(--control-h)*0.28)] [border:var(--field-border-w)_solid_var(--field-border)] [border-radius:var(--field-radius)] " +
  "placeholder:text-muted-foreground focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:1px] " +
  "disabled:bg-muted disabled:text-muted-foreground aria-invalid:[border:2px_solid_var(--destructive-text)]";
