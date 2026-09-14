/**
 * Dil seçimi köməkçiləri (PRD §62). Asılılığı yoxdur — proxy və server kodu bunu yüngül şəkildə import edir.
 */
export type SiteLocale = "az" | "ru" | "en";

export const LOCALES: SiteLocale[] = ["az", "ru", "en"];
export const DEFAULT_LOCALE: SiteLocale = "az";

export function isLocale(v: unknown): v is SiteLocale {
  return v === "az" || v === "ru" || v === "en";
}

/** İstifadəçinin seçimi (cookie), sonra Accept-Language başlığındakı ən üstün dəstəklənən dil. */
export function pickLocale(cookieLocale: string | undefined, acceptLanguage: string | null): SiteLocale {
  if (isLocale(cookieLocale)) return cookieLocale;
  const langs = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: (tag ?? "").slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.lang)
    .sort((a, b) => b.q - a.q);
  const found = langs.find((x) => isLocale(x.lang));
  return found ? (found.lang as SiteLocale) : DEFAULT_LOCALE;
}
