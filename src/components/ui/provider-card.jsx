import { Avatar } from "radix-ui";
import { ShieldCheck, CircleCheck, CircleX, MapPin, Phone, Languages } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button, buttonVariants } from "./button";

function initials(name = "") {
  return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Provider card. Shows one doctor or clinic in search results, with the facts people need to choose.
 * It shows first if the doctor is in network and taking new patients. Give it one main action, like "Book a visit".
 */
export function ProviderCard({ provider = {}, onBook, bookLabel = "Book a visit", photo: photoProp, headingLevel = 3, className }) {
  const s = comp("provider-card");
  const showPhoto = (photoProp || s.photo || "show") === "show";
  const p = provider;
  const Heading = `h${headingLevel}`;
  return (
    <article className={cn("flex flex-col min-w-0 bg-panel text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]", className)}>
      <div className="flex items-start [gap:var(--gap)]">
        {showPhoto && (
          <Avatar.Root className="inline-flex shrink-0 items-center justify-center overflow-hidden size-[2.9em] [border-radius:var(--c-avatar-shape,999px)] bg-secondary text-secondary-foreground font-bold [font-size:calc(var(--text-base)*1.2)]">
            {p.photo && <Avatar.Image src={p.photo} alt="" className="size-full object-cover" />}
            <Avatar.Fallback aria-hidden="true">{initials(p.name)}</Avatar.Fallback>
          </Avatar.Root>
        )}
        <div className="flex flex-col min-w-0 gap-1.5">
          <Heading className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">
            {p.href ? (
              <a href={p.href} className="text-inherit underline underline-offset-4 decoration-link hover:text-link focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">{p.name}</a>
            ) : p.name}
          </Heading>
          <p className="m-0 text-muted-foreground">
            {[p.specialty, p.distance && `${p.distance} away`].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.network !== undefined && (p.network
              ? <Badge tone="success" icon={ShieldCheck}>In network</Badge>
              : <Badge tone="neutral" icon={CircleX}>Out of network</Badge>)}
            {p.accepting !== undefined && (p.accepting
              ? <Badge tone="success" icon={CircleCheck}>Accepting new patients</Badge>
              : <Badge tone="neutral" icon={CircleX}>Not taking new patients</Badge>)}
          </div>
          {p.address && <p className="m-0 flex items-start gap-1.5 [font-size:var(--text-sm)]"><MapPin aria-hidden="true" className="mt-[.2em] size-[1em] shrink-0" />{p.address}</p>}
          {p.languages && <p className="m-0 flex items-start gap-1.5 [font-size:var(--text-sm)]"><Languages aria-hidden="true" className="mt-[.2em] size-[1em] shrink-0" />Speaks {p.languages}</p>}
        </div>
      </div>
      {(onBook || p.phone) && (
        <div className="flex flex-wrap [gap:var(--gap)]">
          {onBook && <Button onClick={onBook} aria-label={`${bookLabel} with ${p.name}`}>{bookLabel}</Button>}
          {p.phone && (
            <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className={buttonVariants({ variant: "outline" })} aria-label={`Call ${p.name} at ${p.phone}`}>
              <Phone aria-hidden="true" className="size-[1.1em]" />{p.phone}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
