import { useId } from "react";
import { Popover as P } from "radix-ui";
import { Info, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

/**
 * Popover. A small box that opens next to a button when people click it. It holds a short explanation or a few actions.
 * For longer help, use the help drawer.
 */
export function Popover({ trigger, triggerLabel = "What does this cost?", title, children, action, side = "bottom", align = "start", open, defaultOpen, onOpenChange, className }) {
  const id = useId();
  return (
    <P.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <P.Trigger asChild>
        {trigger || <Button variant="outline" icon={<Info aria-hidden="true" className="size-[1.1em]" />}>{triggerLabel}</Button>}
      </P.Trigger>
      <P.Portal>
        <P.Content side={side} align={align} sideOffset={8} collisionPadding={12} aria-labelledby={title ? id : undefined}
          className={cn("z-50 relative flex flex-col gap-1.5 w-[min(320px,calc(100vw-24px))] bg-card text-foreground border border-border [padding:calc(var(--gap)*0.8)] pr-12",
            "[border-radius:var(--field-radius)] [box-shadow:var(--menu-shadow)] [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)] focus:outline-none", className)}>
          {title && <p id={id} className="m-0 font-bold">{title}</p>}
          <div className="[font-size:var(--text-sm)] flex flex-col gap-1.5">{children}</div>
          {action && <div className="flex flex-wrap gap-2 pt-1 [font-size:var(--text-sm)]">{action}</div>}
          <P.Close aria-label="Close" className="absolute top-1.5 right-1.5 inline-flex items-center justify-center size-10 rounded-full cursor-pointer text-link hover:bg-muted focus-visible:[outline:3px_solid_var(--ring)]">
            <X aria-hidden="true" className="size-5" />
          </P.Close>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
export const PopoverClose = P.Close;
