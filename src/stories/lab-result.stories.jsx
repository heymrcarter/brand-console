import { LabResult } from "../components/ui/lab-result";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Lab result",
  component: LabResult,
  parameters: { docs: { description: { component: docs("lab-result") } } },
};

const a1c = { test: "Hemoglobin A1C", value: 6.8, unit: "%", range: { low: 4.0, high: 5.6 }, date: "Sep 3, 2026", explainHref: "#", format: (v) => v.toFixed(1) };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 520 }}>
  <Grp label="High, shown as a bar"><LabResult {...a1c} display="bar" /></Grp>
  <Grp label="High, words only"><LabResult {...a1c} display="text" /></Grp>
  <Grp label="Normal"><LabResult test="Cholesterol, total" value={182} unit="mg/dL" range={{ low: 125, high: 200 }} date="Sep 3, 2026" explainHref="#" /></Grp>
  <Grp label="Low"><LabResult test="Vitamin D" value={18} unit="ng/mL" range={{ low: 30, high: 100 }} date="Sep 3, 2026" explainHref="#" /></Grp>
</div>) };
