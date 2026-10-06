import { Divider } from "../components/ui/divider";
import { docs, Grp, Row } from "./meta.jsx";

export default { title: "Components/Divider", component: Divider, parameters: { docs: { description: { component: docs("divider") } } } };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ maxWidth: 480 }}>
  <Grp label="Plain"><Divider /></Grp>
  <Grp label="With a word"><Divider label="or" /></Grp>
  <Grp label="Thin and medium lines"><Divider weight={1} /><Divider weight={2} /></Grp>
  <Grp label="Standing up, between two links"><Row><a href="#" className="text-link underline">Print your card</a><Divider orientation="vertical" /><a href="#" className="text-link underline">Order a new card</a></Row></Grp>
</div>) };
