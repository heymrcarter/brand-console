import { InsetText, WarningText } from "../components/ui/callout";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Inset text and warning",
  component: InsetText,
  subcomponents: { WarningText },
  parameters: { docs: { description: { component: docs("callout") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Inset text"><div style={{ maxWidth: 560 }}><InsetText>It can take up to 10 days for a new card to arrive in the mail.</InsetText></div></Grp>
  <Grp label="Warning"><div style={{ maxWidth: 560 }}><WarningText><p>If you have chest pain or trouble breathing, call 911 right away.</p></WarningText></div></Grp>
  <Grp label="Warning with its own title"><div style={{ maxWidth: 560 }}><WarningText title="Do not stop this medicine on your own"><p>Talk to your doctor first. Stopping too fast can make you sick.</p></WarningText></div></Grp>
</>) };
