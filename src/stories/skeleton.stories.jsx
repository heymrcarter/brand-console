import { Skeleton } from "../components/ui/skeleton";
import { Card } from "../components/ui/card";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Loading placeholder (skeleton)",
  component: Skeleton,
  parameters: { docs: { description: { component: docs("skeleton") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="A card loading">
    <div style={{ maxWidth: 420 }}>
      <Card>
        <Skeleton shape="heading" label="Loading your plan details." />
        <Skeleton lines={2} />
        <Skeleton shape="button" />
      </Card>
    </div>
  </Grp>
  <Grp label="Shapes">
    <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
      <Skeleton shape="heading" />
      <Skeleton shape="text" lines={3} />
      <Row><Skeleton shape="avatar" /><div style={{ flex: 1 }}><Skeleton shape="text" lines={2} /></div></Row>
      <Skeleton shape="block" />
    </div>
  </Grp>
</>) };
