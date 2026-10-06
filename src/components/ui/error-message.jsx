import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Error message. Red words under a field that say what is wrong and how to fix it.
 * Give it an id and put that id in the field's aria-describedby. Set announce to read it out as soon as it shows.
 */
export function ErrorMessage({ id, message, children, announce = false, className }) {
  const s = comp("error-message"); const text = message ?? children;
  if (!text) return null;
  return (
    <p id={id} role={announce ? "alert" : undefined}
      className={cn("m-0 flex items-start gap-1.5 [font-size:var(--text-sm)] font-semibold text-destructive-text leading-snug", className)}>
      {s.icon !== "hide" && <CircleAlert aria-hidden="true" className="mt-[.15em] size-[1.1em] shrink-0" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />}
      <span><span className="sr-only">Error:</span> {text}</span>
    </p>
  );
}
