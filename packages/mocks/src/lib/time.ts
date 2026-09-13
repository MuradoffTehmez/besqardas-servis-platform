/** Relative time helpers — seed data is anchored to "now" so the demo always looks current. */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

let virtualNow: number | null = null;

/** Seed zamanı hadisələrin keçmiş tarixlərlə yazılması üçün virtual saat. */
export function atTime<T>(iso: string, fn: () => T): T {
  const prev = virtualNow;
  virtualNow = new Date(iso).getTime();
  try {
    return fn();
  } finally {
    virtualNow = prev;
  }
}

export const nowIso = () => new Date(virtualNow ?? Date.now()).toISOString();
export const hoursFromNow = (h: number) => new Date(Date.now() + h * HOUR).toISOString();
export const daysFromNow = (d: number) => new Date(Date.now() + d * DAY).toISOString();
export const daysAgo = (d: number) => daysFromNow(-d);
export const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

/** Baku is UTC+4 all year. Returns an ISO string for the given Baku-local day offset and hour. */
export function bakuAt(dayOffset: number, hour: number, minute = 0): string {
  const now = new Date();
  const bakuNow = new Date(now.getTime() + 4 * HOUR);
  const y = bakuNow.getUTCFullYear();
  const m = bakuNow.getUTCMonth();
  const d = bakuNow.getUTCDate() + dayOffset;
  return new Date(Date.UTC(y, m, d, hour - 4, minute)).toISOString();
}

export function bakuHour(iso: string): number {
  return (new Date(iso).getUTCHours() + 4) % 24;
}

export function bakuDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 4 * HOUR);
  return d.toISOString().slice(0, 10);
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function isPast(iso: string | null | undefined): boolean {
  return !!iso && new Date(iso).getTime() < Date.now();
}

export function periodLabel(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
