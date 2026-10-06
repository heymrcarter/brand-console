import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Storybook shows the real React components, styled by the draft theme from the Brand Console. */
export default {
  // The Guide pages (src/docs/*.mdx) come first: start here, foundations, and how to contribute.
  stories: ["../src/docs/**/*.mdx", "../src/stories/**/*.stories.@(js|jsx)"],
  // addon-a11y runs axe on the open story and shows the results in the Accessibility panel.
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    const tailwind = (await import("@tailwindcss/vite")).default;
    return mergeConfig(config, {
      plugins: [tailwind()],
      resolve: { alias: {
        // Storybook shows the draft. Apps that install the package get dist/settings.json through "#settings".
        "#settings": path.join(root, "build/draft/settings.json"),
        "@settings": path.join(root, "build/draft/settings.json"),
        "@manifest": path.join(root, "build/draft/components.manifest.json"),
      } },
      server: { watch: { ignored: ["**/tokens/**", "**/releases/**", "**/dist/**"] } },
    });
  },
};
