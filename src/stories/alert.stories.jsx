import { Alert } from "../components/ui/alert";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Alert",
  component: Alert,
  parameters: { docs: { description: { component: docs("alert") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{display:"grid",gap:"calc(var(--gap)*0.6)",maxWidth:600}}><Alert tone="info" title="Your plan is changing on January 1.">Read what is new before you pick a doctor.</Alert>
<Alert tone="success" title="Your payment went through.">We sent a receipt to june@email.com.</Alert>
<Alert tone="warning" title="Your prescription runs out in 5 days.">Order a refill now so you do not miss a dose.</Alert>
<Alert tone="danger" title="We could not save your address.">Check your internet connection and try again.</Alert></div>) };
