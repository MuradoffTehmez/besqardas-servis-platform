import { HttpResponse } from "msw";
import type { Role } from "@sp/types";
import * as S from "@sp/schemas";
import { maskEmail, maskPhone, normalizeAzPhone } from "@sp/utils";
import { db } from "../db/state";
import { reset } from "../seed";
import { buildCtx, fullName, INTERNAL, type Ctx } from "../engine/context";
import { route, json, parse, requireAuth, setCookie, validationError, localize } from "../lib/http";
import { apiError } from "../lib/errors";
import { idFor, newId } from "../lib/rng";
import { daysFromNow, nowIso } from "../lib/time";
import { DEMO_OTP, type UserRec } from "../data/people";
import { mergeGuestCart, cartItemCount } from "./cartShared";
import { audit } from "../engine/effects";

/** Autentifikasiya (PRD §9): e-poçt + şifrə, telefon + OTP, 2FA, rejim seçimi, qeydiyyat axınları. */

const SESSION_TTL = 60 * 60 * 8;

export function redirectFor(role: Role): string {
  switch (role) {
    case "CUSTOMER":
      return "/account";
    case "CORPORATE_CUSTOMER":
      return "/corporate";
    case "PARTNER":
      return "/partner";
    case "WHOLESALE_CUSTOMER":
      return "/wholesale";
    case "TECHNICIAN":
      return "/technician/dashboard";
    case "COURIER":
      return "/courier";
    default:
      return INTERNAL.includes(role) ? "ADMIN_APP" : "/";
  }
}

export function sessionDto(ctx: Ctx) {
  const user = ctx.user;
  const cart = user ? db.carts.find((c) => c.ownerKey === user.id) : ctx.guestKey ? db.carts.find((c) => c.ownerKey === ctx.guestKey) : null;
  return {
    authenticated: !!user,
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: fullName(user),
          email: user.email,
          phone: user.phone,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          avatarUrl: user.avatarUrl ?? null,
          avatarTone: user.avatarTone,
          locale: user.locale,
          roles: user.roles,
          activeRole: ctx.role,
          segment: user.segment,
          employmentType: ctx.technician?.employmentType ?? user.employmentType,
          branchId: user.branchId,
          branchName: user.branchId ? db.branches.find((b) => b.id === user.branchId)?.name ?? null : null,
          companyId: user.companyId,
          companyName: ctx.company?.legalName ?? null,
          companyRole: user.companyRole,
          twoFactorEnabled: user.twoFactorEnabled,
        }
      : null,
    permissions: ctx.permissions,
    scopes: ctx.scopes,
    entitlements: ctx.entitlements,
    plan: ctx.plan ? { code: ctx.plan.code, name: ctx.plan.name, tier: ctx.plan.tier } : null,
    tenant: { id: db.branding.tenantId, name: db.branding.companyName },
    cartCount: cart ? cartItemCount(cart) : 0,
    unreadNotifications: user ? db.notifications.filter((n) => n.userId === user.id && !n.read).length : 0,
    addresses: user ? db.addresses.filter((a) => a.ownerId === (ctx.role === "CORPORATE_CUSTOMER" ? user.companyId : user.id)).map((a) => ({ ...a })) : [],
    redirectTo: user ? redirectFor(ctx.role) : null,
  };
}

