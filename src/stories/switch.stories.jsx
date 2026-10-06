import { Switch } from "../components/ui/switch";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Switch",
  component: Switch,
  parameters: { docs: { description: { component: docs("switch") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{maxWidth:520}}><Switch label="Text me when a refill is ready" hint="We send texts to (555) 201-4488." defaultChecked /><Switch label="Email me my monthly statement" /></div>) };
