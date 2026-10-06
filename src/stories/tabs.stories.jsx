import { Tabs } from "../components/ui/tabs";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { docs: { description: { component: docs("tabs") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<Tabs label="Claims" tabs={[{value:"medical",label:"Medical",count:12,content:<p style={{margin:0}}>Your medical claims show here.</p>},{value:"pharmacy",label:"Pharmacy",count:4,content:<p style={{margin:0}}>Your pharmacy claims show here.</p>},{value:"dental",label:"Dental",content:<p style={{margin:0}}>Your dental claims show here.</p>}]} />) };
