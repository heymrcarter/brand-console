import { useState } from "react";
import { DatePicker } from "../components/ui/date-picker";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Date picker",
  component: DatePicker,
  parameters: { docs: { description: { component: docs("date-picker") } } },
};

const weekend = (d) => (d.getDay() === 0 || d.getDay() === 6 ? "The clinic is closed on weekends." : false);

function PickerDemo() {
  const today = new Date(2026, 9, 1);
  const [visit, setVisit] = useState(new Date(2026, 9, 14));
  const [refill, setRefill] = useState(null);
  const [bad, setBad] = useState(null);
  return (
    <div style={{ display: "grid", gap: "calc(var(--gap)*2)", maxWidth: 520 }}>
      <Grp label="With a chosen day, weekends turned off">
        <DatePicker label="Visit date" value={visit} onChange={setVisit} today={today} min={today} max={new Date(2026, 11, 31)}
          disabledDates={weekend} unavailableNote="The clinic is closed on weekends. You can pick a weekday." />
      </Grp>
      <Grp label="Empty, week starts on Monday">
        <DatePicker label="When should we send your refill?" optional value={refill} onChange={setRefill} today={today} weekStart="mon" />
      </Grp>
      <Grp label="With an error">
        <DatePicker label="Visit date" value={bad} onChange={setBad} today={today}
          error="Enter the visit date like 10/14/2026, or pick a day in the calendar." />
      </Grp>
      <Grp label="Turned off">
        <DatePicker label="Visit date" defaultValue={new Date(2026, 9, 20)} disabled today={today} />
      </Grp>
    </div>
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. Press the calendar button to open it. */
export const All = { render: () => <PickerDemo /> };
