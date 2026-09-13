/** Deterministic randomness so the demo data is identical after every reset. */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = 20260913) {
  const next = mulberry32(seed);
  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)]!;
    },
    pickMany<T>(items: readonly T[], count: number): T[] {
      const copy = [...items];
      const out: T[] = [];
      while (out.length < count && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]!);
      return out;
    },
    chance(p: number) {
      return next() < p;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** FNV-1a based deterministic UUID for a stable key, e.g. idFor("user:aysel"). */
export function idFor(key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  const rng = mulberry32(h1 ^ h2);
  const hex = Array.from({ length: 32 }, () => Math.floor(rng() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

let counter = 0;
export function newId(prefix = "rt"): string {
  counter += 1;
  return idFor(`${prefix}:${Date.now()}:${counter}:${Math.random()}`);
}
