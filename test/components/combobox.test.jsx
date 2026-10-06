// Combobox: the WAI-ARIA "editable combobox with list autocomplete" pattern, with keyboard, screen reader, and axe checks.
import { describe, test, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox, defaultFilter } from "../../src/components/ui/combobox";
import { Dialog } from "../../src/components/ui/dialog";
import { axeViolations } from "./axe";

const MEDICINES = ["Metformin 500 mg tablet", "Metformin 1000 mg tablet", "Metformin ER 750 mg", "Lisinopril 10 mg tablet", "Atorvastatin 20 mg tablet"];
const opts = (list) => list.map((label) => ({ value: label, label }));

function setup(props = {}) {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const label = props.label || "Medicine name";
  render(<><Combobox label={label} options={MEDICINES} onSelect={onSelect} {...props} /><button>Next</button></>);
  const box = screen.getByRole("combobox", { name: label });
  return { user, onSelect, box };
}
const options = () => within(screen.getByRole("listbox", { hidden: true })).queryAllByRole("option", { hidden: true });
const activeOption = (box) => box.getAttribute("aria-activedescendant") && document.getElementById(box.getAttribute("aria-activedescendant"));

describe("defaultFilter", () => {
  test("shows options that contain the words, with ones that start with them first", () => {
    const list = opts(["Extended Metformin", "Metformin 500 mg", "Aspirin"]);
    expect(defaultFilter(list, "metf").map((o) => o.label)).toEqual(["Metformin 500 mg", "Extended Metformin"]);
  });
  test("an empty box matches everything", () => {
    expect(defaultFilter(opts(MEDICINES), "  ")).toHaveLength(MEDICINES.length);
  });
  test("forgives a spelling mistake once 3 or more letters are typed", () => {
    expect(defaultFilter(opts(MEDICINES), "lisnopril").map((o) => o.label)).toEqual(["Lisinopril 10 mg tablet"]);
    expect(defaultFilter(opts(MEDICINES), "zq")).toEqual([]);
  });
});

