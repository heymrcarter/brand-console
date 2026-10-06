import { Tabs as T } from "radix-ui";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Tabs. A row of labels that switch between views on the same page.
 * Do not use tabs for steps in a process.
 */
export function Tabs({ tabs = [], value, defaultValue, onValueChange, label = "Views", className }) {
  const s = comp("tabs"); const box = s.style === "box";
  return (
    <T.Root value={value} defaultValue={defaultValue || (tabs[0] && tabs[0].value)} onValueChange={onValueChange} className={cn("flex flex-col", className)}>
      <T.List aria-label={label} className={cn("flex flex-wrap gap-1", !box && "border-b border-border")}>
        {tabs.map((t) => (
          <T.Trigger key={t.value} value={t.value}
            className={cn("inline-flex items-center gap-2 cursor-pointer font-semibold text-link [font-family:var(--font-ui,var(--font-body))] [min-height:var(--control-h)] [padding-inline:calc(var(--gap)*0.9)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:-3px]",
              box ? "bg-muted border border-border [border-radius:var(--field-radius)_var(--field-radius)_0_0] data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:[box-shadow:inset_0_3px_0_var(--primary-edge)]"
                  : "data-[state=active]:text-foreground data-[state=active]:[box-shadow:inset_0_-4px_0_var(--primary-edge)]")}>
            {t.label}
            {t.count != null && <span className="rounded-full bg-muted text-foreground px-2 [font-size:var(--text-sm)]">{t.count}</span>}
          </T.Trigger>
        ))}
      </T.List>
      {tabs.map((t) => <T.Content key={t.value} value={t.value} className="pt-[var(--gap)] focus-visible:[outline:3px_solid_var(--ring)]">{t.content}</T.Content>)}
    </T.Root>
  );
}
