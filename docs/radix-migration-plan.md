# Plan: moving the components off Radix, to plain React

**Status: plan only.** Nothing here has been moved yet. Work starts only when Heath says "start migrating with <Component>". This design system is for our own teams only.

Radix was a good starting point, but our direction is plain React that we own. Select and Combobox are already plain React (they follow the WAI-ARIA Authoring Practices, called APG below, and have full keyboard and axe tests). This plan covers the other 25 files.

## Rules for every move

1. **One component per pull request.** Components that share a Radix part (like Dialog, Drawer, and Header) still move one at a time, in the order below.
2. **Nothing changes for apps.** Same props, same exports, same look in both brands, both modes, both screen types, and both text sizes. Refs keep pointing to the same element.
3. **Follow the APG pattern** named for the component. Keyboard keys, roles, and states must match it.
4. **Tests first.** Before the move, write the tests in `test/components/` against today's Radix version: roles, names, states, every key in the pattern, and axe. They must pass before and after.
5. **Check the look.** Run `npm run audit:storybook` and compare the story in both brands and both modes. Update the story if a state was missing.
6. **Update the words.** If the behavior changes at all, update the component's `a11y` text in `console/registry.js`.
7. **Update the table below** in the same pull request.
8. **Remove `radix-ui` from `package.json` only in the last pull request,** when no file imports it.

Not part of this plan: React Aria or any other headless library (that would need a new decision), visual redesigns, and new props.

## Small shared helpers

Some moves need the same small pieces. Put each one in `src/lib/` the first time a component needs it, with its own tests. Do not write them ahead of time.

| Helper | What it does | First needed by |
|---|---|---|
| `useControllableState` | Works with `value` and `onChange`, or with `defaultValue` alone. | Switch |
| `useRovingFocus` | One Tab stop for a group. Arrow keys, Home, and End move inside it. | Tabs |
| `useDismiss` | Closes on Esc and on a click outside. Esc closes only the top layer. Select and Combobox do this inline today; move their code here. | Popover |
| `usePosition` | Places a pop-up next to its button and flips it when there is no room. | Popover |
| `asChild` helper | Merges props and refs onto one child element (replaces `Slot`). | Button |

## The order, from easiest to hardest

### Group 1: simple parts (low risk)

