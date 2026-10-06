import { RadioGroup } from "../components/ui/radio-group";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Radio buttons",
  component: RadioGroup,
  parameters: { docs: { description: { component: docs("radio") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{display:"grid",gap:"calc(var(--gap)*2)",maxWidth:520}}><RadioGroup legend="How would you like to get your card?" defaultValue="mail" options={[{value:"mail",label:"By mail",hint:"It arrives in 7 to 10 days."},{value:"download",label:"Download it now",hint:"You can print it or save it to your phone."}]} />
<RadioGroup legend="Do you have other insurance?" layout="inline" options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} /></div>) };
