import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const SHAPE = {
  text: "h-[1em] w-full",
  heading: "h-[1.4em] w-[45%]",
  avatar: "size-[2.4em] shrink-0 [border-radius:var(--c-avatar-shape,999px)]",
  button: "w-[9em] [height:var(--control-h)] [border-radius:var(--btn-radius)]",
  block: "h-[6em] w-full [border-radius:var(--field-radius)]",
};
/**
 * Loading placeholder (skeleton). Gray shapes that show where things will appear while the page loads.
 * Match the shapes to the real content, like a list of claims.
 * The shapes are hidden from screen readers. Pass `label` to say "Loading" in words instead.
 * The gentle pulse comes from the Brand Console and stops for people who turn off motion.
 */
export function Skeleton({ shape = "text", lines = 1, width, height, label, className }) {
  const pulse = (comp("skeleton").pulse || "on") === "on";
  const n = shape === "text" ? Math.max(1, lines) : 1;
  const bar = (i) => (
    <span key={i} style={{ width: n > 1 && i === n - 1 && !width ? "70%" : width, height }}
      className={cn("block bg-muted [border-radius:calc(var(--radius)*0.75)]", SHAPE[shape] || SHAPE.text, pulse && "animate-pulse motion-reduce:animate-none", n === 1 && className)} />
  );
  const shapes = n > 1
    ? <span aria-hidden="true" className={cn("flex flex-col gap-[0.6em] w-full", className)}>{Array.from({ length: n }, (_, i) => bar(i))}</span>
    : <span aria-hidden="true" className="contents">{bar(0)}</span>;
  if (!label) return shapes;
  return (
    <>
      <span role="status" className="sr-only">{label}</span>
      {shapes}
    </>
  );
}
