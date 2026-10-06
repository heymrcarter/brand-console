import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Label and help text. The words above a field that say what to type, and the smaller words that help.
 * Use it when you build your own control. Connect it with htmlFor, or use labelId and hintId with aria-labelledby and aria-describedby.
 */
export function LabelHint({ htmlFor, label, children, hint, optional = false, labelId, hintId, as, className }) {
  const s = comp("label-hint"); const mark = s.mark === "required" ? "required" : "optional";
  const As = as || (htmlFor ? "label" : "span");
  const hid = hintId || (hint && htmlFor ? `${htmlFor}-hint` : undefined);
  const word = mark === "optional" && optional ? "(optional)" : mark === "required" && !optional ? "(required)" : null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <As id={labelId} htmlFor={As === "label" ? htmlFor : undefined}
        className="block [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))] text-foreground">
        {label ?? children}
        {word && <>{" "}<span className="font-normal text-muted-foreground">{word}</span></>}
      </As>
      {hint && <p id={hid} className="m-0 [font-size:var(--text-sm)] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}
