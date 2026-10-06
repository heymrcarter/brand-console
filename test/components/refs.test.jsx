// Apps (and form tools like React Hook Form) pass a ref to focus or measure the real element.
import { describe, test, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../src/components/ui/button";
import { TextField } from "../../src/components/ui/text-field";
import { Dialog } from "../../src/components/ui/dialog";

describe("refs point to the real element", () => {
  test("Button: the <button>", () => {
    const ref = createRef();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Save" }));
    expect(Button.displayName).toBe("Button");
  });
  test("Button with asChild: the child element", () => {
    const ref = createRef();
    render(<Button asChild ref={ref}><a href="/pay">Pay my bill</a></Button>);
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
  test("TextField: the <input>, and other props still reach it", () => {
    const ref = createRef();
    render(<TextField ref={ref} label="First name" name="first" autoComplete="given-name" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("textbox", { name: "First name" }));
    expect(ref.current).toHaveAttribute("name", "first");
    expect(ref.current).toHaveAttribute("autocomplete", "given-name");
    expect(TextField.displayName).toBe("TextField");
  });
  test("Dialog: the pop-up box, once it is open", async () => {
    const ref = createRef();
    render(<Dialog ref={ref} trigger={<button>Open</button>} title="Are you sure?" />);
    expect(ref.current).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(ref.current).toBe(await screen.findByRole("dialog", { name: "Are you sure?" }));
    expect(Dialog.displayName).toBe("Dialog");
  });
});
