// First smoke tests for the React components: roles, names, states, and axe.
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../src/components/ui/button";
import { TextField } from "../../src/components/ui/text-field";
import { Dialog } from "../../src/components/ui/dialog";
import { MemberCard } from "../../src/components/ui/member-card";
import { axeViolations } from "./axe";

describe("Button", () => {
  test("is a button with its words as its name, and it can be pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save my changes</Button>);
    const b = screen.getByRole("button", { name: "Save my changes" });
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(await axeViolations()).toEqual([]);
  });
  test("turned off and loading buttons cannot be pressed", async () => {
    const onClick = vi.fn();
    render(<><Button disabled onClick={onClick}>Pay</Button><Button loading onClick={onClick}>Saving</Button></>);
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
    const saving = screen.getByRole("button", { name: "Saving" });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute("aria-busy", "true");
    await userEvent.click(saving);
    expect(onClick).not.toHaveBeenCalled();
  });
  test("can be reached with the Tab key", async () => {
    render(<Button>Continue</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
  });
});

describe("TextField", () => {
  test("the label names the box, and help text describes it", async () => {
    render(<TextField label="Phone number" hint="We only call between 8 AM and 8 PM." />);
    const box = screen.getByRole("textbox", { name: "Phone number" });
    expect(box).toHaveAccessibleDescription("We only call between 8 AM and 8 PM.");
    expect(box).not.toHaveAttribute("aria-invalid");
    expect(await axeViolations()).toEqual([]);
  });
  test("an error marks the box as invalid and is read with it", async () => {
    render(<TextField label="ZIP code" hint="Like 12345" error="Enter a ZIP code with 5 numbers." defaultValue="606" />);
    const box = screen.getByRole("textbox", { name: "ZIP code" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Like 12345 Error: Enter a ZIP code with 5 numbers.");
    expect(await axeViolations()).toEqual([]);
  });
});

describe("Dialog", () => {
  test("opens as a dialog named by its title and described by its words", async () => {
    render(<Dialog trigger={<Button>Delete address</Button>} title="Delete this address?" description="We will stop sending mail to 42 Oak Street." actions={<Button variant="danger">Delete this address</Button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete address" }));
    const d = await screen.findByRole("dialog", { name: "Delete this address?" });
    expect(d).toHaveAccessibleDescription("We will stop sending mail to 42 Oak Street.");
    expect(within(d).getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(await axeViolations(d)).toEqual([]);
  });
  test("Esc closes it and focus goes back to the button that opened it", async () => {
    render(<Dialog trigger={<Button>Open</Button>} title="Are you sure?" />);
    const open = screen.getByRole("button", { name: "Open" });
    await userEvent.click(open);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(open).toHaveFocus();
  });
});

describe("MemberCard", () => {
  test("the card is named for the member, and the ID is read one character at a time", async () => {
    render(<MemberCard member={{ name: "June A. Morris", id: "NF-448120", plan: "Gold Plus HMO", group: "40218" }} phone="1-800-555-0142" onPrint={() => {}} />);
    const card = screen.getByRole("region", { name: "Member ID card for June A. Morris" });
    expect(within(card).getByText("N F dash 4 4 8 1 2 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy member ID" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1-800-555-0142" })).toHaveAttribute("href", "tel:18005550142");
    expect(await axeViolations()).toEqual([]);
  });
});
