import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Button",
  component: Button,
  parameters: { docs: { description: { component: docs("button") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<><Grp label="Kinds"><Row><Button>Save my changes</Button><Button variant="outline">Cancel</Button><Button variant="quiet">Add a note</Button><Button variant="ghost">Skip this step</Button><Button variant="danger">Delete address</Button></Row></Grp>
<Grp label="With an icon, loading, and turned off"><Row><Button icon={<Plus aria-hidden="true" size="1.1em" />}>Add a medicine</Button><Button loading>Saving</Button><Button disabled>Turned off</Button></Row></Grp>
<Grp label="Full width on a phone"><div style={{maxWidth:360}}><Button fullWidth>Continue to payment</Button></div></Grp></>) };
