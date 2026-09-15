import { expect, test, type Page } from "@playwright/test";
import { loginWithEmail, open, resetMock, t } from "./support";

// 1×1 PNG — icra mərhələsinin foto tələbi üçün
const PHOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/** İş kartındakı əməliyyat düyməsini basır (əsas əməliyyatlar görünür, qalanları "Daha çox" menyusundadır). */
async function runAction(page: Page, code: string) {
  const button = page.locator("#main-content").getByRole("button", { name: t(`actions.${code}`), exact: true });
  await expect(button).toBeVisible();
  await button.click();
}

test.describe("Usta axını: qəbul → icra → təhvil (§13, §19, §75.1)", () => {
  test.beforeEach(async ({ request }) => resetMock(request));

  test("usta təklifi qəbul edir, mərhələləri keçir və sifarişi imza ilə təhvil verir", async ({ page }) => {
    await loginWithEmail(page, "elvin@demo.az");
    await expect(page).toHaveURL(/\/az\/technician/);

    // 1. Təklifi qəbul et
    await open(page, "/az/technician/jobs?tab=offers");
    const offer = page.locator("article.tp-offer").filter({ hasText: "SV-1062" });
    await expect(offer).toBeVisible();
    await offer.getByRole("button", { name: t("actions.accept") }).click();
    await expect(page.getByText(t("tech.jobs.accepted", { number: "SV-1062" }))).toBeVisible();

    // 2. İşi aç
    await open(page, "/az/technician/jobs");
    await page.getByText("SV-1062").first().click();
    await expect(page.getByRole("heading", { level: 1, name: /SV-1062/ })).toBeVisible();

    // 3. Gəliş mərhələsi
    await runAction(page, "start_travel");
    await runAction(page, "arrive");

    // 4. Servis işləri: başla, klaviatura ilə dialoqu bağla, sonra checklist + foto ilə tamamla
    await runAction(page, "start");
    await runAction(page, "complete_stage");
    let dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("#main-content").getByRole("button", { name: t("actions.complete_stage"), exact: true })).toBeFocused();

    await runAction(page, "complete_stage");
    dialog = page.getByRole("dialog");
    for (const box of await dialog.getByRole("checkbox").all()) await box.check();
    await page.locator('.kit-drop input[type="file"][multiple]').setInputFiles({ name: "servis.png", mimeType: "image/png", buffer: PHOTO });
    await expect(page.locator(".kit-files").getByText("servis.png")).toBeVisible();
    await dialog.getByRole("button", { name: t("actions.complete_stage") }).click();
    await expect(dialog).toHaveCount(0);

    // 5. Təhvil: imza və ödəniş
    await runAction(page, "start");
    await runAction(page, "complete_stage");
    dialog = page.getByRole("dialog");
    const pad = dialog.getByLabel(t("media.signatureArea"));
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 30 + i * 25, box.y + box.height / 2 + (i % 2 ? -18 : 18));
    await page.mouse.up();
    await expect(dialog.getByText(t("media.signed"))).toBeVisible();
    await dialog.getByRole("button", { name: t("actions.complete_stage") }).click();
    await expect(dialog).toHaveCount(0);

    // 6. Sifariş tamamlanıb
    await expect(page.locator("#main-content").getByText(t("enum.OrderStatus.COMPLETED")).first()).toBeVisible();
    await expect(page.locator("#main-content").getByRole("button", { name: t("actions.complete_stage"), exact: true })).toHaveCount(0);
  });
});
