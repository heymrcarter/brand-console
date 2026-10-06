import { useState } from "react";
import { Copy, Download, Printer, Phone } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Button } from "./button";

/** Spells an ID one character at a time for screen readers, like "N F dash 4 4 8 1 2 0". */
function spell(id) {
  return String(id).split("").map((ch) => (ch === "-" ? "dash" : ch === " " ? "" : ch)).filter(Boolean).join(" ");
}

/** An ID people can read, zoom, select, and hear one character at a time. */
function IdText({ value, className }) {
  return (
    <span className={cn("tabular-nums [letter-spacing:0.04em]", className)}>
      <span aria-hidden="true" className="select-all">{value}</span>
      <span className="sr-only select-none">{spell(value)}</span>
    </span>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex flex-col min-w-0">
      <dt className="[font-size:var(--text-sm)] text-muted-foreground">{label}</dt>
      <dd className="m-0 [font-size:var(--text-sm)] font-semibold">{children}</dd>
    </div>
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Member ID card. A digital copy of the member's insurance card, written as real text people can read and zoom.
 * Put it on the plan page with Copy, Download, and Print.
 */
export function MemberCard({
  member = {},
  rx,
  phone,
  tty = "711",
  brandName = "Northfield Health",
  onDownload,
  onPrint = () => window.print(),
  style: styleProp,
  headingLevel = 2,
  className,
}) {
  const s = comp("member-card");
  const style = styleProp || s.style || "band";
  const band = style === "band";
  const [status, setStatus] = useState("");
  const Heading = `h${headingLevel}`;

  async function onCopy() {
    const ok = await copyText(member.id);
    setStatus(ok ? "Your member ID was copied." : "We could not copy your member ID. You can select it and copy it yourself.");
  }

  return (
    <div className={cn("flex flex-col [gap:var(--gap)] max-w-[440px]", className)}>
      <section
        aria-label={`Member ID card for ${member.name || "member"}`}
        className="overflow-hidden bg-card text-card-foreground border border-border [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)]"
      >
        <div className={cn(
          "flex items-center justify-between gap-3 [padding:calc(var(--gap)*0.8)_var(--gap)]",
          band ? "bg-primary text-primary-foreground" : "border-b border-border"
        )}>
          <span className="flex items-center gap-2 [font-family:var(--font-heading)] font-extrabold [font-size:calc(var(--text-base)*1.1)]">
            <span aria-hidden="true" className={cn("block size-[calc(var(--text-base)*1.4)] [border-radius:calc(var(--radius)*0.6)]", band ? "bg-primary-foreground" : "bg-primary")} />
            {brandName}
          </span>
          {member.plan && <Heading className="m-0 [font-size:var(--text-sm)] font-normal [font-family:var(--font-ui,var(--font-body))]">{member.plan}</Heading>}
        </div>
        <div className="flex flex-col gap-1 [padding:var(--gap)]">
        <dl className="m-0 flex flex-col gap-1">
          <dt className="[font-size:var(--text-sm)] text-muted-foreground">Member</dt>
          <dd className="m-0 font-bold">{member.name}</dd>
          <dt className="[font-size:var(--text-sm)] text-muted-foreground">Member ID</dt>
          <dd className="m-0 [font-family:var(--font-heading)] [font-size:var(--text-h2)] [font-weight:var(--heading-w)] leading-tight">
            <IdText value={member.id} />
          </dd>
        </dl>
          <dl className="m-0 grid [gap:var(--gap)] mt-1 [grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr))]">
            {member.group && <Detail label="Group"><IdText value={member.group} /></Detail>}
            {rx?.bin && <Detail label="Rx BIN"><IdText value={rx.bin} /></Detail>}
            {rx?.pcn && <Detail label="Rx PCN"><IdText value={rx.pcn} /></Detail>}
            {rx?.group && <Detail label="Rx group"><IdText value={rx.group} /></Detail>}
          </dl>
          {phone && (
              <p className="m-0 mt-1 [font-size:var(--text-sm)]">
                Member services:{" "}
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 font-bold text-link underline underline-offset-4 focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
                  <Phone aria-hidden="true" className="size-[1em]" />{phone}
                </a>
                {tty && <> (TTY {tty})</>}
              </p>
          )}
        </div>
      </section>
      <div className="flex flex-wrap [gap:var(--gap)]">
        <Button variant="quiet" onClick={onCopy} icon={<Copy aria-hidden="true" className="size-[1.1em]" />}>Copy member ID</Button>
        {onDownload && <Button onClick={onDownload} icon={<Download aria-hidden="true" className="size-[1.1em]" />}>Download</Button>}
        {onPrint && <Button variant="outline" onClick={onPrint} icon={<Printer aria-hidden="true" className="size-[1.1em]" />}>Print</Button>}
      </div>
      <p role="status" className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{status}</p>
    </div>
  );
}
