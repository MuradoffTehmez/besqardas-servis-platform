// UI kodunda istifadə olunan tərcümə açarlarını yoxlayır: t("a.b"), titleKey: "a.b", t(`a.${x}`) (dinamik — yalnız prefiks).
// İstifadə: node scripts/check-i18n.mjs [--dynamic]
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : []; });
const files = walk(join(root, "packages/ui/src/app"));

const load = (locale) => {
  const dir = join(root, "packages/i18n/messages");
  const parts = [JSON.parse(readFileSync(join(dir, `${locale}.json`), "utf8")), ...["app", "enum", "panel", "admin"].map((ns) => JSON.parse(readFileSync(join(dir, locale, `${ns}.json`), "utf8")))];
  const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === "object" && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v; return o; };
  return parts.reduce(merge, {});
};
const has = (msgs, key) => { if (typeof msgs[key] === "string") return true; let cur = msgs; for (const p of key.split(".")) { if (!cur || typeof cur !== "object") return false; cur = cur[p]; } return typeof cur === "string"; };
const hasPrefix = (msgs, prefix) => { let cur = msgs; for (const p of prefix.split(".").filter(Boolean)) { if (!cur || typeof cur !== "object") return false; cur = cur[p]; } return !!cur && typeof cur === "object"; };

const az = load("az");
const missing = new Map();
const dynamic = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const rel = f.slice(root.length + 1);
  for (const m of src.matchAll(/(?<![\w.])(?:t|has)\(\s*"([a-zA-Z0-9_.-]+)"/g)) if (!has(az, m[1])) missing.set(m[1], rel);
  for (const m of src.matchAll(/(?:titleKey|labelKey|doneKey|title)\s*[:=]\s*"([a-z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+)"/g)) if (!has(az, m[1])) missing.set(m[1], rel);
  for (const m of src.matchAll(/(?<![\w.])t\(\s*`([a-zA-Z0-9_.-]+)\.\$\{/g)) if (!hasPrefix(az, m[1])) dynamic.set(m[1], rel);
  // Qısa köməkçilər: const f = (k) => t(`adm.f.${k}`) → f("name")
  for (const def of src.matchAll(/const (\w+) = \(k: string\) => t\(`([a-zA-Z0-9_.]+)\.\$\{k\}`\)/g)) {
    for (const m of src.matchAll(new RegExp(`(?<![\\w.])${def[1]}\\(\\s*"([a-zA-Z0-9_]+)"`, "g"))) if (!has(az, `${def[2]}.${m[1]}`)) missing.set(`${def[2]}.${m[1]}`, rel);
  }
}
for (const [k, f] of [...missing].sort()) console.log(`MISSING ${k}  (${f})`);
for (const [k, f] of [...dynamic].sort()) console.log(`PREFIX  ${k}.*  (${f})`);
console.log(`\n${missing.size} açar, ${dynamic.size} dinamik prefiks tapılmadı.`);
process.exitCode = missing.size || dynamic.size ? 1 : 0;
