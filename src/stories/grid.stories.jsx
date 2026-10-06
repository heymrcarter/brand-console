import { Grid, GridItem } from "../components/ui/grid";
import { Card } from "../components/ui/card";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Grid",
  component: Grid,
  parameters: { docs: { description: { component: docs("grid") } } },
};

const Cell = () => <div style={{ height: 60, background: "var(--secondary)", borderRadius: 4 }} />;

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Columns from the Brand Console (4 on phones)"><Grid>{Array.from({ length: 12 }, (_, i) => <Cell key={i} />)}</Grid></Grp>
  <Grp label="8 columns"><Grid columns={{ phone: 4, computer: 8 }}>{Array.from({ length: 8 }, (_, i) => <Cell key={i} />)}</Grid></Grp>
  <Grp label="Two cards, half width each on a computer">
    <Grid>
      <GridItem span={{ phone: 4, tablet: 4, computer: 6 }}><Card title="Your plan"><p style={{ margin: 0 }}>You have the Gold Plus plan.</p></Card></GridItem>
      <GridItem span={{ phone: 4, tablet: 4, computer: 6 }}><Card title="Your doctor"><p style={{ margin: 0 }}>Your main doctor is Dr. Anita Patel.</p></Card></GridItem>
    </Grid>
  </Grp>
</>) };
