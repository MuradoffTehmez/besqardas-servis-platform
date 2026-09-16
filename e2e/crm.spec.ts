import { expect, test } from "@playwright/test";
import { ADMIN_URL, expectNoCriticalA11y, fillOtp, loginWithEmail, resetMock, t } from "./support";

test.describe("CRM satış qıfı (§A3)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("menecer lead yaradır, zəngi qeydə alır və kommersiya təklifinə çevirir", async ({ page }) => {
    await loginWithEmail(page, "manager@demo.az", { base: ADMIN_URL, next: "/crm" });
    if (await page.getByRole("heading", { name: t("auth.twoFactorTitle") }).isVisible()) {
      await fillOtp(page);
      await page.getByRole("button", { name: t("auth.verify") }).click();
    }
    const main = page.locator("#panel-content");
    await expect(main.getByRole("heading", { name: t("adm.nav.crmPipeline"), level: 1 })).toBeVisible();
    await expect(main.locator(".crm-column")).toHaveCount(7);

    await main.getByRole("button", { name: t("adm.crm.newLead") }).click();
    const dialog = page.getByRole("dialog", { name: t("adm.crm.newLead") });
    await dialog.getByLabel(t("adm.f.fullName")).fill("E2E Potensial Müştəri");
    await dialog.getByLabel(t("adm.f.phone")).fill("+994 50 777 66 55");
    await dialog.getByLabel(t("adm.crm.value")).fill("4500");
    await dialog.getByLabel(t("adm.crm.note")).fill("Ofis üçün kondisioner və quraşdırma");
    await dialog.getByRole("button", { name: t("common.create") }).click();

    const lead = main.getByRole("link", { name: /E2E Potensial Müştəri/ });
    await expect(lead).toBeVisible();
    await lead.click();
    await expect(main.getByRole("heading", { name: /E2E Potensial Müştəri/, level: 1 })).toBeVisible();

    await main.getByRole("button", { name: t("adm.crm.call") }).click();
    const call = page.getByRole("dialog", { name: new RegExp(t("adm.crm.call")) });
    await call.getByLabel(t("adm.crm.outcome")).selectOption("INTERESTED");
    await call.getByRole("button", { name: t("common.save") }).click();
    await expect(main.getByText(t("enum.CrmCallOutcome.INTERESTED"))).toBeVisible();

    await main.getByRole("button", { name: t("adm.crm.createQuote") }).click();
    await expect(main.getByRole("definition").filter({ hasText: /KT-CRM-\d+/ })).toBeVisible();
    await expectNoCriticalA11y(page, "CRM lead kartı");
  });
});
