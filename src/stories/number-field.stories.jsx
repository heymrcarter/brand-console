import { NumberField } from "../components/ui/number-field";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Number and money",
  component: NumberField,
  parameters: { docs: { description: { component: docs("number") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 480 }}>
  <Grp label="A count (plus and minus buttons set in the Brand Console)">
    <NumberField label="How many 90-day refills?" defaultValue={2} min={0} max={4} hint="You can order up to 4." />
  </Grp>
  <Grp label="A count without buttons"><NumberField label="How many 90-day refills?" defaultValue={2} min={0} max={4} stepper={false} hint="You can order up to 4." /></Grp>
  <Grp label="Money"><NumberField kind="currency" label="Payment amount" defaultValue={42.5} hint="Your balance is $42.50." /></Grp>
  <Grp label="Percent"><NumberField kind="percent" label="How much of the cost do you pay?" defaultValue={20} hint="Look for this on your plan summary." /></Grp>
  <Grp label="Something is wrong">
    <NumberField kind="currency" label="Payment amount" defaultValue={60} error="The amount cannot be more than your balance of $42.50." />
  </Grp>
</div>) };
