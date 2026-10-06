import { Pill, CalendarDays } from "lucide-react";
import { EmptyState } from "../components/ui/empty-state";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Empty state",
  component: EmptyState,
  parameters: { docs: { description: { component: docs("empty-state") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="No prescriptions (the picture follows the Brand Console setting)">
    <EmptyState icon={Pill} title="You have no prescriptions yet"
      text="When your doctor sends a prescription to us, it shows up here."
      action={<Button variant="outline">Transfer a prescription</Button>} />
  </Grp>
  <Grp label="Inside a card">
    <div style={{ maxWidth: 480 }}>
      <Card>
        <EmptyState icon={CalendarDays} headingLevel={3} title="You have no visits coming up"
          text="When you make an appointment, you will see it here."
          action={<Button>Make an appointment</Button>} />
      </Card>
    </div>
  </Grp>
</>) };
