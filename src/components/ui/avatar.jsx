import { Avatar as A } from "radix-ui";
import { cn } from "../../lib/utils";

const TITLES = /^(dr|mr|mrs|ms|mx|miss|prof|rev)\.?$/i;
/** Makes initials from a name, like "Dr. Anita Patel" → "AP". */
export function initials(name = "") {
  const w = name.trim().split(/\s+/).filter((x) => x && !TITLES.test(x));
  if (!w.length) return "";
  return ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}
const SIZE = { sm: "text-[0.8em]", md: "text-[1em]", lg: "text-[1.35em]" };
/**
 * Avatar. A small photo or initials that stand for a person, like your doctor.
 * Show a photo when you have one. Otherwise it shows initials. Always show the name next to it.
 * When the name is not shown nearby, set `nameShown={false}` so screen readers hear the name.
 * The shape comes from the Brand Console.
 */
export function Avatar({ name, src, size = "md", nameShown = true, className }) {
  return (
    <A.Root role={nameShown ? undefined : "img"} aria-label={nameShown ? undefined : name} aria-hidden={nameShown ? true : undefined}
      className={cn("relative inline-flex items-center justify-center shrink-0 overflow-hidden align-middle size-[2.4em] [border-radius:var(--c-avatar-shape,999px)] bg-secondary text-secondary-foreground font-bold [font-family:var(--font-ui,var(--font-body))] leading-none", SIZE[size] || SIZE.md, className)}>
      {src && <A.Image src={src} alt="" className="size-full object-cover" />}
      <A.Fallback delayMs={src ? 600 : 0} aria-hidden="true" className="select-none">{initials(name)}</A.Fallback>
    </A.Root>
  );
}
