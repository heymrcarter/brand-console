import { Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { IconButton } from "../components/ui/icon-button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Icon button",
  component: IconButton,
  parameters: { docs: { description: { component: docs("icon-button") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Kinds (word shown or hidden by the Brand Console)"><Row>
    <IconButton icon={Plus} label="Add" variant="primary" />
    <IconButton icon={Pencil} label="Edit" />
    <IconButton icon={Trash2} label="Delete" variant="ghost" />
    <IconButton icon={Printer} label="Print" />
  </Row></Grp>
  <Grp label="Word always shown under the icon"><Row>
    <IconButton icon={Plus} label="Add" variant="primary" showLabel />
    <IconButton icon={Pencil} label="Edit" showLabel />
    <IconButton icon={Trash2} label="Delete" variant="ghost" showLabel />
  </Row></Grp>
  <Grp label="Word next to the icon"><Row>
    <IconButton icon={Printer} label="Print this page" showLabel labelPosition="side" />
  </Row></Grp>
  <Grp label="Icon only, with a tip on mouse over and focus"><Row>
    <IconButton icon={X} label="Close" showLabel={false} />
    <IconButton icon={Trash2} label="Delete this address" variant="ghost" showLabel={false} />
    <IconButton icon={Pencil} label="Edit" showLabel={false} disabled />
  </Row></Grp>
</>) };
