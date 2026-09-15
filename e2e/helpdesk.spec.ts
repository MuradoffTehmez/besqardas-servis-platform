import { expect, test } from "@playwright/test";
import { expectNoCriticalA11y, loginWithEmail, open, resetMock, t } from "./support";

test.describe("Help Desk — müraciətlər", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("müştəri kabinetdən müraciət yaradır və yazışmaya cavab əlavə edir", async ({ page }) => {
    await loginWithEmail(page, "rashad@demo.az", { next: "/account/support" });
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: t("support.title"), level: 1 })).toBeVisible();

    await main.getByRole("button", { name: t("support.new") }).first().click();
    await page.getByLabel(t("support.category")).selectOption({ label: "Zəmanət" });
    await page.getByLabel(t("support.subject")).fill("Zəmanət talonunda seriya səhvdir");
    await page.getByLabel(t("support.body")).fill("Talonda kombinin seriya nömrəsi səhv yazılıb, düzəldilməsini xahiş edirəm.");
    await page.getByRole("button", { name: t("support.send") }).click();

    await expect(page).toHaveURL(/\/az\/account\/support\/[\w-]+$/);
    await expect(main.getByRole("heading", { name: /Zəmanət talonunda seriya səhvdir/, level: 1 })).toBeVisible();
    await main.getByLabel(t("common.comment")).fill("Əlavə: talon nömrəsi ZM-30001");
    await main.getByRole("button", { name: t("support.send") }).click();
    await expect(main.getByText("Əlavə: talon nömrəsi ZM-30001")).toBeVisible();
    await expectNoCriticalA11y(page, "Dəstək müraciəti");
  });

  test("qonaq saytın əlaqə formasından müraciət göndərir və nömrə alır", async ({ page }) => {
    await open(page, "/az/contact");
    await page.getByLabel(t("contactPage.name")).fill("Test Qonaq");
    await page.getByLabel(t("email")).fill("qonaq@example.com");
    await page.getByRole("textbox", { name: t("contactPage.message"), exact: true }).fill("Gəncə filialı bazar günü açıqdır?");
    await page.getByLabel(t("contactPage.consent")).check();
    await page.getByRole("button", { name: t("contactPage.send") }).click();
    await expect(page.getByText(/TK-\d+/)).toBeVisible();
  });
});
