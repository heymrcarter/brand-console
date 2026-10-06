// One file per component keeps each story easy to find. This file re-exports nothing;
// Storybook reads the individual files below.
export default { title: "Components/Read me", tags: ["!autodocs"] };
export const About = { render: () => (
  <div style={{ maxWidth: 640 }}>
    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h2)" }}>Design system components</h1>
    <p>These are the real React components. Their colors, sizes, corners, and settings come from the Brand Console draft. Use the toolbar at the top to switch brand, screen type, text size, and light or dark mode.</p>
  </div>) };