| File | Radix part | Plain React version | APG pattern | Tests to add |
|---|---|---|---|---|
| `divider.jsx` | `Separator` | `<hr>`, or `role="separator"` with `aria-orientation` when vertical; `aria-hidden` when decorative | (none: role only) | Decorative is hidden; labeled one is a separator with its name; vertical sets orientation. |
| `progress.jsx` | `Progress` | `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a label | Meter / progress (role only) | Value, label, and "busy" when the value is unknown. |
| `avatar.jsx` | `Avatar` | `<img>` with `onError` that falls back to initials | (none) | Picture shows; a broken picture shows initials; the name is read once. |
| `provider-card.jsx` | `Avatar` | Use the plain Avatar from the step above | (none) | Same as Avatar, inside the card. |
| `button.jsx` | `Slot` | Small `asChild` helper with `cloneElement` and merged refs | Button | `asChild` puts the button look and ref on a link; spinner and icon still show. |

### Group 2: form controls with a native element (low to medium risk)

| File | Radix part | Plain React version | APG pattern | Tests to add |
|---|---|---|---|---|
| `switch.jsx` | `Switch` | `<button role="switch" aria-checked>` | Switch | Space and Enter flip it; label names it; state is read. |
| `checkbox.jsx` | `Checkbox` | Native `<input type="checkbox">`, styled | Checkbox (dual and mixed) | Click and Space tick it; error and hint are read; **mixed state** (see the note below). |
| `data-table.jsx` | `Checkbox` | The plain Checkbox above | Checkbox (mixed) | "Pick all rows" is mixed when some rows are picked. |
| `radio-group.jsx` | `RadioGroup` | Native radios in a `<fieldset>` with a `<legend>` | Radio group | Arrow keys move and pick; one Tab stop; tiles look the same. |
| `appointment-slots.jsx` | `RadioGroup` | Native radios, as above | Radio group | Day and time groups each have one Tab stop; picked slot is read. |
| `button-group.jsx` | `ToggleGroup` | Buttons with `aria-pressed` in a labeled group | Toolbar / toggle button | One pressed at a time; arrow keys move; state is read. |
| `filter-chips.jsx` | `ToggleGroup` | Buttons with `aria-pressed` | Toggle button | Many can be pressed; Clear all; result count is read. |

**Checkbox mixed state (important):** today, Radix gets `checked="indeterminate"` and shows a dash, and the dash icon is picked by looking at the `checked` prop. A native checkbox cannot take `"indeterminate"` as its `checked` value. The plain version must set `input.indeterminate = true` through a ref (in an effect, every time it changes), keep `checked` false at that time, and pick the icon from the same value. The Tailwind classes that use `data-[state=checked]` and `data-[state=indeterminate]` must move to `:checked` and `:indeterminate` (or to our own `data-state`). `onCheckedChange` must still get `true` or `false`, never the event. Test that the "Pick all rows" box in DataTable is read as "mixed".

### Group 3: show and hide, and lists (medium risk)

| File | Radix part | Plain React version | APG pattern | Tests to add |
|---|---|---|---|---|
| `accordion.jsx` | `Accordion` | Heading with a `<button aria-expanded aria-controls>`, and a region | Accordion | Enter and Space open and close; one or many open; region is named by its button. |
| `tabs.jsx` | `Tabs` | `role="tablist"`, `tab`, `tabpanel`, with `useRovingFocus` | Tabs (automatic activation, as today) | Arrows, Home, and End move and pick; one Tab stop; panel is named by its tab. |
| `time-picker.jsx` | `Select` | Reuse the plain list from `select.jsx` (move it to a shared file), with the browser's own select on phones, like Select | Select-only combobox | Same tests as Select, plus typing "1030" or "10:30a". |

### Group 4: pop-ups that do not block the page (medium to high risk)

These need `useDismiss` and `usePosition`. Decide how to place pop-ups first (see the checkpoints).

| File | Radix part | Plain React version | APG pattern | Tests to add |
|---|---|---|---|---|
| `popover.jsx` | `Popover` | Button with `aria-expanded` that opens a non-modal box; focus moves in, Esc and outside clicks close it, focus goes back | Disclosure / non-modal dialog | Opens and closes by keyboard; focus goes in and back; Esc closes only it. |
| `date-picker.jsx` | `Popover` | The plain Popover, plus today's calendar grid | Date picker dialog | Every key in the calendar grid; typed dates still work. |
| `tooltip.jsx` | `Tooltip`, `Popover` | Tooltip shows on hover and focus, stays while the pointer is on it, and Esc hides it (WCAG 1.4.13). TermTooltip uses the plain Popover so taps work on phones. | Tooltip | Focus shows it; Esc hides it; it is read as the button's description. |
| `icon-button.jsx` | `Tooltip` | The plain Tooltip above | Tooltip | The lone icon still has a name; the tooltip repeats it. |

### Group 5: pop-ups that block the page, menus, and messages (high risk; last)

These need careful focus handling. We recommend the browser's own `<dialog>` element with `showModal()`. It keeps focus inside, blocks the page behind it, and closes on Esc, with no focus-trap code to maintain.

| File | Radix part | Plain React version | APG pattern | Tests to add |
|---|---|---|---|---|
| `dialog.jsx` | `Dialog` | `<dialog>` with `showModal()`, title and description wired up, focus back to the opener | Dialog (modal) | Focus goes in and stays; Esc closes; focus goes back; Select and Combobox inside it close first on Esc. |
| `drawer.jsx` | `Dialog` | The same, sliding from the side | Dialog (modal) | Same as Dialog, on both sides. |
| `header.jsx` | `Dialog` | The plain Dialog, for the phone menu | Dialog (modal) | Menu opens and closes on a phone; links work; focus goes back. |
| `session-timeout.jsx` | `AlertDialog` | `<dialog role="alertdialog">`, with the safe button focused first | Alert dialog | Countdown is read politely; "Stay signed in" is focused; time runs out as before. |
| `menu.jsx` | `DropdownMenu` | Button with `aria-haspopup="menu"`, a `role="menu"` list, and `useRovingFocus` | Menu button | Arrows, Home, End, and typing a letter move; Enter picks; Esc closes and returns focus. |
| `toast.jsx` | `Toast` | A polite live region, timers that pause on hover and focus, a close button, and the F8 key to reach messages | (live region; WCAG 2.2.1 timing) | Messages are read once; they wait while the pointer or focus is on them; actions work by keyboard. |

**Watch out when Dialog moves to `<dialog>`:** the Select list is drawn at the end of the page (a portal), so a pop-up cannot cut it off. A `<dialog>` opened with `showModal()` sits above everything else and makes the rest of the page inert, so the list would end up under it and could not be clicked. When Dialog moves, Select must draw its list inside the open `<dialog>` instead. Add a test for this.

## Known follow-ups (not Radix)

- **Combobox list inside a scroll box:** the Combobox list is drawn right under the box, inside the page. In a pop-up or a card that hides overflow, it can be cut off or make the pop-up scroll. Give it the same portal and placement as Select (with `usePosition`).

## Checkpoints for Heath

1. **Start:** Heath says "start migrating with <Component>". We recommend Divider first.
2. **After Group 1:** look at the five moved components in Storybook and agree that the approach and the look are right.
3. **Before Group 4:** decide how pop-ups find their place on the screen:
   (a) our own small helper (no new package), (b) CSS anchor positioning (newer browsers only), or (c) the small `@floating-ui/react-dom` package. Our advice: (a), with (b) when the browsers we support all have it.
4. **Before Group 5:** agree to use the browser's own `<dialog>` element for pop-ups that block the page.
5. **Before Toast:** decide whether to keep swipe-to-close and the F8 key.
6. **The end:** remove `radix-ui` from `package.json`.

## Recommended first three

1. **Divider** (`Separator`): smallest change, no keyboard behavior, easy to check by eye.
2. **Progress** (`Progress`): one role and three values; good first use of the test pattern.
3. **Avatar** (and ProviderCard right after): shows the "fallback when a picture fails" pattern, with no keyboard behavior.

## What is left: the inventory

25 files still import `radix-ui` (Select was the 26th; it is now plain React). This matches the list in the critique, minus Select.

| File | Imports | Group | Moved? |
|---|---|---|---|
| `accordion.jsx` | `Accordion` | 3 | No |
| `appointment-slots.jsx` | `RadioGroup` | 2 | No |
| `avatar.jsx` | `Avatar` | 1 | No |
| `button-group.jsx` | `ToggleGroup` | 2 | No |
| `button.jsx` | `Slot` | 1 | No |
| `checkbox.jsx` | `Checkbox` | 2 | No |
| `data-table.jsx` | `Checkbox` | 2 | No |
| `date-picker.jsx` | `Popover` | 4 | No |
| `dialog.jsx` | `Dialog` | 5 | No |
| `divider.jsx` | `Separator` | 1 | No |
| `drawer.jsx` | `Dialog` | 5 | No |
| `filter-chips.jsx` | `ToggleGroup` | 2 | No |
| `header.jsx` | `Dialog` | 5 | No |
| `icon-button.jsx` | `Tooltip` | 4 | No |
| `menu.jsx` | `DropdownMenu` | 5 | No |
| `popover.jsx` | `Popover` | 4 | No |
| `progress.jsx` | `Progress` | 1 | No |
| `provider-card.jsx` | `Avatar` | 1 | No |
| `radio-group.jsx` | `RadioGroup` | 2 | No |
| `session-timeout.jsx` | `AlertDialog` | 5 | No |
| `switch.jsx` | `Switch` | 2 | No |
| `tabs.jsx` | `Tabs` | 3 | No |
| `time-picker.jsx` | `Select` | 3 | No |
| `toast.jsx` | `Toast` | 5 | No |
| `tooltip.jsx` | `Tooltip`, `Popover` | 4 | No |
| `select.jsx` | (none) | | Yes: plain React list, and the browser's own select on phones |
| `combobox.jsx` | (none) | | Plain React from the start; now follows APG fully |

To check the count at any time: `grep -rl 'from "radix-ui"' src/components/ui | wc -l`
