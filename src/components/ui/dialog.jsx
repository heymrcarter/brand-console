import { forwardRef } from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Pop-up (dialog). A small window that asks a question before going on.
 * The title asks the question. The main button repeats the action, like "Delete this address".
 * Focus moves into it and stays there. Esc closes it.
 */
/** The ref points to the pop-up box itself (the element with role="dialog"). It is empty while the pop-up is closed. */
export const Dialog = forwardRef(function Dialog({ trigger, title, description, children, actions, open, onOpenChange }, ref) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40" style={{ background: "rgba(20,18,16,var(--overlay))" }} />
        <D.Content ref={ref} className={cn("fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(460px,calc(100vw-32px))] max-h-[calc(100vh-32px)] overflow-auto",
          "flex flex-col bg-card text-foreground [gap:var(--gap)] [padding:calc(var(--pad)*1.1)] [border-radius:var(--dialog-radius)] shadow-2xl [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)] focus:outline-none")}>
          <D.Title className="m-0 pr-10 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{title}</D.Title>
          {description ? <D.Description className="m-0 text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          {children}
          {actions && <div className="flex flex-wrap [gap:calc(var(--gap)*0.6)] [justify-content:var(--dialog-justify)] [flex-direction:var(--dialog-dir)]">{actions}</div>}
          <D.Close aria-label="Close" className="absolute top-3 right-3 inline-flex items-center justify-center size-10 rounded-full text-link hover:bg-muted focus-visible:[outline:3px_solid_var(--ring)]"><X aria-hidden="true" className="size-5" /></D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
});
Dialog.displayName = "Dialog";
export const DialogClose = D.Close;
