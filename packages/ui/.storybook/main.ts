import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Komponent kataloqu (PRD §73). `pnpm --filter @sp/ui storybook` ilə açılır,
 * `build-storybook` statik kataloqu `storybook-static/` qovluğuna yığır.
 */
const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.tsx"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal: async (vite) => ({
    ...vite,
    // Komponentlər Next.js mühitində işlədiyi üçün process.env oxunuşları brauzerdə sabitlənir
    define: { ...vite.define, "process.env.NODE_ENV": JSON.stringify("development"), "process.env": "{}" },
  }),
};

export default config;
