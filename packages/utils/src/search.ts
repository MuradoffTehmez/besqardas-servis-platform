/**
 * Axtarış mətninin normallaşdırılması (PRD §29):
 * - ə/e, ı/i, ö/o, ü/u, ş/sh, ç/ch, ğ/gh
 * - kirill ↔ latın transliterasiyası
 * - AZ / RU / EN sinonimləri
 * - yazı səhvlərinə tolerantlıq
 * - model kodlarında boşluq və defisə həssas olmamaq (X-123 = X123)
 *
 * Production-da bu məntiq axtarış mühərrikində olacaq; burada mock API üçün işləyir.
 */

const AZ_MAP: Record<string, string> = {
  ə: "e",
  ı: "i",
  i̇: "i",
  ö: "o",
  ü: "u",
  ş: "sh",
  ç: "ch",
  ğ: "gh",
};

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "gh", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", ө: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "kh", һ: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ә: "e", ҹ: "j",
};

/** Çoxdilli sinonimlərin kanonik formaları. Açarlar artıq normallaşdırılıb. */
const SYNONYMS: Record<string, string> = {
  kondisioner: "kondisioner",
  konditsioner: "kondisioner",
  kondicioner: "kondisioner",
  konditsionery: "kondisioner",
  "air conditioner": "kondisioner",
  aircon: "kondisioner",
  "air-conditioner": "kondisioner",
  kombi: "kombi",
  boiler: "kombi",
  kotel: "kombi",
  kompressor: "kompressor",
  compressor: "kompressor",
  nasos: "nasos",
  pump: "nasos",
  boru: "boru",
  pipe: "boru",
  truba: "boru",
  filtr: "filtr",
  filter: "filtr",
  hovuz: "hovuz",
  pool: "hovuz",
  basseyn: "hovuz",
  radiator: "radiator",
  qaz: "qaz",
  gas: "qaz",
  gaz: "qaz",
  temir: "temir",
  repair: "temir",
  remont: "temir",
  qurashdirma: "qurashdirma",
  installation: "qurashdirma",
  ustanovka: "qurashdirma",
  diaqnostika: "diaqnostika",
  diagnostics: "diaqnostika",
  diagnostika: "diaqnostika",
  usta: "usta",
  technician: "usta",
  master: "usta",
};

export function transliterateCyrillic(input: string): string {
  let out = "";
  for (const ch of input) out += CYRILLIC_MAP[ch] ?? ch;
  return out;
}

export function normalizeSearchText(input: string): string {
  let s = input.toLocaleLowerCase("az");
  s = transliterateCyrillic(s);
  let out = "";
  for (const ch of s) out += AZ_MAP[ch] ?? ch;
  // qalan diakritik işarələri silirik
  out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // durğu işarələrini boşluğa çeviririk
  out = out.replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  return out;
}

/** Model kodu açarı: "LG X-123" → "lgx123" */
export function compactKey(input: string): string {
  return normalizeSearchText(input).replace(/[\s-]+/g, "");
}

export function canonicalToken(token: string): string {
  return SYNONYMS[token] ?? token;
}

export function tokenize(input: string): string[] {
  const normalized = normalizeSearchText(input);
  // əvvəlcə çoxsözlü sinonimlər
  let replaced = normalized;
  for (const key of Object.keys(SYNONYMS)) {
    if (key.includes(" ") && replaced.includes(key)) replaced = replaced.replaceAll(key, SYNONYMS[key]!);
  }
  return replaced
    .split(/\s+/)
    .filter(Boolean)
    .map(canonicalToken);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length]!;
}

/**
 * `query`-nin `haystack`-ə nə qədər uyğun olduğunu qiymətləndirir (0 — uyğun deyil).
 * Hər sorğu tokeni ən azı bir tokenə uyğun gəlməlidir (prefiks, kompakt və ya qeyri-dəqiq).
 */
export function searchScore(query: string, haystack: string): number {
  const qTokens = tokenize(query);
  if (!qTokens.length) return 0;
  const hTokens = tokenize(haystack);
  const hCompact = compactKey(haystack);
  let score = 0;
  for (const q of qTokens) {
    let best = 0;
    for (const h of hTokens) {
      if (h === q) best = Math.max(best, 10);
      else if (h.startsWith(q)) best = Math.max(best, 7);
      else if (q.length >= 4 && levenshtein(h.slice(0, q.length + 1), q) <= 1) best = Math.max(best, 4);
      else if (q.length >= 6 && levenshtein(h, q) <= 2) best = Math.max(best, 3);
    }
    if (!best && q.length >= 2 && hCompact.includes(q.replace(/-/g, ""))) best = 6;
    if (!best) return 0;
    score += best;
  }
  // bütöv kompakt sorğu kompakt mətndə (model kodları)
  if (hCompact.includes(compactKey(query))) score += 5;
  return score;
}
