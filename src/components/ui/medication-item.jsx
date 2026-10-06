import { useId, useState } from "react";
import { Clock, CircleCheck, CircleAlert, ChevronDown, Pill } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";

const STATUS = {
  ok: { tone: "success", icon: CircleCheck, text: "You have enough for now" },
  soon: { tone: "warning", icon: Clock, text: "Runs out soon" },
  ordered: { tone: "info", icon: CircleCheck, text: "Refill ordered" },
  none: { tone: "danger", icon: CircleAlert, text: "No refills left" },
};

/**
 * Medication item. Shows one medicine, how to take it in plain words, how many refills are left, and a Refill button.
 * Use it in a list of the member's medicines. Never use short codes like "BID" in the instructions.
 */
export function MedicationItem({
  drug = {},
  purpose,
  sig,
  refillsLeft,
  status = "ok",
  statusText,
  nextFill,
  pharmacy,
  onRefill,
  refillLabel,
  onDetails,
  refilling = false,
  message,
  instructions: instructionsProp,
  headingLevel = 3,
  className,
}) {
  const s = comp("medication");
  const hide = (instructionsProp || s.instructions || "show") === "hide";
  const [open, setOpen] = useState(false);
  const sigId = useId();
  const st = STATUS[status] || STATUS.ok;
  const Heading = `h${headingLevel}`;
  const noRefills = status === "none" || refillsLeft === 0;
  const label = refillLabel || (noRefills ? "Ask for a new prescription" : "Order a refill");
  return (
    <article className={cn("flex flex-col min-w-0 bg-panel text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]", className)}>
      <div className="flex flex-wrap items-start justify-between [gap:calc(var(--gap)*0.5)]">
        <div className="min-w-0">
          <Heading className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">
            {[drug.name, drug.strength].filter(Boolean).join(" ")}
          </Heading>
          {(drug.form || purpose) && (
            <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{[drug.form, purpose && `For ${purpose}`].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <Badge tone={st.tone} icon={st.icon}>{statusText || st.text}</Badge>
      </div>
      {sig && (hide ? (
        <div>
          <button type="button" aria-expanded={open} aria-controls={sigId} onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 [min-height:var(--control-h)] cursor-pointer bg-transparent border-0 p-0 text-link font-semibold underline underline-offset-4 [font-size:var(--text-base)] [font-family:var(--font-ui,var(--font-body))] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
            How to take it
            <ChevronDown aria-hidden="true" className={cn("size-[1.1em] transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </button>
          <p id={sigId} hidden={!open} className="m-0 flex items-start gap-2"><Pill aria-hidden="true" className="mt-[.25em] size-[1.1em] shrink-0 text-muted-foreground" />{sig}</p>
        </div>
      ) : (
        <p className="m-0 flex items-start gap-2"><Pill aria-hidden="true" className="mt-[.25em] size-[1.1em] shrink-0 text-muted-foreground" />{sig}</p>
      ))}
      <dl className="m-0 grid [gap:var(--gap)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))] [font-size:var(--text-sm)]">
        {refillsLeft != null && <div><dt className="text-muted-foreground">Refills left</dt><dd className="m-0 font-bold">{refillsLeft}</dd></div>}
        {nextFill && <div><dt className="text-muted-foreground">Next refill</dt><dd className="m-0">{nextFill}</dd></div>}
        {pharmacy && <div><dt className="text-muted-foreground">Pharmacy</dt><dd className="m-0">{pharmacy}</dd></div>}
      </dl>
      {(onRefill || onDetails) && (
        <div className="flex flex-wrap [gap:var(--gap)]">
          {onRefill && status !== "ordered" && (
            <Button onClick={onRefill} loading={refilling} aria-label={`${label} for ${drug.name}`}>{refilling ? "Ordering your refill" : label}</Button>
          )}
          {onDetails && <Button variant="ghost" onClick={onDetails} aria-label={`See details for ${drug.name}`}>See details</Button>}
        </div>
      )}
      <p role="status" className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{message}</p>
    </article>
  );
}
