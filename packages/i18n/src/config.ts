/** Lokalizasiya ayarları (PRD §62) */
export const locales = ["az", "ru", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "az";
export const timeZone = "Asia/Baku";
export const currency = "AZN";

export const localeLabels: Record<AppLocale, { short: string; name: string; intl: string }> = {
  az: { short: "AZ", name: "Azərbaycan", intl: "az-Latn-AZ" },
  ru: { short: "RU", name: "Русский", intl: "ru-RU" },
  en: { short: "EN", name: "English", intl: "en-GB" },
};

export function isLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}
