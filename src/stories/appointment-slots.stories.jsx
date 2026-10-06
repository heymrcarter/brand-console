import { useState } from "react";
import { AppointmentSlots } from "../components/ui/appointment-slots";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Appointment slot picker", component: AppointmentSlots, parameters: { docs: { description: { component: docs("appointment-slots") } } } };

const DAYS = [
  { date: "2026-10-13", label: "Tue", sub: "Oct 13", fullLabel: "Tuesday, October 13", slots: [{ time: "8:30 AM" }, { time: "11:00 AM" }, { time: "3:00 PM" }] },
  { date: "2026-10-14", label: "Wed", sub: "Oct 14", fullLabel: "Wednesday, October 14", slots: [{ time: "9:00 AM" }, { time: "9:30 AM" }, { time: "10:30 AM" }, { time: "1:00 PM" }, { time: "2:30 PM" }] },
  { date: "2026-10-15", label: "Thu", sub: "Oct 15", fullLabel: "Thursday, October 15", slots: [] },
  { date: "2026-10-16", label: "Fri", sub: "Oct 16", fullLabel: "Friday, October 16", slots: [{ time: "10:00 AM" }, { time: "4:00 PM" }] },
];

function Demo(props) {
  const [v, setV] = useState("2026-10-14 10:30 AM");
  return <AppointmentSlots days={DAYS} value={v} onValueChange={setV} {...props} />;
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Rounded time buttons, with a time picked (Thursday has no times left)"><Demo shape="md" /></Grp>
  <Grp label="Round-ended time buttons"><Demo shape="pill" /></Grp>
  <Grp label="Nothing picked yet"><AppointmentSlots days={DAYS} timezone="Eastern Time" visitLength="20 minutes" /></Grp>
</>) };
