import { useId } from "react";
import { Tooltip as T, Popover as P } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const toneClass = (tone) => tone === "light"
  ? { box: "bg-card text-foreground border border-border", arrow: "fill-card" }
  : { box: "bg-foreground text-background", arrow: "fill-foreground" };

const bubble = "z-50 max-w-[240px] rounded-[6px] px-[.7em] py-[.35em] leading-[1.35] [font-size:var(--text-sm)] [font-family:var(--font-ui,var(--font-body))] shadow-[0_4px_12px_rgba(0,0,0,.15)]";

/**
 * Tooltip. A short name that shows when people point at or tab to something, like the name of an icon.
 * Never put important information in a tooltip. People on phones cannot see it. Use TermTooltip or the help drawer for explanations.
 */
export function Tooltip({ content, side = "top", tone, children, delayDuration = 300, open, defaultOpen, onOpenChange, className }) {
  const t = toneClass(tone || comp("tooltip").tone || "dark");
  return (
    <T.Provider delayDuration={delayDuration}>
      <T.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} collisionPadding={8} className={cn(bubble, t.box, className)}>
            {content}
            <T.Arrow className={t.arrow} width={12} height={6} />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

/**
 * Term tooltip. A word in a sentence that people tap or click to see what it means, like "copay".
 * It works on phones and with a keyboard. Use it for short definitions of health plan words.
 */
export function TermTooltip({ term, children, definition, title, side = "top", tone, className }) {
  const t = toneClass(tone || comp("tooltip").tone || "dark");
  const id = useId();
  const words = children ?? term;
  return (
    <P.Root>
      <P.Trigger
        className={cn("relative inline cursor-pointer bg-transparent border-0 p-0 m-0 text-inherit [font:inherit] underline decoration-dotted decoration-2 underline-offset-4",
          "after:content-[''] after:absolute after:-inset-x-1 after:top-1/2 after:-translate-y-1/2 after:[height:var(--control-h)]",
          "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] rounded-[2px]", className)}>
        {words}
        <span className="sr-only"> (Tap to see what this means.)</span>
      </P.Trigger>
      <P.Portal>
        <P.Content side={side} sideOffset={8} collisionPadding={8} aria-labelledby={id}
          className={cn("z-50 flex items-start gap-2 max-w-[300px] rounded-[6px] p-[.75em] [font-size:var(--text-sm)] [line-height:var(--lh)] shadow-[0_4px_12px_rgba(0,0,0,.15)] focus:outline-none", t.box)}>
          <div className="flex flex-col gap-1 min-w-0">
            <strong id={id} className="[font-family:var(--font-ui,var(--font-body))]">{title ?? words}</strong>
            <span>{definition}</span>
          </div>
          <P.Close aria-label="Close" className="-m-1 inline-flex shrink-0 items-center justify-center size-10 rounded-full cursor-pointer text-inherit hover:opacity-80 focus-visible:[outline:3px_solid_var(--ring)]">
            <X aria-hidden="true" className="size-5" />
          </P.Close>
          <P.Arrow className={t.arrow} width={12} height={6} />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
