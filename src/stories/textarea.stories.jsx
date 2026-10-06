import { Textarea } from "../components/ui/textarea";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Text area",
  component: Textarea,
  parameters: { docs: { description: { component: docs("textarea") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{maxWidth:520}}><Textarea label="What would you like your doctor to know?" hint="A few sentences is enough." maxLength={500} defaultValue="I have been feeling dizzy in the mornings for about two weeks." /></div>) };
