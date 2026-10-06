import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Breadcrumbs", component: Breadcrumbs, parameters: { docs: { description: { component: docs("breadcrumbs") } } } };

const items = [{ label: "Home", href: "#" }, { label: "My plan", href: "#" }, { label: "Claims" }];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="As set in the Brand Console"><Breadcrumbs items={items} /></Grp>
  <Grp label="Arrows between links"><Breadcrumbs sep="chevron" items={items} /></Grp>
  <Grp label="Slashes between links"><Breadcrumbs sep="slash" items={items} /></Grp>
  <Grp label="On a phone, only the link one level up shows"><div style={{ maxWidth: 360 }}><Breadcrumbs items={items} /></div></Grp>
</>) };
