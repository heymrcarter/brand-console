import { cn } from "../../lib/utils";
/**
 * Card. A box that groups things that belong together, like one account or one order.
 * Keep one main action per card. Do not put a card inside another card.
 */
export function Card({ title, children, action, className, as: As = "section" }) {
  return (
    <As className={cn("flex flex-col min-w-0 bg-panel [backdrop-filter:blur(var(--panel-blur))] text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]", className)}>
      {title && <h3 className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{title}</h3>}
      {children}
      {action && <div className="flex flex-wrap gap-[var(--gap)]">{action}</div>}
    </As>
  );
}
