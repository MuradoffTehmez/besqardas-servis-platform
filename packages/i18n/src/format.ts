import { localeLabels, timeZone, type AppLocale } from "./config";

/**
 * Yalnız göstərmə üçün formatlayıcılar. Biznes dəyəri hesablamır — API-nin qaytardığını formatlayır
 * (PRD §62: AZN, dd.MM.yyyy tarix, 24 saatlıq vaxt, Asia/Baku saat qurşağı).
 */

type MoneyLike = { amount: string; currency?: string } | null | undefined;
type QuantityLike = { value: string; unit: string } | null | undefined;

const loc = (locale: string): AppLocale => ((locale as AppLocale) in localeLabels ? (locale as AppLocale) : "az");

/**
 * Ədəd ayırıcıları CLDR qaydalarına uyğun sabit cədvəldən götürülür. Brauzerlərin və Node.js-in ICU datası
 * fərqlidir (məs. bəzi brauzerlərdə `az` lokalı yoxdur) — server render ilə brauzer eyni mətni almalıdır (§72).
 */
const separators: Record<AppLocale, { group: string; decimal: string }> = {
  az: { group: ".", decimal: "," },
  ru: { group: " ", decimal: "," },
  en: { group: ",", decimal: "." },
};

function formatDecimal(n: number, locale: string, min: number | undefined, max: number): string {
  const sep = separators[loc(locale)];
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max })
    .formatToParts(n)
    .map((p) => (p.type === "group" ? sep.group : p.type === "decimal" ? sep.decimal : p.value))
    .join("");
}

export function formatNumber(value: number | string, locale: string, fractionDigits?: number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return formatDecimal(n, locale, fractionDigits, fractionDigits ?? 3);
}

export function formatMoney(money: MoneyLike, locale: string, opts: { hideCurrency?: boolean } = {}): string {
  if (!money) return "—";
  const n = Number(money.amount);
  const formatted = formatDecimal(n, locale, 2, 2);
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

/** Tarix hissələri həmişə "en-US" ilə rəqəm kimi alınır, yığılması isə dilə görə bizim formatımızdadır. */
function parts(date: Date, _locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, numberingSystem: "latn", ...options }).formatToParts(date);
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

// Həftə günü və ay adları da sabit cədvəldəndir (ICU datasından asılı olmasın)
const weekdayNames: Record<AppLocale, { short: string[]; long: string[] }> = {
  az: { short: ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."], long: ["bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə"] },
  ru: { short: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"], long: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"] },
  en: { short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
};
const monthNames: Record<AppLocale, string[]> = {
  az: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  ru: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function formatWeekday(iso: string, locale = "az", style: "short" | "long" = "short"): string {
  const day = pick(parts(new Date(iso), "en", { weekday: "short" }), "weekday");
  return weekdayNames[loc(locale)][style][weekdayIndex[day] ?? 0]!;
}

export function formatMonth(iso: string, locale = "az"): string {
  const p = parts(new Date(iso), "en", { month: "numeric", year: "numeric" });
  const name = monthNames[loc(locale)][Number(pick(p, "month")) - 1] ?? "";
  return `${name} ${pick(p, "year")}`;
}

export function formatRelative(iso: string | null | undefined, locale = "az", now: Date = new Date()): string {
  if (!iso) return "—";
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  // Brauzerlərin Intl.RelativeTimeFormat məlumatında "az" yoxdur ("-21 h" çıxırdı) — sabit cədvəl istifadə olunur
  const w = RELATIVE[(locale as AppLocale) in RELATIVE ? (locale as AppLocale) : "az"];
  const past = diffSec < 0;
  if (abs < 60) return w.now;
  const [n, unit] = abs < 3600 ? [Math.round(abs / 60), w.min] : abs < 86400 ? [Math.round(abs / 3600), w.hour] : [Math.round(abs / 86400), w.day];
  if (abs >= 86400 && n === 1) return past ? w.yesterday : w.tomorrow;
  if (abs >= 86400 * 30) return formatDate(iso, locale);
  return (past ? w.ago : w.in).replace("{n}", String(n)).replace("{u}", unit);
}

const RELATIVE: Record<AppLocale, { now: string; min: string; hour: string; day: string; ago: string; in: string; yesterday: string; tomorrow: string }> = {
  az: { now: "indicə", min: "dəq", hour: "saat", day: "gün", ago: "{n} {u} əvvəl", in: "{n} {u} sonra", yesterday: "dünən", tomorrow: "sabah" },
  ru: { now: "только что", min: "мин", hour: "ч", day: "дн.", ago: "{n} {u} назад", in: "через {n} {u}", yesterday: "вчера", tomorrow: "завтра" },
  en: { now: "just now", min: "min", hour: "h", day: "d", ago: "{n} {u} ago", in: "in {n} {u}", yesterday: "yesterday", tomorrow: "tomorrow" },
};

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
