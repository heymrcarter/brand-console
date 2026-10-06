import { CircleHelp, Phone } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Drawer } from "./drawer";

/**
 * Help drawer. A side panel that explains a hard word or rule in plain words, without leaving the page.
 * Use it for insurance words people may not know, like deductible. Pass `term` to open it from a word in a sentence,
 * or leave it out to show a "Get help" button. It can list help topics and a phone number to call.
 *
 * topics: [{ title, body }]. phone: { number, display, hours }.
 */
export function HelpDrawer({ term, triggerLabel = "Get help", trigger, title = "Get help", children, topics = [], phone, open, defaultOpen, onOpenChange, side, width }) {
  const t = trigger || (term
    ? <button type="button" className="inline cursor-pointer bg-transparent border-0 p-0 [font:inherit] font-semibold text-link border-b-2 border-dotted border-link rounded-none focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
        {term}<span className="sr-only">. Opens help.</span>
      </button>
    : <Button variant="outline" icon={<CircleHelp aria-hidden="true" className="size-[1.1em]" />}>{triggerLabel}</Button>);
  return (
    <Drawer trigger={t} title={title} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} side={side} width={width}>
      {children}
      {topics.length > 0 && (
        <div className="flex flex-col [gap:var(--gap)]">
          {topics.map((tp, i) => (
            <section key={tp.title ?? i} className="flex flex-col gap-1">
              <h3 className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-weight:var(--heading-w)] [font-size:var(--text-base)] leading-snug">{tp.title}</h3>
              <div className="m-0 text-muted-foreground">{tp.body}</div>
            </section>
          ))}
        </div>
      )}
      {phone && (
        <div className={cn("flex flex-col gap-1 bg-muted [border-radius:var(--card-radius)] [padding:var(--pad)]", (children || topics.length > 0) && "mt-auto")}>
          <p className="m-0 font-bold [font-family:var(--font-ui,var(--font-body))]">{phone.label || "Still have questions? Call us."}</p>
          <a href={"tel:" + String(phone.number).replace(/[^\d+]/g, "")}
            className="self-start inline-flex items-center gap-2 text-link font-bold underline underline-offset-4 [min-height:var(--control-h)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] rounded-sm">
            <Phone aria-hidden="true" className="size-[1.1em]" />
            {phone.display || phone.number}
          </a>
          {phone.hours && <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{phone.hours}</p>}
        </div>
      )}
    </Drawer>
  );
}
