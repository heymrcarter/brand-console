import { isValidElement, useState } from "react";
import { ToggleGroup } from "radix-ui";
import { Check } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Icon } from "./icon";

const ITEM =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none cursor-pointer select-none border-2 -ml-[2px] first:ml-0 " +
  "[height:var(--control-h)] [padding-inline:calc(var(--control-h)*0.3)] [font-family:var(--font-ui,var(--font-body))] " +
  "[font-size:var(--text-base)] [font-weight:var(--btn-weight)] [text-transform:var(--btn-case)] [letter-spacing:var(--btn-track)] " +
  "bg-card text-link border-input hover:bg-muted rounded-none first:[border-start-start-radius:var(--btn-radius)] first:[border-end-start-radius:var(--btn-radius)] " +
  "last:[border-start-end-radius:var(--btn-radius)] last:[border-end-end-radius:var(--btn-radius)] " +
  "focus-visible:z-20 focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:3px] disabled:opacity-45 disabled:cursor-not-allowed data-[state=on]:z-10";
const SELECTED = {
  soft: "data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:border-link",
  solid: "data-[state=on]:[background:var(--btn-bg)] data-[state=on]:[color:var(--btn-fg)] data-[state=on]:border-(--btn-border) data-[state=on]:hover:[background:var(--btn-bg-hover)]",
};

/**
 * Button group. A few buttons joined together where people pick one, like Day, Week, or Month.
 * Use it to switch between views of the same thing. For choices in a form, use radio buttons.
 */
export function ButtonGroup({ label, options = [], value, defaultValue, onChange, onValueChange, disabled, className }) {
  const s = comp("button-group");
  const look = SELECTED[s.selected] ? s.selected : "soft";
  const [inner, setInner] = useState(defaultValue ?? (options[0] && options[0].value) ?? "");
  const current = value !== undefined ? value : inner;
  const change = (v) => {
    if (!v) return; // Keep one choice picked. Pressing the chosen button again does nothing.
    if (value === undefined) setInner(v);
    onChange && onChange(v);
    onValueChange && onValueChange(v);
  };
  return (
    <ToggleGroup.Root type="single" value={current} onValueChange={change} disabled={disabled} aria-label={label}
      className={cn("inline-flex flex-wrap max-w-full", className)}>
      {options.map((o) => {
        const on = o.value === current;
        const own = isValidElement(o.icon) ? o.icon : o.icon ? <Icon as={o.icon} /> : null;
        return (
          <ToggleGroup.Item key={o.value} value={o.value} disabled={o.disabled} className={cn(ITEM, SELECTED[look])}>
            {/* The chosen button also shows a check mark, so color is not the only sign. */}
            {on ? <Check aria-hidden="true" className="size-[1.1em] shrink-0" /> : own}
            {o.label}
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
