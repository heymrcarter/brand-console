import { TextField } from "../components/ui/text-field";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Text field",
  component: TextField,
  parameters: { docs: { description: { component: docs("field") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{display:"grid",gap:"var(--gap)",maxWidth:480}}><TextField label="Phone number" hint="We will only call between 8 AM and 8 PM." defaultValue="(555) 201-4488" type="tel" autoComplete="tel" />
<TextField label="Middle name" optional hint="Leave it blank if you do not have one." />
<TextField label="Email address" error="Please add an @ sign, like name@email.com." defaultValue="jmorris.gmail.com" type="email" />
<TextField label="ZIP code" width="10" defaultValue="60601" inputMode="numeric" />
<TextField label="Member ID" disabled defaultValue="NF-448120" hint="Call us to change your member ID." /></div>) };