describe("Combobox roles and states", () => {
  test("starts closed, with the parts a screen reader needs", async () => {
    const { box } = setup();
    expect(box).toHaveAttribute("aria-autocomplete", "list");
    expect(box).toHaveAttribute("aria-expanded", "false");
    const list = screen.getByRole("listbox", { hidden: true });
    expect(box).toHaveAttribute("aria-controls", list.id);
    expect(box).not.toHaveAttribute("aria-activedescendant");
    expect(box).toHaveAccessibleDescription("Type at least 2 letters to see matches.");
    expect(await axeViolations()).toEqual([]);
  });

  test("typing shows matches, and says how many there are", async () => {
    const { user, box } = setup();
    await user.type(box, "metf");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "Medicine name matches" })).toBeVisible();
    expect(options().map((o) => o.textContent)).toEqual(["Metformin 500 mg tablet", "Metformin 1000 mg tablet", "Metformin ER 750 mg"]);
    expect(await screen.findByText("3 matches. Use the up and down arrows to hear them.")).toHaveAttribute("role", "status");
    expect(await axeViolations()).toEqual([]);
  });

  test("the pop-up counts as open when nothing matches, and says so", async () => {
    const { user, box } = setup();
    await user.type(box, "zzzz");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { hidden: true })).not.toBeVisible();
    expect(screen.getByText('Nothing matches "zzzz". Check the spelling and try again.')).toBeVisible();
    expect(await screen.findByText("No matches found.")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test("too few letters keeps it closed", async () => {
    const { user, box } = setup();
    await user.type(box, "m");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  test("an error marks the box as not valid and is read with it", async () => {
    setup({ error: "Please pick a medicine from the list." });
    const box = screen.getByRole("combobox", { name: "Medicine name" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Type at least 2 letters to see matches. Error: Please pick a medicine from the list.");
    expect(await axeViolations()).toEqual([]);
  });

  test("a turned-off box cannot be used", async () => {
    const { user, box } = setup({ disabled: true });
    expect(box).toBeDisabled();
    await user.type(box, "metf");
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  test("optional fields say so in the label", () => {
    render(<Combobox label="Pharmacy" optional options={["Main Street Pharmacy"]} />);
    expect(screen.getByRole("combobox", { name: "Pharmacy (optional)" })).toBeInTheDocument();
  });

  test("the ref points to the text box", () => {
    const ref = createRef();
    render(<Combobox ref={ref} label="Medicine name" options={MEDICINES} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("combobox"));
    expect(Combobox.displayName).toBe("Combobox");
  });
});

describe("Combobox keyboard", () => {
  test("Down and Up move through matches, wrap at the ends, and keep focus in the box", async () => {
    const { user, box } = setup();
    await user.type(box, "metf");
    await user.keyboard("{ArrowDown}");
    expect(activeOption(box)).toHaveTextContent("Metformin 500 mg tablet");
    expect(activeOption(box)).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(activeOption(box)).toHaveTextContent("Metformin ER 750 mg");
    await user.keyboard("{ArrowDown}");
    expect(activeOption(box)).toHaveTextContent("Metformin 500 mg tablet");
    expect(options().filter((o) => o.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  test("Home and End jump to the first and last match once a match is active", async () => {
    const { user, box } = setup();
    await user.type(box, "metf");
    await user.keyboard("{Home}");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{ArrowDown}{End}");
    expect(activeOption(box)).toHaveTextContent("Metformin ER 750 mg");
    await user.keyboard("{Home}");
    expect(activeOption(box)).toHaveTextContent("Metformin 500 mg tablet");
  });

  test("Enter picks the active match and closes the pop-up", async () => {
    const { user, box, onSelect } = setup({ name: "medicine" });
    await user.type(box, "metf");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith({ value: "Metformin 1000 mg tablet", label: "Metformin 1000 mg tablet" });
    expect(box).toHaveValue("Metformin 1000 mg tablet");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).not.toHaveAttribute("aria-activedescendant");
    expect(document.querySelector('input[type="hidden"][name="medicine"]')).toHaveValue("Metformin 1000 mg tablet");
  });

  test("Escape closes the pop-up, and a second Escape clears the box", async () => {
    const { user, box } = setup();
    await user.type(box, "metf");
    await user.keyboard("{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveValue("metf");
    await user.keyboard("{Escape}");
    expect(box).toHaveValue("");
  });

  test("inside a pop-up, Esc closes the matches, then clears the box, then closes the pop-up", async () => {
    const user = userEvent.setup();
    render(<Dialog trigger={<button>Add a medicine</button>} title="Add a medicine"><Combobox label="Medicine name" options={MEDICINES} /></Dialog>);
    await user.click(screen.getByRole("button", { name: "Add a medicine" }));
    const box = await screen.findByRole("combobox", { name: "Medicine name" });
    await user.type(box, "metf");
    await user.keyboard("{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(box).toHaveValue("");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("Alt + Up closes the pop-up, and Down opens it again on the first match", async () => {
    const { user, box } = setup();
    await user.type(box, "metf");
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowDown}");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(activeOption(box)).toHaveTextContent("Metformin 500 mg tablet");
  });

  test("Tab moves on without picking, and closes the pop-up", async () => {
    const { user, box, onSelect } = setup();
    await user.type(box, "metf");
    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(onSelect).not.toHaveBeenCalled();
    expect(box).toHaveValue(""); // Without free text, words that are not a choice are taken out.
  });

  test("with free text, the typed words stay", async () => {
    const { user, box } = setup({ allowFreeText: true });
    await user.type(box, "My own medicine");
    await user.tab();
    expect(box).toHaveValue("My own medicine");
  });
});

describe("Combobox with a mouse or touch", () => {
  test("a tap on a match picks it", async () => {
    const { user, box, onSelect } = setup();
    await user.type(box, "lis");
    await user.click(screen.getByRole("option", { name: "Lisinopril 10 mg tablet" }));
    expect(onSelect).toHaveBeenCalledWith({ value: "Lisinopril 10 mg tablet", label: "Lisinopril 10 mg tablet" });
    expect(box).toHaveValue("Lisinopril 10 mg tablet");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Combobox matching", () => {
  test("a custom filter replaces the default one", async () => {
    const filter = vi.fn((list, q) => list.filter((o) => o.label.endsWith(q)));
    const { user, box } = setup({ filter });
    await user.type(box, "mg");
    expect(filter).toHaveBeenCalled();
    expect(options().map((o) => o.textContent)).toEqual(["Metformin ER 750 mg"]);
  });

  test("matches can load from a server, and the pop-up counts as open while they load", async () => {
    let answer;
    const source = vi.fn(() => new Promise((done) => { answer = done; }));
    const { user, box } = setup({ options: undefined, source, label: "Doctor's name" });
    await user.type(box, "ch");
    expect(await screen.findByText("Looking for matches.", { selector: "p" })).toBeVisible();
    expect(box).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(source).toHaveBeenCalledWith("ch"));
    answer([{ value: "d2", label: "Dr. James Chen", hint: "Heart doctor in Evanston" }]);
    expect(await screen.findByRole("option", { name: /Dr. James Chen/ })).toHaveTextContent("Heart doctor in Evanston");
    expect(await screen.findByText("1 match. Use the up and down arrows to hear them.")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test("answers that come back late are ignored", async () => {
    const waiting = [];
    const source = (q) => new Promise((done) => waiting.push({ q, done }));
    const { user, box } = setup({ options: undefined, source });
    await user.type(box, "ch");
    await waitFor(() => expect(waiting.map((w) => w.q)).toContain("ch"));
    await user.type(box, "e");
    await waitFor(() => expect(waiting.map((w) => w.q)).toContain("che"));
    waiting.find((w) => w.q === "che").done([{ value: "new", label: "Dr. James Chen" }]);
    waiting.find((w) => w.q === "ch").done([{ value: "old", label: "Dr. Old Answer" }]);
    expect(await screen.findByRole("option", { name: "Dr. James Chen" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Dr. Old Answer" })).toBeNull();
  });
});
