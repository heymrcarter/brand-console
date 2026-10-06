import { SummaryList } from "../components/ui/summary-list";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Summary list",
  component: SummaryList,
  parameters: { docs: { description: { component: docs("summary-list") } } },
};

const rows = [
  { key: "Name", value: "June Morris", href: "#name" },
  { key: "Date of birth", value: "March 27, 1952", href: "#dob" },
  { key: "Phone", value: "(555) 201-4488", href: "#phone", actionHidden: "phone number" },
  { key: "Address", value: <>42 Oak Street<br />Springfield, IL 62704</>, href: "#address" },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Review your answers (lines follow the Brand Console setting)"><div style={{ maxWidth: 640 }}><SummaryList rows={rows} /></div></Grp>
  <Grp label="On a phone"><div style={{ maxWidth: 340 }}><SummaryList rows={rows} /></div></Grp>
  <Grp label="Without Change links"><div style={{ maxWidth: 640 }}><SummaryList rows={[{ key: "Plan", value: "Silver Plus" }, { key: "Member ID", value: "NF 204 118 336" }]} /></div></Grp>
</>) };
