import { FileText, FlaskConical, Pill } from "lucide-react";
import { List } from "../components/ui/list";
import { Button } from "../components/ui/button";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/List",
  component: List,
  parameters: { docs: { description: { component: docs("list") } } },
};

const items = [
  { id: "a", icon: FileText, title: "Office visit, Dr. Patel", detail: "Sep 12. You owe $20.", href: "#visit", badge: { tone: "success", label: "Paid" } },
  { id: "b", icon: FlaskConical, title: "Lab work", detail: "Sep 3. We are still checking it.", href: "#lab", badge: { tone: "warning", label: "In review" } },
  { id: "c", icon: Pill, title: "Metformin 500 mg", detail: "Aug 29. You paid $4.", href: "#med", badge: { tone: "success", label: "Paid" } },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="With lines"><List label="Recent claims" lines="on" items={items} /></Grp>
  <Grp label="No lines"><List label="Recent claims" lines="off" items={items} /></Grp>
  <Grp label="With an action button"><List label="Your medicines" items={[
    { id: "m1", icon: Pill, title: "Metformin 500 mg", detail: "You have 5 days left.", action: <Button variant="outline">Refill</Button> },
    { id: "m2", icon: Pill, title: "Lisinopril 10 mg", detail: "You have 24 days left.", action: <Button variant="outline">Refill</Button> },
  ]} /></Grp>
</>) };
