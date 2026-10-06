import { useState } from "react";
import { Pagination } from "../components/ui/pagination";
import { docs, Grp } from "./meta.jsx";

export default { title: "Components/Pagination", component: Pagination, parameters: { docs: { description: { component: docs("pagination") } } } };

function Demo({ variant, start = 1 }) {
  const [page, setPage] = useState(start);
  return <Pagination page={page} total={240} pageSize={20} itemLabel="claims" label="Pages of claims" variant={variant} onPageChange={setPage} />;
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>
  <Grp label="Page numbers"><Demo variant="numbers" /></Grp>
  <Grp label="Page numbers, in the middle of the list"><Demo variant="numbers" start={6} /></Grp>
  <Grp label="Previous and Next only"><Demo variant="simple" /></Grp>
  <Grp label="Nothing to show"><Pagination total={0} itemLabel="claims" /></Grp>
</>) };
