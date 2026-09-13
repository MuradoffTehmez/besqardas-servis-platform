import az from "../messages/az.json";
import ru from "../messages/ru.json";
import en from "../messages/en.json";
import type { AppLocale } from "./config";

type Messages = Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Dərin birləşdirmə: tərcümə olmayan açarlar AZ versiyasına düşür (PRD §62). */
function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] = isObject(baseValue) && isObject(value) ? merge(baseValue, value) : value === "" ? baseValue : value;
  }
  return out;
}

const cache = new Map<AppLocale, Messages>();

export function loadMessages(locale: AppLocale): Messages {
  if (cache.has(locale)) return cache.get(locale)!;
  const table: Record<AppLocale, Messages> = { az, ru, en };
  const merged = locale === "az" ? az : merge(az as Messages, table[locale] as Messages);
  cache.set(locale, merged);
  return merged;
}
