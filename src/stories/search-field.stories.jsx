import { useState } from "react";
import { SearchField } from "../components/ui/search-field";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Search field",
  component: SearchField,
  parameters: { docs: { description: { component: docs("search") } } },
};

function SiteSearch() {
  const [count, setCount] = useState(null);
  return <SearchField onSubmit={(q) => setCount(q.toLowerCase().includes("flu") ? 24 : 0)} results={count} />;
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 560 }}>
  <Grp label="Site search (try searching for flu shot)"><SiteSearch /></Grp>
  <Grp label="With words kept in the box after a search"><SearchField defaultValue="flu shot" /></Grp>
  <Grp label="With a label people can see">
    <SearchField label="Search your claims" hideLabel={false} placeholder="Like a doctor or a date" hint="You can search by doctor, place, or date." />
  </Grp>
  <Grp label="Turned off"><SearchField disabled /></Grp>
</div>) };
