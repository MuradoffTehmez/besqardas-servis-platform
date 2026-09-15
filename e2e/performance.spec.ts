import { expect, test } from "@playwright/test";
import { open } from "./support";

/**
 * Core Web Vitals ölçümü (PRD §73): LCP, CLS, TTFB brauzerin Performance API-si ilə toplanır.
 * CLS büdcəsi hər yerdə yoxlanılır; LCP və TTFB büdcələri yalnız CI-da (production build) tətbiq olunur —
 * lokal dev serverdə ilk kompilyasiya ölçümü təhrif edir. Ətraflı audit: `lighthouserc.json`.
 */
const CI = !!process.env.CI;
const BUDGET = { lcp: 2500, cls: 0.1, ttfb: 800 };
const PAGES = ["/az", "/az/services", "/az/shop", "/az/product/midea-xtreme-save", "/az/login"];

test.describe("Performans — Core Web Vitals (§73)", () => {
  for (const path of PAGES) {
    test(`${path}: LCP, CLS, TTFB büdcə daxilindədir`, async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __vitals: { lcp: number; cls: number } };
        w.__vitals = { lcp: 0, cls: 0 };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) w.__vitals.lcp = Math.max(w.__vitals.lcp, e.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__vitals.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      // Dev serverdə ilk kompilyasiya ölçülməsin deyə səhifə bir dəfə isidilir
      if (!CI) await open(page, path);
      await open(page, path);
      await page.waitForLoadState("networkidle");
      // Səhifə ilə qarşılıqlı əlaqə olmadan bir az gözlənilir — gecikmiş layout sürüşmələri də tutulsun
      await page.waitForTimeout(1500);
      const vitals = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const w = window as unknown as { __vitals: { lcp: number; cls: number } };
        return { lcp: Math.round(w.__vitals.lcp), cls: Number(w.__vitals.cls.toFixed(3)), ttfb: Math.round(nav.responseStart) };
      });
      test.info().annotations.push({ type: "web-vitals", description: `LCP ${vitals.lcp} ms · CLS ${vitals.cls} · TTFB ${vitals.ttfb} ms` });
      expect(vitals.cls, "CLS").toBeLessThanOrEqual(BUDGET.cls);
      if (CI) {
        expect(vitals.lcp, "LCP").toBeLessThanOrEqual(BUDGET.lcp);
        expect(vitals.ttfb, "TTFB").toBeLessThanOrEqual(BUDGET.ttfb);
      }
    });
  }
});
