import { useId, useMemo, useState } from "react";
import { Checkbox as C } from "radix-ui";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from "lucide-react";
import { comp } from "../../lib/settings";
import { cn } from "../../lib/utils";

const isNum = (col) => col.align === "right" || col.type === "number" || col.type === "money";
const cmp = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

function RowCheck({ checked, onCheckedChange, label }) {
  return (
    <C.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={label}
      className={cn("relative shrink-0 inline-flex items-center justify-center align-middle cursor-pointer bg-card text-primary-foreground size-[1.25em] [border:2px_solid_var(--input)] [border-radius:var(--c-checkbox-radius,4px)]",
        "after:absolute after:content-[''] after:[inset:calc((var(--control-h)-1.25em)/-2)]",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary-edge data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary-edge",
        "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]")}>
      <C.Indicator className="flex">
        {checked === "indeterminate" ? <Minus aria-hidden="true" strokeWidth={3.5} className="size-[0.8em]" /> : <Check aria-hidden="true" strokeWidth={3.5} className="size-[0.8em]" />}
      </C.Indicator>
    </C.Root>
  );
}

/**
 * Data table. A real table for many rows, with sorting and row picking. Most used on employee screens.
 * Numbers and money line up on the right. On small screens the table scrolls sideways inside its box.
 *
 * columns: [{ key, label, sortable, align: "left" | "right", type: "number" | "money", render(row), sortValue(row) }].
 * rows: list of objects, each with a unique `id` (or set `rowKey`).
 * Sorting runs inside the table unless you pass `sort` and `onSort`. Picking works the same way with `selected` and `onSelectedChange`.
 */
export function DataTable({
  caption, captionHidden = false, columns = [], rows = [], rowKey = "id", rowLabel,
  selectable = false, selected, defaultSelected = [], onSelectedChange,
  sort, defaultSort, onSort, stripes, header, toolbar, emptyText = "There is nothing to show yet.", className,
}) {
  const s = comp("data-table");
  const striped = (stripes || s.stripes || "off") === "on";
  const tinted = (header || s.header || "tinted") === "tinted";
  const capId = useId();

  const [sortInner, setSortInner] = useState(defaultSort || null);
  const sortState = sort !== undefined ? sort : sortInner;
  const [selInner, setSelInner] = useState(defaultSelected);
  const sel = selected !== undefined ? selected : selInner;
  const setSel = (next) => { if (selected === undefined) setSelInner(next); onSelectedChange && onSelectedChange(next); };

  const keyOf = (r, i) => (typeof rowKey === "function" ? rowKey(r) : r[rowKey]) ?? i;
  const nameOf = (r) => (typeof rowLabel === "function" ? rowLabel(r) : rowLabel ? r[rowLabel] : r[columns[0]?.key]);

  const shown = useMemo(() => {
    if (!sortState || onSort) return rows;
    const col = columns.find((c) => c.key === sortState.key);
    if (!col) return rows;
    const val = (r) => (col.sortValue ? col.sortValue(r) : r[col.key]);
    const out = [...rows].sort((a, b) => cmp(val(a), val(b)));
    return sortState.dir === "desc" ? out.reverse() : out;
  }, [rows, columns, sortState, onSort]);

  const doSort = (key) => {
    const dir = sortState && sortState.key === key && sortState.dir === "asc" ? "desc" : "asc";
    const next = { key, dir };
    if (sort === undefined) setSortInner(next);
    onSort && onSort(next);
  };

  const keys = shown.map(keyOf);
  const pickedCount = keys.filter((k) => sel.includes(k)).length;
  const allState = pickedCount === 0 ? false : pickedCount === keys.length ? true : "indeterminate";
  const toggleAll = () => setSel(allState === true ? sel.filter((k) => !keys.includes(k)) : Array.from(new Set([...sel, ...keys])));
  const toggleOne = (k) => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);

  const cell = "[padding:calc(var(--gap)*0.55)_calc(var(--gap)*0.75)] border-b border-border whitespace-nowrap align-middle";
  const th = "text-left [font-size:var(--text-sm)] font-bold text-muted-foreground [font-family:var(--font-ui,var(--font-body))] [padding:0_calc(var(--gap)*0.75)] [height:var(--control-h)] border-b border-border whitespace-nowrap align-middle";

  return (
    <div className={cn("flex flex-col [gap:calc(var(--gap)*0.6)] min-w-0", className)}>
      {selectable && (
        <div className="flex flex-wrap items-center [gap:calc(var(--gap)*0.6)] [font-size:var(--text-sm)]">
          <p role="status" className="m-0 font-bold">
            {pickedCount === 0 ? "No rows picked." : pickedCount === 1 ? "1 row picked." : `${pickedCount} rows picked.`}
          </p>
          {pickedCount > 0 && toolbar}
        </div>
      )}
      <div role="region" aria-labelledby={capId} tabIndex={0}
        className="overflow-x-auto bg-card [border-radius:var(--card-radius)] [box-shadow:var(--card-shadow)] [border:var(--card-border)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]">
        <table className="w-full border-collapse [font-size:var(--text-base)] text-foreground">
          <caption id={capId}
            className={cn(captionHidden ? "sr-only" : "text-left [caption-side:top] font-bold [padding:calc(var(--gap)*0.75)_calc(var(--gap)*0.75)_calc(var(--gap)*0.4)] [font-family:var(--font-heading)] [font-weight:var(--heading-w)]")}>
            {caption}
          </caption>
          <thead>
            <tr className={cn(tinted && "[&>th]:bg-muted")}>
              {selectable && (
                <th scope="col" className={cn(th, "w-[1%]")}>
                  <RowCheck checked={allState} onCheckedChange={toggleAll} label={allState === true ? "Unpick all rows" : "Pick all rows"} />
                </th>
              )}
              {columns.map((col) => {
                const active = sortState && sortState.key === col.key;
                const dir = active ? sortState.dir : null;
                const SortIcon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
                return (
                  <th key={col.key} scope="col" aria-sort={col.sortable ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                    className={cn(th, isNum(col) && "text-right")}>
                    {col.sortable ? (
                      <button type="button" onClick={() => doSort(col.key)}
                        className={cn("inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 [font:inherit] font-bold [height:var(--control-h)] rounded-sm",
                          active ? "text-foreground" : "text-muted-foreground", "hover:text-foreground focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]",
                          isNum(col) && "flex-row-reverse")}>
                        {col.label}
                        <SortIcon aria-hidden="true" className="size-[1em] shrink-0" />
                        <span className="sr-only">{dir === "asc" ? ", sorted A to Z or low to high" : dir === "desc" ? ", sorted Z to A or high to low" : ", press to sort"}</span>
                      </button>
                    ) : col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className={cn(cell, "text-muted-foreground")}>{emptyText}</td></tr>
            )}
            {shown.map((r, i) => {
              const k = keyOf(r, i), on = sel.includes(k);
              return (
                <tr key={k}
                  className={cn(striped && "even:[&>td]:bg-muted", on && "[&>td]:bg-secondary [&>td]:text-secondary-foreground")}>
                  {selectable && (
                    <td className={cn(cell, "w-[1%]")}>
                      <RowCheck checked={on} onCheckedChange={() => toggleOne(k)} label={`Pick ${nameOf(r) ?? "row " + (i + 1)}`} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn(cell, isNum(col) && "text-right tabular-nums")}>
                      {col.render ? col.render(r) : r[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
