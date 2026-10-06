import { Spinner } from "../components/ui/spinner";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Spinner",
  component: Spinner,
  parameters: { docs: { description: { component: docs("spinner") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Loading (words follow the Brand Console setting)"><Spinner label="Loading your plan." /></Grp>
  <Grp label="Sizes"><Row><Spinner size="sm" label="Loading your bills." /><Spinner size="md" label="Loading your bills." /><Spinner size="lg" label="Loading your bills." /></Row></Grp>
  <Grp label="Words always shown, and words hidden"><Row><Spinner words label="Finding doctors near you." /><Spinner words={false} label="Finding doctors near you." /></Row></Grp>
  <Grp label="In a button"><Row><Button loading>Saving</Button></Row></Grp>
</>) };
