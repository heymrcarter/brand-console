import { useState } from "react";
import { PlanCompare } from "../components/ui/plan-compare";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Plan comparison", component: PlanCompare, parameters: { docs: { description: { component: docs("plan-compare") } } } };

const PLANS = [
  { id: "gold", name: "Gold Plus", monthly: "$42", deductible: "$0", doctorVisit: "$10", specialist: "$30", maxYear: "$4,500" },
  { id: "silver", name: "Silver Basic", monthly: "$0", deductible: "$500", doctorVisit: "$25", specialist: "$50", maxYear: "$6,700" },
  { id: "bronze", name: "Bronze Saver", monthly: "$0", deductible: "$1,500", doctorVisit: "$40", specialist: "$75", maxYear: "$8,300" },
];

function Demo(props) {
  const [msg, setMsg] = useState("");
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <PlanCompare plans={PLANS} current="gold" onChoose={(p) => setMsg(`You picked ${p.name}.`)} {...props} />
    <p role="status" style={{ margin: 0 }}>{msg}</p>
  </div>);
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Current plan marked with a tag"><Demo highlight="badge" plans={PLANS.slice(0, 2)} /></Grp>
  <Grp label="Current plan marked with a thick border"><Demo highlight="border" plans={PLANS.slice(0, 2)} /></Grp>
  <Grp label="Three plans, with one we suggest"><Demo recommended="silver" /></Grp>
  <Grp label="On a phone, the plans stack"><div style={{ maxWidth: 360 }}><Demo plans={PLANS.slice(0, 2)} /></div></Grp>
</>) };
