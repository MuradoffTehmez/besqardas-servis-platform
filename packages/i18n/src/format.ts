import { localeLabels, timeZone, type AppLocale } from "./config";

/**
 * Yalnız göstərmə üçün formatlayıcılar. Biznes dəyəri hesablamır — API-nin qaytardığını formatlayır
 * (PRD §62: AZN, dd.MM.yyyy tarix, 24 saatlıq vaxt, Asia/Baku saat qurşağı).
 */

type MoneyLike = { amount: string; currency?: string } | null | undefined;
type QuantityLike = { value: string; unit: string } | null | undefined;

const intl = (locale: string) => localeLabels[(locale as AppLocale) in localeLabels ? (locale as AppLocale) : "az"].intl;

export function formatNumber(value: number | string, locale: string, fractionDigits?: number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(intl(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits ?? 3,
  }).format(n);
}

export function formatMoney(money: MoneyLike, locale: string, opts: { hideCurrency?: boolean } = {}): string {
  if (!money) return "—";
  const n = Number(money.amount);
  const formatted = new Intl.NumberFormat(intl(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  if (opts.hideCurrency) return formatted;
  const cur = money.currency ?? "AZN";
  const symbol = cur === "AZN" ? "₼" : cur;
  return `${formatted} ${symbol}`;
}

const unitLabels: Record<string, Record<AppLocale, string>> = {
  pcs: { az: "əd.", ru: "шт.", en: "pcs" },
  m: { az: "m", ru: "м", en: "m" },
  cm: { az: "sm", ru: "см", en: "cm" },
  kg: { az: "kq", ru: "кг", en: "kg" },
  g: { az: "q", ru: "г", en: "g" },
  l: { az: "l", ru: "л", en: "l" },
  ml: { az: "ml", ru: "мл", en: "ml" },
  roll: { az: "rulon", ru: "рулон", en: "roll" },
  box: { az: "qutu", ru: "коробка", en: "box" },
  pack: { az: "paket", ru: "пакет", en: "pack" },
  can: { az: "banka", ru: "банка", en: "can" },
  cylinder: { az: "balon", ru: "баллон", en: "cylinder" },
  set: { az: "dəst", ru: "компл.", en: "set" },
  pallet: { az: "pallet", ru: "паллет", en: "pallet" },
  h: { az: "saat", ru: "ч", en: "h" },
};

export function unitLabel(unit: string, locale: string): string {
  return unitLabels[unit]?.[locale as AppLocale] ?? unit;
}

export function formatQuantity(q: QuantityLike, locale: string): string {
  if (!q) return "—";
  return `${formatNumber(q.value, locale)} ${unitLabel(q.unit, locale)}`;
}

function parts(date: Date, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intl(locale), { timeZone, ...options }).formatToParts(date);
}

function pick(p: Intl.DateTimeFormatPart[], type: string) {
  return p.find((x) => x.type === type)?.value ?? "";
}

/** Dildən asılı olmayaraq dd.MM.yyyy (PRD §62) */
export function formatDate(iso: string | null | undefined, locale = "az"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = parts(d, locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${pick(p, "day")}.${pick(p, "month")}.${pick(p, "year")}`;
}

export function formatTime(iso: string | null | undefined, locale = "az"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = parts(d, locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const hour = pick(p, "hour") === "24" ? "00" : pick(p, "hour");
  return `${hour}:${pick(p, "minute")}`;
}

export function formatDateTime(iso: string | null | undefined, locale = "az"): string {
  if (!iso) return "—";
  return `${formatDate(iso, locale)} ${formatTime(iso, locale)}`;
}

export function formatWeekday(iso: string, locale = "az", style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat(intl(locale), { timeZone, weekday: style }).format(new Date(iso));
}

export function formatMonth(iso: string, locale = "az"): string {
  return new Intl.DateTimeFormat(intl(locale), { timeZone, month: "long", year: "numeric" }).format(new Date(iso));
}

export function formatRelative(iso: string | null | undefined, locale = "az", now: Date = new Date()): string {
  if (!iso) return "—";
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intl(locale), { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(iso, locale);
}

/** Bakı vaxtı ilə "yyyy-MM-dd" — slotların və təqvim günlərinin qruplaşdırılması üçün */
export function bakuDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = parts(d, "en", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${pick(p, "year")}-${pick(p, "month")}-${pick(p, "day")}`;
}

export function formatMinutes(minutes: number, locale = "az"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hl = { az: "saat", ru: "ч", en: "h" }[locale as AppLocale] ?? "h";
  const ml = { az: "dəq", ru: "мин", en: "min" }[locale as AppLocale] ?? "min";
  if (!h) return `${m} ${ml}`;
  if (!m) return `${h} ${hl}`;
  return `${h} ${hl} ${m} ${ml}`;
}
