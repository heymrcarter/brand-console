import { Consent } from "../components/ui/consent";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Consent and signature", component: Consent, parameters: { docs: { description: { component: docs("consent") } } } };

const TERMS = (<>
  <p style={{ margin: 0 }}>You are giving Main Street Family Medicine permission to see your health records from the last 2 years. This includes your visits, your lab results, and your list of medicines.</p>
  <p style={{ margin: 0 }}>They will use your records only to care for you. They will not sell your records or share them with anyone else.</p>
  <p style={{ margin: 0 }}>This permission lasts for one year. You can stop it at any time. To stop it, call member services or turn it off in your account.</p>
  <p style={{ margin: 0 }}>If you say no, your care and your plan will not change.</p>
</>);

const base = {
  title: "Share your records with Dr. Patel",
  summary: "Dr. Patel's office can see your last 2 years of visits and lab results. You can stop this at any time.",
  terms: TERMS, downloadHref: "#", date: new Date(2026, 8, 28),
};

/** Every kind and state, as the brand team sees it in the Brand Console. Press "Sign and send" with nothing filled in to see the help text. */
export const All = { render: () => (<>
  <Grp label="Sign by typing your name"><div style={{ maxWidth: 560 }}><Consent {...base} sign="typed" /></div></Grp>
  <Grp label="Sign by ticking the box only"><div style={{ maxWidth: 560 }}><Consent {...base} sign="check" /></div></Grp>
</>) };
