import { useEffect, useRef, useState } from "react";
import { AlertDialog as AD } from "radix-ui";
import { Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { buttonVariants } from "./button";

const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart"];
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function spoken(s) {
  if (s <= 0) return "Time is up.";
  if (s <= 30) return "You have 30 seconds or less left.";
  const m = Math.ceil(s / 60);
  return `You have ${m} ${m === 1 ? "minute" : "minutes"} left.`;
}

/**
 * Session timeout warning. A message that warns people before they are signed out, so they do not lose their work.
 * It counts down and lets people stay signed in with one key press. How early it warns comes from the Brand Console.
 *
 * Two ways to use it:
 *   <SessionTimeout open={open} onStay={...} onSignOut={...} />   // you decide when it opens
 *   <SessionTimeout timeoutMinutes={20} onSignOut={...} />         // it watches for activity and opens by itself
 */
export function SessionTimeout({
  open: openProp, timeoutMinutes = 20, warnMinutes, onStay, onSignOut, onTimeout,
  title = "You will be signed out soon",
  message = "For your safety, we sign you out when you have not done anything for a while. Your answers are saved.",
}) {
  const warn = Number(warnMinutes ?? comp("timeout").warn ?? 5) || 5;
  const controlled = openProp !== undefined;
  const [selfOpen, setSelfOpen] = useState(false);
  const open = controlled ? openProp : selfOpen;
  const lastActive = useRef(Date.now());
  const endAt = useRef(0);
  const [left, setLeft] = useState(warn * 60);
  const [said, setSaid] = useState("");
  const cb = useRef({});
  cb.current = { onStay, onSignOut, onTimeout };

  // Uncontrolled: watch for activity and open the warning before time runs out.
  useEffect(() => {
    if (controlled || open) return;
    const mark = () => { lastActive.current = Date.now(); };
    ACTIVITY.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const t = setInterval(() => {
      if (Date.now() - lastActive.current >= Math.max(0, timeoutMinutes - warn) * 60000) setSelfOpen(true);
    }, 1000);
    return () => { clearInterval(t); ACTIVITY.forEach((e) => window.removeEventListener(e, mark)); };
  }, [controlled, open, timeoutMinutes, warn]);

  // Count down while open. The screen shows every second; screen readers hear it only when the minute changes.
  useEffect(() => {
    if (!open) return;
    endAt.current = Date.now() + warn * 60000;
    setLeft(warn * 60); setSaid("");
    let lastSpoken = spoken(warn * 60);
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      const words = spoken(s);
      if (words !== lastSpoken) { lastSpoken = words; setSaid(words); }
      if (s <= 0) {
        clearInterval(t);
        lastActive.current = Date.now();
        if (!controlled) setSelfOpen(false);
        (cb.current.onTimeout || cb.current.onSignOut)?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [open, warn, controlled]);

  const stay = () => { lastActive.current = Date.now(); if (!controlled) setSelfOpen(false); cb.current.onStay?.(); };
  const signOut = () => { lastActive.current = Date.now(); if (!controlled) setSelfOpen(false); cb.current.onSignOut?.(); };

  return (
    <AD.Root open={open} onOpenChange={() => {}}>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-40" style={{ background: "rgba(20,18,16,var(--overlay))" }} />
        <AD.Content onEscapeKeyDown={(e) => { e.preventDefault(); stay(); }}
          className={cn("fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(460px,calc(100vw-32px))] max-h-[calc(100vh-32px)] overflow-auto",
            "flex flex-col bg-card text-foreground [gap:var(--gap)] [padding:calc(var(--pad)*1.1)] [border-radius:var(--dialog-radius)] shadow-2xl [font-family:var(--font-body)] [font-size:var(--text-base)] [line-height:var(--lh)] focus:outline-none")}>
          <AD.Title className="m-0 flex items-center gap-[0.5em] [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">
            <Clock aria-hidden="true" className="size-[1.1em] shrink-0 text-warning" />{title}
          </AD.Title>
          <p aria-hidden="true" className="m-0 [font-family:var(--font-heading)] [font-size:var(--text-h2)] [font-weight:var(--heading-w)] [font-variant-numeric:tabular-nums] leading-[1.1]">{clock(left)}</p>
          <AD.Description className="m-0 text-muted-foreground">
            <span className="sr-only">{spoken(warn * 60)} </span>{message}
          </AD.Description>
          <p role="status" aria-live="polite" className="sr-only">{said}</p>
          <div className="flex flex-wrap [gap:calc(var(--gap)*0.6)] [justify-content:var(--dialog-justify)] [flex-direction:var(--dialog-dir)]">
            <AD.Action className={buttonVariants({ variant: "outline" })} onClick={signOut}>Sign out now</AD.Action>
            <AD.Cancel className={buttonVariants({ variant: "primary" })} onClick={stay}>Stay signed in</AD.Cancel>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
