import { ErrorSummary } from "../components/ui/error-summary";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Error summary",
  component: ErrorSummary,
  parameters: { docs: { description: { component: docs("error-summary") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{maxWidth:560}}><ErrorSummary autoFocus={false} errors={[{message:"Enter a ZIP code with 5 numbers, like 60601.",href:"#zip"},{message:"The day must be between 1 and 31.",href:"#dob"}]} /></div>) };
