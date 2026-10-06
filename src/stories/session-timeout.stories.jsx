import { useState } from "react";
import { SessionTimeout } from "../components/ui/session-timeout";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Session timeout warning",
  component: SessionTimeout,
  parameters: { docs: { description: { component: docs("timeout") } } },
};

function Demo({ warnMinutes, label }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Row><Button variant="outline" onClick={() => { setNote(""); setOpen(true); }}>{label}</Button></Row>
      {note && <p role="status" style={{ margin: 0 }}>{note}</p>}
      <SessionTimeout open={open} warnMinutes={warnMinutes}
        onStay={() => { setOpen(false); setNote("You chose to stay signed in."); }}
        onSignOut={() => { setOpen(false); setNote("You chose to sign out."); }} />
    </div>
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Warning time from the Brand Console"><Demo label="Show the warning" /></Grp>
  <Grp label="Warns 1 minute before"><Demo warnMinutes={1} label="Show the 1 minute warning" /></Grp>
</>) };
