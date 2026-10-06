import { ProviderCard } from "../components/ui/provider-card";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Provider card",
  component: ProviderCard,
  parameters: { docs: { description: { component: docs("provider-card") } } },
};

const patel = { name: "Dr. Anita Patel", specialty: "Family medicine", distance: "1.2 miles", network: true, accepting: true, address: "200 Main Street, Springfield", languages: "English and Hindi", phone: "(555) 310-2200", href: "#" };
const noop = () => {};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 520 }}>
  <Grp label="With a photo or initials"><ProviderCard photo="show" provider={patel} onBook={noop} /></Grp>
  <Grp label="Without a photo"><ProviderCard photo="hide" provider={patel} onBook={noop} /></Grp>
  <Grp label="Not taking new patients"><ProviderCard provider={{ ...patel, name: "Dr. Luis Romero", specialty: "Heart doctor", distance: "3.4 miles", accepting: false, languages: "English and Spanish", phone: "(555) 310-4410" }} /></Grp>
</div>) };
