import { expect, test } from "@playwright/test";
import { loginWithEmail, resetMock, t } from "./support";

test.describe("Kataloq, səbət və checkout (§28–§31, §48)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("filtr və axtarış nəticələri yeniləyir", async ({ page }) => {
    await page.goto("/az/shop/kondisionerler");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const count = page.getByText(/\d+ məhsul/).first();
    const before = await count.textContent();
    await page.locator('input[type="checkbox"]').first().check();
    await expect(page).toHaveURL(/\?.+=/);
    await expect(count).not.toHaveText(before ?? "");

    await page.goto("/az/search?q=midea");
    await expect(page.getByRole("link", { name: /Midea/ }).first()).toBeVisible();
  });

  test("müştəri məhsulu səbətə atır, kartla ödəyir və sifarişi görür", async ({ page }) => {
    await loginWithEmail(page, "gunel@demo.az", { next: "/product/midea-xtreme-save" });
    await expect(page.getByRole("heading", { name: "Midea Xtreme Save", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: t("add"), exact: false }).first().click();

    await page.goto("/az/cart");
    await expect(page.getByText("Midea Xtreme Save").first()).toBeVisible();
    await page.goto("/az/checkout");
    await expect(page.getByRole("heading", { name: t("checkout.title"), level: 1 })).toBeVisible();
    await page.getByRole("radio", { name: new RegExp(t("enum.PaymentMethod.CARD_ONLINE"), "i") }).check().catch(() => undefined);
    await page.getByRole("button", { name: t("checkout.payNow") }).click();

    // Ödəniş provayderi simulyasiyası — kart məlumatı daxil edilmir
    await expect(page.getByText(t("pay.sandbox"))).toBeVisible();
    await page.getByRole("button", { name: t("pay.simulateSuccess") }).click();
    await expect(page.getByRole("heading", { name: t("result.successTitle") })).toBeVisible();
    await page.getByRole("link", { name: t("result.viewOrder") }).first().click();
    await expect(page).toHaveURL(/\/az\/account\/orders\/[\w-]+$/);
  });
});
