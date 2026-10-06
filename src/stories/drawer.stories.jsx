import { Drawer, DrawerClose } from "../components/ui/drawer";
import { Button } from "../components/ui/button";
import { TextField } from "../components/ui/text-field";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Drawer",
  component: Drawer,
  parameters: { docs: { description: { component: docs("drawer") } } },
};

const Example = ({ side, width, label }) => (
  <Drawer side={side} width={width} title="Claim R-20411" trigger={<Button variant="outline">{label}</Button>}
    footer={<><DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose><DrawerClose asChild><Button>Save</Button></DrawerClose></>}>
    <p style={{ margin: 0 }}>This claim is waiting for a note from the member.</p>
    <TextField label="Note" defaultValue="Called the member on 9/23." />
  </Drawer>
);

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="From the right"><Row><Example side="right" width="narrow" label="Open a narrow drawer" /><Example side="right" width="wide" label="Open a wide drawer" /></Row></Grp>
  <Grp label="From the left"><Row><Example side="left" width="narrow" label="Open from the left" /></Row></Grp>
</>) };
