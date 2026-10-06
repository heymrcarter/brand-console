import manifest from "@manifest";
/** Docs text for a component, taken from the Brand Console: description, AI guidance, and accessibility. */
export function docs(id) {
  const c = (manifest.components || []).find((x) => x.id === id);
  if (!c) return "";
  return `${c.description}\n\n**Guidance for AI tools:** ${c.guidance}\n\n**Accessibility:** ${c.accessibility}`;
}
export const meta = (id, title, component) => ({ title: `Components/${title}`, component, parameters: { docs: { description: { component: docs(id) } } } });
export const Grp = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted-foreground)", fontFamily: "system-ui" }}>{label}</div>
    {children}
  </div>
);
export const Row = ({ children }) => <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap)", alignItems: "center" }}>{children}</div>;