function startSession(user: UserRec, request: Request, role?: Role) {
  const sid = newId("sid");
  const needs2fa = user.twoFactorEnabled && user.roles.some((r) => INTERNAL.includes(r));
  const activeRole = role ?? user.roles[0]!;
  db.sessions.set(sid, { sid, userId: user.id, activeRole, createdAt: nowIso(), pendingTwoFactor: needs2fa });
  const headers: [string, string][] = [["Set-Cookie", setCookie("sid", sid, SESSION_TTL)]];
  if (needs2fa) {
    return { status: "TWO_FACTOR_REQUIRED" as const, challengeId: sid, maskedTarget: user.phone ? maskPhone(user.phone) : maskEmail(user.email), headers };
  }
  user.lastLoginAt = nowIso();
  const cookieHeader = `sid=${sid}; ${request.headers.get("cookie") ?? ""}`;
  const guest = buildCtx(new Request(request.url, { headers: { cookie: cookieHeader, "accept-language": request.headers.get("accept-language") ?? "az" } }));
  if (guest.guestKey) {
    mergeGuestCart(guest.guestKey, user.id);
    headers.push(["Set-Cookie", setCookie("cid", "", 0)]);
  }
  const ctx = buildCtx(new Request(request.url, { headers: { cookie: `sid=${sid}`, "accept-language": request.headers.get("accept-language") ?? "az" } }));
  const loginRoles = user.roles.filter((r) => r !== "GUEST");
  if (!role && loginRoles.length > 1) return { status: "SELECT_MODE" as const, session: sessionDto(ctx), roles: loginRoles, headers };
  return { status: "OK" as const, session: sessionDto(ctx), redirectTo: redirectFor(activeRole), headers };
}

function respond(result: ReturnType<typeof startSession>, ctx: Ctx) {
  const { headers, ...body } = result;
  const h = new Headers();
  for (const [k, v] of headers) h.append(k, v);
  h.set("content-type", "application/json");
  return new HttpResponse(JSON.stringify(localize(body, ctx.locale)), { status: 200, headers: h });
}

function findByPhone(phone: string) {
  const n = normalizeAzPhone(phone);
  return db.users.find((u) => u.phone && normalizeAzPhone(u.phone) === n);
}

