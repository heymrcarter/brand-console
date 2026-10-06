import { useState } from "react";
import { Bell, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const TONES = {
  brand: { Icon: Bell, word: "Notice", cls: "bg-primary text-primary-foreground" },
  info: { Icon: Bell, word: "Notice", cls: "bg-secondary text-secondary-foreground" },
  warning: { Icon: TriangleAlert, word: "Warning", cls: "[background:var(--warning-soft)] text-foreground [border-block-end:2px_solid_var(--warning)]" },
};

/** Moves keyboard focus to the main part of the page after the banner closes. */
function focusPage(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target && target.current;
  if (!el) return;
  if (!el.matches("a[href],button,input,select,textarea,[tabindex]")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

/**
 * Notification banner. A strip across the top of the page for news that matters to everyone, like open enrollment.
 * Use one at a time. Keep it to one sentence and one link.
 */
export function Banner({
  tone, message, children, action, dismissible = false, onDismiss,
  label = "Site notice", focusOnDismiss = "main, [role=main], h1", className,
}) {
  const s = comp("banner");
  const t = TONES[tone || s.tone] || TONES.info;
  const [shown, setShown] = useState(true);
  if (!shown) return null;
  const close = () => { setShown(false); onDismiss && onDismiss(); setTimeout(() => focusPage(focusOnDismiss), 0); };
  return (
    <section aria-label={label} className={cn("w-full", t.cls, className)}>
      <div className="flex items-center gap-[0.7em] [padding:calc(var(--gap)*0.7)_var(--pad)] font-semibold">
        <t.Icon aria-hidden="true" className="size-[1.3em] shrink-0" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />
        <p role="status" className="m-0 flex-1 min-w-0">
          <span className="sr-only">{t.word}: </span>
          {message ?? children}
          {action && action.href && (
            <> <a href={action.href} onClick={action.onClick}
              className="underline underline-offset-4 [color:inherit] rounded-sm focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">{action.label}</a></>
          )}
        </p>
        {dismissible && (
          <button type="button" onClick={close} aria-label="Close this notice"
            className="inline-flex items-center justify-center shrink-0 [width:var(--control-h)] [height:var(--control-h)] -my-[calc(var(--gap)*0.5)] [border-radius:var(--btn-radius)] [color:inherit] cursor-pointer hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
            <X aria-hidden="true" className="size-[1.2em]" />
          </button>
        )}
      </div>
    </section>
  );
}
