import type { HttpHandler } from "msw";
import type { Ctx } from "../engine/context";
import { audit } from "../engine/effects";
import { newId } from "./rng";
import { list, notFound, requirePerm, route, validationError } from "./http";

/**
 * Admin konfiqurasiya resursları üçün generic CRUD (PRD §61). İcazələr `resurs:əməliyyat` formatındadır,
 * bütün dəyişikliklər audit log-a yazılır. `*I18n` sahələri müvafiq LocalizedText sahəsinə yazılır.
 */

export interface CrudOptions<T extends { id: string }> {
  perm: string;
  get: () => T[];
  set: (items: T[]) => void;
  toDto?: (rec: T, ctx: Ctx) => unknown;
  search?: (rec: T) => string;
  defaultSort?: string;
  label?: (rec: T) => string;
  create?: (body: Record<string, unknown>, ctx: Ctx) => T;
  validate?: (body: Record<string, unknown>, rec: T | null) => Record<string, string[]> | null;
  beforeDelete?: (rec: T) => void;
  readOnly?: boolean;
  dateField?: string;
  filter?: (rec: T, ctx: Ctx) => boolean;
}

export function applyPatch<T extends object>(rec: T, body: Record<string, unknown>) {
  const changes: { field: string; from: string | null; to: string | null }[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key === "id") continue;
    const target = key.endsWith("I18n") ? key.slice(0, -4) : key;
    if (!(target in rec)) continue;
    const before = (rec as Record<string, unknown>)[target];
    if (JSON.stringify(before) === JSON.stringify(value)) continue;
    changes.push({ field: target, from: before === undefined ? null : typeof before === "object" ? JSON.stringify(before) : String(before), to: typeof value === "object" ? JSON.stringify(value) : String(value) });
    (rec as Record<string, unknown>)[target] = value;
  }
  return changes;
}

export function crud<T extends { id: string }>(path: string, o: CrudOptions<T>): HttpHandler[] {
  const dto = (r: T, ctx: Ctx) => {
    const base = (o.toDto ? o.toDto(r, ctx) : { ...r }) as Record<string, unknown>;
    // redaktə formaları üçün xam LocalizedText dəyərləri
    for (const [k, v] of Object.entries(r)) if (v && typeof v === "object" && "az" in (v as object) && !(`${k}I18n` in base)) base[`${k}I18n`] = v;
    return base;
  };
  const label = (r: T) => (o.label ? o.label(r) : String((r as Record<string, unknown>).code ?? (r as Record<string, unknown>).number ?? r.id));
  const handlers: HttpHandler[] = [
    route.get(path, ({ ctx, url }) => {
      requirePerm(ctx, `${o.perm}:view`);
      const rows = o.get().filter((r) => !o.filter || o.filter(r, ctx)).map((r) => dto(r, ctx));
      return list(url, rows as T[], { search: o.search ? (x) => o.search!(x) : (x) => JSON.stringify(x), defaultSort: o.defaultSort, dateField: o.dateField, defaultPageSize: 25 });
    }),
    route.get(`${path}/:id`, ({ ctx, params }) => {
      requirePerm(ctx, `${o.perm}:view`);
      const rec = o.get().find((r) => r.id === params.id);
      if (!rec) notFound();
      return dto(rec, ctx);
    }),
  ];
  if (o.readOnly) return handlers;
  handlers.push(
    route.post(path, async ({ ctx, body }) => {
      requirePerm(ctx, `${o.perm}:create`, `${o.perm}:edit`);
      const data = await body();
      const errors = o.validate?.(data, null);
      if (errors) throw validationError(errors);
      const rec = o.create ? o.create(normalizeI18n(data), ctx) : ({ id: newId(path), ...normalizeI18n(data) } as unknown as T);
      o.set([rec, ...o.get()]);
      audit(ctx, "create", o.perm, rec.id, label(rec));
      return dto(rec, ctx);
    }),
    route.patch(`${path}/:id`, async ({ ctx, params, body }) => {
      requirePerm(ctx, `${o.perm}:edit`);
      const rec = o.get().find((r) => r.id === params.id);
      if (!rec) notFound();
      const data = await body();
      const errors = o.validate?.(data, rec);
      if (errors) throw validationError(errors);
      const changes = applyPatch(rec, data);
      if (changes.length) audit(ctx, "edit", o.perm, rec.id, label(rec), changes);
      return dto(rec, ctx);
    }),
    route.delete(`${path}/:id`, ({ ctx, params }) => {
      requirePerm(ctx, `${o.perm}:delete`);
      const rec = o.get().find((r) => r.id === params.id);
      if (!rec) notFound();
      o.beforeDelete?.(rec);
      o.set(o.get().filter((r) => r !== rec));
      audit(ctx, "delete", o.perm, rec.id, label(rec));
      return undefined;
    }),
  );
  return handlers;
}

export function normalizeI18n(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) out[k.endsWith("I18n") ? k.slice(0, -4) : k] = v;
  return out;
}

export function required(body: Record<string, unknown>, ...fields: string[]) {
  const errors: Record<string, string[]> = {};
  for (const f of fields) {
    const v = body[f];
    const empty = v === undefined || v === null || v === "" || (typeof v === "object" && "az" in (v as object) && !(v as { az: string }).az);
    if (empty) errors[f] = ["validation.required"];
  }
  return Object.keys(errors).length ? errors : null;
}
