import { useState } from "react";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Progress bar",
  component: Progress,
  parameters: { docs: { description: { component: docs("progress") } } },
};

function Upload() {
  const [v, setV] = useState(40);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
      <Progress label="Uploading your file" value={v} />
      <Row><Button variant="outline" onClick={() => setV((x) => Math.min(100, x + 20))}>Upload more</Button><Button variant="quiet" onClick={() => setV(0)}>Start over</Button></Row>
    </div>
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="A form with steps"><div style={{ maxWidth: 480 }}><Progress label="Step 2 of 4" value={2} max={4} show={false} hint="About 3 minutes left" /></div></Grp>
  <Grp label="Counting items"><div style={{ maxWidth: 480 }}><Progress label="Forms you have signed" value={3} max={5} /></div></Grp>
  <Grp label="Percent done"><Upload /></Grp>
  <Grp label="Empty and full"><div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}><Progress label="Your claim is not started yet" value={0} /><Progress label="Your claim is done" value={100} /></div></Grp>
</>) };
