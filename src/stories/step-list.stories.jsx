import { StepList } from "../components/ui/step-list";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Step list",
  component: StepList,
  parameters: { docs: { description: { component: docs("stepper") } } },
};

const steps = [
  { label: "Your details", href: "#details" },
  { label: "Your plan", href: "#plan" },
  { label: "Your doctor" },
  { label: "Review and send" },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Down the page"><StepList dir="col" steps={steps} current={2} /></Grp>
  <Grp label="Across the page"><StepList dir="row" steps={steps} current={2} /></Grp>
  <Grp label="All steps done"><StepList steps={steps.map((s) => ({ ...s, status: "done" }))} /></Grp>
</>) };
