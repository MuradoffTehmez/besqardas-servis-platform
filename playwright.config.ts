import { defineConfig, devices } from "@playwright/test";

/**
 * Kritik axınlar üçün E2E testləri (PRD §75.2): giriş, servis sifarişi, smeta təsdiqi, checkout və
 * avtomatlaşdırılmış əlçatanlıq yoxlaması. Mock API, web və admin tətbiqləri avtomatik qaldırılır;
 * artıq işləyən dev serverlər təkrar istifadə olunur.
 *
 * Lokal olaraq quraşdırılmış Chrome işlədilir (`PW_CHANNEL=chrome`); CI-da Playwright Chromium yüklənir.
 */
const CI = !!process.env.CI;
const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const ADMIN = process.env.E2E_ADMIN_URL ?? "http://localhost:3001";
const pnpm = CI ? "pnpm" : "npx -y pnpm@10.34.5";
// Vizual reqressiya yalnız ayrıca işə salınanda (pnpm test:visual) qoşulur — etalonlar platformadan asılıdır
const VISUAL = process.env.VISUAL === "1" || process.argv.some((a) => a.includes("visual"));
// Worker prosesləri argv-ni görmür — seçim env ilə ötürülür
if (VISUAL) process.env.VISUAL = "1";

export default defineConfig({
  testDir: "./e2e",
  // Mock verilənlər bazası testlər arasında paylaşılır — axınlar ardıcıl işləyir
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}",
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB,
    locale: "az-AZ",
    timezoneId: "Asia/Baku",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /(mobile|visual)\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
    ...(VISUAL
      ? [
          { name: "visual-desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /visual\.spec\.ts/ },
          { name: "visual-mobile", use: { ...devices["Pixel 7"] }, testMatch: /visual\.spec\.ts/ },
        ]
      : []),
  ],
  webServer: [
    { command: `${pnpm} --filter @sp/mocks start`, url: "http://127.0.0.1:4000/api/health", reuseExistingServer: !CI, timeout: 120_000, env: { PORT: "4000" } },
    { command: `${pnpm} --filter @sp/web ${CI ? "start" : "dev"}`, url: WEB, reuseExistingServer: !CI, timeout: 240_000, env: { MOCK_AUTOSTART: "0", NEXT_PUBLIC_HIDE_MOCK_PANEL: "1" } },
    { command: `${pnpm} --filter @sp/admin ${CI ? "start" : "dev"}`, url: ADMIN, reuseExistingServer: !CI, timeout: 240_000, env: { MOCK_AUTOSTART: "0", NEXT_PUBLIC_HIDE_MOCK_PANEL: "1" } },
  ],
});
