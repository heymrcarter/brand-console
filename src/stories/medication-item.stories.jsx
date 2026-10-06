import { useState } from "react";
import { MedicationItem } from "../components/ui/medication-item";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Medication item",
  component: MedicationItem,
  parameters: { docs: { description: { component: docs("medication") } } },
};

const metformin = { drug: { name: "Metformin", strength: "500 mg", form: "Tablet" }, purpose: "diabetes", sig: "Take 1 tablet by mouth 2 times a day, with food.", pharmacy: "Main Street Pharmacy" };

function RefillDemo({ instructions }) {
  const [state, setState] = useState("idle");
  const order = () => { setState("busy"); setTimeout(() => setState("done"), 900); };
  return (
    <MedicationItem {...metformin} instructions={instructions} refillsLeft={2} nextFill="October 4, 2026"
      status={state === "done" ? "ordered" : "soon"} statusText={state === "done" ? undefined : "Runs out in 5 days"}
      refilling={state === "busy"} onRefill={order} onDetails={() => {}}
      message={state === "done" ? "Your refill is ordered. Main Street Pharmacy will text you when it is ready." : ""} />
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 560 }}>
  <Grp label="Runs out soon (press the button to order)"><RefillDemo /></Grp>
  <Grp label="How to take it, hidden until opened"><RefillDemo instructions="hide" /></Grp>
  <Grp label="Enough for now"><MedicationItem drug={{ name: "Lisinopril", strength: "10 mg", form: "Tablet" }} purpose="blood pressure" sig="Take 1 tablet by mouth once a day, in the morning." refillsLeft={5} nextFill="November 12, 2026" pharmacy="Main Street Pharmacy" status="ok" onRefill={() => {}} onDetails={() => {}} /></Grp>
  <Grp label="No refills left"><MedicationItem drug={{ name: "Atorvastatin", strength: "20 mg", form: "Tablet" }} purpose="cholesterol" sig="Take 1 tablet by mouth once a day, at bedtime." refillsLeft={0} pharmacy="Main Street Pharmacy" status="none" onRefill={() => {}} onDetails={() => {}} /></Grp>
</div>) };
