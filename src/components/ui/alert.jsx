import { Info, CircleCheck, TriangleAlert, CircleAlert } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const TONES = {
  info: { Icon: Info, word: "Information", line: "var(--link)", soft: "var(--secondary)" },
  success: { Icon: CircleCheck, word: "Success", line: "var(--success)", soft: "var(--success-soft)" },
  warning: { Icon: TriangleAlert, word: "Warning", line: "var(--warning)", soft: "var(--warning-soft)" },
  danger: { Icon: CircleAlert, word: "Error", line: "var(--destructive-text)", soft: "var(--destructive-soft)" },
};
/**
 * Alert. A message inside the page that tells people something important.
 * Every tone has its own icon and a hidden word, so color is never the only signal.
 */
export function Alert({ tone = "info", title, children, className }) {
  const s = comp("alert"); const t = TONES[tone] || TONES.info;
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      style={{ borderColor: t.line, background: s.style === "outline" ? "var(--card)" : t.soft }}
      className={cn("flex items-start gap-[0.75em] border-2 [padding:calc(var(--gap)*0.9)] [border-radius:var(--field-radius)] text-foreground", className)}>
      <t.Icon aria-hidden="true" className="shrink-0 size-[1.4em]" style={{ color: t.line }} />
      <div className="flex flex-col gap-1 min-w-0">
        {title && <b><span className="sr-only">{t.word}: </span>{title}</b>}
        {children && <div>{!title && <span className="sr-only">{t.word}: </span>}{children}</div>}
      </div>
    </div>
  );
}
