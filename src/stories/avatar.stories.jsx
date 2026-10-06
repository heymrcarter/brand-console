import { Avatar } from "../components/ui/avatar";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { docs: { description: { component: docs("avatar") } } },
};

const photo = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#cfd8dc"/><circle cx="40" cy="31" r="15" fill="#90a4ae"/><path d="M12 80a28 28 0 0 1 56 0z" fill="#90a4ae"/></svg>');

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Sizes"><Row><Avatar size="sm" name="June Morris" /><Avatar name="June Morris" /><Avatar size="lg" name="June Morris" /></Row></Grp>
  <Grp label="With a name">
    <Row>
      <span style={{ display: "inline-flex", alignItems: "center", gap: ".7em" }}>
        <Avatar name="Dr. Anita Patel" />
        <span><b>Dr. Anita Patel</b><span style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>Family medicine</span></span>
      </span>
    </Row>
  </Grp>
  <Grp label="With a photo, and alone (screen readers hear the name)"><Row><Avatar name="Dr. Luis Romero" src={photo} /><Avatar name="Dr. Luis Romero" nameShown={false} /></Row></Grp>
</>) };
