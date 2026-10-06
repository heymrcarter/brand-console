import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const focusRing = "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:-3px]";

function NavItem({ item, current, bar, level }) {
  const id = item.id || item.href || item.label;
  const on = id === current || item.current;
  return (
    <li>
      <a href={item.href || "#"} aria-current={on ? "page" : undefined}
        className={cn("flex items-center [min-height:var(--control-h)] [padding-block:calc(var(--gap)*.35)] [padding-inline:calc(var(--gap)*.8)] [border-radius:var(--field-radius)] [font-family:var(--font-ui,var(--font-body))] leading-snug",
          level > 0 && "[padding-left:calc(var(--gap)*2)] [font-size:var(--text-sm)]",
          on ? cn("font-bold text-secondary-foreground no-underline", bar ? "rounded-none [box-shadow:inset_4px_0_0_var(--primary-edge)]" : "bg-secondary")
             : "text-link underline underline-offset-[3px] hover:bg-muted",
          focusRing)}>
        {item.label}
      </a>
      {item.children && item.children.length > 0 && level === 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-0.5 mt-0.5">
          {item.children.map((c) => <NavItem key={c.id || c.href || c.label} item={c} current={current} bar={bar} level={1} />)}
        </ul>
      )}
    </li>
  );
}

/**
 * Side navigation. A list of links down the side of the page for moving around one section, like your claims.
 * Use it when a section has more than five pages. Keep it to two levels.
 */
export function SideNav({ items = [], current, label = "Section", currentStyle, className }) {
  const s = comp("side-nav");
  const bar = (currentStyle || s.current || "fill") === "bar";
  return (
    <nav aria-label={label} className={cn("max-w-[260px] [font-size:var(--text-base)]", className)}>
      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {items.map((it) => <NavItem key={it.id || it.href || it.label} item={it} current={current} bar={bar} level={0} />)}
      </ul>
    </nav>
  );
}