export const authHandlers = [
  route.get("/auth/session", ({ ctx }) => sessionDto(ctx)),

  route.post("/auth/login", async ({ body, request, ctx }) => {
    const data = parse(S.LoginEmailRequest, await body());
    const user = db.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user || user.password !== data.password) throw apiError(401, "INVALID_CREDENTIALS", "error.invalidCredentials");
    if (user.status === "BLOCKED") throw apiError(403, "BLOCKED", "error.forbidden");
    return respond(startSession(user, request), ctx);
  }),

  route.post("/auth/otp/request", async ({ body }) => {
    const data = parse(S.OtpRequest, await body());
    const user = findByPhone(data.phone);
    if (data.purpose === "LOGIN" && !user) throw apiError(404, "USER_NOT_FOUND", "error.userNotFound", { phone: ["validation.userNotFound"] });
    if (data.purpose === "REGISTER" && user) throw apiError(409, "ALREADY_EXISTS", "error.alreadyExists", { phone: ["validation.alreadyExists"] });
    const id = newId("otp");
    db.otpChallenges.set(id, { id, userId: user?.id ?? null, target: normalizeAzPhone(data.phone), purpose: data.purpose, createdAt: nowIso() });
    return { challengeId: id, maskedTarget: maskPhone(data.phone), expiresInSeconds: 120, resendInSeconds: 30, devCode: DEMO_OTP };
  }),

  route.post("/auth/otp/verify", async ({ body, request, ctx }) => {
    const raw = await body<{ phone: string; code: string; challengeId?: string }>();
    const data = parse(S.OtpVerifyRequest, raw);
    if (data.code !== DEMO_OTP) throw apiError(422, "INVALID_OTP", "error.invalidOtp", { code: ["validation.otpInvalid"] });
    const challenge = raw.challengeId ? db.otpChallenges.get(raw.challengeId) : undefined;
    if (challenge?.purpose === "REGISTER" && challenge.payload) {
      const p = challenge.payload as { firstName: string; lastName: string; locale: "az" | "ru" | "en"; marketingConsent: boolean };
      const user = createCustomer({ firstName: p.firstName, lastName: p.lastName, phone: challenge.target, email: null, password: "", locale: p.locale, marketingConsent: p.marketingConsent });
      user.phoneVerified = true;
      db.otpChallenges.delete(challenge.id);
      return respond(startSession(user, request), ctx);
    }
    const user = findByPhone(data.phone);
    if (!user) throw apiError(404, "USER_NOT_FOUND", "error.userNotFound", { phone: ["validation.userNotFound"] });
    user.phoneVerified = true;
    return respond(startSession(user, request), ctx);
  }),

  route.post("/auth/2fa", async ({ body, request, ctx }) => {
    const data = parse(S.TwoFactorRequest, await body());
    const session = db.sessions.get(data.challengeId);
    if (!session) throw apiError(401, "UNAUTHORIZED", "error.unauthorized");
    if (data.code !== DEMO_OTP) throw apiError(422, "INVALID_OTP", "error.invalidOtp", { code: ["validation.otpInvalid"] });
    session.pendingTwoFactor = false;
    const user = db.users.find((u) => u.id === session.userId)!;
    user.lastLoginAt = nowIso();
    const c = buildCtx(new Request(request.url, { headers: { cookie: `sid=${session.sid}`, "accept-language": request.headers.get("accept-language") ?? "az" } }));
    audit(c, "login", "users", user.id, fullName(user));
    const roles = user.roles;
    const body2 = roles.length > 1 ? { status: "SELECT_MODE", session: sessionDto(c), roles } : { status: "OK", session: sessionDto(c), redirectTo: redirectFor(session.activeRole) };
    return json(body2, ctx.locale);
  }),

  route.post("/auth/select-mode", async ({ body, ctx, request }) => {
    const user = requireAuth(ctx);
    const { role } = await body<{ role: Role }>();
    if (!user.roles.includes(role)) throw apiError(403, "FORBIDDEN", "error.forbidden");
    ctx.session!.activeRole = role;
    const c = buildCtx(request);
    return { status: "OK", session: sessionDto(c), redirectTo: redirectFor(role) };
  }),

  route.post("/auth/logout", ({ ctx }) => {
    if (ctx.session) db.sessions.delete(ctx.session.sid);
    return new HttpResponse(null, { status: 204, headers: { "Set-Cookie": setCookie("sid", "", 0) } });
  }),

  route.post("/auth/register", async ({ body, request, ctx }) => {
    const data = parse(S.RegisterCustomerRequest, await body());
    if (data.method === "EMAIL") {
      if (db.users.some((u) => u.email?.toLowerCase() === data.email!.toLowerCase())) throw validationError({ email: ["validation.alreadyExists"] });
      const user = createCustomer({ firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, email: data.email!, password: data.password!, locale: data.locale, marketingConsent: data.marketingConsent });
      const result = startSession(user, request);
      if (result.status === "OK") result.redirectTo = "/verify?type=email";
      return respond(result, ctx);
    }
    if (findByPhone(data.phone!)) throw validationError({ phone: ["validation.alreadyExists"] });
    const id = newId("otp");
    db.otpChallenges.set(id, { id, userId: null, target: normalizeAzPhone(data.phone!), purpose: "REGISTER", createdAt: nowIso(), payload: { firstName: data.firstName, lastName: data.lastName, locale: data.locale, marketingConsent: data.marketingConsent } });
    return { status: "OTP_SENT", challengeId: id, maskedTarget: maskPhone(data.phone!), devCode: DEMO_OTP };
  }),

  route.post("/auth/forgot-password", async ({ body }) => {
    parse(S.ForgotPasswordRequest, await body());
    return { sent: true, devResetLink: "/reset-password?token=demo-reset-token" };
  }),

  route.post("/auth/reset-password", async ({ body }) => {
    const data = parse(S.ResetPasswordRequest, await body());
    if (!data.token.startsWith("demo")) throw apiError(422, "INVALID_TOKEN", "error.invalidOtp", { token: ["validation.tokenInvalid"] });
    return { ok: true };
  }),

  route.post("/auth/verify", async ({ body, ctx }) => {
    const user = requireAuth(ctx);
    const { type, code } = await body<{ type: "email" | "phone"; code: string }>();
    if (code !== DEMO_OTP) throw apiError(422, "INVALID_OTP", "error.invalidOtp", { code: ["validation.otpInvalid"] });
    if (type === "email") user.emailVerified = true;
    else user.phoneVerified = true;
    return sessionDto(ctx);
  }),

  route.post("/auth/verify/resend", ({ ctx }) => {
    requireAuth(ctx);
    return { sent: true, devCode: DEMO_OTP };
  }),

  route.post("/auth/technician-application", async ({ body }) => {
    const data = parse(S.TechnicianApplicationRequest, await body());
    if (findByPhone(data.phone) || db.users.some((u) => u.email === data.email)) throw validationError({ phone: ["validation.alreadyExists"] });
    const userId = newId("user");
    const plan = db.plans.find((p) => p.id === data.planId && p.group === "TECHNICIAN");
    if (!plan) throw validationError({ planId: ["validation.required"] });
    db.users.push({ id: userId, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: normalizeAzPhone(data.phone), password: "Demo1234!", roles: ["TECHNICIAN"], locale: "az", segment: null, employmentType: "INDEPENDENT", branchId: null, companyId: null, companyRole: null, twoFactorEnabled: false, emailVerified: false, phoneVerified: true, planId: plan.id, status: "PENDING_VERIFICATION", createdAt: nowIso(), lastLoginAt: null, avatarTone: "stone", favorites: [], compare: [], marketingConsent: false, birthDate: null, city: data.city });
    db.technicians.push({
      id: userId, userId, bio: { az: "", ru: "", en: "" }, city: data.city, branchId: null, zoneIds: data.zoneIds, employmentType: "INDEPENDENT", status: "PENDING_VERIFICATION",
      specializations: data.specializationIds.map((sid) => ({ id: newId("tspec"), specializationId: sid, level: "INTERMEDIATE" as const, status: "PENDING_APPROVAL" as const, certificateExpiresAt: null })),
      skillIds: data.skillIds, licenseStatus: null,
      documents: data.documents.map((d) => ({ id: newId("doc"), kind: (d.kind as "ID_CARD") ?? "OTHER", name: d.name, status: "PENDING" as const, expiresAt: null, uploadedAt: nowIso(), note: null })),
      workingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, from: data.workFrom, to: data.workTo, off: !data.workDays.includes(day) })),
      rating: 0, reviewCount: 0, completedJobs: 0, promoted: false, location: { lat: 40.4, lng: 49.86 }, experienceYears: 0, languages: ["az"], joinedAt: nowIso(), warrantyClaimRate: 0, onTimeRate: 0, cashCents: 0,
    });
    const price = plan.prices.find((p) => p.period === data.billingPeriod) ?? plan.prices[0]!;
    db.subscriptions.push({ id: newId("sub"), subscriberId: userId, subscriberType: "TECHNICIAN", planId: plan.id, status: plan.trialDays ? "TRIAL" : "ACTIVE", period: price.period as "MONTH_1", priceCents: Math.round(Number(price.price.amount) * 100), startedAt: nowIso(), currentPeriodEnd: daysFromNow(plan.trialDays ?? 30), autoRenew: true, pendingPlanId: null, cancelAtPeriodEnd: false, graceUntil: null });
    db.technicianApplications.push({ id: newId("app"), userId, createdAt: nowIso() });
    db.partnerships.push({ id: newId("ps"), technicianId: userId, companyName: db.branding.legalName, status: "PENDING", initiatedBy: "TECHNICIAN", zones: data.zoneIds.map((z) => db.zones.find((x) => x.id === z)?.name.az ?? ""), priceListName: "Usta qiymətləri", createdAt: nowIso() });
    return { applicationId: userId, status: "PENDING_VERIFICATION" };
  }),

  route.post("/auth/b2b-application", async ({ body }) => {
    const data = parse(S.B2BApplicationRequest, await body());
    if (db.b2bAccounts.some((a) => a.voen === data.voen)) throw validationError({ voen: ["validation.alreadyExists"] });
    const id = newId("company");
    db.b2bAccounts.push({ id, legalName: data.companyName, voen: data.voen, segment: data.segment, status: "PENDING_REVIEW", legalAddress: data.legalAddress, actualAddress: data.legalAddress, bankDetails: { bank: "", iban: "", swift: "" }, contract: null, accountManager: "—", priceType: data.segment, discountPercent: 0, paymentTerms: "PREPAID", deferredDays: 0, creditLimitCents: 0, debtCents: 0, addressLimit: null, userLimit: null, planId: null, partnerTypeId: null, commissionEnabled: false, eInvoiceRequired: true, contactName: data.contactName, contactPhone: data.contactPhone, contactEmail: data.contactEmail, createdAt: nowIso(), minOrderCents: 0 });
    db.b2bApplications.push({ id, payload: data as unknown as Record<string, unknown>, createdAt: nowIso() });
    return { applicationId: id, status: "PENDING_REVIEW" };
  }),

  // Demo hesabları (giriş səhifəsində göstərilir)
  route.get("/auth/demo-accounts", () =>
    [
      ["aysel@demo.az", "CUSTOMER", "Aysel Məmmədova — Premium"],
      ["rashad@demo.az", "CUSTOMER", "Rəşad Kərimov — Basic"],
      ["gunel@demo.az", "CUSTOMER", "Günel Əliyeva — Pro"],
      ["elvin@demo.az", "TECHNICIAN", "Elvin Həsənov — müstəqil usta (Pro)"],
      ["kamran@demo.az", "TECHNICIAN", "Kamran Əliyev — STAFF usta"],
      ["nicat@demo.az", "TECHNICIAN", "Nicat Rəhimov — usta + müştəri"],
      ["+994553334455", "COURIER", "Orxan Məmmədli — kuryer (OTP)"],
      ["corporate@demo.az", "CORPORATE_CUSTOMER", "Azər Holding — korporativ"],
      ["partner@demo.az", "PARTNER", "KlimaPro — partner"],
      ["wholesale@demo.az", "WHOLESALE_CUSTOMER", "TexnoTopdan — topdan"],
      ["operator@demo.az", "OPERATOR", "Nərmin Səfərova — operator"],
      ["dispatcher@demo.az", "DISPATCHER", "Rüstəm Bağırov — dispetçer"],
      ["warehouse@demo.az", "WAREHOUSE_EMPLOYEE", "Rauf Nəsirov — anbar"],
      ["sales@demo.az", "SALES_EMPLOYEE", "Kənan Vəliyev — satış"],
      ["accountant@demo.az", "ACCOUNTANT", "Səbinə Axundova — mühasib"],
      ["manager@demo.az", "MANAGER", "Fərid Quliyev — menecer"],
      ["admin@demo.az", "ADMIN", "Admin İstifadəçi"],
      ["superadmin@demo.az", "SUPER_ADMIN", "Tahmaz Muradov — Super Admin"],
    ].map(([login, role, label]) => ({ login, role, label, password: login!.startsWith("+") ? null : "Demo1234!", otp: DEMO_OTP })),
  ),

  // Mock idarəetməsi (§65.3)
  route.get("/_mock/config", () => db.mockConfig, { system: true, raw: true }),
  route.put("/_mock/config", async ({ body }) => {
    const data = await body<Partial<typeof db.mockConfig>>();
    Object.assign(db.mockConfig, data);
    return db.mockConfig;
  }, { system: true, raw: true }),
  route.post("/_mock/reset", () => {
    const cfg = { ...db.mockConfig };
    const sessions = new Map(db.sessions);
    reset();
    db.mockConfig = cfg;
    db.sessions = sessions;
    return { ok: true };
  }, { system: true, raw: true }),
  route.get("/health", () => ({ ok: true, at: nowIso() }), { system: true, raw: true }),
];

export function createCustomer(input: { firstName: string; lastName: string; phone: string | null; email: string | null; password: string; locale: "az" | "ru" | "en"; marketingConsent: boolean }): UserRec {
  const user: UserRec = {
    id: newId("user"),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone ? normalizeAzPhone(input.phone) : null,
    password: input.password,
    roles: ["CUSTOMER"],
    locale: input.locale,
    segment: "RETAIL",
    employmentType: null,
    branchId: null,
    companyId: null,
    companyRole: null,
    twoFactorEnabled: false,
    emailVerified: false,
    phoneVerified: false,
    planId: idFor("plan:CUSTOMER_BASIC"),
    status: "ACTIVE",
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
    avatarTone: "sky",
    favorites: [],
    compare: [],
    marketingConsent: input.marketingConsent,
    birthDate: null,
    city: "Bakı",
  };
  db.users.push(user);
  return user;
}
