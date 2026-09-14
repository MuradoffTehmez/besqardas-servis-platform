import { expect, test } from "@playwright/test";
import { expectNoCriticalA11y, loginWithEmail, resetMock } from "./support";

test.describe("SEO (§72)", () => {
  test("public səhifə serverdə məzmun, canonical, hreflang və JSON-LD ilə gəlir", async ({ request }) => {
    const res = await request.get("/az/product/midea-xtreme-save");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="az"');
    expect(html).toMatch(/<link rel="canonical" href="[^"]+\/az\/product\/midea-xtreme-save"/);
    expect(html.match(/hrefLang="(az|ru|en|x-default)"/g)?.length).toBe(4);
    expect(html).toContain('"@type":"BreadcrumbList"');
    // Məzmun JavaScript-siz də HTML-dədir
    expect(html).toMatch(/<h1[^>]*>Midea Xtreme Save<\/h1>/);
  });

  test("kabinet noindex, tanınmayan ünvan 404, prefikssiz ünvan dilə yönləndirilir", async ({ request }) => {
    const account = await request.get("/az/account");
    expect(await account.text()).toMatch(/<meta name="robots" content="noindex/);
    expect((await request.get("/az/bele-sehife-yoxdur")).status()).toBe(404);
    const root = await request.get("/", { maxRedirects: 0, headers: { "Accept-Language": "ru-RU,ru;q=0.9" } });
    expect(root.status()).toBe(307);
    expect(root.headers()["location"]).toMatch(/\/ru$/);
  });

  test("sitemap və robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/az/services/");
    expect(sitemap).toContain('hreflang="ru"');
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /az/account");
    expect(robots).toContain("Sitemap:");
  });
});

test.describe("Əlçatanlıq — axe (§71)", () => {
  const publicPages = ["/az", "/az/services", "/az/services/kondisioner-periodik-servis", "/az/shop", "/az/product/midea-xtreme-save", "/az/technicians", "/az/pricing", "/az/branches", "/az/faq", "/az/contact", "/az/login", "/az/register", "/ru", "/en/shop"];
  for (const path of publicPages) {
    test(`public: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main, form").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoCriticalA11y(page, path);
    });
  }

  test("kabinet səhifələri", async ({ page, request }) => {
    await resetMock(request);
    await loginWithEmail(page, "aysel@demo.az");
    for (const path of ["/az/account", "/az/account/services", "/az/account/devices", "/az/account/profile", "/az/cart", "/az/checkout"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoCriticalA11y(page, path);
    }
  });
});
