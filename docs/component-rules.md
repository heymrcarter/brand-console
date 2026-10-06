# Rules for building a React component in this design system

These rules keep every component consistent. Follow all of them.

## Where things go
- Component: `src/components/ui/<file>.jsx` (one file per component, kebab-case, e.g. `icon-button.jsx`).
- Story: `src/stories/<file>.stories.jsx`.
- Do NOT edit shared files: `src/index.js`, `package.json`, `console/*`, `.storybook/*`, `src/lib/*`, other components. The lead adds exports.
- No new npm packages. Available: `react` 19, `lucide-react` icons, `class-variance-authority` (`cva`), `clsx`, `tailwind-merge` via `cn` from `../../lib/utils`.
- **Plain React only.** Do not add `radix-ui` imports, and do not add React Aria or another headless library. Follow the WAI-ARIA Authoring Practices pattern for the control, like Combobox and Select do. Some older components still import `radix-ui` until we move them; leave those imports alone unless your change is that component's move. The order and the rules are in `docs/radix-migration-plan.md`.
- Read brand-team settings with `import { comp } from "../../lib/settings";` then `comp("<registry id>")` → e.g. `comp("progress").height`. The setting names and options are the `slots` in `console/registry.js` for that id. Defaults are in the slot `defaults` / BASE; always fall back to the default when a setting is missing.

## Look and feel
- Match the console preview for that component. The HTML the console draws is the `spec` function for its id in `console/registry.js`; the CSS is the `.pv-*` rules in `console/index.html`. Copy the look, but build real accessible React.
- Style ONLY with the theme's CSS variables (Tailwind v4 classes that map to them, or arbitrary values like `[padding:var(--pad)]`). Never hard-code brand colors. Useful ones:
  - Colors (Tailwind names): `bg-background text-foreground bg-card bg-panel text-card-foreground bg-muted text-muted-foreground bg-secondary text-secondary-foreground bg-accent text-accent-foreground bg-primary text-primary-foreground border-primary-edge text-link border-border border-input ring-ring bg-destructive text-destructive-text bg-destructive-soft text-success text-warning`, and `[background:var(--success-soft)]`, `[background:var(--warning-soft)]`.
  - Main button colors: `[background:var(--btn-bg)] [color:var(--btn-fg)] border-(--btn-border)`.
  - Sizes: `var(--text-base) var(--text-sm) var(--text-h1|h2|h3) var(--control-h) var(--gap) var(--pad) var(--lh)`.
  - Shape: `var(--radius) var(--field-radius) var(--btn-radius) var(--card-radius) var(--card-shadow) var(--menu-shadow) var(--dialog-radius) var(--overlay)`.
  - Fonts: `[font-family:var(--font-heading)] [font-style:var(--heading-style,normal)] [font-weight:var(--heading-w)]` for headings; `[font-family:var(--font-ui,var(--font-body))]` for labels, navigation, tabs, badges, buttons; body text inherits `--font-body`.
  - Component settings that are CSS variables (use with a fallback): `--c-icon-button-shape --c-date-picker-day --c-progress-height --c-avatar-shape --c-callout-weight --c-divider-weight --c-filter-chips-shape --c-appointment-slots-shape --c-badge-shape --c-icon-stroke`.
- Filled brand shapes that must stand out from the page (checked states, current step, selected slot, progress fill, current page) use `border-primary-edge` / `var(--primary-edge)` for their outline or fill edge.
- Error text and error borders use `text-destructive-text` / `var(--destructive-text)`, never `text-destructive`.
- Reuse existing parts: `Button`/`buttonVariants` from `./button`, `FieldLabel, FieldHint, FieldError, inputClass` from `./field-parts`, `Icon` from `./icon`, `Badge` from `./badge`, `Card` from `./card`.

## Accessibility (most users are over 65)
- Real HTML elements (button, a, input, nav, ol, table, and the Dialog component for pop-ups). Keyboard works everywhere. Visible focus: `focus-visible:[outline:3px_solid_var(--ring)] focus-visible:[outline-offset:2px]`.
- Tap targets at least `var(--control-h)` tall for anything people press.
- Icons next to words get `aria-hidden="true"`. A lone icon needs a label.
- Live messages (toast, banner, errors, timers) use `role="status"` or `role="alert"` correctly.
- Respect `motion-reduce:` for any animation.
- Never rely on color alone: status also has an icon or words.
- Follow the `a11y` and `guide` text for the id in `console/registry.js`.

## Writing
- All visible text in examples and defaults: fifth-grade reading level, full sentences, plain words. Healthcare member context (plans, visits, medicines, bills).
- Each component gets a JSDoc comment on the export: one or two sentences saying what it is and when to use it, in plain words.

## Props, refs, and types
- Form controls and buttons pass a ref to the element people type in or press: wrap the export in `forwardRef` from `react`, put the `ref` on that element, and set `Component.displayName = "Component"`. Spread other props (`...props`) onto the same element when the component allows it.
- Teams that use TypeScript read `src/index.d.ts`. It is written by hand. When you add or rename an export, the lead adds it there too (`npm test` fails if one is missing, and `npm run check:types` checks the file). Give main form parts full prop types; others can list their prop names.

## Story file pattern
```jsx
import { Thing } from "../components/ui/thing";
import { docs, Grp, Row } from "./meta.jsx";
export default { title: "Components/<Registry name>", component: Thing, parameters: { docs: { description: { component: docs("<registry id>") } } } };
/** Every kind and state, as the brand team sees it in the Brand Console. */
export const All = { render: () => (<>...<Grp label="...">...</Grp>...</>) };
```
- The default export must be a plain object literal (Storybook requires it).
- The `All` story shows every kind, state, and the settings that change structure, like the console preview for that id.
- Stories must work with no props from outside; keep any state inside the story with `useState` in a small wrapper component.

## Done means
- `node --check` style sanity: no syntax errors; JSX only in `.jsx` files.
- Imports resolve (relative paths only, plus the packages listed above).
- Tests in `test/components/<file>.test.jsx`: roles, names, states, the keyboard keys from the pattern, and axe. Run `npm test` and `npm run check:types`, and open the story in Storybook in both brands and both modes.
- Report back: the list of files, each component's exported names and main props, and anything you could not do.
