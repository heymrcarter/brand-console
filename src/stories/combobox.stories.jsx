import { useState } from "react";
import { userEvent, within } from "storybook/test";
import { Combobox } from "../components/ui/combobox";
import { Link } from "../components/ui/link";
import { docs, Grp } from "./meta.jsx";

export default {
  title: "Components/Combobox (search and pick)",
  component: Combobox,
  parameters: { docs: { description: { component: docs("combobox") } } },
};

const MEDICINES = [
  "Metformin 500 mg tablet", "Metformin 1000 mg tablet", "Metformin ER 750 mg", "Lisinopril 10 mg tablet",
  "Lisinopril 20 mg tablet", "Atorvastatin 20 mg tablet", "Amlodipine 5 mg tablet", "Levothyroxine 50 mcg tablet",
  "Omeprazole 20 mg capsule", "Losartan 50 mg tablet", "Gabapentin 300 mg capsule", "Sertraline 50 mg tablet",
];
const DOCTORS = [
  { value: "d1", label: "Dr. Maria Alvarez", hint: "Family doctor in Oak Park" },
  { value: "d2", label: "Dr. James Chen", hint: "Heart doctor in Evanston" },
  { value: "d3", label: "Dr. Priya Shah", hint: "Family doctor in Chicago" },
  { value: "d4", label: "Dr. Robert Miles", hint: "Eye doctor in Skokie" },
];
const findDoctors = (q) => new Promise((done) => setTimeout(() => done(DOCTORS.filter((d) => d.label.toLowerCase().includes(q.toLowerCase()))), 600));

function Picker() {
  const [med, setMed] = useState(null);
  return (<>
    <Combobox label="Medicine name" options={MEDICINES} onSelect={setMed} />
    <p style={{ margin: 0 }}>{med ? `You picked ${med.label}.` : "You have not picked a medicine yet."}</p>
  </>);
}

/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<div style={{ display: "grid", gap: "var(--gap)", maxWidth: 480, paddingBottom: 280 }}>
  <Grp label="Typing and picking (try typing metf)"><Picker /></Grp>
  <Grp label="Forgives spelling mistakes (try typing lisnopril)">
    <Combobox label="Medicine name" options={MEDICINES} hint="Type the name on your bottle. Close spelling is fine." />
  </Grp>
  <Grp label="Nothing found, with a next step">
    <Combobox label="Medicine name" options={MEDICINES}
      noMatches={(q) => <p style={{ margin: 0 }}>No medicines match "{q}". Check the spelling, or <Link href="#pharmacist">call your pharmacist</Link>.</p>} />
  </Grp>
  <Grp label="Matches that load from the server">
    <Combobox label="Doctor's name" source={findDoctors} hint="Type at least 2 letters of your doctor's name." />
  </Grp>
  <Grp label="Already picked, and with an error">
    <Combobox label="Medicine name" options={MEDICINES} defaultValue="Lisinopril 10 mg tablet" />
    <Combobox label="Medicine name" options={MEDICINES} error="Please pick a medicine from the list." />
  </Grp>
  <Grp label="Optional, and turned off">
    <Combobox label="Pharmacy" optional options={["Main Street Pharmacy", "Oak Park Drug Store", "Lakeview Pharmacy"]} />
    <Combobox label="Medicine name" options={MEDICINES} defaultValue="Metformin 500 mg tablet" disabled />
  </Grp>
  <Grp label="Keeps words that are not in the list">
    <Combobox label="Allergy" allowFreeText options={["Penicillin", "Peanuts", "Latex", "Shellfish"]}
      hint="Pick one from the list, or type your own." />
  </Grp>
</div>) };

// The stories below open the pop-up on their own, so every state can be seen and checked without typing.
const Frame = ({ children }) => <div style={{ maxWidth: 480, paddingBottom: 300 }}>{children}</div>;
const typeIn = (words, keys) => async ({ canvasElement }) => {
  const box = within(canvasElement).getByRole("combobox");
  await userEvent.type(box, words);
  if (keys) await userEvent.keyboard(keys);
};

/** Open, with matches. The second match is active (Down was pressed twice). */
export const OpenWithMatches = {
  render: () => <Frame><Combobox label="Medicine name" options={MEDICINES} /></Frame>,
  play: typeIn("metf", "{ArrowDown}{ArrowDown}"),
};

/** Open, with nothing that matches, and a next step. */
export const NoMatches = {
  render: () => <Frame><Combobox label="Medicine name" options={MEDICINES}
    noMatches={(q) => <p style={{ margin: 0 }}>No medicines match "{q}". Check the spelling, or <Link href="#pharmacist">call your pharmacist</Link>.</p>} /></Frame>,
  play: typeIn("zzzz"),
};

/** Open, while matches load from the server. The spinner stops turning when the device asks for less motion. */
export const Loading = {
  render: () => <Frame><Combobox label="Doctor's name" source={() => new Promise(() => {})} /></Frame>,
  play: typeIn("ch"),
};
