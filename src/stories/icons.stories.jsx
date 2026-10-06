import { useState } from "react";
import { icons } from "lucide-react";
import manifest from "@manifest";
import { Icon } from "../components/ui/icon";

const pascal = (n) => n.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const groups = (manifest.icons && manifest.icons.groups) || [];

export default {
  title: "Foundations/Icons",
  component: Icon,
  parameters: { docs: { description: { component: (manifest.icons && manifest.icons.$description) || "" } } },
};

function Gallery() {
  const [q, setQ] = useState("");
  const [hover, setHover] = useState("");
  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--foreground)" }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an icon, like calendar" aria-label="Find an icon"
        style={{ height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid var(--input)", background: "var(--card)", color: "var(--foreground)", width: 320, marginBottom: 8 }} />
      <p aria-live="polite" style={{ minHeight: 24, margin: "0 0 12px", fontWeight: 600 }}>{hover ? `${hover}  ·  ${pascal(hover)}` : "Point at an icon to see its name."}</p>
      {groups.map((g) => {
        const names = g.names.filter((n) => !q || n.includes(q.toLowerCase()));
        if (!names.length) return null;
        return (
          <section key={g.id} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "var(--muted-foreground)" }}>{g.label}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 6 }}>
              {names.map((n) => {
                const G = icons[pascal(n)];
                return G ? (
                  <button key={n} title={n} aria-label={n} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)}
                    style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}>
                    <Icon as={G} size={20} />
                  </button>
                ) : null;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The approved icon set, using the brand's line thickness. */
export const All = { render: () => <Gallery /> };
