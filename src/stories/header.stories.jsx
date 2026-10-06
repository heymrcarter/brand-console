import { Header } from "../components/ui/header";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Header", component: Header, parameters: { layout: "fullscreen", docs: { description: { component: docs("header") } } } };

const links = [
  { label: "My plan", href: "#", current: true },
  { label: "Find care", href: "#" },
  { label: "Claims", href: "#" },
  { label: "Pharmacy", href: "#" },
];
const account = { name: "Jane Martinez", initials: "JM", href: "#" };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ padding: 16 }}>
  <Grp label="White background, as set in the Brand Console"><Header links={links} account={account} /></Grp>
  <Grp label="Main color background"><Header variant="brand" links={links} account={account} /></Grp>
  <Grp label="Without the phone number"><Header showPhone={false} links={links} account={account} /></Grp>
  <Grp label="On a phone. The links move into the Menu button."><div style={{ maxWidth: 390 }}><Header links={links} account={account} /></div></Grp>
</div>) };
