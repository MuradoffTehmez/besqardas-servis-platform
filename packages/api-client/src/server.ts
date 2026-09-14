/**
 * Server tərəfində (SSR, metadata, sitemap) API sorğuları. Brauzerdəki `apiFetch`-dən fərqli olaraq
 * mütləq ünvan istifadə olunur, istifadəçinin cookie-si ötürülür və sorğu vaxt limiti ilə kəsilir —
 * API cavab verməsə səhifə yenə render olunur, data brauzerdə yüklənir (PRD §65.4).
 */
export { qs } from "./qs";

export const API_BASE = (process.env.MOCK_API_URL ?? process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");

export interface ServerFetchOptions {
  locale: string;
  cookie?: string;
  timeoutMs?: number;
}

/** Uğurlu cavabda JSON, 404-də `null`, digər hallarda `undefined` qaytarır. */
export async function serverGet<T = any>(path: string, opts: ServerFetchOptions): Promise<T | null | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      headers: { Accept: "application/json", "Accept-Language": opts.locale, ...(opts.cookie ? { Cookie: opts.cookie } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}
