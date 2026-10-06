// Select: a list button with a mouse (WAI-ARIA select-only combobox), and the browser's own <select> on phones.
import { describe, test, expect, vi, afterEach } from "vitest";
import { createRef, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "../../src/components/ui/select";
import { Dialog } from "../../src/components/ui/dialog";
import { axeViolations } from "./axe";

const STATES = ["Idaho", "Illinois", "Indiana", "Iowa", "Kansas"];

function setup(props = {}) {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(<><Select label="State" hint="Pick the state where you live." options={STATES} onValueChange={onValueChange} {...props} /><button>Next</button></>);
  return { user, onValueChange, box: screen.getByRole("combobox", { name: "State" }) };
}
const listbox = () => screen.getByRole("listbox", { hidden: true });
const active = (box) => box.getAttribute("aria-activedescendant") && document.getElementById(box.getAttribute("aria-activedescendant"));

describe("Select with a mouse or keyboard (list button)", () => {
  test("is a labeled combobox button that starts closed", async () => {
    const { box } = setup();
    expect(box.tagName).toBe("BUTTON");
    expect(box).toHaveAttribute("aria-haspopup", "listbox");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveAttribute("aria-controls", listbox().id);
    expect(box).toHaveTextContent("Choose one");
    expect(box).toHaveAccessibleDescription("Pick the state where you live.");
    expect(await axeViolations()).toEqual([]);
  });

  test("a click opens the list, and a click on a choice picks it", async () => {
    const { user, box, onValueChange } = setup({ name: "state" });
    await user.click(box);
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "State" })).toBeVisible();
    expect(within(listbox()).getAllByRole("option").map((o) => o.textContent)).toEqual(STATES);
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getByRole("option", { name: "Iowa" }));
    expect(onValueChange).toHaveBeenCalledWith("Iowa");
    expect(box).toHaveTextContent("Iowa");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveFocus();
    expect(document.querySelector('input[type="hidden"][name="state"]')).toHaveValue("Iowa");
  });

  test("a click outside closes the list without picking", async () => {
    const { user, box, onValueChange } = setup();
    await user.click(box);
    await user.click(document.body);
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("Enter opens on the current choice; Down and Up move and stop at the ends", async () => {
    const { user, box } = setup({ defaultValue: "Indiana" });
    await user.tab();
    expect(box).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(active(box)).toHaveTextContent("Indiana");
    expect(active(box)).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(active(box)).toHaveTextContent("Kansas");
    await user.keyboard("{Home}");
    expect(active(box)).toHaveTextContent("Idaho");
    await user.keyboard("{ArrowUp}");
    expect(active(box)).toHaveTextContent("Idaho");
    await user.keyboard("{End}");
    expect(active(box)).toHaveTextContent("Kansas");
    expect(box).toHaveFocus();
  });

  test("Enter picks the active choice and keeps focus on the button", async () => {
    const { user, box, onValueChange } = setup();
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("Illinois");
    expect(box).toHaveTextContent("Illinois");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveFocus();
  });

  test("Space opens the list, and Space picks a choice without opening it again", async () => {
    const { user, box, onValueChange } = setup();
    await user.tab();
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowDown} ");
    expect(onValueChange).toHaveBeenCalledWith("Illinois");
    expect(box).toHaveAttribute("aria-expanded", "false");
    await user.click(box);
    expect(box).toHaveAttribute("aria-expanded", "true");
  });

  test("Up and End open the list on the first and last choice", async () => {
    const { user, box } = setup({ defaultValue: "Iowa" });
    await user.tab();
    await user.keyboard("{ArrowUp}");
    expect(active(box)).toHaveTextContent("Idaho");
    await user.keyboard("{Escape}{End}");
    expect(active(box)).toHaveTextContent("Kansas");
  });

  test("Esc closes the list and keeps the old choice", async () => {
    const { user, box, onValueChange } = setup({ defaultValue: "Iowa" });
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowUp}{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(box).toHaveTextContent("Iowa");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("Tab picks the active choice and moves on", async () => {
    const { user, box, onValueChange } = setup();
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await user.tab();
    expect(onValueChange).toHaveBeenCalledWith("Illinois");
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  test("typing letters jumps to a matching choice", async () => {
    const { user, box } = setup();
    await user.tab();
    await user.keyboard("k");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(active(box)).toHaveTextContent("Kansas");
    await new Promise((r) => setTimeout(r, 750));
    await user.keyboard("ind");
    expect(active(box)).toHaveTextContent("Indiana");
    await new Promise((r) => setTimeout(r, 750));
    await user.keyboard("i");
    expect(active(box)).toHaveTextContent("Iowa");
  });

  test("Esc inside a pop-up closes only the list", async () => {
    const user = userEvent.setup();
    render(<Dialog trigger={<button>Change address</button>} title="Change your address"><Select label="State" options={STATES} /></Dialog>);
    await user.click(screen.getByRole("button", { name: "Change address" }));
    const box = await screen.findByRole("combobox", { name: "State" });
    await user.click(box);
    await user.keyboard("{Escape}");
    expect(box).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog", { name: "Change your address" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("inside a pop-up, the list is not cut off and a click picks a choice", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Dialog trigger={<button>Change address</button>} title="Change your address"><Select label="State" options={STATES} onValueChange={onValueChange} /></Dialog>);
    await user.click(screen.getByRole("button", { name: "Change address" }));
    const dialog = await screen.findByRole("dialog", { name: "Change your address" });
    await user.click(within(dialog).getByRole("combobox", { name: "State" }));
    const list = screen.getByRole("listbox", { name: "State" });
    expect(dialog.contains(list)).toBe(false); // Drawn at the end of the page, outside the pop-up's scroll box.
    await user.click(screen.getByRole("option", { name: "Kansas" }));
    expect(onValueChange).toHaveBeenCalledWith("Kansas");
    expect(screen.getByRole("dialog", { name: "Change your address" })).toBeInTheDocument();
  });

  test("a space typed while searching does not close the list", async () => {
    const { user, box } = setup({ options: ["Nevada", "New Jersey", "New York", "North Dakota"] });
    await user.tab();
    await user.keyboard("new y");
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(active(box)).toHaveTextContent("New York");
  });

  test("nothing is sent with the form until a choice is picked", async () => {
    const { user, box } = setup({ name: "state" });
    const hidden = document.querySelector('input[type="hidden"][name="state"]');
    expect(hidden).toBeDisabled();
    await user.click(box);
    await user.click(screen.getByRole("option", { name: "Iowa" }));
    expect(hidden).not.toBeDisabled();
    expect(hidden).toHaveValue("Iowa");
  });

  test("an error marks it as not valid and is read with it", async () => {
    setup({ error: "Pick a state." });
    const box = screen.getByRole("combobox", { name: "State" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Pick the state where you live. Error: Pick a state.");
    expect(await axeViolations()).toEqual([]);
  });

  test("a turned-off select cannot be opened", async () => {
    const { user, box } = setup({ disabled: true });
    expect(box).toBeDisabled();
    await user.click(box);
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  test("the app can control the value", async () => {
    function Controlled() {
      const [v, setV] = useState("Iowa");
      return <><Select label="State" options={STATES} value={v} onValueChange={setV} /><p>Picked {v}</p></>;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox", { name: "State" }));
    await user.click(screen.getByRole("option", { name: "Kansas" }));
    expect(screen.getByText("Picked Kansas")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent("Kansas");
  });

  test("the ref points to the button", () => {
    const ref = createRef();
    render(<Select ref={ref} label="State" options={STATES} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "State" }));
    expect(Select.displayName).toBe("Select");
  });
});

describe("Select on phones and tablets (the browser's own select)", () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => { window.matchMedia = realMatchMedia; });

  test("a finger-sized pointer gets the browser's select", () => {
    window.matchMedia = (q) => ({ matches: q === "(pointer: coarse)", media: q, addEventListener() {}, removeEventListener() {} });
    render(<Select label="State" options={STATES} />);
    expect(screen.getByRole("combobox", { name: "State" }).tagName).toBe("SELECT");
  });

  test("it is labeled, picks a choice, and reports it", async () => {
    const onValueChange = vi.fn();
    const ref = createRef();
    const user = userEvent.setup();
    render(<Select ref={ref} native label="State" hint="Pick the state where you live." name="state" options={["Idaho", { value: "IL", label: "Illinois" }]} onValueChange={onValueChange} />);
    const box = screen.getByRole("combobox", { name: "State" });
    expect(ref.current).toBe(box);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(box).toHaveAttribute("name", "state");
    expect(box).toHaveAccessibleDescription("Pick the state where you live.");
    expect(within(box).getByRole("option", { name: "Choose one" })).toBeDisabled();
    expect(box).toHaveValue("");
    await user.selectOptions(box, "Illinois");
    expect(onValueChange).toHaveBeenCalledWith("IL");
    expect(box).toHaveValue("IL");
    expect(await axeViolations()).toEqual([]);
  });

  test("an error marks it as not valid and is read with it", async () => {
    render(<Select native label="Plan year" error="Pick a plan year." options={["2026", "2027"]} />);
    const box = screen.getByRole("combobox", { name: "Plan year" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Error: Pick a plan year.");
    expect(await axeViolations()).toEqual([]);
  });

  test("a value that is not a choice shows the placeholder", () => {
    render(<Select native label="State" options={STATES} value="Texas" onValueChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "State" })).toHaveValue("");
  });

  test("turned off", () => {
    render(<Select native disabled label="State" options={STATES} defaultValue="Iowa" />);
    expect(screen.getByRole("combobox", { name: "State" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "State" })).toHaveValue("Iowa");
  });
});
