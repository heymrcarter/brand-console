import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Card",
  component: Card,
  parameters: { docs: { description: { component: docs("card") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{display:"grid",gap:"var(--gap)",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",maxWidth:760}}><Card title="Your plan"><p style={{margin:0,color:"var(--muted-foreground)"}}>Gold Plus, since March 2024.</p><a href="#" style={{color:"var(--link)",fontWeight:600}}>See what your plan covers</a></Card>
<Card title="Next payment" action={<Button>Pay my bill</Button>}><Badge tone="warning">Due soon</Badge><div style={{fontFamily:"var(--font-heading)",fontSize:"var(--text-h2)",fontWeight:"var(--heading-w)"}}>$42.50</div><p style={{margin:0,color:"var(--muted-foreground)",fontSize:"var(--text-sm)"}}>Due October 1, 2026.</p></Card></div>) };
