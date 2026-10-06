import { Badge } from "../components/ui/badge";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Badge",
  component: Badge,
  parameters: { docs: { description: { component: docs("badge") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<Row><Badge>New</Badge><Badge tone="brand">Member</Badge><Badge tone="success">In network</Badge><Badge tone="warning">Due soon</Badge><Badge tone="danger">Late</Badge><Badge tone="neutral">Draft</Badge></Row>) };
