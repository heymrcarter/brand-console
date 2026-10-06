import { ChevronRight } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Icon } from "./icon";

/**
 * List. A simple list of items people scan, like recent claims. Each row can link to more details.
 * Each row has one link, on the title, so screen readers do not hear it twice. The whole row can be tapped.
 * On phones, use a list instead of a wide table.
 *
 * items: [{ id, icon, title, detail, href, onClick, badge: { tone, label } | node, action: node }].
 */
export function List({ items = [], lines, label, className }) {
  const s = comp("list");
  const lined = (lines || s.lines || "on") === "on";
  return (
    <ul aria-label={label} className={cn("m-0 p-0 list-none flex flex-col", className)}>
      {items.map((it, i) => {
        const linked = it.href || it.onClick;
        const Title = it.href ? "a" : it.onClick ? "button" : "span";
        const badge = it.badge && typeof it.badge === "object" && "label" in it.badge
          ? <Badge tone={it.badge.tone}>{it.badge.label}</Badge> : it.badge;
        return (
          <li key={it.id ?? i}
            className={cn("relative flex items-center [gap:var(--gap)] [padding:calc(var(--gap)*0.75)_0] [min-height:var(--control-h)]",
              lined && "border-b border-border", linked && "hover:bg-muted/60")}>
            {it.icon && (
              <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center size-[2.4em] rounded-full bg-secondary text-secondary-foreground">
                <Icon as={it.icon} />
              </span>
            )}
            <span className="flex flex-col flex-1 min-w-0">
              <Title
                {...(it.href ? { href: it.href } : {})}
                {...(Title === "button" ? { type: "button", onClick: it.onClick } : {})}
                className={cn("block min-w-0",
                  linked ? "self-start text-left text-link font-semibold underline underline-offset-[3px] cursor-pointer bg-transparent border-0 p-0 [font:inherit] [font-weight:600] rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]"
                    : "font-semibold")}>
                {it.title}
              </Title>
              {it.detail && <span className="[font-size:var(--text-sm)] text-muted-foreground">{it.detail}</span>}
            </span>
            {badge && <span className="shrink-0">{badge}</span>}
            {it.action && <span className="relative z-[1] shrink-0">{it.action}</span>}
            {linked && !it.action && <ChevronRight aria-hidden="true" className="shrink-0 size-[1.15em] text-muted-foreground" />}
          </li>
        );
      })}
    </ul>
  );
}
