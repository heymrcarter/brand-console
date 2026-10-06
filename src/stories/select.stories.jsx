import { userEvent, within } from "storybook/test";
import { Select } from "../components/ui/select";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Select",
  component: Select,
  parameters: { docs: { description: { component: docs("select") } } },
};

const CONTACT = ["Phone call", "Text message", "Email", "Mail"];
const STATES = ["Idaho", "Illinois", "Indiana", "Iowa"];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 420 }}>
  <Grp label="With a mouse: a button that opens a list">
    <Select label="How should we reach you first?" options={CONTACT} defaultValue="Phone call" native={false} />
    <Select label="State" hint="Pick the state where you live." options={STATES} native={false} />
    <Select label="Plan year" error="Pick a plan year." options={["2026", "2027"]} native={false} />
  </Grp>
  <Grp label="On phones and tablets: the phone's own picker">
    <Select label="How should we reach you first?" options={CONTACT} defaultValue="Phone call" native />
    <Select label="State" hint="Pick the state where you live." options={STATES} native />
    <Select label="Plan year" error="Pick a plan year." options={["2026", "2027"]} native />
  </Grp>
  <Grp label="Optional, and turned off">
    <Select label="Second language" optional options={["Spanish", "Polish", "Chinese", "Tagalog"]} native={false} />
    <Select label="Plan year" options={["2026", "2027"]} defaultValue="2026" disabled native={false} />
  </Grp>
</div>) };

/** The list is open. The active choice has a ring, and the picked one has a check mark. */
export const Open = {
  render: () => (<div style={{ maxWidth: 420, paddingBottom: 280 }}>
    <Select label="How should we reach you first?" options={CONTACT} defaultValue="Text message" native={false} />
  </div>),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("combobox"));
    await userEvent.keyboard("{ArrowDown}");
  },
};
