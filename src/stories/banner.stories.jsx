import { Banner } from "../components/ui/banner";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Notification banner",
  component: Banner,
  parameters: { docs: { description: { component: docs("banner") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. With no tone, the banner uses the Brand Console color. */
export const All = { render: () => (
  <div style={{ display: "grid", gap: "calc(var(--gap)*1.2)" }}>
    <Grp label="Brand Console color">
      <Banner dismissible action={{ label: "Compare plans", href: "#plans" }}>Open enrollment ends December 7.</Banner>
    </Grp>
    <Grp label="Main color">
      <Banner tone="brand" dismissible action={{ label: "Compare plans", href: "#plans" }}>Open enrollment ends December 7.</Banner>
    </Grp>
    <Grp label="Soft">
      <Banner tone="info" action={{ label: "Read what is new", href: "#news" }}>Your plan has new benefits on January 1.</Banner>
    </Grp>
    <Grp label="Warning">
      <Banner tone="warning" dismissible>Our phone lines are closed on Monday for the holiday. You can still send us a message.</Banner>
    </Grp>
  </div>
) };
