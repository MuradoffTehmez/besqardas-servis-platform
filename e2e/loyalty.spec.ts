import { expect, test } from "@playwright/test";
import { ADMIN_URL, expectNoCriticalA11y, fillOtp, loginWithEmail, open, resetMock, t } from "./support";

test.describe("Loyallıq, keşbek və referral (§A2)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("müştəri balansını görür və checkout-da xal ilə keşbek istifadə edir", async ({ page }) => {
    await loginWithEmail(page, "aysel@demo.az", { next: "/account/loyalty" });
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: t("loyalty.title"), level: 1 })).toBeVisible();
    await expect(main.getByText(t("loyalty.code"))).toBeVisible();
    await expect(main.locator(".lyl-code strong")).toHaveText(/^[A-ZƏÖÜÇŞĞİ]{2,3}\d{4}$/);
    await expect(main.getByText(t("loyalty.history"))).toBeVisible();

    await open(page, "/az/product/lg-dualcool-inverter");
    await page.getByRole("button", { name: t("add"), exact: false }).first().click();
    await open(page, "/az/checkout");
    await expect(main.getByRole("heading", { name: t("checkout.title"), level: 1 })).toBeVisible();

    const range = main.locator("#loyalty-range");
    await expect(range).toBeVisible();
    const max = Number(await range.getAttribute("max"));
    await range.fill(String(Math.min(400, max)));
    const wallet = main.locator('input[type="checkbox"]').last();
    await wallet.check();

    await expect(main.getByText(t("loyaltyCheckout.discount"))).toBeVisible();
    await expect(main.getByText(t("loyaltyCheckout.walletDiscount"), { exact: true })).toBeVisible();
    await expectNoCriticalA11y(page, "Loyallıq checkout-u");
  });

  test("menecer loyallıq icmalını, üzvləri və parametrləri idarəetmədə görür", async ({ page }) => {
    await loginWithEmail(page, "manager@demo.az", { base: ADMIN_URL, next: "/loyalty" });
    if (await page.getByRole("heading", { name: t("auth.twoFactorTitle") }).isVisible()) {
      await fillOtp(page);
      await page.getByRole("button", { name: t("auth.verify") }).click();
    }
    const main = page.locator("#panel-content");
    await expect(main.getByRole("heading", { name: t("adm.nav.loyalty"), level: 1 })).toBeVisible();
    await expect(main.getByText(t("adm.loyalty.stats.referralFunnel"))).toBeVisible();

    await main.getByRole("tab", { name: t("adm.loyalty.tabs.members") }).click();
    await expect(main.getByRole("columnheader", { name: t("adm.loyalty.col.member") })).toBeVisible();
    await main.getByRole("tab", { name: t("adm.loyalty.tabs.settings") }).click();
    await expect(main.getByText(t("adm.loyalty.settings.earn"))).toBeVisible();
    await expectNoCriticalA11y(page, "Loyallıq idarəetməsi");
  });
});
