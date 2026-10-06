import { useState } from "react";
import { DateInput } from "../components/ui/date-input";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Date input",
  component: DateInput,
  parameters: { docs: { description: { component: docs("date-input") } } },
};

function DateDemo(){const [v,setV]=useState({month:"3",day:"27",year:"1952"});const [b,setB]=useState({month:"3",day:"42",year:"1952"});
return <div style={{display:"grid",gap:"calc(var(--gap)*2)"}}><DateInput legend="Date of birth" value={v} onChange={setV} /><DateInput legend="Date of birth" value={b} onChange={setB} error="The day must be between 1 and 31." errorField="day" /></div>;}
/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<DateDemo />) };
