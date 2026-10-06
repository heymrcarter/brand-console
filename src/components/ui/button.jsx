import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "../../lib/utils";

/**
 * Button. People press it to do something, like save or pay.
 * Use one primary button per screen for the main action.
 * Height comes from the screen type and text size. Corners, word weight,
 * and letter case come from the Brand Console.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none cursor-pointer select-none border-2 " +
  "[height:var(--control-h)] [padding-inline:calc(var(--control-h)*var(--btn-pad-x,0.42))] [border-radius:var(--btn-radius)] [font-family:var(--font-ui,var(--font-body))] " +
  "[font-size:var(--text-base)] [font-weight:var(--btn-weight)] [text-transform:var(--btn-case)] [letter-spacing:var(--btn-track)] " +
  "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:3px] disabled:opacity-45 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "[background:var(--btn-bg)] [color:var(--btn-fg)] border-(--btn-border) hover:[background:var(--btn-bg-hover)]",
        outline: "bg-card text-link border-input hover:bg-muted",
        quiet: "border-transparent bg-secondary text-secondary-foreground hover:brightness-95",
        ghost: "border-transparent bg-transparent text-link underline underline-offset-4 hover:bg-muted",
        danger: "bg-destructive text-destructive-foreground border-destructive-text hover:brightness-95",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", fullWidth: false },
  }
);

/** The ref points to the <button> (or to the child element when asChild is on). */
export const Button = forwardRef(function Button({ className, variant, fullWidth, loading = false, icon, asChild = false, children, disabled, ...props }, ref) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, fullWidth }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <span aria-hidden="true" className="inline-block size-[1.1em] rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" /> : icon}
      {/* Slot needs one child to merge into. Slottable marks it, so the icon or spinner can sit beside it. */}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
});
Button.displayName = "Button";
