import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

/**
 * Icon. Wraps any icon from the approved Lucide set so it uses the brand's line thickness.
 * Put words next to an icon. If an icon stands alone, give it a label.
 *
 *   import { Calendar } from "lucide-react";
 *   <Icon as={Calendar} />                         // next to words: hidden from screen readers
 *   <Icon as={Calendar} label="Pick a date" />     // alone: read out loud
 */
export function Icon({ as: Glyph, label, size = "1.15em", className, ...props }) {
  const s = comp("icon");
  return (
    <Glyph
      width={size} height={size} strokeWidth={s.stroke || 2} absoluteStrokeWidth={false}
      aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}
      className={cn("inline-block shrink-0 align-[-0.15em]", className)} {...props}
    />
  );
}
