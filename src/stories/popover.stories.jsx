import { Popover } from "../components/ui/popover";
import { docs, Grp, Row } from "./meta.jsx";

export default { title: "Components/Popover", component: Popover, parameters: { docs: { description: { component: docs("popover") } } } };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Closed. Click the button to open it."><Row>
    <Popover title="Your cost is $20." action={<a href="#" className="text-link underline font-semibold">See all your costs</a>}>
      <p style={{ margin: 0 }}>This is your copay for a visit with a specialist in your network.</p>
    </Popover>
  </Row></Grp>
  <Grp label="Open"><div style={{ minHeight: 200 }}>
    <Popover defaultOpen triggerLabel="When will my card arrive?" title="Your card is on the way.">
      <p style={{ margin: 0 }}>It can take up to 10 days for a new card to arrive in the mail.</p>
    </Popover>
  </div></Grp>
</>) };
