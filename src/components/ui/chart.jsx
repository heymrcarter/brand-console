import { useId, useState } from "react";
import { Table2, ChartColumn } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";
import { Card } from "./card";
import { Button } from "./button";

const W = 420, H = 200, PL = 40, PR = 8, PT = 18, PB = 26;

/** Picks a round top value and five even steps for the side scale. */
function niceScale(max) {
  if (!(max > 0)) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const top = step * 4;
  return { top, ticks: [0, step, step * 2, step * 3, top] };
}

/** Builds a short summary in words, like "Highest in June at $142. Lowest in August at $38." */
function summarize(data, fmt) {
  if (!data.length) return "No data to show.";
  let hi = data[0], lo = data[0];
  data.forEach((d) => { if (d.value > hi.value) hi = d; if (d.value < lo.value) lo = d; });
  return `Highest in ${hi.label} at ${fmt(hi.value)}. Lowest in ${lo.label} at ${fmt(lo.value)}.`;
}

/** Shared frame: title, summary, the picture, and a table that screen readers always get and anyone can open. */
function ChartFrame({ kind, title, summary, data, compare, format, valueName, labelName, legend, tableView, className, children }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const fmt = format || ((v) => String(v));
  const label = `${kind} chart. ${title}. ${summary || summarize(data, fmt)}`;
  return (
    <Card title={title} className={className}>
      {summary && <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">{summary}</p>}
      {!showTable && (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full h-auto overflow-visible [font-family:var(--font-ui,var(--font-body))]">
          {children}
        </svg>
      )}
      {!showTable && legend}
      <table id={tableId} className={cn(showTable ? "w-full border-collapse [font-size:var(--text-base)]" : "sr-only")}>
        <caption className={showTable ? "sr-only" : undefined}>{title}</caption>
        <thead>
          <tr className="border-b-2 border-border text-left [font-family:var(--font-ui,var(--font-body))]">
            <th scope="col" className="py-2 pr-4">{labelName}</th>
            <th scope="col" className="py-2 pr-4 text-right">{valueName}</th>
            {compare && <th scope="col" className="py-2 text-right">{compare.name}</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label} className="border-b border-border">
              <th scope="row" className="py-2 pr-4 text-left font-normal">{d.label}</th>
              <td className="py-2 pr-4 text-right tabular-nums">{fmt(d.value)}</td>
              {compare && <td className="py-2 text-right tabular-nums">{compare.data[i] != null ? fmt(compare.data[i].value) : ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {tableView && (
        <div>
          <Button variant="ghost" className="px-0 [padding-inline:0]" aria-controls={tableId} aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}
            icon={showTable ? <ChartColumn aria-hidden="true" className="size-[1.1em]" /> : <Table2 aria-hidden="true" className="size-[1.1em]" />}>
            {showTable ? "Show as a chart" : "Show as a table"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Side scale lines and numbers. Words use the muted text color. */
function Axis({ ticks, y, fmt }) {
  return (
    <g aria-hidden="true">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - 4} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={PL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">{fmt(v)}</text>
        </g>
      ))}
      <line x1={PL} x2={W - 4} y1={y(0)} y2={y(0)} stroke="var(--muted-foreground)" strokeWidth="1" />
    </g>
  );
}

/**
 * Bar chart. Shows one amount per month or group, like what you paid each month.
 * Say the main point in the title. It always has a summary in words and a table view.
 */
export function BarChart({ title, summary, data = [], format, valueName = "Amount", labelName = "Month", labels, tableView = true, className }) {
  const s = comp("chart");
  const mode = labels || s.labels || "last";
  const [active, setActive] = useState(null);
  const fmt = format || ((v) => String(v));
  const { top, ticks } = niceScale(Math.max(0, ...data.map((d) => d.value)));
  const y = (v) => PT + (H - PT - PB) * (1 - v / top);
  const step = (W - PL - PR) / Math.max(1, data.length);
  const bw = Math.min(36, step * 0.64);
  return (
    <ChartFrame kind="Bar" title={title} summary={summary} data={data} format={format} valueName={valueName} labelName={labelName} tableView={tableView} className={className}>
      <Axis ticks={ticks} y={y} fmt={fmt} />
      {data.map((d, i) => {
        const x = PL + step * i + (step - bw) / 2, t = y(d.value), b = y(0), r = Math.min(4, (b - t) / 2);
        const show = mode === "all" || i === data.length - 1 || active === i;
        return (
          <g key={d.label} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <title>{`${d.label}: ${fmt(d.value)}`}</title>
            <path d={`M${x},${b} V${t + r} Q${x},${t} ${x + r},${t} H${x + bw - r} Q${x + bw},${t} ${x + bw},${t + r} V${b} Z`}
              fill="var(--primary-edge)" opacity={active != null && active !== i ? 0.55 : 1} />
            {show && <text x={x + bw / 2} y={t - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">{fmt(d.value)}</text>}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{d.label}</text>
          </g>
        );
      })}
    </ChartFrame>
  );
}

/**
 * Line chart. Shows how one amount changes over time, like steps or blood pressure by month.
 * You can add one comparison line, like last year. It is dashed, so it never depends on color alone.
 */
export function LineChart({ title, summary, data = [], compare, format, valueName = "Amount", labelName = "Month", labels, tableView = true, className }) {
  const s = comp("chart");
  const mode = labels || s.labels || "last";
  const [active, setActive] = useState(null);
  const fmt = format || ((v) => String(v));
  const all = [...data, ...(compare?.data || [])].map((d) => d.value);
  const { top, ticks } = niceScale(Math.max(0, ...all));
  const y = (v) => PT + (H - PT - PB) * (1 - v / top);
  const step = (W - PL - PR) / Math.max(1, data.length);
  const x = (i) => PL + step * i + step / 2;
  const pts = (list) => list.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const legend = compare && (
    <ul aria-hidden="true" className="m-0 p-0 list-none flex flex-wrap gap-x-5 gap-y-1 [font-size:var(--text-sm)] text-muted-foreground [font-family:var(--font-ui,var(--font-body))]">
      <li className="flex items-center gap-2"><svg width="28" height="8"><line x1="0" x2="28" y1="4" y2="4" stroke="var(--link)" strokeWidth="3" /></svg>{valueName}</li>
      <li className="flex items-center gap-2"><svg width="28" height="8"><line x1="0" x2="28" y1="4" y2="4" stroke="var(--secondary-foreground)" strokeWidth="2" strokeDasharray="6 5" /></svg>{compare.name}</li>
    </ul>
  );
  return (
    <ChartFrame kind="Line" title={title} summary={summary} data={data} compare={compare} format={format} valueName={valueName} labelName={labelName} legend={legend} tableView={tableView} className={className}>
      <Axis ticks={ticks} y={y} fmt={fmt} />
      {compare && <polyline points={pts(compare.data)} fill="none" stroke="var(--secondary-foreground)" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" aria-hidden="true" />}
      <polyline points={pts(data)} fill="none" stroke="var(--link)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" />
      {data.map((d, i) => {
        const show = mode === "all" || i === data.length - 1 || active === i;
        return (
          <g key={d.label} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <title>{`${d.label}: ${fmt(d.value)}`}</title>
            <rect x={x(i) - step / 2} y={PT} width={step} height={H - PT - PB} fill="transparent" />
            <circle cx={x(i)} cy={y(d.value)} r={active === i ? 6 : 4.5} fill="var(--card)" stroke="var(--link)" strokeWidth="2.5" />
            {show && <text x={x(i)} y={y(d.value) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">{fmt(d.value)}</text>}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{d.label}</text>
          </g>
        );
      })}
    </ChartFrame>
  );
}
