import { useState } from "react";
import { FilterChips } from "../components/ui/filter-chips";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Filter chips",
  component: FilterChips,
  parameters: { docs: { description: { component: docs("filter-chips") } } },
};

const options = ["In network", "Accepting new patients", "Speaks Spanish", "Video visits"];

function Example() {
  const [sel, setSel] = useState(["In network", "Accepting new patients"]);
  const count = [58, 41, 32, 20, 12][sel.length] ?? 12;
  return <FilterChips label="Filter doctors" options={options} value={sel} onValueChange={setSel} resultText={`${count} doctors match.`} />;
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Some filters on"><Example /></Grp>
  <Grp label="Round ends"><div style={{ "--c-filter-chips-shape": "999px" }}><FilterChips label="Filter doctors" options={options} defaultValue={["Video visits"]} /></div></Grp>
  <Grp label="Rounded"><div style={{ "--c-filter-chips-shape": "var(--field-radius)" }}><FilterChips label="Filter doctors" options={options} defaultValue={["Video visits"]} /></div></Grp>
</>) };
