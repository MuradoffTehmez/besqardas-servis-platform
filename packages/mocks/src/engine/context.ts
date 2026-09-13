import type { Locale, PriceType, Role } from "@sp/types";
import { db } from "../db/state";
import type { SessionRec } from "../db/types";
import type { UserRec, B2BAccountRec, TechnicianRec } from "../data/people";
import type { PlanRec } from "../data/plans";
import { permissionsFor } from "../data/rbac";
import { localeFromRequest } from "../lib/i18n";

/** Sorğu konteksti: dil, sessiya, aktiv rol, icazələr, plan imkanları və qiymət tipi. */

export interface Ctx {
  locale: Locale;
  session: SessionRec | null;
  user: UserRec | null;
  role: Role;
  permissions: string[];
  scopes: Record<string, string>;
  plan: PlanRec | null;
  entitlements: Record<string, boolean | number | string>;
  priceType: PriceType;
  company: B2BAccountRec | null;
  technician: TechnicianRec | null;
  guestKey: string | null;
}

export const INTERNAL: Role[] = ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN"];
export const MANAGERS: Role[] = ["MANAGER", "ADMIN", "SUPER_ADMIN"];

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") ?? "";
  return Object.fromEntries(
    header
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
      }),
  );
}

export function planForUser(user: UserRec | null, role: Role, company: B2BAccountRec | null): PlanRec | null {
  if (!user) return null;
  if (role === "CORPORATE_CUSTOMER" && company?.planId) return db.plans.find((p) => p.id === company.planId) ?? null;
  if (role === "TECHNICIAN") {
    const tech = db.technicians.find((t) => t.userId === user.id);
    if (tech?.employmentType === "STAFF") return null;
    const sub = db.subscriptions.find((s) => s.subscriberId === user.id && s.subscriberType === "TECHNICIAN" && ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "CANCELLED"].includes(s.status));
    return db.plans.find((p) => p.id === (sub?.planId ?? user.planId)) ?? null;
  }
  if (role === "CUSTOMER") {
    const sub = db.subscriptions.find((s) => s.subscriberId === user.id && s.subscriberType === "CUSTOMER" && ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "CANCELLED"].includes(s.status));
    return db.plans.find((p) => p.id === (sub?.planId ?? user.planId)) ?? db.plans.find((p) => p.code === "CUSTOMER_BASIC") ?? null;
  }
  return null;
}

function priceTypeFor(role: Role): PriceType {
  switch (role) {
    case "TECHNICIAN":
      return "TECHNICIAN";
    case "PARTNER":
      return "PARTNER";
    case "WHOLESALE_CUSTOMER":
      return "WHOLESALE";
    case "CORPORATE_CUSTOMER":
      return "CORPORATE";
    default:
      return "RETAIL";
  }
}

export function buildCtx(request: Request): Ctx {
  const locale = localeFromRequest(request);
  const cookies = parseCookies(request);
  const session = cookies.sid ? db.sessions.get(cookies.sid) ?? null : null;
  const valid = session && !session.pendingTwoFactor ? session : null;
  const user = valid ? db.users.find((u) => u.id === valid.userId) ?? null : null;
  const role: Role = user && valid ? valid.activeRole : "GUEST";
  const { codes, scopes } = user ? permissionsFor(role) : { codes: [], scopes: {} };
  const company = user?.companyId ? db.b2bAccounts.find((c) => c.id === user.companyId) ?? null : null;
  const plan = planForUser(user, role, company);
  const technician = user && role === "TECHNICIAN" ? db.technicians.find((t) => t.userId === user.id) ?? null : null;
  let entitlements: Record<string, boolean | number | string> = { ...(plan?.entitlements ?? {}) };
  if (technician?.employmentType === "STAFF") {
    const lic = db.staffLicenses.find((l) => l.technicianId === technician.id && l.status === "ACTIVE");
    entitlements = {
      staff_license: !!lic,
      max_reservations: lic?.capabilities.materialReservation ? 50 : 0,
      advanced_statistics: !!lic?.capabilities.statistics,
      customer_history: !!lic?.capabilities.customerHistory,
      basic_statistics: true,
      technician_pricing: true,
      max_active_jobs: 12,
      max_monthly_jobs: "UNLIMITED",
    };
  }
  if (company && role !== "CORPORATE_CUSTOMER") {
    entitlements = { ...entitlements, one_time_address: true, max_addresses: company.addressLimit ?? 99 };
  }
  if (role === "CORPORATE_CUSTOMER" && company) {
    entitlements = { ...entitlements, max_addresses: company.addressLimit ?? Number(entitlements.max_sites ?? 20), one_time_address: false };
  }
  return {
    locale,
    session: valid,
    user,
    role,
    permissions: codes,
    scopes,
    plan,
    entitlements,
    priceType: priceTypeFor(role),
    company,
    technician,
    guestKey: cookies.cid ?? null,
  };
}

export function can(ctx: Ctx, permission: string): boolean {
  if (ctx.permissions.includes("*")) return true;
  return ctx.permissions.includes(permission);
}

export function isInternal(ctx: Ctx) {
  return INTERNAL.includes(ctx.role);
}

export function isManager(ctx: Ctx) {
  return MANAGERS.includes(ctx.role);
}

export function fullName(user: { firstName: string; lastName: string } | null | undefined): string {
  return user ? `${user.firstName} ${user.lastName}` : "—";
}

export function userById(id: string | null | undefined) {
  return id ? db.users.find((u) => u.id === id) ?? null : null;
}

export function displayNameById(id: string | null | undefined): string {
  if (!id) return "—";
  const user = userById(id);
  if (user) return fullName(user);
  const company = db.b2bAccounts.find((c) => c.id === id);
  return company?.legalName ?? "—";
}
