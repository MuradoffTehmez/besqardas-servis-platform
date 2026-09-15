import { expect, test } from "@playwright/test";
import { open } from "./support";

/**
 * Vizual reqressiya (desktop və mobil): məzmunu seed-dən sabit gələn səhifələrin ekran görüntüləri etalonla müqayisə olunur.
 * Şrift render-i əməliyyat sistemindən asılı olduğu üçün etalonlar platformaya görə ayrıca saxlanılır
 * (`e2e/__screenshots__/<layihə>/<ad>-<platforma>.png`). İşə salmaq: `pnpm test:visual`,
 * etalonu yeniləmək: `pnpm test:visual --update-snapshots`.
 */
const PAGES = [
  { name: "login", path: "/az/login" },
  { name: "register", path: "/az/register" },
  { name: "pricing", path: "/az/pricing" },
  { name: "faq", path: "/az/faq" },
  { name: "not-found", path: "/az/bele-sehife-yoxdur" },
];

// Demo/dev elementləri və hərəkət müqayisəyə düşmür
const HIDE = `.mock-panel, nextjs-portal, [data-sonner-toaster] { display: none !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;

test.describe("Vizual reqressiya", () => {
  for (const { name, path } of PAGES) {
    test(`${name}`, async ({ page }) => {
      await open(page, path);
      await page.waitForLoadState("networkidle");
      await page.addStyleTag({ content: HIDE });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
    });
  }
});
