// Runs axe on a rendered component. jsdom cannot measure colors, so the color contrast rule is off here.
// Color contrast is checked by npm run audit:storybook and the console's own checks instead.
import axe from "axe-core";

export async function axeViolations(node = document.body) {
  const r = await axe.run(node, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return r.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}
