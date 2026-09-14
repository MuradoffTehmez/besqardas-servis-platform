import type { MetadataRoute } from "next";
import { LOCALES, SITE_URL } from "@sp/ui/server";

/** Kabinetlər, panellər və tranzaksiya səhifələri indekslənmir (PRD §72). */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["account", "technician/", "corporate", "partner", "wholesale", "courier", "cart", "checkout", "compare", "search", "login", "register", "verify", "2fa", "select-mode", "forgot-password", "reset-password", "demo"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...LOCALES.flatMap((l) => privatePaths.map((p) => `/${l}/${p}`))] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
