import { expect, test } from "@playwright/test";
import { loginWithEmail, open, resetMock, t } from "./support";

test.describe("Mobil görünüş (§63)", () => {
  test("ana səhifədə üfüqi sürüşmə yoxdur və mobil menyu işləyir", async ({ page }) => {
    await open(page, "/az");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: t("common.menu") }).click();
    const menu = page.getByRole("navigation", { name: t("site.mobileMenu") });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: t("services") }).click();
    await expect(page).toHaveURL(/\/az\/services$/);
  });

  test("kuryer interfeysi telefonda tapşırıqları göstərir", async ({ page, request }) => {
    await resetMock(request);
    await open(page, "/az/login");
    await page.getByLabel(t("auth.phone")).fill("553334455");
    await page.getByRole("button", { name: t("auth.sendCode") }).click();
    await page.getByLabel(t("auth.otpDigit", { n: 1 })).fill("123456");
    await page.locator("#main-content").getByRole("button", { name: t("auth.signIn") }).click();
    await expect(page).toHaveURL(/\/az\/courier/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("usta panelində iş siyahısı telefonda açılır", async ({ page, request }) => {
    await resetMock(request);
    await loginWithEmail(page, "elvin@demo.az");
    await expect(page).toHaveURL(/\/az\/technician/);
    await open(page, "/az/technician/jobs");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
