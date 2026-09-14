// Monorepo üçün vahid ESLint konfiqurasiyası (PRD §66, §75.2)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/.turbo/**", "**/storybook-static/**", "**/playwright-report/**", "**/test-results/**", ".pnpm-store/**", "**/next-env.d.ts"],
  },
  {
    // v0.1 demo mərhələsindən qalan, tətbiqə qoşulmayan fayllar (src/app əvəz edib); silinməyə namizəddir
    ignores: [
      "packages/ui/src/platform.tsx",
      "packages/ui/src/views/{admin,auth,courier,customer,technician}/**",
      "packages/ui/src/views/public/{booking-wizard,cart-view,checkout-view,info-view,pricing-view,product-detail-view,shop-view,technicians-view,warranty-verify-view}.tsx",
      "packages/ui/src/components/ui/{badge,button,data-table,input,status-badge}.tsx",
      "packages/ui/src/components/{domain/device-card,layout/sidebar}.tsx",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Mock DTO-ları və API cavabları geniş tiplərlə işləyir; müqavilə tipləri packages/schemas-dadır
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs["core-web-vitals"].rules },
    settings: { next: { rootDir: ["apps/web/", "apps/admin/"] } },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
