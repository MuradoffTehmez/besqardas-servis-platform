import { http, HttpResponse, type HttpHandler } from "msw";
import type { Locale } from "@sp/types";
import { searchScore } from "@sp/utils";
import { db } from "../db/state";
import { ensureSeeded } from "../seed";
import { buildCtx, can, type Ctx } from "../engine/context";
import { ApiErrorException, apiError } from "./errors";
import { t } from "./i18n";
import { expireReservations } from "../engine/stock";

/** HTTP qatı: MSW handler yaradılması, xəta formatı, lokallaşdırma, siyahı parametrləri (PRD §65.2–65.3). */

export const API = "*/api";

type Params = Record<string, string>;
export interface RouteArgs {
  request: Request;
  params: Params;
  ctx: Ctx;
  url: URL;
  body: <T = Record<string, unknown>>() => Promise<T>;
}

type Handler = (args: RouteArgs) => unknown | Promise<unknown>;

const LOCALIZED_KEYS = new Set(["az", "ru", "en"]);

function isLocalized(value: unknown): value is Record<"az" | "ru" | "en", string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.length <= 3 && keys.includes("az") && keys.every((k) => LOCALIZED_KEYS.has(k)) && keys.every((k) => typeof (value as Record<string, unknown>)[k] === "string");
}

/** LocalizedText obyektlərini istifadəçinin dilinə çevirir; `*I18n` sahələri redaktə üçün xam saxlanılır. */
export function localize(value: unknown, locale: Locale): unknown {
  if (Array.isArray(value)) return value.map((v) => localize(v, locale));
  if (isLocalized(value)) return value[locale] || value.az;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = k.endsWith("I18n") ? v : localize(v, locale);
    return out;
  }
  return value;
}

export function errorResponse(e: unknown, locale: Locale) {
  if (e instanceof ApiErrorException) {
    return HttpResponse.json({ code: e.code, message: t(e.messageKey, locale), fieldErrors: e.fieldErrors }, { status: e.status });
  }
  console.error("[mock] unhandled", e);
  return HttpResponse.json({ code: "INTERNAL", message: t("error.server", locale) }, { status: 500 });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function wrap(handler: Handler, opts: { raw?: boolean; system?: boolean } = {}) {
  return async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    ensureSeeded();
    const ctx = buildCtx(request);
    const url = new URL(request.url);
    const cfg = db.mockConfig;
    if (!opts.system) {
      expireReservations();
      const delay = Number(request.headers.get("x-mock-delay") ?? cfg.delayMs);
      if (delay > 0) await sleep(delay);
      const forced = request.headers.get("x-mock-error") ? Number(request.headers.get("x-mock-error")) : cfg.forceError;
      if (forced) return HttpResponse.json({ code: forced >= 500 ? "INTERNAL" : "MOCK_ERROR", message: t("error.mock", ctx.locale) }, { status: forced });
      if (cfg.errorRate > 0 && request.method === "GET" && Math.random() < cfg.errorRate) {
        return HttpResponse.json({ code: "INTERNAL", message: t("error.mock", ctx.locale) }, { status: 500 });
      }
    }
    let cachedBody: unknown;
    const body = async <T,>() => {
      if (cachedBody === undefined) {
        try {
          cachedBody = await request.clone().json();
        } catch {
          cachedBody = {};
        }
      }
      return cachedBody as T;
    };
    try {
      const result = await handler({ request, params: params as Params, ctx, url, body });
      if (result instanceof Response) return result;
      if (result === undefined) return new HttpResponse(null, { status: 204 });
      return new HttpResponse(JSON.stringify(opts.raw ? result : localize(result, ctx.locale)), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return errorResponse(e, ctx.locale);
    }
  };
}

export const route = {
  get: (path: string, h: Handler, o?: { raw?: boolean; system?: boolean }): HttpHandler => http.get(`${API}${path}`, wrap(h, o)),
  post: (path: string, h: Handler, o?: { raw?: boolean; system?: boolean }): HttpHandler => http.post(`${API}${path}`, wrap(h, o)),
  put: (path: string, h: Handler, o?: { raw?: boolean; system?: boolean }): HttpHandler => http.put(`${API}${path}`, wrap(h, o)),
  patch: (path: string, h: Handler, o?: { raw?: boolean; system?: boolean }): HttpHandler => http.patch(`${API}${path}`, wrap(h, o)),
  delete: (path: string, h: Handler, o?: { raw?: boolean; system?: boolean }): HttpHandler => http.delete(`${API}${path}`, wrap(h, o)),
};

export function requireAuth(ctx: Ctx) {
  if (!ctx.user) throw apiError(401, "UNAUTHORIZED", "error.unauthorized");
  return ctx.user;
}

export function requirePerm(ctx: Ctx, ...permissions: string[]) {
  requireAuth(ctx);
  if (!permissions.some((p) => can(ctx, p))) throw apiError(403, "FORBIDDEN", "error.forbidden");
}

export function requireRole(ctx: Ctx, ...roles: string[]) {
  requireAuth(ctx);
  if (!roles.includes(ctx.role) && ctx.role !== "SUPER_ADMIN") throw apiError(403, "FORBIDDEN", "error.forbidden");
}

export function notFound(): never {
  throw apiError(404, "NOT_FOUND", "error.notFound");
}

export function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((x) => x.id === id);
  if (!item) notFound();
  return item;
}

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function sortValue(v: unknown): string | number {
  if (v && typeof v === "object" && "amount" in (v as object)) return Number((v as { amount: string }).amount);
  if (v && typeof v === "object" && "value" in (v as object)) return Number((v as { value: string }).value);
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return String(v ?? "").toLowerCase();
}

