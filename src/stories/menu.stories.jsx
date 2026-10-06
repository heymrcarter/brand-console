import { Pencil, Printer, Download, Trash2, MoreHorizontal } from "lucide-react";
import { Menu } from "../components/ui/menu";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Menu",
  component: Menu,
  parameters: { docs: { description: { component: docs("menu") } } },
};

const items = [
  { label: "Edit", icon: Pencil },
  { label: "Print", icon: Printer },
  { label: "Download", icon: Download },
  { label: "Delete", icon: Trash2, danger: true },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Actions menu"><Row><Menu label="Actions" items={items} /></Row></Grp>
  <Grp label="Opened from a button with only an icon"><Row>
    <Menu items={items} trigger={<Button variant="outline" aria-label="More actions for this claim"><MoreHorizontal aria-hidden="true" className="size-[1.2em]" /></Button>} />
  </Row></Grp>
</>) };
