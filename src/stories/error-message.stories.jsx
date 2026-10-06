import { ErrorMessage } from "../components/ui/error-message";
import { inputClass } from "../components/ui/field-parts";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Error message",
  component: ErrorMessage,
  parameters: { docs: { description: { component: docs("error-message") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. The Brand Console picks whether the warning icon shows. */
export const All = { render: () => (
  <div style={{ display: "grid", gap: "calc(var(--gap)*2)", maxWidth: 480 }}>
    <Grp label="Under a field">
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="em-zip" style={{ fontWeight: "var(--label-weight)" }}>ZIP code</label>
        <ErrorMessage id="em-zip-err">Enter a ZIP code with 5 numbers, like 60601.</ErrorMessage>
        <input id="em-zip" className={inputClass} style={{ maxWidth: "8em" }} defaultValue="606" aria-invalid="true" aria-describedby="em-zip-err" />
      </div>
    </Grp>
    <Grp label="On its own">
      <ErrorMessage message="Pick a pharmacy before you order your refill." />
    </Grp>
  </div>
) };
