// Component tests: React Testing Library in jsdom, with axe for accessibility.
// Run: npm run test:components   (npm test runs these after the Node tests)
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/components/**/*.test.jsx"],
    setupFiles: ["test/components/setup.js"],
    css: false,
    testTimeout: 15000,
  },
});
