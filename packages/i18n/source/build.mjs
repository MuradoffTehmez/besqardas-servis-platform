// Tərcümə mənbəyi: hər açar üçün [az, ru, en] bir yerdədir; bu skript messages/<locale>/<ns>.json fayllarını yaradır.
import { writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const locales = ["az", "ru", "en"];

function split(node, index) {
  if (Array.isArray(node)) return node[index] ?? node[0];
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, split(v, index)]));
}

for (const file of readdirSync(here).filter((f) => f.endsWith(".mjs") && f !== "build.mjs")) {
  const ns = file.replace(/\.mjs$/, "");
  const { default: tree } = await import(pathToFileURL(join(here, file)).href);
  locales.forEach((locale, i) => {
    writeFileSync(join(here, "..", "messages", locale, `${ns}.json`), JSON.stringify(split(tree, i), null, 2) + "\n");
  });
  console.log(`✓ ${ns}`);
}