const RESERVED = new Set(["page", "pageSize", "sort", "q", "locale", "from", "to"]);

/**
 * Vahid siyahı cavabı: `?page=&pageSize=&sort=-createdAt&q=&<sahə>=dəyər1,dəyər2&from=&to=`.
 * Mock konfiqurasiyasında "boş siyahılar" aktivdirsə, boş nəticə qaytarılır.
 */
export function list<T>(url: URL, items: T[], opts: { search?: (item: T) => string; dateField?: string; defaultSort?: string; ignoreEmpty?: boolean; defaultPageSize?: number } = {}) {
  const sp = url.searchParams;
  let rows = items;
  const q = sp.get("q")?.trim();
  if (q && opts.search) {
    rows = rows
      .map((item) => ({ item, score: searchScore(q, opts.search!(item)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);
  }
  for (const [key, value] of sp.entries()) {
    if (RESERVED.has(key) || key.startsWith("_") || value === "") continue;
    const values = value.split(",");
    rows = rows.filter((row) => {
      const v = get(row, key);
      if (Array.isArray(v)) return v.some((x) => values.includes(String(x)));
      if (typeof v === "boolean") return values.includes(String(v));
      return v !== undefined && values.includes(String(v));
    });
  }
  const dateField = opts.dateField ?? "createdAt";
  if (sp.get("from")) rows = rows.filter((r) => String(get(r, dateField) ?? "") >= sp.get("from")!);
  if (sp.get("to")) rows = rows.filter((r) => String(get(r, dateField) ?? "") <= sp.get("to")! + "T23:59:59");
  const sort = sp.get("sort") ?? (q ? null : opts.defaultSort ?? null);
  if (sort) {
    const desc = sort.startsWith("-");
    const field = desc ? sort.slice(1) : sort;
    rows = [...rows].sort((a, b) => {
      const av = sortValue(get(a, field));
      const bv = sortValue(get(b, field));
      return (av < bv ? -1 : av > bv ? 1 : 0) * (desc ? -1 : 1);
    });
  }
  if (db.mockConfig.emptyLists && !opts.ignoreEmpty) rows = [];
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(sp.get("pageSize") ?? opts.defaultPageSize ?? 20)));
  const total = rows.length;
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export function setCookie(name: string, value: string, maxAgeSec: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function json(data: unknown, locale: Locale, init?: { status?: number; headers?: Record<string, string> | [string, string][] }) {
  const headers = new Headers(init?.headers as HeadersInit);
  headers.set('Content-Type', 'application/json');
  return new HttpResponse(JSON.stringify(localize(data, locale)), { status: init?.status ?? 200, headers });
}

export function validationError(fieldErrors: Record<string, string[]>) {
  return apiError(422, "VALIDATION", "error.validation", fieldErrors);
}

/** Zod xətalarını `fieldErrors` formatına çevirir. */
export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) {
    const key = i.path.map(String).join(".") || "_";
    (out[key] ||= []).push(i.message);
  }
  return out;
}

export function parse<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw validationError(zodFieldErrors(r.error.issues));
  return r.data;
}
