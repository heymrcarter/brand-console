import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { Button } from "./button";
import { Badge } from "./badge";

const DEFAULT_ROWS = [
  { key: "monthly", label: "Monthly cost" },
  { key: "deductible", label: "Deductible" },
  { key: "doctorVisit", label: "Doctor visit" },
  { key: "specialist", label: "Specialist visit" },
  { key: "maxYear", label: "Most you pay in a year" },
];

/**
 * Plan comparison. Shows two or three plans side by side so people can compare costs.
 * Use it when someone is picking a health plan. The cards stack on a phone, and screen readers get a real table.
 *
 * plans: [{ id, name, monthly: "$42", deductible: "$0", ... }]. Row values are read by each row's `key`.
 */
export function PlanCompare({
  plans = [], rows = DEFAULT_ROWS, current, recommended, onChoose,
  caption = "Compare plans", highlight, className,
}) {
  const s = comp("plan-compare");
  const mode = highlight || s.highlight || "badge";
  const shown = plans.slice(0, 3);
  const [lead, ...rest] = rows;
  const tag = (p) => (p.id === current ? "Your plan now" : p.id === recommended ? "We suggest this plan" : null);

  return (
    <div className={cn("flex flex-col [gap:var(--gap)] min-w-0", className)}>
      {/* Screen readers get a real table. Row labels are row headers. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <td />
            {shown.map((p) => <th key={p.id} scope="col">{p.name}{tag(p) ? `. ${tag(p)}.` : ""}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {shown.map((p) => <td key={p.id}>{p[r.key] ?? "Not listed"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid [gap:var(--gap)] grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {shown.map((p) => {
          const t = tag(p);
          const isCurrent = p.id === current;
          return (
            <div key={p.id}
              className={cn("flex flex-col min-w-0 bg-panel [backdrop-filter:blur(var(--panel-blur))] text-card-foreground [gap:calc(var(--gap)*0.75)] [padding:var(--pad)] [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)]",
                t && mode === "border" && "[border:3px_solid_var(--primary-edge)]")}>
              <div aria-hidden="true" className="flex flex-col [gap:calc(var(--gap)*0.75)] flex-1">
                {t && (mode === "badge"
                  ? <Badge tone="brand" icon={false} className="self-start">{t}</Badge>
                  : <span className="self-start font-bold [font-size:var(--text-sm)] [font-family:var(--font-ui,var(--font-body))] text-link">{t}</span>)}
                <h3 className="m-0 [font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-size:var(--text-h3)] [font-weight:var(--heading-w)] leading-tight">{p.name}</h3>
                {lead && (
                  <div>
                    <span className="[font-family:var(--font-heading)] [font-size:var(--text-h2)] [font-weight:var(--heading-w)] tabular-nums leading-[1.1]">{p[lead.key] ?? "Not listed"}</span>
                    {lead.key === "monthly" && <span className="text-muted-foreground"> a month</span>}
                  </div>
                )}
                <dl className="m-0 flex flex-col">
                  {rest.map((r) => (
                    <div key={r.key} className="flex flex-wrap justify-between gap-x-[var(--gap)] [padding-block:calc(var(--gap)*0.6)] border-b border-border">
                      <dt className="font-bold">{r.label}</dt>
                      <dd className="m-0 tabular-nums">{p[r.key] ?? "Not listed"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <Button fullWidth variant={isCurrent ? "outline" : "primary"} onClick={() => onChoose && onChoose(p)}>
                {isCurrent ? "Keep this plan" : "Choose this plan"}
                <span className="sr-only">: {p.name}{isCurrent ? ", your plan now" : ""}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
