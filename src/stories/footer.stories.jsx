import { Footer } from "../components/ui/footer";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Footer", component: Footer, parameters: { layout: "fullscreen", docs: { description: { component: docs("footer") } } } };

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ padding: 16 }}>
  <Grp label="As set in the Brand Console"><Footer /></Grp>
  <Grp label="Light"><Footer variant="light" /></Grp>
  <Grp label="Dark"><Footer variant="dark" /></Grp>
</div>) };
