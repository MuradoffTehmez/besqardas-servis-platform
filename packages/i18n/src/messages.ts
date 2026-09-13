import az from "../messages/az.json";
import ru from "../messages/ru.json";
import en from "../messages/en.json";
import azApp from "../messages/az/app.json";
import ruApp from "../messages/ru/app.json";
import enApp from "../messages/en/app.json";
import azEnum from "../messages/az/enum.json";
import ruEnum from "../messages/ru/enum.json";
import enEnum from "../messages/en/enum.json";
import azPanel from "../messages/az/panel.json";
import ruPanel from "../messages/ru/panel.json";
import enPanel from "../messages/en/panel.json";
import azAdmin from "../messages/az/admin.json";
import ruAdmin from "../messages/ru/admin.json";
import enAdmin from "../messages/en/admin.json";
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

export const messageSources: Record<AppLocale, Messages[]> = {
  az: [az, azApp, azEnum, azPanel, azAdmin],
  ru: [ru, ruApp, ruEnum, ruPanel, ruAdmin],
  en: [en, enApp, enEnum, enPanel, enAdmin],
};

const cache = new Map<AppLocale, Messages>();

export function loadMessages(locale: AppLocale): Messages {
  if (cache.has(locale)) return cache.get(locale)!;
  const combine = (parts: Messages[]) => parts.reduce((acc, p) => merge(acc, p), {} as Messages);
  const base = combine(messageSources.az);
  const merged = locale === "az" ? base : merge(base, combine(messageSources[locale]));
  cache.set(locale, merged);
  return merged;
}

/** "a.b.c" yolu ilə mesajı tapır. */
export function lookup(messages: Messages, key: string): string | undefined {
  if (typeof messages[key] === "string") return messages[key] as string;
  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (!isObject(cur)) return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function flattenKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (isObject(v) ? flattenKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
