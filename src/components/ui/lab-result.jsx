import { ArrowUp, ArrowDown, CircleCheck } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";

const FLAG = {
  high: { tone: "warning", icon: ArrowUp, word: "High", where: "above" },
  low: { tone: "warning", icon: ArrowDown, word: "Low", where: "below" },
  normal: { tone: "success", icon: CircleCheck, word: "Normal", where: "inside" },
};

/**
 * Lab result. Shows one test result with its normal range, and says in words if it is normal, high, or low.
 * Link to a plain explanation, and suggest talking to the doctor about anything that is high or low.
 */
export function LabResult({
  test,
  value,
  unit,
  range = {},
  flag: flagProp,
  date,
  explainHref,
  explainLabel = "What this means",
  display,
  format = (v) => String(v),
  headingLevel = 3,
  className,
}) {
  const s = comp("lab-result");
  const showBar = (display || s.range || "bar") === "bar";
  const { low, high } = range;
  const hasRange = low != null && high != null;
  const flag = flagProp || (hasRange ? (value > high ? "high" : value < low ? "low" : "normal") : "normal");
  const f = FLAG[flag] || FLAG.normal;
  const Heading = `h${headingLevel}`;
  const u = unit && unit !== "%" ? ` ${unit}` : unit || "";
  const rangeText = hasRange ? `${format(low)} to ${format(high)}${u}` : "";
  const sentence = hasRange
    ? flag === "normal"
      ? `Your result, ${format(value)}${u}, is inside the normal range of ${rangeText}.`
      : `Your result, ${format(value)}${u}, is ${f.where} the normal range of ${rangeText}.`
    : `Your result is ${format(value)}${u}.`;

  let bar = null;
  if (showBar && hasRange) {
    const span = high - low || 1;
    const min = Math.min(low - span * 0.5, value - span * 0.1);
    const max = Math.max(high + span * 0.5, value + span * 0.1);
    const pct = (v) => `${((v - min) / (max - min)) * 100}%`;
    const flagged = flag !== "normal";
    bar = (
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        <div className="relative h-3 rounded-full bg-muted">
          <span className="absolute inset-y-0 rounded-full [background:var(--success-soft)] border-[1.5px] border-success" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
          <span
            className={cn("absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card", flagged ? "bg-warning [box-shadow:0_0_0_1px_var(--warning)]" : "bg-success [box-shadow:0_0_0_1px_var(--success)]")}
            style={{ left: pct(value) }}
          />
        </div>
        <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">Normal range: {rangeText}</p>
      </div>
    );
  }

  return (
    <article className={cn("flex flex-col min-w-0 bg-panel text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]", className)}>
      <div className="flex flex-wrap items-start justify-between [gap:calc(var(--gap)*0.5)]">
        <div className="min-w-0">
          <Heading className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{test}</Heading>
          {date && <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">Tested {date}</p>}
        </div>
        <Badge tone={f.tone} icon={f.icon}><span className="sr-only">Result:</span> {f.word}</Badge>
      </div>
      <p className="m-0 flex items-baseline gap-1.5">
        <span className="[font-family:var(--font-heading)] [font-size:var(--text-h2)] [font-weight:var(--heading-w)] tabular-nums leading-tight">{format(value)}</span>
        {unit && <span className="text-muted-foreground">{unit}</span>}
      </p>
      {bar}
      <p className="m-0 [font-size:var(--text-sm)]">
        {sentence}
        {flag !== "normal" && " Talk to your doctor about what to do next."}
        {explainHref && <> <a href={explainHref} className="text-link font-semibold underline underline-offset-4 focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">{explainLabel}</a></>}
      </p>
    </article>
  );
}
