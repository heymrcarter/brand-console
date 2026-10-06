import { TriangleAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import { Icon } from "./icon";

/**
 * Inset text. Text set apart from the page with a line on its side, for one key point.
 * The line thickness comes from the Brand Console.
 */
export function InsetText({ children, className }) {
  return (
    <div className={cn("[border-left:var(--c-callout-weight,4px)_solid_var(--input)] [padding:calc(var(--gap)*0.5)_var(--gap)] [&>p]:m-0", className)}>
      {children}
    </div>
  );
}

/**
 * Warning text. A callout for safety information, like when to call 911.
 * It always has a warning icon and the word "Important", so color is never the only signal.
 * Screen readers always hear "Important:" first, even with a different title.
 */
export function WarningText({ title = "Important", children, className }) {
  const plain = /^important$/i.test(String(title).trim());
  return (
    <div className={cn("flex flex-col gap-[6px] [background:var(--warning-soft)] [border-radius:var(--field-radius)] [padding:var(--gap)] text-foreground [&_p]:m-0", className)}>
      <div className="flex items-center gap-[0.5em] font-extrabold text-warning [font-family:var(--font-ui,var(--font-body))]">
        <Icon as={TriangleAlert} />
        <span>{!plain && <span className="sr-only">Important: </span>}{title}{plain && <span className="sr-only">:</span>}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
