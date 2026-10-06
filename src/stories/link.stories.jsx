import { Link } from "../components/ui/link";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Link",
  component: Link,
  parameters: { docs: { description: { component: docs("link") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Inside a sentence"><p style={{ margin: 0 }}>You can <Link href="#plan">see your plan details</Link> at any time.</p></Grp>
  <Grp label="On its own line"><div><Link href="#claims" variant="standalone">View your claims</Link></div></Grp>
  <Grp label="Action link"><div><Link href="#doctors" variant="action">Find a doctor near you</Link></div></Grp>
  <Grp label="Back link"><div><Link href="#back" variant="back">Back</Link></div></Grp>
  <Grp label="Opens another website"><div><Link href="https://www.ssa.gov" variant="standalone" external>Social Security website</Link></div>
    <p style={{ margin: 0 }}>You can also read about benefits on the <Link href="https://www.medicare.gov" external>Medicare website</Link>.</p></Grp>
</>) };
