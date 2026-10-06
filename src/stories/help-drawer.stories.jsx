import { HelpDrawer } from "../components/ui/help-drawer";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Help drawer",
  component: HelpDrawer,
  parameters: { docs: { description: { component: docs("help-drawer") } } },
};

const phone = { number: "1-800-555-0142", display: "1-800-555-0142 (TTY 711)", hours: "We are here Monday to Friday, 8 AM to 8 PM." };
const topics = [
  { title: "How do I find a doctor?", body: "Use Find a doctor at the top of the page. You can look for doctors who take your plan." },
  { title: "How do I pay a bill?", body: "Go to My bills. You can pay with a card or your bank account." },
  { title: "How do I get a new card?", body: "Go to My plan and pick Order a new card. It comes in the mail in 7 to 10 days." },
];

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Get help button">
    <div><HelpDrawer title="Get help" topics={topics} phone={phone} /></div>
  </Grp>
  <Grp label="Explains a hard word">
    <p style={{ margin: 0 }}>You have met <b>$600</b> of your{" "}
      <HelpDrawer term="deductible" title="What is a deductible?" phone={phone}>
        <p style={{ margin: 0 }}>A deductible is the amount you pay for care each year before your plan starts to pay.</p>
        <p style={{ margin: 0, color: "var(--muted-foreground)" }}>For example, if your deductible is $1,000, you pay the first $1,000 of your care. After that, you pay less.</p>
      </HelpDrawer>.
    </p>
  </Grp>
</>) };
