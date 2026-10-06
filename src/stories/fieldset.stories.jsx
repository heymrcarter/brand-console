import { Fieldset } from "../components/ui/fieldset";
import { TextField } from "../components/ui/text-field";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Fieldset (question group)",
  component: Fieldset,
  parameters: { docs: { description: { component: docs("fieldset") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. The Brand Console picks the question size. */
export const All = { render: () => (
  <div style={{ display: "grid", gap: "calc(var(--gap)*2)", maxWidth: 520 }}>
    <Grp label="An address">
      <Fieldset legend="What is your home address?" hint="We mail your member card to this address.">
        <TextField label="Street address" defaultValue="42 Oak Street" autoComplete="address-line1" />
        <TextField label="Apartment or unit" optional autoComplete="address-line2" />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--gap)" }}>
          <TextField label="City" defaultValue="Springfield" autoComplete="address-level2" />
          <TextField label="ZIP code" defaultValue="62704" width={10} inputMode="numeric" autoComplete="postal-code" />
        </div>
      </Fieldset>
    </Grp>
    <Grp label="With an error">
      <Fieldset legend="Who can we call about your care?" error="Enter a name and a phone number for the person we can call.">
        <TextField label="Full name" />
        <TextField label="Phone number" type="tel" width={20} autoComplete="tel" />
      </Fieldset>
    </Grp>
  </div>
) };
