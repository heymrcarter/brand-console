import { isValidElement } from "react";
import { cva } from "class-variance-authority";
import { Tooltip } from "radix-ui";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Icon } from "./icon";

/** The square (or round) box that holds the icon. Shape comes from the Brand Console. */
export const iconButtonBox = cva(
  "inline-flex shrink-0 items-center justify-center border-2 [width:var(--control-h)] [height:var(--control-h)] " +
  "[border-radius:var(--c-icon-button-shape,var(--btn-radius))] [font-size:calc(var(--text-base)*1.15)]",
  {
    variants: {
      variant: {
        primary: "[background:var(--btn-bg)] [color:var(--btn-fg)] border-(--btn-border)",
        outline: "bg-card text-link border-input",
        ghost: "bg-transparent text-link border-transparent",
      },
    },
    defaultVariants: { variant: "outline" },
  }
);
const HOVER = {
  primary: "hover:[background:var(--btn-bg-hover)] group-hover:[background:var(--btn-bg-hover)]",
  outline: "hover:bg-muted group-hover:bg-muted",
  ghost: "hover:bg-muted group-hover:bg-muted",
};
const FOCUS = "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:3px]";

/**
 * Icon button. A small button that shows a picture, like a trash can for delete or an X for close.
 * Always give it a label. The Brand Console decides if the label also shows as a word under the icon.
 */
export function IconButton({
  icon, label, variant = "outline", showLabel, labelPosition = "below", tooltip = true,
  type = "button", disabled, className, ...props
}) {
  const s = comp("icon-button");
  const visible = showLabel ?? (s.showLabel ?? "yes") !== "no";
  const v = HOVER[variant] ? variant : "outline";
  const glyph = isValidElement(icon) ? icon : icon ? <Icon as={icon} /> : null;

  if (visible) {
    const side = labelPosition === "side";
    return (
      <button type={type} disabled={disabled}
        className={cn("group inline-flex items-center border-0 bg-transparent p-0 text-foreground cursor-pointer [border-radius:var(--btn-radius)] [font-family:var(--font-ui,var(--font-body))]",
          side ? "flex-row gap-2" : "flex-col gap-1.5", FOCUS, "disabled:opacity-45 disabled:cursor-not-allowed", className)}
        {...props}>
        <span aria-hidden="true" className={cn(iconButtonBox({ variant: v }), !disabled && HOVER[v])}>{glyph}</span>
        <span className={cn("[font-size:var(--text-sm)] leading-tight", side ? "font-semibold text-link" : "text-muted-foreground")}>{label}</span>
      </button>
    );
  }

  const btn = (
    <button type={type} disabled={disabled} aria-label={label}
      className={cn(iconButtonBox({ variant: v }), "cursor-pointer", HOVER[v], FOCUS, "disabled:opacity-45 disabled:cursor-not-allowed", className)}
      {...props}>
      {glyph}
    </button>
  );
  if (!tooltip || disabled) return btn;
  // When the word is hidden, show it in a small tip on mouse over and keyboard focus.
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{btn}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6}
            className="z-50 bg-foreground text-background px-2.5 py-1 [font-size:var(--text-sm)] [border-radius:calc(var(--field-radius)*0.7)] [box-shadow:var(--menu-shadow)] [font-family:var(--font-ui,var(--font-body))]">
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
