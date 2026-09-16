import * as S from "@sp/schemas";
import { normalizeAzPhone } from "@sp/utils";
import { db } from "../db/state";
import type { ServiceOrderRec } from "../db/types";
import { can, fullName, isInternal, type Ctx } from "../engine/context";
import { createServiceOrder } from "../engine/orders";
import { applyAction, decideEstimate, latestEstimate, orderAmounts, estimateTotals, isDone } from "../engine/workflow";
import { notify, recordPayment, audit } from "../engine/effects";
import { earnReviewBonus } from "../engine/loyalty";
import { find, list, notFound, parse, requireAuth, route, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { daysFromNow, nowIso } from "../lib/time";
import { checkDataUrl } from "../lib/upload";
import { deviceDto, documentDto, paymentDto, planDto, salesOrderDto, salesOrderSummaryDto, serviceOrderDto, serviceOrderSummaryDto, subscriptionDto, warrantyDto, categoryName, brandName } from "../dto";

/** Müştəri kabineti (PRD §52–55) və servis sifarişlərinin ümumi API-si (§13, §18–19). */

const ACTIVE = ["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ON_HOLD"];

export function visibleOrders(ctx: Ctx): ServiceOrderRec[] {
  const u = requireAuth(ctx);
  switch (ctx.role) {
    case "CUSTOMER":
      return db.serviceOrders.filter((o) => o.customerId === u.id && !o.companyId && !o.partnerCompanyId);
    case "CORPORATE_CUSTOMER":
      return db.serviceOrders.filter((o) => o.companyId === u.companyId && (u.companyRole !== "SITE_MANAGER" || o.customerId === u.id || o.siteId === db.addresses.find((a) => a.label === "Logistika anbarı")?.id));
    case "PARTNER":
      return db.serviceOrders.filter((o) => o.partnerCompanyId === u.companyId);
    case "TECHNICIAN":
      return db.serviceOrders.filter((o) => o.technicianId === u.id || o.stages.some((s) => s.assigneeId === u.id));
    case "COURIER":
    case "WHOLESALE_CUSTOMER":
    case "GUEST":
      return [];
    default:
      if (!can(ctx, "service_orders:view")) return [];
      return ctx.scopes.service_orders === "BRANCH" ? db.serviceOrders.filter((o) => o.branchId === u.branchId) : db.serviceOrders;
  }
}

export function orderForCtx(ctx: Ctx, id: string) {
  const o = visibleOrders(ctx).find((x) => x.id === id || x.number === id);
  if (!o) notFound();
  return o;
}

function ownerId(ctx: Ctx) {
  const u = requireAuth(ctx);
  return ctx.role === "CORPORATE_CUSTOMER" || ctx.role === "PARTNER" || ctx.role === "WHOLESALE_CUSTOMER" ? u.companyId! : u.id;
}

function limit(ctx: Ctx, code: string): number | null {
  const v = ctx.entitlements[code];
  if (v === "UNLIMITED" || v === undefined) return null;
  return Number(v);
}

export const accountHandlers = [
  /* ---------------- Servis sifarişləri ---------------- */
  route.get("/service-orders", ({ ctx, url }) =>
    list(url, visibleOrders(ctx).map((o) => serviceOrderSummaryDto(o, ctx)), { search: (o) => `${o.number} ${o.customerName} ${JSON.stringify(o.serviceName)} ${o.technicianName ?? ""}`, defaultSort: "-createdAt", defaultPageSize: 100 }),
  ),

  route.get("/service-orders/:id", ({ ctx, params }) => serviceOrderDto(orderForCtx(ctx, params.id), ctx)),

  route.post("/service-orders", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const raw = await body<Record<string, unknown>>();
    const data = parse(S.CreateServiceOrderRequest, { contactChannel: "CALL", ...raw });
    const internal = isInternal(ctx);
    const customerId = internal && data.customerId ? data.customerId : u.id;
    const customer = db.users.find((x) => x.id === customerId);
    if (!customer) throw validationError({ customerId: ["validation.required"] });
    const service = find(db.services, data.serviceId);
    if (!service.executionForms.includes(data.executionForm)) throw validationError({ executionForm: ["validation.required"] });

    // Plan limitləri (§42): aktiv sifariş, təcili servis, birdəfəlik ünvan
    if (!internal && ctx.role === "CUSTOMER") {
      const max = limit(ctx, "max_active_orders");
      const active = db.serviceOrders.filter((o) => o.customerId === u.id && ACTIVE.includes(o.status)).length;
      if (max !== null && active >= max) throw apiError(403, "LIMIT_REACHED", "error.limit", { _: ["validation.activeOrderLimit"] });
      if (data.urgent && !ctx.entitlements.urgent_service) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement", { urgent: ["validation.premiumOnly"] });
      if (data.oneTimeAddress && !ctx.entitlements.one_time_address) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement", { oneTimeAddress: ["validation.planOneTimeAddress"] });
    }
    const addressOwner = ctx.role === "CORPORATE_CUSTOMER" ? u.companyId : customerId;
    let address = null;
    if (data.executionForm !== "CARRY_IN") {
      if (data.oneTimeAddress) address = { id: newId("addr"), label: "Birdəfəlik ünvan", city: data.oneTimeAddress.city, street: data.oneTimeAddress.street, building: data.oneTimeAddress.building, apartment: data.oneTimeAddress.apartment, isDefault: false, oneTime: true };
      else if (data.endCustomer && ctx.role === "PARTNER") address = { id: newId("addr"), label: data.endCustomer.name, city: "Bakı", street: data.endCustomer.address, isDefault: false, oneTime: true };
      else {
        const a = db.addresses.find((x) => x.id === data.addressId && x.ownerId === addressOwner);
        if (!a) throw validationError({ addressId: ["validation.required"] });
        address = { ...a };
      }
    }
    if (data.slotStart && new Date(data.slotStart).getTime() <= Date.now()) throw validationError({ slotStart: ["validation.futureDate"] });
    const scheduledAt = data.slotStart ?? (raw.scheduledAt as string | undefined) ?? null;
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) throw validationError({ scheduledAt: ["validation.futureDate"] });
    let deviceId = data.deviceId ?? null;
    if (deviceId && !db.devices.some((d) => d.id === deviceId && (d.ownerId === customerId || d.ownerId === u.companyId))) deviceId = null;
    let device = null;
    if (!deviceId && data.newDevice) {
      const model = db.models.find((m) => m.id === data.newDevice!.modelId);
      device = { categoryId: data.newDevice.categoryId, brandId: data.newDevice.brandId, modelId: model?.id ?? null, modelName: model ? `${brandName(model.brandId)} ${model.name}` : data.newDevice.modelName ?? "—", serialNumber: data.newDevice.serialNumber ?? null };
    }
    const order = createServiceOrder({
      serviceId: service.id,
      executionForm: data.executionForm,
      customerId,
      companyId: ctx.role === "CORPORATE_CUSTOMER" ? u.companyId : null,
      partnerCompanyId: ctx.role === "PARTNER" ? u.companyId : null,
      endCustomer: ctx.role === "PARTNER" ? data.endCustomer ?? null : null,
      deviceId,
      device,
      problemCode: data.problemCode ?? null,
      description: data.description,
      address,
      contactChannel: data.contactChannel,
      note: data.note ?? null,
      urgent: data.urgent,
      scheduledAt,
      preferredTechnicianId: data.technicianId ?? null,
      source: internal ? "OPERATOR" : ctx.role === "CUSTOMER" ? "WEB" : "B2B",
      operatorId: internal ? u.id : null,
      attachments: data.attachments,
      siteId: ctx.role === "CORPORATE_CUSTOMER" ? data.addressId ?? null : null,
    });
    // Sifarişçi və obyekt meneceri yaratdığı sifariş şirkət sahibinin/təsdiqləyicinin razılığını gözləyir (§45)
    if (ctx.role === "CORPORATE_CUSTOMER" && !["OWNER", "APPROVER"].includes(u.companyRole ?? "")) {
      order.approvalPending = true;
      order.history.unshift({ id: newId("hist"), at: order.createdAt, actorName: fullName(u), action: "company_approval_requested" });
    }
    notify(customerId, "ORDER_CREATED", "notif.orderCreated", L(`${order.number} sifarişiniz qəbul edildi`, `Заказ ${order.number} принят`, `Order ${order.number} received`), `/account/services/${order.id}`, "SMS");
    return serviceOrderDto(order, ctx);
  }),

  route.post("/service-orders/:id/actions", async ({ ctx, params, body }) => {
    const order = orderForCtx(ctx, params.id);
    const data = parse(S.ServiceOrderActionRequest, await body());
    applyAction(order, data, ctx);
    return serviceOrderDto(order, ctx);
  }),

  route.post("/service-orders/:id/estimate/decision", async ({ ctx, params, body }) => {
    const order = orderForCtx(ctx, params.id);
    const data = parse(S.EstimateDecisionRequest, await body());
    decideEstimate(order, data, ctx);
    return serviceOrderDto(order, ctx);
  }),

  route.get("/service-orders/:id/logistics", ({ ctx, params }) => {
    const order = orderForCtx(ctx, params.id);
    return db.logisticsTasks.filter((t) => t.relatedOrderId === order.id).map((t) => ({ id: t.id, number: t.number, type: t.type, status: t.status, windowStart: t.windowStart, windowEnd: t.windowEnd, assigneeName: t.assigneeId ? fullName(db.users.find((x) => x.id === t.assigneeId)) : null }));
  }),

  /* ---------------- Dashboard və profil ---------------- */
  route.get("/account/dashboard", ({ ctx }) => {
    const u = requireAuth(ctx);
    const orders = visibleOrders(ctx);
    const active = orders.filter((o) => ACTIVE.includes(o.status));
    const warranties = db.warranties.filter((w) => w.customerId === u.id && !w.void);
    const sub = db.subscriptions.find((s) => s.subscriberId === u.id && s.subscriberType === "CUSTOMER");
    const saved = orders.reduce((sum, o) => {
      const e = latestEstimate(o);
      return sum + (e && (e.status === "APPROVED" || e.status === "PARTIALLY_APPROVED") ? estimateTotals(o, e).discount : 0);
    }, 0);
    return {
      activeOrders: active.map((o) => {
        const dto = serviceOrderSummaryDto(o, ctx);
        return { id: o.id, number: o.number, serviceName: dto.serviceName, stageName: dto.currentStageName, status: o.status, progress: dto.progress, scheduledAt: o.scheduledAt };
      }),
      pendingEstimates: active
        .filter((o) => latestEstimate(o)?.status === "SENT")
        .map((o) => ({ orderId: o.id, orderNumber: o.number, serviceName: serviceOrderSummaryDto(o, ctx).serviceName, total: money(estimateTotals(o, latestEstimate(o)!).total), validUntil: latestEstimate(o)!.validUntil })),
      upcoming: [
        ...active.filter((o) => o.scheduledAt && new Date(o.scheduledAt).getTime() > Date.now()).map((o) => ({ id: o.id, title: `${o.number} — ${serviceOrderSummaryDto(o, ctx).serviceName.az}`, date: o.scheduledAt!, kind: "SERVICE" as const, href: `/account/services/${o.id}` })),
        ...db.devices.filter((d) => d.ownerId === u.id && d.nextServiceAt && new Date(d.nextServiceAt).getTime() < Date.now() + 60 * 86400_000).map((d) => ({ id: d.id, title: `${d.modelName} — periodik servis`, date: d.nextServiceAt!, kind: "PERIODIC" as const, href: `/account/devices/${d.id}` })),
      ].sort((a, b) => a.date.localeCompare(b.date)),
      expiringWarranties: warranties.filter((w) => { const d = (new Date(w.endsAt).getTime() - Date.now()) / 86400_000; return d > 0 && d < 60; }).map((w) => ({ id: w.id, deviceName: w.deviceName, endsAt: w.endsAt })),
      subscription: { planName: ctx.plan?.name ?? L("Basic"), status: sub?.status ?? "ACTIVE", renewsAt: sub?.currentPeriodEnd ?? null, tier: ctx.plan?.tier ?? 0 },
      stats: { devices: db.devices.filter((d) => d.ownerId === u.id).length, completedOrders: orders.filter((o) => ["COMPLETED", "CLOSED"].includes(o.status)).length, activeWarranties: warranties.filter((w) => new Date(w.endsAt).getTime() > Date.now()).length, savedAmount: money(saved) },
      unreadNotifications: db.notifications.filter((n) => n.userId === u.id && !n.read).length,
    };
  }),

  route.get("/account/profile", ({ ctx }) => {
    const u = requireAuth(ctx);
    const filled = [u.firstName, u.lastName, u.email, u.phone, u.birthDate, u.city, u.avatarUrl, u.gender].filter(Boolean).length;
    return {
      id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, emailVerified: u.emailVerified, phoneVerified: u.phoneVerified,
      locale: u.locale, birthDate: u.birthDate, marketingConsent: u.marketingConsent, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, avatarTone: u.avatarTone,
      avatarUrl: u.avatarUrl ?? null, gender: u.gender ?? null, city: u.city, preferredChannel: u.preferredChannel ?? "PHONE", jobTitle: u.jobTitle ?? null,
      roles: u.roles, activeRole: ctx.role, companyName: ctx.company?.legalName ?? null, companyRole: u.companyRole, branchName: u.branchId ? db.branches.find((b) => b.id === u.branchId)?.name ?? null : null,
      twoFactorEnabled: u.twoFactorEnabled, completeness: Math.round((filled / 8) * 100),
    };
  }),

  route.patch("/account/profile", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const raw = await body<Record<string, unknown>>();
    const data = parse(S.ProfileUpdate, raw);
    if (data.email && data.email !== u.email) {
      if (db.users.some((x) => x.email === data.email && x.id !== u.id)) throw validationError({ email: ["validation.alreadyExists"] });
      u.email = data.email;
      u.emailVerified = false;
    }
    if (data.phone && normalizeAzPhone(data.phone) !== u.phone) {
      u.phone = normalizeAzPhone(data.phone);
      u.phoneVerified = false;
    }
    Object.assign(u, { firstName: data.firstName, lastName: data.lastName, locale: data.locale, birthDate: data.birthDate ?? u.birthDate });
    // əlavə sahələr (sxemdən kənar, istəyə bağlı)
    const extra = raw as { city?: string; gender?: "MALE" | "FEMALE" | null; preferredChannel?: "PHONE" | "SMS" | "WHATSAPP" | "EMAIL"; jobTitle?: string | null; marketingConsent?: boolean };
    if (extra.city !== undefined) u.city = extra.city.trim() || u.city;
    if (extra.gender !== undefined) u.gender = extra.gender === "MALE" || extra.gender === "FEMALE" ? extra.gender : null;
    if (extra.preferredChannel) {
      if (!["PHONE", "SMS", "WHATSAPP", "EMAIL"].includes(extra.preferredChannel)) throw validationError({ preferredChannel: ["validation.invalid"] });
      if (extra.preferredChannel === "EMAIL" && !u.email) throw validationError({ preferredChannel: ["validation.emailRequired"] });
      u.preferredChannel = extra.preferredChannel;
    }
    if (extra.jobTitle !== undefined) u.jobTitle = extra.jobTitle?.trim() || null;
    if (extra.marketingConsent !== undefined) u.marketingConsent = !!extra.marketingConsent;
    audit(ctx, "edit_profile", "users", u.id, fullName(u));
    return { ok: true };
  }),

  /* ---------------- Profil şəkli ---------------- */
  route.put("/account/avatar", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { dataUrl } = await body<{ dataUrl: string }>();
    checkDataUrl(dataUrl, "avatar", { maxMb: 2 });
    u.avatarUrl = dataUrl;
    audit(ctx, "upload_avatar", "users", u.id, fullName(u));
    return { avatarUrl: u.avatarUrl };
  }),

  route.delete("/account/avatar", ({ ctx }) => {
    const u = requireAuth(ctx);
    u.avatarUrl = null;
    audit(ctx, "delete_avatar", "users", u.id, fullName(u));
    return { avatarUrl: null };
  }),

  /* ---------------- Son fəaliyyət ---------------- */
  route.get("/account/activity", ({ ctx, url }) => {
    const u = requireAuth(ctx);
    const name = fullName(u);
    const events = [
      ...db.auditLogs.filter((a) => a.actorName === name).map((a) => ({ id: a.id, at: a.at, action: a.action, resource: a.resource, label: a.resourceLabel, ip: a.ip, kind: "ACTION" as const })),
      { id: `login-${u.id}`, at: u.lastLoginAt ?? u.createdAt, action: "login", resource: "auth", label: "Chrome · Windows", ip: "85.132.44.10", kind: "LOGIN" as const },
      { id: `login2-${u.id}`, at: new Date(Date.now() - 2 * 86400_000).toISOString(), action: "login", resource: "auth", label: "Safari · iPhone", ip: "94.20.61.7", kind: "LOGIN" as const },
    ].sort((a, b) => b.at.localeCompare(a.at));
    return list(url, events, { dateField: "at", defaultSort: "-at", defaultPageSize: 10 });
  }),

  /* ---------------- Ünvanlar ---------------- */
  route.get("/account/addresses", ({ ctx }) => {
    const owner = ownerId(ctx);
    return { items: db.addresses.filter((a) => a.ownerId === owner), limit: limit(ctx, "max_addresses"), oneTimeAllowed: !!ctx.entitlements.one_time_address };
  }),

  route.post("/account/addresses", async ({ ctx, body }) => {
    const owner = ownerId(ctx);
    const data = parse(S.AddressInput, await body());
    const max = limit(ctx, "max_addresses");
    const count = db.addresses.filter((a) => a.ownerId === owner).length;
    if (max !== null && count >= max) throw apiError(403, "LIMIT_REACHED", "error.limit", { _: ["validation.addressLimit"] });
    if (data.isDefault || count === 0) db.addresses.filter((a) => a.ownerId === owner).forEach((a) => (a.isDefault = false));
    const rec = { ...data, id: newId("addr"), ownerId: owner, isDefault: data.isDefault || count === 0, location: data.location ?? { lat: 40.4 + Math.random() * 0.03, lng: 49.85 + Math.random() * 0.05 } };
    db.addresses.push(rec);
    return rec;
  }),

  route.patch("/account/addresses/:id", async ({ ctx, params, body }) => {
    const owner = ownerId(ctx);
    const a = db.addresses.find((x) => x.id === params.id && x.ownerId === owner);
    if (!a) notFound();
    const data = parse(S.AddressInput, await body());
    if (data.isDefault) db.addresses.filter((x) => x.ownerId === owner).forEach((x) => (x.isDefault = false));
    Object.assign(a, data);
    return a;
  }),

  route.delete("/account/addresses/:id", ({ ctx, params }) => {
    const owner = ownerId(ctx);
    const a = db.addresses.find((x) => x.id === params.id && x.ownerId === owner);
    if (!a) notFound();
    if (db.addresses.filter((x) => x.ownerId === owner).length === 1) throw apiError(409, "LAST_ADDRESS", "error.actionNotAllowed");
    if (db.devices.some((d) => d.addressId === a.id)) throw apiError(409, "ADDRESS_IN_USE", "error.actionNotAllowed");
    db.addresses = db.addresses.filter((x) => x !== a);
    return undefined;
  }),

  /* ---------------- Cihazlar (§53) ---------------- */
  route.get("/account/devices", ({ ctx, url }) => {
    const owner = ownerId(ctx);
    const items = db.devices.filter((d) => d.ownerId === owner || db.familyMembers.some((f) => f.sharedDeviceIds.includes(d.id) && normalizeAzPhone(f.phone) === ctx.user?.phone)).map(deviceDto);
    return { ...list(url, items, { search: (d) => `${d.modelName} ${d.nickname ?? ""} ${d.serialNumber ?? ""}`, defaultPageSize: 100 }), limit: limit(ctx, "max_devices") };
  }),

  route.get("/account/devices/:id", ({ ctx, params }) => {
    const owner = ownerId(ctx);
    const d = db.devices.find((x) => x.id === params.id && x.ownerId === owner);
    if (!d) notFound();
    const orders = db.serviceOrders.filter((o) => o.deviceId === d.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      ...deviceDto(d),
      warranties: db.warranties.filter((w) => w.deviceId === d.id).map(warrantyDto),
      history: orders.map((o) => {
        const est = latestEstimate(o);
        return {
          id: o.id,
          date: o.closedAt ?? o.createdAt,
          orderId: o.id,
          orderNumber: o.number,
          status: o.status,
          title: serviceOrderSummaryDto(o, ctx).serviceName,
          technicianName: o.technicianId ? fullName(db.users.find((x) => x.id === o.technicianId)) : null,
          works: est ? est.lines.filter((l) => !l.declined && l.type !== "MATERIAL").map((l) => l.name) : [],
          materials: o.materials.map((m) => ({ az: `${m.name.az} — ${m.quantity} ${m.unit}`, ru: `${m.name.ru} — ${m.quantity} ${m.unit}`, en: `${m.name.en} — ${m.quantity} ${m.unit}` })),
          documents: db.documents.filter((doc) => doc.orderId === o.id).map((doc) => ({ id: doc.id, number: doc.number, type: doc.type })),
          photos: o.stages.reduce((s, st) => s + st.photos.length, 0),
          warrantyUntil: o.warrantyId ? db.warranties.find((w) => w.id === o.warrantyId)?.endsAt ?? null : null,
        };
      }),
      documents: db.documents.filter((doc) => doc.deviceId === d.id || orders.some((o) => o.id === doc.orderId)).map((doc) => ({ id: doc.id, number: doc.number, type: doc.type, issuedAt: doc.issuedAt })),
      compatiblePartsCount: d.modelId ? db.products.filter((p) => p.compatibleModelIds.includes(d.modelId!)).length : 0,
    };
  }),

  route.post("/account/devices", async ({ ctx, body }) => {
    const owner = ownerId(ctx);
    const data = parse(S.DeviceInput, await body());
    const max = limit(ctx, "max_devices");
    if (max !== null && db.devices.filter((d) => d.ownerId === owner).length >= max) throw apiError(403, "LIMIT_REACHED", "error.limit", { _: ["validation.deviceLimit"] });
    if (!db.addresses.some((a) => a.id === data.addressId && a.ownerId === owner)) throw validationError({ addressId: ["validation.required"] });
    const model = db.models.find((m) => m.id === data.modelId);
    const rec = { id: newId("device"), ownerId: owner, addressId: data.addressId, categoryId: data.categoryId, brandId: data.brandId, modelId: model?.id ?? null, modelName: model ? `${brandName(model.brandId)} ${model.name}` : data.modelName || `${brandName(data.brandId)}`, nickname: data.nickname ?? null, serialNumber: data.serialNumber ?? null, purchasedAt: data.purchasedAt ?? null, installedAt: data.installedAt ?? null, nextServiceAt: daysFromNow(180), source: "MANUAL" as const, location: "AT_CUSTOMER" as const, imageTone: "sky", sharedWithFamily: false, qrCode: `QR-${Math.random().toString(36).slice(2, 10).toUpperCase()}` };
    db.devices.push(rec);
    return deviceDto(rec);
  }),

  route.patch("/account/devices/:id", async ({ ctx, params, body }) => {
    const owner = ownerId(ctx);
    const d = db.devices.find((x) => x.id === params.id && x.ownerId === owner);
    if (!d) notFound();
    const data = await body<{ nickname?: string; serialNumber?: string; addressId?: string }>();
    Object.assign(d, { nickname: data.nickname ?? d.nickname, serialNumber: data.serialNumber ?? d.serialNumber, addressId: data.addressId ?? d.addressId });
    return deviceDto(d);
  }),

  route.delete("/account/devices/:id", ({ ctx, params }) => {
    const owner = ownerId(ctx);
    const d = db.devices.find((x) => x.id === params.id && x.ownerId === owner);
    if (!d) notFound();
    if (db.serviceOrders.some((o) => o.deviceId === d.id && ACTIVE.includes(o.status))) throw apiError(409, "DEVICE_IN_USE", "error.actionNotAllowed");
    db.devices = db.devices.filter((x) => x !== d);
    return undefined;
  }),

  /* ---------------- Satış sifarişləri, qaytarmalar ---------------- */
  route.get("/account/orders", ({ ctx, url }) => {
    const u = requireAuth(ctx);
    const rows = db.salesOrders.filter((s) => (u.companyId ? s.companyId === u.companyId : s.customerId === u.id)).map(salesOrderSummaryDto);
    return list(url, rows, { search: (s) => s.number, defaultSort: "-createdAt" });
  }),

  route.get("/account/orders/:id", ({ ctx, params }) => {
    const u = requireAuth(ctx);
    const s = db.salesOrders.find((x) => (x.id === params.id || x.number === params.id) && (x.customerId === u.id || (!!u.companyId && x.companyId === u.companyId)));
    if (!s) notFound();
    return salesOrderDto(s, ctx);
  }),

  route.get("/account/returns", ({ ctx, url }) => {
    const u = requireAuth(ctx);
    return list(url, db.returns.filter((r) => r.customerId === u.id).map((r) => returnDto(r)), { defaultSort: "-createdAt" });
  }),

  route.post("/account/returns", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const data = parse(S.CreateReturnRequest, await body());
    const so = db.salesOrders.find((s) => s.id === data.salesOrderId && s.customerId === u.id);
    if (!so || !["DELIVERED", "COMPLETED"].includes(so.status)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const age = (Date.now() - new Date(so.createdAt).getTime()) / 86400_000;
    if (age > db.settings.returnWindowDays + 30) throw apiError(409, "RETURN_WINDOW", "error.actionNotAllowed", { salesOrderId: ["validation.returnWindow"] });
    for (const l of data.lines) {
      const line = so.lines.find((x) => x.id === l.lineId);
      const product = line ? db.products.find((p) => p.id === line.productId) : null;
      if (!line || Number(l.quantity) > Number(line.quantity) - Number(line.returnedQuantity)) throw validationError({ lines: ["validation.quantity"] });
      if (product?.returnRestriction) throw validationError({ lines: ["validation.returnRestricted"] });
    }
    const rec = { id: newId("ret"), number: `QY-${3000 + db.returns.length + 1}`, salesOrderId: so.id, customerId: u.id, status: "REQUESTED" as const, lines: data.lines.map((l) => ({ ...l, reason: data.reason })), reason: data.reason, inspectionResult: null, refundCents: null, refundMethod: null, createdAt: nowIso(), history: [{ id: newId("h"), at: nowIso(), actorName: fullName(u), action: "created", toStatus: "REQUESTED" }] };
    db.returns.unshift(rec);
    so.status = "RETURN_REQUESTED";
    return returnDto(rec);
  }),

  /* ---------------- Abunəlik (§41–42) ---------------- */
  route.get("/account/subscription", ({ ctx }) => {
    const u = requireAuth(ctx);
    const type = ctx.role === "TECHNICIAN" ? "TECHNICIAN" : "CUSTOMER";
    const sub = db.subscriptions.find((s) => s.subscriberId === u.id && s.subscriberType === type);
    const group = type === "TECHNICIAN" ? "TECHNICIAN" : "CUSTOMER";
    return {
      subscription: sub ? subscriptionDto(sub) : null,
      plan: ctx.plan ? planDto(ctx.plan) : null,
      plans: db.plans.filter((p) => p.group === group && p.visibility === "PUBLIC").sort((a, b) => a.tier - b.tier).map(planDto),
      entitlementDefinitions: db.entitlementDefinitions.filter((e) => e.group === group),
      staffLicense: ctx.technician?.employmentType === "STAFF" ? db.staffLicenses.find((l) => l.technicianId === ctx.technician!.id) ?? null : null,
      payments: db.payments.filter((p) => p.orderType === "SUBSCRIPTION" && p.payerId === u.id).map((p) => paymentDto(p, ctx)),
    };
  }),

  route.post("/account/subscription/change", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    if (ctx.technician?.employmentType === "STAFF") throw apiError(403, "STAFF_LICENSE", "error.forbidden");
    const data = parse(S.ChangePlanRequest, await body());
    const type = ctx.role === "TECHNICIAN" ? "TECHNICIAN" : "CUSTOMER";
    const plan = db.plans.find((p) => p.id === data.planId && p.group === type);
    if (!plan) throw validationError({ planId: ["validation.required"] });
    const price = plan.prices.find((p) => p.period === data.period && p.enabled);
    if (!price) throw validationError({ period: ["validation.required"] });
    let sub = db.subscriptions.find((s) => s.subscriberId === u.id && s.subscriberType === type);
    const current = ctx.plan;
    const priceCents = Math.round(Number(price.price.amount) * 100);
    if (!sub) {
      sub = { id: newId("sub"), subscriberId: u.id, subscriberType: type, planId: current?.id ?? plan.id, status: "ACTIVE", period: data.period, priceCents, startedAt: nowIso(), currentPeriodEnd: nowIso(), autoRenew: true, pendingPlanId: null, cancelAtPeriodEnd: false, graceUntil: null };
      db.subscriptions.push(sub);
    }
    // Yüksəltmə dərhal (ödənişlə), endirmə dövrün sonunda (§41.4)
    if (!current || plan.tier > current.tier || priceCents > 0 && current.code === "CUSTOMER_BASIC") {
      if (priceCents === 0) { sub.planId = plan.id; u.planId = plan.id; return { status: "CHANGED", subscription: subscriptionDto(sub) }; }
      sub.pendingPlanId = plan.id;
      sub.period = data.period;
      sub.priceCents = priceCents;
      const p = recordPayment({ payerId: u.id, payerName: fullName(u), orderType: "SUBSCRIPTION", orderId: sub.id, orderNumber: `SUB-${sub.id.slice(0, 6).toUpperCase()}`, method: "CARD_ONLINE", amountCents: priceCents, status: "INITIATED" });
      return { status: "PAYMENT_REQUIRED", paymentId: p.id, redirectUrl: `/checkout/pay?paymentId=${p.id}`, subscription: subscriptionDto(sub) };
    }
    sub.pendingPlanId = plan.id;
    return { status: "SCHEDULED", effectiveAt: sub.currentPeriodEnd, subscription: subscriptionDto(sub) };
  }),

  route.post("/account/subscription/cancel", ({ ctx }) => {
    const u = requireAuth(ctx);
    const sub = db.subscriptions.find((s) => s.subscriberId === u.id);
    if (!sub) notFound();
    sub.cancelAtPeriodEnd = true;
    sub.autoRenew = false;
    return subscriptionDto(sub);
  }),

  route.post("/account/subscription/resume", ({ ctx }) => {
    const u = requireAuth(ctx);
    const sub = db.subscriptions.find((s) => s.subscriberId === u.id);
    if (!sub) notFound();
    sub.cancelAtPeriodEnd = false;
    sub.autoRenew = true;
    sub.pendingPlanId = null;
    return subscriptionDto(sub);
  }),

  route.patch("/account/subscription", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const sub = db.subscriptions.find((s) => s.subscriberId === u.id);
    if (!sub) notFound();
    const { autoRenew } = await body<{ autoRenew: boolean }>();
    sub.autoRenew = autoRenew;
    return subscriptionDto(sub);
  }),

  /* ---------------- Ödənişlər, zəmanətlər, sənədlər ---------------- */
  route.get("/account/payments", ({ ctx, url }) => {
    const owner = ownerId(ctx);
    const u = requireAuth(ctx);
    return list(url, db.payments.filter((p) => p.payerId === owner || p.payerId === u.id).map((p) => paymentDto(p, ctx)), { search: (p) => `${p.number} ${p.orderNumber}`, defaultSort: "-createdAt" });
  }),

  route.get("/account/warranties", ({ ctx, url }) => {
    const u = requireAuth(ctx);
    return list(url, db.warranties.filter((w) => w.customerId === u.id).map(warrantyDto), { defaultSort: "-endsAt", search: (w) => `${w.number} ${w.deviceName}` });
  }),

  route.get("/account/warranty-claims", ({ ctx }) => {
    const u = requireAuth(ctx);
    return db.warrantyClaims.filter((c) => c.customerId === u.id).map((c) => ({ ...c, warrantyNumber: db.warranties.find((w) => w.id === c.warrantyId)?.number ?? "", serviceOrderNumber: c.serviceOrderId ? db.serviceOrders.find((o) => o.id === c.serviceOrderId)?.number ?? null : null }));
  }),

  route.post("/account/warranty-claims", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { warrantyId, description } = await body<{ warrantyId: string; description: string }>();
    const w = db.warranties.find((x) => x.id === warrantyId && x.customerId === u.id);
    if (!w) notFound();
    if (!description || description.trim().length < 10) throw validationError({ description: ["validation.descriptionMin"] });
    if (!warrantyDto(w).canClaim) throw apiError(409, "WARRANTY_NOT_CLAIMABLE", "error.actionNotAllowed");
    const claim = { id: newId("claim"), number: `ZI-${200 + db.warrantyClaims.length + 1}`, warrantyId: w.id, customerId: u.id, description, status: "SUBMITTED" as const, serviceOrderId: null, decisionNote: null, createdAt: nowIso() };
    db.warrantyClaims.unshift(claim);
    notify(db.users.find((x) => x.roles.includes("OPERATOR"))?.id, "WARRANTY_CLAIM", "notif.orderCreated", L(`Yeni zəmanət iddiası: ${claim.number}`), "/warranty-claims");
    return claim;
  }),

  route.get("/account/documents", ({ ctx, url }) => {
    const owner = ownerId(ctx);
    const u = requireAuth(ctx);
    const rows = db.documents.filter((d) => d.ownerId === owner || d.ownerId === u.id).map((d) => documentDto(d, ctx));
    return list(url, rows, { search: (d) => `${d.number} ${d.orderNumber ?? ""}`, dateField: "issuedAt", defaultSort: "-issuedAt" });
  }),

  route.get("/documents/:id", ({ ctx, params }) => {
    const u = requireAuth(ctx);
    const d = find(db.documents, params.id);
    const allowed = isInternal(ctx) || d.ownerId === u.id || d.ownerId === u.companyId || (ctx.role === "TECHNICIAN" && db.serviceOrders.some((o) => o.id === d.orderId && o.technicianId === u.id));
    if (!allowed) throw apiError(403, "FORBIDDEN", "error.forbidden");
    return documentDto(d, ctx);
  }),

  /* ---------------- Bildirişlər (§58) ---------------- */
  route.get("/notifications", ({ ctx, url }) => {
    const u = requireAuth(ctx);
    const rows = db.notifications.filter((n) => n.userId === u.id);
    return { ...list(url, rows, { defaultSort: "-createdAt", ignoreEmpty: false }), unread: rows.filter((n) => !n.read).length };
  }),

  route.post("/notifications/:id/read", ({ ctx, params }) => {
    const u = requireAuth(ctx);
    const n = db.notifications.find((x) => x.id === params.id && x.userId === u.id);
    if (n) n.read = true;
    return { ok: true };
  }),

  route.post("/notifications/read-all", ({ ctx }) => {
    const u = requireAuth(ctx);
    db.notifications.filter((n) => n.userId === u.id).forEach((n) => (n.read = true));
    return { ok: true };
  }),

  route.get("/notifications/preferences", ({ ctx }) => {
    const u = requireAuth(ctx);
    return db.notificationPrefs.get(u.id) ?? { channels: {}, marketingConsent: false, quietHours: { enabled: true, from: "22:00", to: "08:00" } };
  }),

  route.put("/notifications/preferences", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const data = await body<import("@sp/types").NotificationPreferences>();
    // Tranzaksiya bildirişləri məcburidir — IN_APP söndürülə bilməz
    for (const g of Object.values(data.channels ?? {})) g.IN_APP = true;
    db.notificationPrefs.set(u.id, data);
    u.marketingConsent = data.marketingConsent;
    return data;
  }),

  /* ---------------- Rəylər (§55) ---------------- */
  route.get("/account/reviews", ({ ctx }) => {
    const u = requireAuth(ctx);
    const mine = db.reviews.filter((r) => r.authorId === u.id).map((r) => ({ ...r, targetName: reviewTargetName(r.target, r.targetId), orderNumber: r.orderId ? db.serviceOrders.find((o) => o.id === r.orderId)?.number ?? null : null, availableActions: [] }));
    const pending = visibleOrders(ctx)
      .filter((o) => ["COMPLETED", "CLOSED"].includes(o.status) && o.technicianId && !db.reviews.some((r) => r.orderId === o.id && r.authorId === u.id))
      .slice(0, 10)
      .flatMap((o) => [{ target: "TECHNICIAN", targetId: o.technicianId!, targetName: reviewTargetName("TECHNICIAN", o.technicianId!), orderId: o.id, orderNumber: o.number, completedAt: o.closedAt ?? o.updatedAt }]);
    return { mine, pending };
  }),

  route.post("/reviews", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const data = parse(S.ReviewInput, await body());
    if (data.target === "PRODUCT" && !db.salesOrders.some((s) => s.customerId === u.id && ["DELIVERED", "COMPLETED"].includes(s.status) && s.lines.some((l) => l.productId === data.targetId))) throw apiError(403, "NOT_PURCHASED", "error.forbidden");
    if (data.orderId) {
      const o = visibleOrders(ctx).find((x) => x.id === data.orderId);
      if (!o || !["COMPLETED", "CLOSED"].includes(o.status)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    }
    const rec = { id: newId("review"), target: data.target, targetId: data.targetId, orderId: data.orderId ?? null, authorId: u.id, authorName: `${u.firstName} ${u.lastName.slice(0, 1)}.`, rating: data.rating, criteria: data.criteria, pros: data.pros ?? null, cons: data.cons ?? null, comment: data.comment, photos: 0, status: "PENDING" as const, reply: null, reported: false, createdAt: nowIso() };
    db.reviews.unshift(rec);
    // Rəy üçün loyallıq bonusu — hər sifariş üzrə yalnız bir dəfə (§A2)
    const reviewedOrder = data.orderId ? db.serviceOrders.find((o) => o.id === data.orderId) ?? null : null;
    if (reviewedOrder && !db.loyaltyTxns.some((t) => t.type === "EARN_REVIEW" && t.userId === u.id && t.orderNumber === reviewedOrder.number)) {
      earnReviewBonus(u.id, reviewedOrder.number);
    }
    if (data.rating <= 3) notify(db.users.find((x) => x.roles.includes("MANAGER"))?.id, "LOW_RATING", "notif.orderConfirmed", L(`Aşağı reytinqli rəy: ${data.rating} ulduz`), "/reviews");
    return rec;
  }),

  route.post("/reviews/:id/report", ({ ctx, params }) => {
    requireAuth(ctx);
    const r = find(db.reviews, params.id);
    r.reported = true;
    return { ok: true };
  }),

  /* ---------------- Ailə üzvləri (Premium) ---------------- */
  route.get("/account/family", ({ ctx }) => {
    const u = requireAuth(ctx);
    return { items: db.familyMembers.filter((f) => f.ownerId === u.id), limit: limit(ctx, "family_members") ?? 0, allowed: Number(ctx.entitlements.family_members ?? 0) > 0 };
  }),

  route.post("/account/family", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const max = Number(ctx.entitlements.family_members ?? 0);
    if (!max) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement");
    if (db.familyMembers.filter((f) => f.ownerId === u.id).length >= max) throw apiError(403, "LIMIT_REACHED", "error.limit");
    const data = await body<{ name: string; phone: string; relation: string; sharedDeviceIds: string[]; canCreateOrders: boolean }>();
    if (!data.name || data.name.length < 2) throw validationError({ name: ["validation.required"] });
    if (!/^\+994\d{9}$/.test(normalizeAzPhone(data.phone ?? ""))) throw validationError({ phone: ["validation.phone"] });
    const rec = { id: newId("family"), ownerId: u.id, name: data.name, phone: normalizeAzPhone(data.phone), relation: data.relation ?? "", status: "INVITED" as const, sharedDeviceIds: data.sharedDeviceIds ?? [], canCreateOrders: !!data.canCreateOrders, invitedAt: nowIso() };
    db.familyMembers.push(rec);
    return rec;
  }),

  route.patch("/account/family/:id", async ({ ctx, params, body }) => {
    const u = requireAuth(ctx);
    const f = db.familyMembers.find((x) => x.id === params.id && x.ownerId === u.id);
    if (!f) notFound();
    Object.assign(f, await body());
    return f;
  }),

  route.delete("/account/family/:id", ({ ctx, params }) => {
    const u = requireAuth(ctx);
    db.familyMembers = db.familyMembers.filter((x) => !(x.id === params.id && x.ownerId === u.id));
    return undefined;
  }),

  /* ---------------- Təhlükəsizlik və fərdi məlumatlar (§70) ---------------- */
  route.get("/account/security", ({ ctx }) => {
    const u = requireAuth(ctx);
    return {
      twoFactorEnabled: u.twoFactorEnabled,
      twoFactorRequired: isInternal(ctx),
      loginMethods: { phone: !!u.phone, phoneVerified: u.phoneVerified, email: !!u.email, emailVerified: u.emailVerified, password: !!u.password },
      sessions: [
        { id: ctx.session?.sid ?? "current", device: "Chrome · Windows", location: "Bakı, AZ", lastActiveAt: nowIso(), current: true },
        { id: "s-mobile", device: "Safari · iPhone", location: "Bakı, AZ", lastActiveAt: daysFromNow(-2), current: false },
      ],
      consent: { personalData: true, marketing: u.marketingConsent },
      dataRequests: [],
    };
  }),

  route.post("/account/security/2fa", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { enabled, code } = await body<{ enabled: boolean; code?: string }>();
    if (!enabled && isInternal(ctx)) throw apiError(403, "2FA_REQUIRED", "error.forbidden");
    if (enabled && code !== "123456") throw validationError({ code: ["validation.otpInvalid"] });
    u.twoFactorEnabled = enabled;
    audit(ctx, enabled ? "enable_2fa" : "disable_2fa", "users", u.id, fullName(u));
    return { twoFactorEnabled: u.twoFactorEnabled };
  }),

  route.post("/account/security/password", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { currentPassword, newPassword } = await body<{ currentPassword: string; newPassword: string }>();
    if (u.password && u.password !== currentPassword) throw validationError({ currentPassword: ["validation.passwordWrong"] });
    parse(S.PasswordSchema, newPassword);
    u.password = newPassword;
    return { ok: true };
  }),

  route.post("/account/security/sessions/:id/revoke", ({ ctx, params }) => {
    requireAuth(ctx);
    if (params.id !== ctx.session?.sid) db.sessions.delete(params.id);
    return { ok: true };
  }),

  route.post("/account/data-requests", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { type } = await body<{ type: "EXPORT" | "DELETION" }>();
    audit(ctx, type === "EXPORT" ? "data_export_request" : "data_deletion_request", "users", u.id, fullName(u));
    return { id: newId("dsr"), type, status: "RECEIVED", createdAt: nowIso(), eta: daysFromNow(type === "EXPORT" ? 3 : 30) };
  }),

  route.put("/account/consent", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const { marketing } = await body<{ marketing: boolean }>();
    u.marketingConsent = !!marketing;
    return { personalData: true, marketing: u.marketingConsent };
  }),

  route.get("/lookup/models", ({ url }) => {
    const brandId = url.searchParams.get("brandId");
    const categoryId = url.searchParams.get("categoryId");
    return db.models.filter((m) => (!brandId || m.brandId === brandId) && (!categoryId || m.categoryId === categoryId)).map((m) => ({ id: m.id, name: m.name, fullName: `${brandName(m.brandId)} ${m.name}`, categoryName: categoryName(m.categoryId) }));
  }),

  route.get("/lookup/brands", () => db.brands.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name, slug: b.slug }))),

  route.get("/service-orders/:id/amounts", ({ ctx, params }) => {
    const o = orderForCtx(ctx, params.id);
    const a = orderAmounts(o);
    return { total: money(a.total), paid: money(a.paid), due: money(a.due), done: o.stages.filter(isDone).length };
  }),
];

