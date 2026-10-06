import { Inbox } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { Icon } from "./icon";

/**
 * Empty state. What a page shows when there is nothing there yet, like no prescriptions.
 * Say why it is empty and give one next step. The Brand Console decides if the picture shows.
 */
export function EmptyState({ icon = Inbox, title, text, children, action, headingLevel = 2, className }) {
  const showIcon = (comp("empty-state").icon || "show") === "show" && icon;
  const H = `h${headingLevel}`;
  return (
    <div className={cn("flex flex-col items-center text-center [gap:calc(var(--gap)*0.7)] [padding:calc(var(--pad)*1.5)_var(--pad)]", className)}>
      {showIcon && (
        <span className="flex items-center justify-center size-[3.2em] rounded-full bg-muted text-muted-foreground">
          <Icon as={icon} size="1.6em" />
        </span>
      )}
      <H className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{title}</H>
      {(text || children) && <div className="m-0 max-w-[36em] text-muted-foreground">{text || children}</div>}
      {action && <div className="flex flex-wrap justify-center [gap:var(--gap)] pt-[calc(var(--gap)*0.3)]">{action}</div>}
    </div>
  );
}
