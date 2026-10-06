import { TimePicker } from "../components/ui/time-picker";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Time picker",
  component: TimePicker,
  parameters: { docs: { description: { component: docs("time-picker") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 480 }}>
  <Grp label="Steps set in the Brand Console">
    <TimePicker label="Pickup time" hint="The pharmacy is open 9 AM to 6 PM." min="09:00" max="18:00" defaultValue="10:30" />
  </Grp>
  <Grp label="Every 15 minutes, with taken times left out">
    <TimePicker label="Call-back time" hint="We can call you between 8 AM and noon." min="08:00" max="12:00" step={15} unavailable={["09:00", "09:15"]} />
  </Grp>
  <Grp label="Nothing picked yet, and with an error">
    <TimePicker label="Pickup time" min="09:00" max="18:00" error="Please pick a time for your pickup." />
  </Grp>
  <Grp label="Turned off"><TimePicker label="Pickup time" defaultValue="14:00" disabled hint="Call us to change your pickup time." /></Grp>
</div>) };
