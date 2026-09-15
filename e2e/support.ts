import { expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadMessages, lookup } from "../packages/i18n/src/messages";

/** Testlər UI mətnlərini tərcümə fayllarından götürür — mətn dəyişəndə testlər qırılmır. */
const az = loadMessages("az");
export function t(key: string, vars: Record<string, string | number> = {}) {
  let s = lookup(az, key);
  if (s === undefined) throw new Error(`Tərcümə açarı yoxdur: ${key}`);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const API = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://localhost:3001";
export const PASSWORD = "Demo1234!";
export const OTP = "123456";

/** Mock verilənlər bazasını ilkin vəziyyətə qaytarır (seed). */
export async function resetMock(request: APIRequestContext) {
  const r = await request.post(`${API}/api/_mock/reset`);
  expect(r.ok()).toBeTruthy();
}

/** Səhifəyə keçir və React hidratasiyasını gözləyir (server HTML-i interaktiv olana qədər klik itə bilər). */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector("html[data-hydrated]", { timeout: 30_000 });
  // Cookie seçimi testin predmeti deyil. Bildiriş viewport-un aşağı hissəsindəki
  // əməliyyatları örtə bildiyi üçün hər təmiz browser context-də deterministik seçim edilir.
  const cookieDialog = page.getByRole("dialog", { name: t("legal.cookieTitle") });
  if (await cookieDialog.isVisible().catch(() => false)) {
    await cookieDialog.getByRole("button", { name: t("legal.essentialOnly") }).click();
  }
}

/** E-poçt və şifrə ilə UI vasitəsilə giriş. */
export async function loginWithEmail(
  page: Page,
  email: string,
  opts: { next?: string; base?: string } = {},
) {
  const base = opts.base ?? "";
  const url = `${base}/az/login${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`;
  // Dev serverdə ilk kompilyasiya səhifəni yenidən yükləyə bilər — forma vəziyyəti itərsə bir dəfə təkrarlanır
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 0 || page.url().includes("/login")) await open(page, url);
    const emailTab = page.getByRole("tab", { name: t("auth.byEmail") });
    if (await emailTab.isVisible()) await emailTab.click();
    const emailInput = page.getByLabel(t("email"));
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(email);
    await page.getByLabel(t("password")).fill(PASSWORD);
    await page.getByRole("button", { name: t("auth.signIn") }).click();
    const left = await page
      .waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    // 2FA addımı da girişin davamıdır
    if (left || (await page.getByRole("heading", { name: t("auth.twoFactorTitle") }).isVisible()))
      return;
  }
}

/** OTP / 2FA kodunu rəqəm xanalarına daxil edir. */
export async function fillOtp(page: Page, code = OTP) {
  await page.getByLabel(t("auth.otpDigit", { n: 1 })).fill(code);
}

/** Axe ilə WCAG 2.2 AA yoxlaması; kritik pozuntular testi dayandırır (§71, §75.2). */
export async function expectNoCriticalA11y(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // Mock idarəetmə paneli yalnız demo üçündür
    .exclude(".mock-panel")
    .analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  const summary = critical.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
  expect(summary, `${label} — kritik əlçatanlıq pozuntuları`).toEqual([]);
  return results;
}
