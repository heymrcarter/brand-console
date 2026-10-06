import { ToastProvider, Toaster, useToast } from "../components/ui/toast";
import { Button } from "../components/ui/button";
import { comp } from "../lib/settings";
import { docs, Grp, Row } from "./meta.jsx";

export default {
  title: "Components/Toast",
  component: Toaster,
  parameters: { docs: { description: { component: docs("toast") } } },
};

function Buttons() {
  const { toast } = useToast();
  const sec = comp("toast").duration ?? 10;
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <Grp label="After saving">
        <Row>
          <Button onClick={() => toast({ message: "Your address is saved.", action: { label: "Undo", altText: "Undo the address change" } })}>Save my address</Button>
          <Button variant="outline" onClick={() => toast("Your refill is ordered.")}>Order my refill</Button>
          <Button variant="quiet" onClick={() => toast({ message: "Your message was sent to your care team.", duration: 0 })}>Send a message (stays until closed)</Button>
        </Row>
      </Grp>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
        {Number(sec) > 0 ? `Each message hides after ${sec} seconds. It stays while your mouse or keyboard is on it.` : "Each message stays until you close it."}
      </p>
    </div>
  );
}

/** Every kind and state, as the brand team sees it in the Brand Console. Press a button to show a toast. */
export const All = { render: () => (
  <ToastProvider>
    <Buttons />
    <Toaster />
  </ToastProvider>
) };
