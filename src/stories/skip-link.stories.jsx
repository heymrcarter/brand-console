import { SkipLink } from "../components/ui/skip-link";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Skip link",
  component: SkipLink,
  parameters: { docs: { description: { component: docs("skip-link") } } },
};

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Press Tab to see it">
    <SkipLink target="story-main" />
    <nav aria-label="Main menu" style={{ display: "flex", gap: "var(--gap)" }}>
      <a href="#plan" style={{ color: "var(--link)" }}>My plan</a>
      <a href="#claims" style={{ color: "var(--link)" }}>My claims</a>
      <a href="#doctors" style={{ color: "var(--link)" }}>Find a doctor</a>
    </nav>
    <main id="story-main" style={{ paddingTop: "var(--gap)" }}>
      <p style={{ margin: 0 }}>Press Tab on any page and the skip link shows first. It takes you right here, past the menu.</p>
    </main>
  </Grp>
</>) };
