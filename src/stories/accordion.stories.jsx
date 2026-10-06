import { Accordion } from "../components/ui/accordion";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Accordion",
  component: Accordion,
  parameters: { docs: { description: { component: docs("accordion") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{maxWidth:640}}><Accordion defaultValue="a" items={[{value:"a",title:"What is a deductible?",content:"It is the amount you pay for care each year before your plan starts to pay."},{value:"b",title:"How do I get a new member card?",content:"Call us, or download it from your account."},{value:"c",title:"Can I see a doctor out of network?",content:"Yes, but you may pay more."}]} /></div>) };
