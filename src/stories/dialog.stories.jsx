import { Dialog, DialogClose } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Dialog",
  component: Dialog,
  parameters: { docs: { description: { component: docs("dialog") } } },
};


/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<Dialog trigger={<Button variant="danger">Delete this address</Button>} title="Delete this address?" description="We will stop sending mail to 42 Oak Street. You cannot undo this."
  actions={<><DialogClose asChild><Button variant="outline">Keep it</Button></DialogClose><DialogClose asChild><Button variant="danger">Delete this address</Button></DialogClose></>} />) };
