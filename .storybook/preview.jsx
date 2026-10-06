import "../src/styles/storybook.css";
import settings from "@settings";

// Load the brand's fonts from Google Fonts. Apps do the same with settings.fonts.href, or host the fonts themselves.
if (settings.fonts && settings.fonts.href && !document.querySelector("link[data-brand-fonts]")) {
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = settings.fonts.href; l.dataset.brandFonts = "1"; document.head.appendChild(l);
}

const pick = (title, items, icon) => ({ description: title, toolbar: { title, icon, items, dynamicTitle: true } });

/** @type { import('@storybook/react-vite').Preview } */
export default {
  globalTypes: {
    brand: pick("Brand", [{ value: "northfield", title: "Northfield" }, { value: "crestline", title: "Crestline" }], "paintbrush"),
    screen: pick("Screen", [{ value: "consumer", title: "Consumer" }, { value: "employee", title: "Employee" }], "browser"),
    size: pick("Text size", [{ value: "large", title: "Large" }, { value: "standard", title: "Standard" }], "zoom"),
    mode: pick("Mode", [{ value: "light", title: "Light" }, { value: "dark", title: "Dark" }], "contrast"),
  },
  initialGlobals: { brand: "northfield", screen: "consumer", size: "large", mode: "light" },
  decorators: [
    (Story, ctx) => {
      const g = ctx.globals, h = document.documentElement;
      h.dataset.brand = g.brand; h.dataset.screen = g.screen; h.dataset.size = g.size; h.dataset.mode = g.mode;
      return (
        <div style={{ background: "var(--page-fill) center / cover no-repeat, var(--background)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--lh)", padding: "var(--pad)", minHeight: "100%" }}>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: "fullscreen", controls: { expanded: true },
    options: { storySort: { order: ["Guide", ["Start here", "Foundations", "Contributing"], "Components"] } },
    // The Accessibility panel checks WCAG 2.2 AA rules on every story. "todo" shows problems as warnings, so nothing fails yet.
    a11y: { test: "todo", options: { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } } },
  },
  tags: ["autodocs"],
};
