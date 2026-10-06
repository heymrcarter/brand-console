import { useEffect, useId, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";
import { FieldLabel, FieldHint, FieldError, inputClass } from "./field-parts";

/* ---------- small date helpers (plain Date, no library) ---------- */
const pad = (n) => String(n).padStart(2, "0");
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => {
  const y = d.getFullYear(), m = d.getMonth() + n, last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(d.getDate(), last));
};
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const longDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
/** Writes a date as MM/DD/YYYY. */
export const formatDate = (d) => (d ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}` : "");
/** Reads a typed date like 10/14/2026 or 10-14-2026. Returns null when it is not a real date. */
export function parseDate(text) {
  const m = String(text || "").trim().match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[1] - 1, +m[2]);
  return d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] ? d : null;
}

const WEEK = [["Su", "Sunday"], ["Mo", "Monday"], ["Tu", "Tuesday"], ["We", "Wednesday"], ["Th", "Thursday"], ["Fr", "Friday"], ["Sa", "Saturday"]];
const navBtn =
  "inline-flex items-center justify-center shrink-0 [width:var(--control-h)] [height:var(--control-h)] [border-radius:var(--btn-radius)] text-link cursor-pointer " +
  "hover:bg-muted focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px] disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Date picker. A date box with a small calendar that pops open.
 * Use it to pick a new date in the next few months, like a visit. People can always type the date instead.
 * For a birth date, use the date input.
 */
export function DatePicker({
  label, hint = "Type the date like 10/14/2026, or pick a day.", error, optional,
  value, defaultValue = null, onChange, min, max, disabledDates, unavailableNote,
  today: todayProp, weekStart: weekStartProp, disabled, id, name, className,
}) {
  const s = comp("date-picker");
  const ws = (weekStartProp || s.weekStart || "sun") === "mon" ? 1 : 0;
  const auto = useId(); const fid = id || auto;
  const hintId = hint ? fid + "-hint" : undefined, errId = error ? fid + "-err" : undefined;
  const headId = fid + "-month", noteId = fid + "-note";

  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const picked = controlled ? value : inner;
  const [text, setText] = useState(formatDate(picked));
  const today = dayOnly(todayProp || new Date());
  const minD = min ? dayOnly(min) : null, maxD = max ? dayOnly(max) : null;

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(picked || today);
  const [view, setView] = useState(() => new Date((picked || today).getFullYear(), (picked || today).getMonth(), 1));
  const moveFocus = useRef(false);
  const contentRef = useRef(null);

  // Keep the typed words in step when the chosen date changes from outside.
  const pickedKey = picked ? dateKey(picked) : "";
  useEffect(() => {
    // A cleared date keeps what the person typed, so they can fix it.
    if (picked && !sameDay(parseDate(text), picked)) setText(formatDate(picked));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey]);

  /** Returns false when a day can be picked, or the reason it cannot. */
  const whyOff = (d) => {
    if (minD && d < minD) return "It is before the first day you can pick.";
    if (maxD && d > maxD) return "It is after the last day you can pick.";
    const r = disabledDates ? disabledDates(d) : false;
    return r ? (typeof r === "string" ? r : "You cannot pick this day.") : false;
  };

  const commit = (d) => {
    if (!controlled) setInner(d);
    onChange && onChange(d, { unavailable: d ? whyOff(d) : false });
  };

  const focusDay = () => {
    const btn = contentRef.current && contentRef.current.querySelector(`[data-date="${dateKey(focused)}"]`);
    if (btn) btn.focus();
  };
  useEffect(() => {
    if (open && moveFocus.current) { moveFocus.current = false; focusDay(); }
  });

  const goTo = (d, focus = true) => {
    if (minD && d < minD) d = minD;
    if (maxD && d > maxD) d = maxD;
    setFocused(d);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
    moveFocus.current = focus;
  };

  const onOpenChange = (next) => {
    if (next) {
      const start = parseDate(text) || picked || today;
      setFocused(start);
      setView(new Date(start.getFullYear(), start.getMonth(), 1));
    }
    setOpen(next);
  };

  const pick = (d) => {
    if (whyOff(d)) return;
    commit(d); setText(formatDate(d)); setOpen(false);
  };

  const onGridKey = (e) => {
    const map = {
      ArrowLeft: () => addDays(focused, -1), ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7), ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1), PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -((focused.getDay() - ws + 7) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() - ws + 7) % 7)),
    };
    if (map[e.key]) { e.preventDefault(); goTo(map[e.key]()); }
  };

  const onBlur = () => {
    if (text.trim() === "") { if (picked) commit(null); return; }
    const d = parseDate(text);
    if (d) { setText(formatDate(d)); if (!sameDay(d, picked)) commit(d); }
    else if (picked) commit(null);
  };

  // Build the weeks for the month on show.
  const y = view.getFullYear(), m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() - ws + 7) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = lead; i > 0; i--) cells.push({ out: true, d: new Date(y, m, 1 - i) });
  for (let i = 1; i <= count; i++) cells.push({ d: new Date(y, m, i) });
  let n = 1; while (cells.length % 7) cells.push({ out: true, d: new Date(y, m + 1, n++) });
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const days = [...WEEK.slice(ws), ...WEEK.slice(0, ws)];
  const monthName = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevOff = minD && new Date(y, m, 0) < minD;
  const nextOff = maxD && new Date(y, m + 1, 1) > maxD;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={fid} optional={optional}>{label}</FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errId}>{error}</FieldError>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Anchor asChild>
          <div className="relative w-full max-w-[calc(10ch+2.6em+var(--control-h))]">
            <input id={fid} name={name} type="text" autoComplete="off" value={text} disabled={disabled}
              onChange={(e) => setText(e.target.value)} onBlur={onBlur}
              aria-invalid={error ? true : undefined}
              aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
              className={cn(inputClass, "[padding-inline-end:calc(var(--control-h)+4px)] tabular-nums")} />
            <Popover.Trigger disabled={disabled}
              aria-label={picked ? `Change the date in the calendar. The date now is ${longDate(picked)}.` : `Pick ${label ? label.toString().toLowerCase() : "a date"} from a calendar`}
              className={cn(navBtn, "absolute inset-y-0 right-0 [border-radius:0_var(--field-radius)_var(--field-radius)_0]")}>
              <Calendar aria-hidden="true" className="size-[1.2em]" style={{ strokeWidth: "var(--c-icon-stroke,2)" }} />
            </Popover.Trigger>
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content ref={contentRef} align="start" sideOffset={8} collisionPadding={12}
            aria-label={`Calendar for ${label || "picking a date"}`}
            onOpenAutoFocus={(e) => { e.preventDefault(); focusDay(); }}
            className={cn("z-50 flex flex-col bg-card text-foreground border border-border [box-shadow:var(--menu-shadow)] [border-radius:var(--field-radius)]",
              "[padding:calc(var(--gap)*0.6)] [gap:calc(var(--gap)*0.5)] [font-family:var(--font-body)] [font-size:var(--text-base)] w-max max-w-[calc(100vw-24px)] focus:outline-none")}>
            <div className="flex items-center justify-between gap-2">
              <button type="button" className={navBtn} disabled={prevOff} aria-label="Show the month before" onClick={() => goTo(addMonths(focused, -1), false)}>
                <ChevronLeft aria-hidden="true" className="size-[1.2em]" />
              </button>
              <div id={headId} aria-live="polite" className="m-0 [font-size:var(--text-base)] font-bold [font-family:var(--font-ui,var(--font-body))]">{monthName}</div>
              <button type="button" className={navBtn} disabled={nextOff} aria-label="Show the month after" onClick={() => goTo(addMonths(focused, 1), false)}>
                <ChevronRight aria-hidden="true" className="size-[1.2em]" />
              </button>
            </div>
            <table role="grid" aria-labelledby={headId} aria-describedby={unavailableNote ? noteId : undefined} onKeyDown={onGridKey} className="border-collapse">
              <thead>
                <tr>{days.map(([s2, full]) => (
                  <th key={full} scope="col" abbr={full} className="p-0 pb-1 text-center [font-size:var(--text-sm)] font-bold text-muted-foreground [font-family:var(--font-ui,var(--font-body))]">{s2}</th>
                ))}</tr>
              </thead>
              <tbody>
                {weeks.map((w, wi) => (
                  <tr key={wi}>
                    {w.map(({ d, out }) => {
                      if (out) return <td key={dateKey(d)} className="p-[1px]"><span aria-hidden="true" className="flex items-center justify-center [width:var(--control-h)] [height:var(--control-h)] text-muted-foreground tabular-nums">{d.getDate()}</span></td>;
                      const off = whyOff(d), sel = sameDay(d, picked), isToday = sameDay(d, today), isFocus = sameDay(d, focused);
                      const words = [longDate(d), isToday && "today", sel && "chosen", off && `not available. ${off}`].filter(Boolean).join(", ");
                      return (
                        <td key={dateKey(d)} aria-selected={sel || undefined} className="p-[1px]">
                          <button type="button" data-date={dateKey(d)} tabIndex={isFocus ? 0 : -1}
                            aria-label={words} aria-disabled={off ? true : undefined} aria-current={isToday ? "date" : undefined}
                            onClick={() => pick(d)} onFocus={() => { if (!isFocus) setFocused(d); }}
                            className={cn("flex items-center justify-center [width:var(--control-h)] [height:var(--control-h)] [border-radius:var(--c-date-picker-day,999px)] tabular-nums cursor-pointer",
                              "[font-size:calc(var(--text-base)*0.95)] focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:1px]",
                              !sel && !off && "hover:bg-muted",
                              isToday && !sel && "[box-shadow:inset_0_0_0_2px_var(--link)]",
                              off && "text-muted-foreground line-through cursor-not-allowed",
                              sel && "bg-primary text-primary-foreground font-bold [box-shadow:inset_0_0_0_2px_var(--primary-edge)]")}>
                            {d.getDate()}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {unavailableNote && <p id={noteId} className="m-0 max-w-[calc(var(--control-h)*7)] [font-size:var(--text-sm)] text-muted-foreground">{unavailableNote}</p>}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
