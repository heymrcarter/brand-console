import { useState } from "react";
import { FormattedField } from "../components/ui/formatted-field";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Formatted fields",
  component: FormattedField,
  parameters: { docs: { description: { component: docs("masked") } } },
};

function Phone() {
  const [digits, setDigits] = useState("5552014488");
  return (<>
    <FormattedField kind="phone" label="Phone number" value={digits} onValueChange={setDigits} />
    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>The app saves only the numbers: {digits || "nothing yet"}.</p>
  </>);
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 480 }}>
  <Grp label="Phone number (try pasting +1 555.201.4488)"><Phone /></Grp>
  <Grp label="ZIP code"><FormattedField kind="zip" label="ZIP code" defaultValue="60601" /></Grp>
  <Grp label="Member ID"><FormattedField kind="member-id" label="Member ID" defaultValue="nf448120" hint="You can find it on the front of your member card." /></Grp>
  <Grp label="Last 4 of Social Security number">
    <FormattedField kind="ssn-last4" label="Last 4 numbers of your Social Security number" defaultValue="4821" hint="We only need the last 4 numbers." />
  </Grp>
  <Grp label="Something is wrong">
    <FormattedField kind="phone" label="Phone number" defaultValue="555201" error="Please type all 10 numbers of your phone number." />
  </Grp>
</div>) };