function reviewTargetName(target: string, id: string) {
  if (target === "TECHNICIAN") return fullName(db.users.find((u) => u.id === id));
  if (target === "SERVICE") return db.services.find((s) => s.id === id)?.name ?? L("—");
  return db.products.find((p) => p.id === id)?.name ?? L("—");
}

export function returnDto(r: (typeof db.returns)[number]) {
  const so = db.salesOrders.find((s) => s.id === r.salesOrderId)!;
  const customer = db.users.find((u) => u.id === r.customerId);
  const next: Record<string, string[]> = { REQUESTED: ["approve", "reject"], APPROVED: ["receive"], RECEIVED: ["inspect"], INSPECTED: ["refund"], REFUNDED: ["close"] };
  return {
    id: r.id,
    number: r.number,
    salesOrderId: r.salesOrderId,
    salesOrderNumber: so.number,
    customerName: fullName(customer),
    status: r.status,
    lines: r.lines.map((l) => {
      const line = so.lines.find((x) => x.id === l.lineId);
      return { name: line?.name ?? L("—"), quantity: { value: l.quantity, unit: line?.unit ?? "pcs" }, reason: l.reason };
    }),
    reason: r.reason,
    inspectionResult: r.inspectionResult,
    refundAmount: r.refundCents !== null ? money(r.refundCents) : null,
    refundMethod: r.refundMethod,
    createdAt: r.createdAt,
    history: r.history,
    availableActions: (next[r.status] ?? []).map((code) => ({ code, variant: code === "reject" ? ("destructive" as const) : ("primary" as const), requiresReason: code === "reject" })),
  };
}
