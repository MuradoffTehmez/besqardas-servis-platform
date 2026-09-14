import type { MetadataRoute } from "next";

/** Admin panel heç bir halda indekslənmir (PRD §72). */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
