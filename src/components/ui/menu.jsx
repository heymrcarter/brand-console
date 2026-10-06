import { Fragment } from "react";
import { DropdownMenu as M } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Icon } from "./icon";

/**
 * Menu. A list of actions that opens from a button, like Edit, Print, or Delete.
 * Put the most used action first. Put anything that deletes last, in red, after a line.
 *
 * items: [{ label, icon, onSelect, danger, disabled }] or { separator: true }.
 * A line is added before the first danger item for you.
 */
export function Menu({ label = "Actions", trigger, items = [], align = "start", open, onOpenChange, className }) {
  let seenDanger = false;
  return (
    <M.Root open={open} onOpenChange={onOpenChange}>
      <M.Trigger asChild>
        {trigger || <Button variant="outline">{label}<ChevronDown aria-hidden="true" className="size-[1.1em]" /></Button>}
      </M.Trigger>
      <M.Portal>
        <M.Content align={align} sideOffset={6} collisionPadding={8}
          className={cn("z-50 min-w-[220px] max-w-[calc(100vw-16px)] flex flex-col p-1 bg-card text-foreground border border-border [border-radius:var(--field-radius)] [box-shadow:var(--menu-shadow)]",
            "[font-family:var(--font-ui,var(--font-body))] [font-size:var(--text-base)]", className)}>
          {items.map((it, i) => {
            if (it.separator) return <M.Separator key={"sep" + i} className="my-1 [height:var(--c-divider-weight,1px)] bg-border" />;
            const addLine = it.danger && !seenDanger && i > 0 && !items[i - 1].separator;
            if (it.danger) seenDanger = true;
            return (
              <Fragment key={it.id ?? it.label ?? i}>
                {addLine && <M.Separator className="my-1 [height:var(--c-divider-weight,1px)] bg-border" />}
                <M.Item onSelect={it.onSelect} disabled={it.disabled}
                  className={cn("flex items-center gap-2 cursor-pointer select-none outline-none [min-height:var(--control-h)] [padding-inline:calc(var(--control-h)*0.24)] [border-radius:calc(var(--field-radius)*0.7)]",
                    "data-[highlighted]:bg-secondary data-[highlighted]:text-secondary-foreground data-[highlighted]:font-semibold data-[highlighted]:[outline:3px_solid_var(--ring)] data-[highlighted]:[outline-offset:-3px]",
                    "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
                    it.danger && "text-destructive-text data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-text")}>
                  {it.icon && <Icon as={it.icon} />}
                  <span>{it.label}</span>
                </M.Item>
              </Fragment>
            );
          })}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
