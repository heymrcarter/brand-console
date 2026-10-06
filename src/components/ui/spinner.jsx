import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const SIZE = { sm: "size-[1.1em] border-2", md: "size-[1.6em] border-[3px]", lg: "size-[2.4em] border-4" };
/**
 * Spinner. A turning circle that tells people to please wait.
 * Say what is loading, like "Loading your plan". If waiting takes more than 10 seconds, use a progress bar.
 * The Brand Console decides if the words show next to it. Screen readers always hear them.
 */
export function Spinner({ label = "Loading", size = "md", words, className }) {
  const s = comp("spinner");
  const show = words ?? ((s.words || "yes") === "yes");
  return (
    <span role="status" className={cn("inline-flex items-center gap-[0.6em]", className)}>
      <span aria-hidden="true" className={cn("inline-block shrink-0 rounded-full border-muted border-t-primary-edge animate-spin [animation-duration:1s] motion-reduce:animate-none", SIZE[size] || SIZE.md)} />
      <span className={show ? undefined : "sr-only"}>{label}</span>
    </span>
  );
}
