import { CircleCheck, Clock, CircleAlert } from "lucide-react";
import { cn } from "../../lib/utils";

const TONE = {
  neutral: "bg-muted text-foreground",
  brand: "bg-primary text-primary-foreground",
  info: "bg-accent text-accent-foreground",
  success: "[background:var(--success-soft)] text-success",
  warning: "[background:var(--warning-soft)] text-warning",
  danger: "[background:var(--destructive-soft)] text-destructive-text",
};
const ICON = { success: CircleCheck, warning: Clock, danger: CircleAlert };
/**
 * Badge. A small label that shows a status, like "In network" or "Due soon".
 * One to three words. Status tones always show an icon.
 */
export function Badge({ tone = "info", icon, children, className }) {
  const Icon = icon === false ? null : icon || ICON[tone];
  return (
    <span className={cn("inline-flex items-center gap-[0.3em] whitespace-nowrap font-bold [font-family:var(--font-ui,var(--font-body))] [font-size:var(--text-sm)] px-[0.7em] py-[0.15em] [border-radius:var(--c-badge-shape,999px)]", TONE[tone] || TONE.info, className)}>
      {Icon && <Icon aria-hidden="true" className="size-[1em]" />}
      {children}
    </span>
  );
}
