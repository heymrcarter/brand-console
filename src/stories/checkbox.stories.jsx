import { Checkbox } from "../components/ui/checkbox";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { docs: { description: { component: docs("checkbox") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<><Grp label="A group"><fieldset style={{border:0,padding:0,margin:0}}><legend style={{fontWeight:"var(--label-weight)"}}>How can we reach you?</legend><p style={{margin:"4px 0",fontSize:"var(--text-sm)",color:"var(--muted-foreground)"}}>Pick all that apply.</p>
<Checkbox label="Phone call" defaultChecked /><Checkbox label="Text message" hint="Message and data rates may apply." defaultChecked /><Checkbox label="Email" /></fieldset></Grp>
<Grp label="Some ticked"><Checkbox label="All reminders" checked="indeterminate" /></Grp>
<Grp label="Something is wrong"><Checkbox label="I agree to the terms" error="You must agree before you can go on." /></Grp></>) };
