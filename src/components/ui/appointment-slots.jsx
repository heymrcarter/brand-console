import { useId, useState } from "react";
import { RadioGroup as R } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { comp } from "../../lib/settings";

const focusRing = "focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]";

function useControllable(value, defaultValue, onChange) {
  const [inner, setInner] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;
  const set = (v, ...rest) => { if (!isControlled) setInner(v); onChange && onChange(v, ...rest); };
  return [current, set];
}

const slotValue = (day, slot) => slot.value || `${day.date} ${slot.time}`;
const periodOf = (slot) => slot.period || (/am/i.test(slot.time) ? "Morning" : "Afternoon");

/**
 * Appointment slot picker. People pick a day, then pick an open visit time on that day.
 * Use it when someone books a visit. Always say the time zone and how long the visit is.
 *
 * days: [{ date, label: "Wed", sub: "Oct 14", fullLabel: "Wednesday, October 14", slots: [{ time: "10:30 AM", period?: "Morning", value? }] }]
 */
export function AppointmentSlots({
  days = [], value, defaultValue, onValueChange,
  day, defaultDay, onDayChange,
  timezone = "Central Time", visitLength = "30 minutes",
  dayLegend = "Pick a day", timeLegend = "Pick a time",
  shape, className,
}) {
  const s = comp("appointment-slots");
  const shapeSetting = shape || s.shape || "md";
  const slotRadius = shapeSetting === "pill" ? "[border-radius:999px]" : "[border-radius:var(--c-appointment-slots-shape,var(--btn-radius))]";
  const gid = useId();

  const firstOpen = days.find((d) => d.slots && d.slots.length);
  const [time, setTime] = useControllable(value, defaultValue, onValueChange);
  const dayOfTime = time ? days.find((d) => (d.slots || []).some((sl) => slotValue(d, sl) === time)) : undefined;
  const [dayValue, setDay] = useControllable(day, defaultDay ?? dayOfTime?.date ?? firstOpen?.date, onDayChange);
  const current = days.find((d) => d.date === dayValue);

  const groups = [];
  (current?.slots || []).forEach((sl) => {
    const p = periodOf(sl);
    let g = groups.find((x) => x.period === p);
    if (!g) groups.push((g = { period: p, slots: [] }));
    g.slots.push(sl);
  });

  const chosenDay = time ? dayOfTime : undefined;
  const chosenSlot = chosenDay ? chosenDay.slots.find((sl) => slotValue(chosenDay, sl) === time) : undefined;

  return (
    <div className={cn("flex flex-col [gap:var(--gap)] min-w-0", className)}>
      <div className="flex flex-col gap-[calc(var(--gap)*0.5)]">
        <p id={gid + "-days"} className="m-0 [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))]">{dayLegend}</p>
        <R.Root aria-labelledby={gid + "-days"} value={dayValue || ""} onValueChange={(v) => setDay(v)} orientation="horizontal" className="flex flex-wrap gap-[calc(var(--gap)*0.4)]">
          {days.map((d) => {
            const full = !d.slots || d.slots.length === 0;
            return (
              <R.Item key={d.date} value={d.date} disabled={full}
                aria-label={`${d.fullLabel || `${d.label} ${d.sub || ""}`}${full ? ". No times left." : ""}`}
                className={cn("inline-flex flex-col items-center justify-center cursor-pointer bg-card text-foreground leading-tight",
                  "[min-width:calc(var(--control-h)*1.4)] [min-height:var(--control-h)] [padding:0.4em_0.6em] [border:2px_solid_var(--input)] [border-radius:var(--field-radius)]",
                  "data-[state=checked]:border-primary-edge data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground",
                  "data-[disabled]:cursor-not-allowed data-[disabled]:bg-muted data-[disabled]:text-muted-foreground data-[disabled]:border-dashed", focusRing)}>
                <span aria-hidden="true" className="font-bold [font-family:var(--font-ui,var(--font-body))]">{d.label}</span>
                {d.sub && <span aria-hidden="true" className="[font-size:var(--text-sm)]">{d.sub}</span>}
                {full && <span aria-hidden="true" className="[font-size:var(--text-sm)]">No times left</span>}
              </R.Item>
            );
          })}
        </R.Root>
      </div>

      {current && (
        <div className="flex flex-col gap-[calc(var(--gap)*0.5)]">
          <p id={gid + "-times"} className="m-0 [font-weight:var(--label-weight)] [font-family:var(--font-ui,var(--font-body))]">
            {timeLegend} on {current.fullLabel || `${current.label} ${current.sub || ""}`}
          </p>
          {groups.length === 0 ? (
            <p className="m-0 text-muted-foreground">There are no open times on this day. Please pick another day.</p>
          ) : (
            <R.Root aria-labelledby={gid + "-times"} value={time || ""} onValueChange={(v) => setTime(v)} className="flex flex-col gap-[calc(var(--gap)*0.6)]">
              {groups.map((g) => (
                <div key={g.period} role="group" aria-labelledby={`${gid}-${g.period}`} className="flex flex-col gap-2">
                  <p id={`${gid}-${g.period}`} className="m-0 font-bold">{g.period}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.slots.map((sl) => {
                      const v = slotValue(current, sl);
                      const on = v === time;
                      return (
                        <R.Item key={v} value={v} disabled={sl.disabled}
                          aria-label={`${current.fullLabel || `${current.label} ${current.sub || ""}`} at ${sl.time}`}
                          className={cn("inline-flex items-center gap-[0.4em] cursor-pointer whitespace-nowrap font-bold bg-card text-link [font-family:var(--font-ui,var(--font-body))]",
                            "[height:var(--control-h)] [padding-inline:1.1em] [border:2px_solid_var(--input)]", slotRadius,
                            "hover:bg-muted data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary-edge",
                            "data-[state=checked]:[box-shadow:0_0_0_2px_var(--primary-edge)] data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed", focusRing)}>
                          {on && <Check aria-hidden="true" strokeWidth={3} className="size-[1.1em]" />}
                          <span>{sl.time}</span>
                        </R.Item>
                      );
                    })}
                  </div>
                </div>
              ))}
            </R.Root>
          )}
        </div>
      )}

      <p className="m-0 [font-size:var(--text-sm)] text-muted-foreground">Times are {timezone}. Visits are {visitLength}.</p>
      <p role="status" className="m-0 font-bold empty:hidden">
        {chosenSlot ? `You picked ${chosenDay.fullLabel || `${chosenDay.label} ${chosenDay.sub || ""}`} at ${chosenSlot.time}.` : ""}
      </p>
    </div>
  );
}
