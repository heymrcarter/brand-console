import { Stack } from "../components/ui/stack";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Stack",
  component: Stack,
  parameters: { docs: { description: { component: docs("stack") } } },
};

const Box = ({ w, children }) => <div style={{ minHeight: 36, width: w, background: "var(--secondary)", border: "1.5px dashed var(--link)", borderRadius: 6, padding: "6px 10px", color: "var(--secondary-foreground)" }}>{children}</div>;

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ maxWidth: 560 }}>
  <Grp label="Column"><Stack><Box>Your plan</Box><Box>Your doctor</Box><Box>Your medicines</Box></Stack></Grp>
  <Grp label="Row"><Stack direction="row"><Box w={70}>One</Box><Box w={70}>Two</Box><Box w={70}>Three</Box><Box w={70}>Four</Box></Stack></Grp>
  {["xs", "sm", "md", "lg", "xl"].map((g) => (
    <Grp key={g} label={`Gap: ${g}`}><Stack direction="row" gap={g}><Box w={60} /><Box w={60} /><Box w={60} /></Stack></Grp>
  ))}
  <Grp label="Row that wraps, spread apart"><Stack direction="row" wrap justify="between"><Box w={140}>Left side</Box><Box w={140}>Right side</Box></Stack></Grp>
</div>) };
