import { LabelHint } from "../components/ui/label-hint";
import { inputClass } from "../components/ui/field-parts";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Label and help text",
  component: LabelHint,
  parameters: { docs: { description: { component: docs("label-hint") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. The Brand Console picks whether optional or required fields get the extra word. */
export const All = { render: () => (
  <div style={{ display: "grid", gap: "calc(var(--gap)*2)", maxWidth: 480 }}>
    <Grp label="Optional field">
      <div style={{ display: "grid", gap: 6 }}>
        <LabelHint htmlFor="lh-middle" label="Middle name" optional hint="Leave it blank if you do not have one." />
        <input id="lh-middle" className={inputClass} aria-describedby="lh-middle-hint" />
      </div>
    </Grp>
    <Grp label="Required field">
      <div style={{ display: "grid", gap: 6 }}>
        <LabelHint htmlFor="lh-last" label="Last name" hint="Use the name on your member card." />
        <input id="lh-last" className={inputClass} defaultValue="Morris" aria-describedby="lh-last-hint" />
      </div>
    </Grp>
    <Grp label="For a custom control">
      <div style={{ display: "grid", gap: 6 }}>
        <LabelHint labelId="lh-pain" hintId="lh-pain-hint" label="How much pain do you feel today?" hint="Pick a number from 0 for no pain to 10 for the worst pain." />
        <input type="range" min="0" max="10" defaultValue="3" aria-labelledby="lh-pain" aria-describedby="lh-pain-hint" style={{ minHeight: "var(--control-h)" }} />
      </div>
    </Grp>
  </div>
) };
