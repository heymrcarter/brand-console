import { useId, useState } from "react";
import { Switch as Sw } from "radix-ui";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

/**
 * Switch. An on and off control that works right away, like turning on text reminders.
 * Inside a form with a Submit button, use a checkbox instead.
 */
export function Switch({ label, hint, checked, defaultChecked = false, onCheckedChange, disabled, className }) {
  const s = comp("switch"); const id = useId();
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  return (
    <div className={cn("flex items-center justify-between gap-[var(--gap)] py-[0.3em]", className)}>
      <label htmlFor={id} className="cursor-pointer min-w-0">
        {label}
        {hint && <span className="block [font-size:var(--text-sm)] text-muted-foreground">{hint}</span>}
      </label>
      <span className="flex items-center gap-2 shrink-0">
        {s.stateText !== "no" && <b aria-hidden="true" className="[font-size:var(--text-sm)]">{on ? "On" : "Off"}</b>}
        <Sw.Root id={id} checked={on} disabled={disabled} onCheckedChange={(v) => { setInner(v); onCheckedChange && onCheckedChange(v); }}
          className="relative inline-flex items-center w-[2.75em] h-[1.6em] rounded-full cursor-pointer bg-muted [border:2px_solid_var(--input)] data-[state=checked]:bg-primary data-[state=checked]:border-primary-edge focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] disabled:opacity-50">
          <Sw.Thumb className="block size-[1.05em] rounded-full bg-white shadow translate-x-[3px] transition-transform data-[state=checked]:translate-x-[calc(2.75em-1.05em-7px)] motion-reduce:transition-none" />
        </Sw.Root>
      </span>
    </div>
  );
}
