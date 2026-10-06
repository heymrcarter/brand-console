import { MemberCard } from "../components/ui/member-card";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Member ID card",
  component: MemberCard,
  parameters: { docs: { description: { component: docs("member-card") } } },
};

const member = { name: "June A. Morris", id: "NF-448120", group: "40218", plan: "Gold Plus HMO" };
const rx = { bin: "610014", pcn: "MEDDPRIME" };
const noop = () => {};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<Row>
  <Grp label="Main color band"><MemberCard style="band" member={member} rx={rx} phone="1-800-555-0142" onDownload={noop} onPrint={noop} /></Grp>
  <Grp label="White top"><MemberCard style="plain" member={member} rx={rx} phone="1-800-555-0142" onDownload={noop} onPrint={noop} /></Grp>
</Row>) };
