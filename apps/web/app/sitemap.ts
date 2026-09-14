import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, SITE_URL, languageAlternates, sitemapEntries } from "@sp/ui/server";

// Kataloq dəyişdikcə yenilənir; build zamanı API olmaya bilər
export const dynamic = "force-dynamic";

/** Dillər üzrə sitemap (PRD §72): hər URL AZ versiyası ilə, RU/EN variantları hreflang kimi. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await sitemapEntries();
  return entries.map((e) => ({
    url: `${SITE_URL}/${DEFAULT_LOCALE}${e.path === "/" ? "" : e.path}`,
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
    alternates: { languages: languageAlternates(e.path) },
  }));
}
