import { Container } from "../components/ui/container";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Container",
  component: Container,
  parameters: { docs: { description: { component: docs("container") } } },
};

const Fill = ({ children }) => <div style={{ border: "1.5px dashed var(--link)", background: "var(--secondary)", borderRadius: 6, padding: 10, textAlign: "center" }}>{children}</div>;

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Reading width (from the Brand Console)"><Container size="reading"><Fill><b>Reading</b><p style={{ textAlign: "left" }}>Your plan helps pay for doctor visits, hospital stays, and medicines. Lines of text stay short, so they are easy to read, even on a big screen.</p></Fill></Container></Grp>
  <Grp label="Page width"><Container size="page"><Fill><b>Page · 1200 px</b></Fill></Container></Grp>
  <Grp label="Full width"><Container size="full"><Fill><b>Full</b></Fill></Container></Grp>
</>) };
