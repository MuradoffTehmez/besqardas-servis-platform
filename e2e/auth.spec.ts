import { expect, test } from "@playwright/test";
import { ADMIN_URL, fillOtp, loginWithEmail, open, resetMock, t } from "./support";

test.describe("Giriş və rol əsaslı yönləndirmə (§9)", () => {
  test.beforeAll(async ({ request }) => resetMock(request));

  test("müştəri e-poçt və şifrə ilə daxil olur və kabinetə yönləndirilir", async ({ page }) => {
    await loginWithEmail(page, "aysel@demo.az");
    await expect(page).toHaveURL(/\/az\/account$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("yanlış şifrə lokallaşdırılmış xəta göstərir", async ({ page }) => {
    await open(page, "/az/login");
    await page.getByRole("tab", { name: t("auth.byEmail") }).click();
    await page.getByLabel(t("email")).fill("aysel@demo.az");
    await page.getByLabel(t("password")).fill("yanlis-sifre");
    await page.locator("#main-content").getByRole("button", { name: t("auth.signIn") }).click();
    // Xəta mətni API-dən istifadəçinin dilində gəlir (§65.2)
    await expect(page.getByRole("alert").filter({ hasText: /yanlış/i })).toBeVisible();
    await expect(page).toHaveURL(/\/az\/login/);
  });

  test("kuryer telefon + OTP ilə daxil olur", async ({ page }) => {
    await open(page, "/az/login");
    await page.getByLabel(t("auth.phone")).fill("553334455");
    await page.getByRole("button", { name: t("auth.sendCode") }).click();
    await fillOtp(page);
    await page.locator("#main-content").getByRole("button", { name: t("auth.signIn") }).click();
    await expect(page).toHaveURL(/\/az\/courier/);
  });

  test("qonaq kabinetə girəndə girişə yönləndirilir və sonra geri qaytarılır", async ({ page }) => {
    await open(page, "/az/account/devices");
    await expect(page).toHaveURL(/\/az\/login\?next=%2Faccount%2Fdevices/);
    await page.getByRole("tab", { name: t("auth.byEmail") }).click();
    await page.getByLabel(t("email")).fill("rashad@demo.az");
    await page.getByLabel(t("password")).fill("Demo1234!");
    await page.locator("#main-content").getByRole("button", { name: t("auth.signIn") }).click();
    await expect(page).toHaveURL(/\/az\/account\/devices$/);
  });

  test("daxili rol admin panelə 2FA ilə daxil olur", async ({ page }) => {
    await loginWithEmail(page, "operator@demo.az", { base: ADMIN_URL });
    await expect(page.getByRole("heading", { name: t("auth.twoFactorTitle") })).toBeVisible();
    await fillOtp(page);
    await page.getByRole("button", { name: t("auth.verify") }).click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_URL}/az/?$`));
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });
});
