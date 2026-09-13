export type AppLocale = "az" | "ru" | "en";

/**
 * Safely resolves any localized text or object ({ az, ru, en }) to a string.
 * Prevents React child object rendering errors.
 */
export function resolveText(val: any, locale: AppLocale = "az", fallback: string = ""): string {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    return val[locale] || val.az || val.en || val.ru || fallback;
  }
  return fallback;
}

/**
 * Safely gets technician display name, prioritizing fullName (from API DTO) over name.
 */
export function resolveTechnicianName(tech: any, defaultName: string = "Usta"): string {
  if (!tech) return defaultName;
  return tech.fullName || tech.name || defaultName;
}

/**
 * Safely extracts up to 2 uppercase initials from a name string.
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== "string") return "U";
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}
