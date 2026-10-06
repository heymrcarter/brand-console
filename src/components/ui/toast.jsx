import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Toast as T } from "radix-ui";
import { CircleCheck, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const Ctx = createContext(null);
let seq = 0;

/** Turns the brand setting (seconds, 0 means "stays until closed") into milliseconds for Radix. */
const toMs = (sec) => (Number(sec) > 0 ? Number(sec) * 1000 : Infinity);

/**
 * Toast provider. Wrap the app in it once, and put a Toaster inside it.
 * Then call useToast() anywhere to show a short message after an action, like "Your address is saved."
 */
export function ToastProvider({ children, label = "Messages" }) {
  const s = comp("toast");
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const toast = useCallback((opts) => {
    const o = typeof opts === "string" ? { message: opts } : opts || {};
    const id = o.id || `toast-${++seq}`;
    setToasts((list) => [...list.filter((x) => x.id !== id), { ...o, id }]);
    return id;
  }, []);
  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
  return (
    <T.Provider duration={toMs(s.duration ?? 10)} swipeDirection="right" label={label}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </T.Provider>
  );
}

/**
 * Shows toasts. Call toast({ message, action: { label, onClick } }) or toast("Saved.").
 * Pass duration in seconds to change how long one stays, and 0 to keep it until people close it.
 */
export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside a ToastProvider.");
  return { toast: c.toast, dismiss: c.dismiss };
}

/**
 * Toaster. The place on the screen where toasts show up. Put it once inside the ToastProvider.
 * Toasts are read out politely and stay while the mouse or keyboard focus is on them.
 */
export function Toaster({ className }) {
  const c = useContext(Ctx);
  if (!c) return null;
  return (
    <>
      {c.toasts.map((t) => (
        <T.Root key={t.id} type="background" defaultOpen
          duration={t.duration !== undefined ? toMs(t.duration) : undefined}
          onOpenChange={(open) => { if (!open) { c.dismiss(t.id); t.onClose && t.onClose(); } }}
          className={cn("pointer-events-auto flex items-center flex-wrap gap-x-[0.8em] gap-y-2 w-full bg-foreground text-background",
            "[border-radius:var(--field-radius)] [padding:0.6em_0.6em_0.6em_1.1em] shadow-[0_10px_30px_rgba(0,0,0,.2)] [font-family:var(--font-body)] [font-size:var(--text-base)]",
            "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform motion-reduce:transition-none",
            "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]")}>
          <CircleCheck aria-hidden="true" className="size-[1.25em] shrink-0" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />
          <T.Description className="flex-1 min-w-[10ch] m-0">{t.message}</T.Description>
          {t.action && (
            <T.Action altText={t.action.altText || t.action.label} asChild>
              <button type="button" onClick={t.action.onClick}
                className="inline-flex items-center [min-height:var(--control-h)] px-3 underline underline-offset-4 font-semibold [color:inherit] [font-family:var(--font-ui,var(--font-body))] [border-radius:var(--btn-radius)] cursor-pointer hover:bg-[color-mix(in_srgb,currentColor_14%,transparent)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
                {t.action.label}
              </button>
            </T.Action>
          )}
          <T.Close aria-label="Close this message"
            className="inline-flex items-center justify-center shrink-0 [width:var(--control-h)] [height:var(--control-h)] [border-radius:var(--btn-radius)] [color:inherit] cursor-pointer hover:bg-[color-mix(in_srgb,currentColor_14%,transparent)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
            <X aria-hidden="true" className="size-[1.15em]" />
          </T.Close>
        </T.Root>
      ))}
      <T.Viewport className={cn("fixed z-[100] bottom-0 right-0 m-0 list-none flex flex-col gap-2 [padding:var(--gap)] w-[min(440px,100vw)] max-h-screen outline-none", className)} />
    </>
  );
}
