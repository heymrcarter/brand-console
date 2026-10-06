import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Tooltip, TermTooltip } from "../components/ui/tooltip";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default { title: "Components/Tooltip", component: Tooltip, parameters: { docs: { description: { component: docs("tooltip") } } } };

const PrintButton = () => (
  <Button variant="outline" aria-label="Print your card" className="[padding-inline:0] [width:var(--control-h)]" icon={<Printer aria-hidden="true" className="size-[1.2em]" />} />
);

/* Opens after the page has finished laying out, so the tip sits in the right place. */
function OpenTip(props) { const [open, setOpen] = useState(false); useEffect(() => { const t = setTimeout(() => setOpen(true), 300); return () => clearTimeout(t); }, []); return <Tooltip {...props} open={open} onOpenChange={() => {}} />; }

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Point at the button or tab to it"><Row><Tooltip content="Print your card"><PrintButton /></Tooltip></Row></Grp>
  <Grp label="Open, dark and light"><Row><div style={{ paddingTop: 48, display: "flex", gap: 96 }}>
    <OpenTip content="Print your card" tone="dark"><PrintButton /></OpenTip>
    <OpenTip content="Print your card" tone="light" side="right"><PrintButton /></OpenTip>
  </div></Row></Grp>
  <Grp label="A word people can tap to learn what it means">
    <p style={{ margin: 0, maxWidth: 480 }}>You pay a <TermTooltip term="copay" definition="A copay is the set amount you pay for a visit or a medicine. Your plan pays the rest." /> of $20 when you see a specialist.</p>
  </Grp>
</>) };
