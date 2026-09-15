import { expect, test } from "@playwright/test";
import { loginWithEmail, open, resetMock, t } from "./support";

test.describe("Kataloq, səbət və checkout (§28–§31, §48)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("filtr və axtarış nəticələri yeniləyir", async ({ page }) => {
    await open(page, "/az/shop/kondisionerler");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const count = page.locator(".shop-head p");
    await expect(count).toHaveText(/\d+ məhsul/);
    const before = await count.textContent();
    // Marka filtri: birinci aktiv seçim
    await page
      .locator(".shop-side .shop-facet input[type=checkbox]:not([disabled])")
      .first()
      .click();
    await expect(page).toHaveURL(/\?.+=/);
    await expect(count).not.toHaveText(before ?? "");
    await expect(page.locator(".shop-active .chip").first()).toBeVisible();

    await open(page, "/az/search?q=midea");
    await expect(page.getByRole("link", { name: /Midea/ }).first()).toBeVisible();
  });

  test("müştəri məhsulu səbətə atır, kartla ödəyir və sifarişi görür", async ({ page }) => {
    await loginWithEmail(page, "gunel@demo.az", { next: "/product/midea-xtreme-save" });
    await expect(page.getByRole("heading", { name: "Midea Xtreme Save", level: 1 })).toBeVisible();
    await page
      .getByRole("button", { name: t("add"), exact: false })
      .first()
      .click();

    await open(page, "/az/cart");
    await expect(page.getByText("Midea Xtreme Save").first()).toBeVisible();
    await open(page, "/az/checkout");
    await expect(page.getByRole("heading", { name: t("checkout.title"), level: 1 })).toBeVisible();
    // API label-i locale copy-sindən asılı olaraq “Kartla onlayn” və ya “Kart — onlayn” ola bilər.
    // Uğursuz locator-u udmaq əvəzinə semantik, sabit prefix ilə konkret seçim edilir.
    await page.getByRole("radio", { name: /^Kart/i }).check();
    await page.getByRole("button", { name: t("checkout.payNow") }).click();

    // Ödəniş provayderi simulyasiyası — kart məlumatı daxil edilmir
    await expect(page.getByText(t("pay.sandbox"))).toBeVisible();
    await page.getByRole("button", { name: t("pay.simulateSuccess") }).click();
    await expect(page.getByRole("heading", { name: t("result.successTitle") })).toBeVisible();
    await page
      .getByRole("link", { name: t("result.viewOrder") })
      .first()
      .click();
    await expect(page).toHaveURL(/\/az\/account\/orders\/[\w-]+$/);
  });
});
