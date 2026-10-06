import { useId, useState } from "react";
import { Download, CircleCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

const longDate = (d) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(d);

/**
 * Consent and signature. People read a short summary and the full terms, agree, and sign.
 * Use it when a member must give permission, like sharing records. The brand team picks a typed name or a tick box only.
 */
export function Consent({
  title, summary, terms, termsLabel = "Full terms", downloadHref, downloadLabel = "Download the full terms",
  agreeLabel = "I have read this and I agree.", sign, date, submitLabel = "Sign and send", onSign, className,
}) {
  const s = comp("consent");
  const mode = sign || s.sign || "typed";
  const gid = useId();
  const today = date || new Date();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(null);

  const needAgree = !agreed;
  const needName = mode === "typed" && !name.trim();
  const missing = [needAgree && "tick the box to say you agree", needName && "type your full name"].filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (missing.length) return;
    const record = { agreed: true, name: mode === "typed" ? name.trim() : undefined, signedAt: new Date(), agreedTo: agreeLabel };
    setDone(record);
    onSign && onSign(record);
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby={title ? gid + "-t" : undefined} className={cn("flex flex-col [gap:var(--gap)] min-w-0", className)}>
      {title && <h3 id={gid + "-t"} className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{title}</h3>}
      {summary && <p className="m-0"><b>In short:</b> {summary}</p>}

      <div className="flex flex-col gap-2">
        <p id={gid + "-terms"} className="m-0 [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))]">{termsLabel}</p>
        <div role="region" aria-labelledby={gid + "-terms"} tabIndex={0}
          className="bg-muted text-foreground [border-radius:var(--field-radius)] [padding:var(--gap)] max-h-[12em] overflow-auto flex flex-col gap-2 [font-size:var(--text-sm)] leading-[var(--lh)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
          {typeof terms === "string" ? <p className="m-0">{terms}</p> : terms}
        </div>
        {downloadHref && (
          <a href={downloadHref} download className="self-start inline-flex items-center gap-1.5 [min-height:var(--control-h)] text-link underline underline-offset-4 [font-size:var(--text-sm)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
            <Download aria-hidden="true" className="size-[1.1em]" />{downloadLabel}
          </a>
        )}
      </div>

      <Checkbox label={agreeLabel} checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} disabled={!!done}
        error={tried && needAgree ? "Please tick the box to say you agree." : undefined} />

      {mode === "typed" && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={gid + "-name"}>Type your full name</FieldLabel>
          <FieldHint id={gid + "-hint"}>Typing your name counts as your signature. Today's date is {longDate(today)}.</FieldHint>
          <FieldError id={gid + "-nerr"}>{tried && needName ? "Please type your full name to sign." : null}</FieldError>
          <input id={gid + "-name"} type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!!done}
            aria-invalid={tried && needName ? true : undefined} aria-describedby={[gid + "-hint", tried && needName && gid + "-nerr"].filter(Boolean).join(" ")}
            className={cn(inputClass, "italic")} />
        </div>
      )}

      <div className="flex flex-wrap gap-[var(--gap)]">
        <Button type="submit" disabled={!!done}>{submitLabel}</Button>
      </div>
      <div role={tried && missing.length ? "alert" : "status"} className="empty:hidden">
        {done ? (
          <p className="m-0 flex items-start gap-1.5 font-bold text-success">
            <CircleCheck aria-hidden="true" className="mt-[.15em] size-[1.1em] shrink-0" />
            <span>Thank you. You signed this on {longDate(done.signedAt)}.</span>
          </p>
        ) : tried && missing.length ? (
          <FieldError>Before you can sign, please {missing.join(" and ")}.</FieldError>
        ) : null}
      </div>
    </form>
  );
}
