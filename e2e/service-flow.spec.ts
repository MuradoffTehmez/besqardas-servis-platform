import { expect, test } from "@playwright/test";
import { loginWithEmail, open, resetMock, t } from "./support";

test.describe("Servis sifarişi və smeta (§13, §19)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("qonaq sifarişə başlayanda girişə yönləndirilir (§75.1)", async ({ page }) => {
    await open(page, "/az/services/kondisioner-periodik-servis");
    await page.getByRole("button", { name: t("book") }).first().click();
    await expect(page).toHaveURL(/\/az\/login\?next=/);
  });

  test("müştəri servis sifarişini addım-addım yaradır", async ({ page }) => {
    await loginWithEmail(page, "aysel@demo.az", { next: "/services/kondisioner-periodik-servis/book" });
    await expect(page.getByRole("heading", { name: t("booking.title"), level: 1 })).toBeVisible();
    const next = page.getByRole("button", { name: t("continue") });

    // 1. İcra forması və cihaz — ilk cihaz seçilir
    await expect(page.getByRole("heading", { name: t("booking.device") })).toBeVisible();
    await page.locator('input[name="device"]').first().check();
    await next.click();

    // 2. Problem təsviri
    await page.getByLabel(t("booking.description")).fill("Kondisioner soyutmur, filtr çirklidir");
    await next.click();

    // 3. Ünvan — defolt ünvan seçilidir
    await expect(page.getByRole("heading", { name: t("booking.address") })).toBeVisible();
    await next.click();

    // 4. Vaxt — ilk boş slot
    await expect(page.getByRole("heading", { name: t("booking.time") })).toBeVisible();
    await page.locator(".kit-slot:not([disabled])").first().click();
    await next.click();

    // 5. Təsdiq
    await expect(page.getByRole("heading", { name: t("booking.confirmTitle") })).toBeVisible();
    await page.getByRole("button", { name: t("booking.submit") }).click();
    await expect(page.getByRole("heading", { name: /SV-\d+/ })).toBeVisible();
    await page.getByRole("link", { name: t("booking.trackOrder") }).click();
    await expect(page).toHaveURL(/\/az\/account\/services\/[\w-]+$/);
  });

  test("müştəri göndərilmiş smetanı kabinetdən təsdiqləyir", async ({ page }) => {
    await loginWithEmail(page, "aysel@demo.az", { next: "/account/services" });
    await page.getByRole("link", { name: /SV-1052/ }).first().click();
    await expect(page.getByText(t("acc.orders.nextEstimate"))).toBeVisible();
    await page.getByRole("button", { name: t("actions.approve_estimate") }).click();
    await expect(page.getByText(t("acc.estimate.done.APPROVE"))).toBeVisible();
    await expect(page.getByRole("button", { name: t("actions.approve_estimate") })).toHaveCount(0);
  });
});
