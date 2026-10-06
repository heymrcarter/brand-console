import { useState } from "react";
import { DataTable } from "../components/ui/data-table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Data table",
  component: DataTable,
  parameters: { docs: { description: { component: docs("data-table") } } },
};

const TONE = { Waiting: "warning", Done: "success", Late: "danger" };
const columns = [
  { key: "id", label: "ID", sortable: true, render: (r) => <a href={"#" + r.id} style={{ color: "var(--link)", fontWeight: 600 }}>{r.id}</a> },
  { key: "member", label: "Member", sortable: true },
  { key: "request", label: "Request" },
  { key: "due", label: "Due", sortable: true, sortValue: (r) => r.dueOrder },
  { key: "status", label: "Status", render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
  { key: "balance", label: "Balance", type: "money", sortable: true, sortValue: (r) => r.balance, render: (r) => "$" + r.balance.toFixed(2) },
];
const rows = [
  { id: "R-20417", member: "Morris, June", request: "Address change", due: "Today", dueOrder: 3, status: "Waiting", balance: 0 },
  { id: "R-20416", member: "Patel, Arun", request: "New card", due: "Today", dueOrder: 3, status: "Done", balance: 0 },
  { id: "R-20411", member: "Lee, Grace", request: "Billing question", due: "Sep 23", dueOrder: 2, status: "Late", balance: 142.18 },
  { id: "R-20409", member: "Ortiz, Sam", request: "Address change", due: "Sep 23", dueOrder: 2, status: "Done", balance: 0 },
  { id: "R-20402", member: "Brooks, Ann", request: "Plan change", due: "Sep 22", dueOrder: 1, status: "Waiting", balance: 38 },
];

function Picking() {
  const [sel, setSel] = useState(["R-20411"]);
  return (
    <DataTable caption="Member requests" columns={columns} rows={rows} rowLabel="member" selectable selected={sel} onSelectedChange={setSel}
      defaultSort={{ key: "id", dir: "desc" }}
      toolbar={<><Button variant="ghost">Assign to me</Button><Button variant="ghost">Export</Button></>} />
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Pick rows and sort"><Picking /></Grp>
  <Grp label="Striped rows, plain header"><DataTable caption="Member requests" columns={columns} rows={rows} stripes="on" header="plain" /></Grp>
  <Grp label="Nothing to show"><DataTable caption="Member requests" columns={columns} rows={[]} emptyText="There are no requests right now." /></Grp>
  <Grp label="Narrow screen scrolls sideways"><div style={{ maxWidth: 360 }}><DataTable caption="Member requests" columns={columns} rows={rows.slice(0, 3)} /></div></Grp>
</>) };
