import { useState } from "react";
import { List, MapPin } from "lucide-react";
import { ButtonGroup } from "../components/ui/button-group";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Button group",
  component: ButtonGroup,
  parameters: { docs: { description: { component: docs("button-group") } } },
};

function Views() {
  const [view, setView] = useState("week");
  return (<>
    <ButtonGroup label="Show your visits by" value={view} onChange={setView}
      options={[{ label: "Day", value: "day" }, { label: "Week", value: "week" }, { label: "Month", value: "month" }]} />
    <p style={{ margin: 0 }}>You are looking at this {view}.</p>
  </>);
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Switch views"><Views /></Grp>
  <Grp label="With icons">
    <ButtonGroup label="Show doctors as" defaultValue="list"
      options={[{ label: "List", value: "list", icon: List }, { label: "Map", value: "map", icon: MapPin }]} />
  </Grp>
  <Grp label="Turned off">
    <ButtonGroup label="Show your visits by" defaultValue="day" disabled
      options={[{ label: "Day", value: "day" }, { label: "Week", value: "week" }, { label: "Month", value: "month" }]} />
  </Grp>
</>) };
