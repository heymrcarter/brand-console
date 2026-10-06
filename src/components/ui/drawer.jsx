import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

/**
 * Drawer. A panel that slides in from the side, for a short form or details about one item, without leaving the page.
 * It works like a pop-up: focus moves in and stays in, and Esc closes it. On phones it fills the screen.
 * Use a full page for anything long.
 */
export function Drawer({ trigger, title, description, children, footer, side, width, open, defaultOpen, onOpenChange, closeLabel = "Close", className }) {
  const s = comp("drawer");
  const sd = (side || s.side || "right") === "left" ? "left" : "right";
  const w = (width || s.width || "narrow") === "wide" ? "wide" : "narrow";
  return (
    <D.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none" style={{ background: "rgba(20,18,16,var(--overlay))" }} />
        <D.Content
          className={cn("fixed z-50 top-0 bottom-0 flex flex-col w-full max-w-full bg-card text-foreground",
            "[font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)] focus:outline-none shadow-2xl",
            "transition-transform duration-300 ease-out motion-reduce:transition-none",
            sd === "right" ? "right-0 starting:translate-x-full" : "left-0 starting:-translate-x-full",
            w === "wide" ? "sm:w-[min(44rem,100vw)]" : "sm:w-[min(28rem,100vw)]", className)}>
          <div className="flex items-center justify-between gap-3 border-b border-border [padding:var(--gap)_var(--pad)]">
            <D.Title className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{title}</D.Title>
            <D.Close aria-label={closeLabel}
              className="shrink-0 inline-flex items-center justify-center cursor-pointer bg-transparent border-2 border-transparent text-link hover:bg-muted [width:var(--control-h)] [height:var(--control-h)] [border-radius:var(--c-icon-button-shape,var(--btn-radius))] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
              <X aria-hidden="true" className="size-[1.2em]" />
            </D.Close>
          </div>
          {description ? <D.Description className="m-0 text-muted-foreground [padding:var(--gap)_var(--pad)_0]">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          <div className="flex-1 overflow-auto flex flex-col [gap:var(--gap)] [padding:var(--pad)]">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border [padding:var(--gap)_var(--pad)]">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export const DrawerClose = D.Close;
