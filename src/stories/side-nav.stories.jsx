import { useState } from "react";
import { SideNav } from "../components/ui/side-nav";
import { docs, Grp, Row } from "./meta.jsx";

export default { title: "Components/Side navigation", component: SideNav, parameters: { docs: { description: { component: docs("side-nav") } } } };

const items = [
  { id: "overview", label: "Overview", href: "#" },
  { id: "claims", label: "Claims", href: "#", children: [
    { id: "medical", label: "Medical", href: "#" },
    { id: "pharmacy", label: "Pharmacy", href: "#" },
  ] },
  { id: "payments", label: "Payments", href: "#" },
  { id: "documents", label: "Documents", href: "#" },
];

function Demo({ currentStyle }) {
  const [cur, setCur] = useState("claims");
  return (
    <div onClick={(e) => { const a = e.target.closest("a"); if (a) { e.preventDefault(); const it = [...items, ...items.flatMap((i) => i.children || [])].find((i) => i.label === a.textContent); if (it) setCur(it.id); } }}>
      <SideNav label="Claims and payments" items={items} current={cur} currentStyle={currentStyle} />
    </div>
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<Row>
  <Grp label="Soft fill for the current page"><Demo currentStyle="fill" /></Grp>
  <Grp label="Side line for the current page"><Demo currentStyle="bar" /></Grp>
</Row>) };
