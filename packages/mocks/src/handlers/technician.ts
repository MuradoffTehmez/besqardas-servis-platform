import * as S from "@sp/schemas";
import { maskPhone } from "@sp/utils";
import { db } from "../db/state";
import { fullName, requireTechnician, type Ctx } from "../engine/context";
import { offerExpiry, notify, audit } from "../engine/effects";
import { findVariant, reserve, releaseReservation, stockRow } from "../engine/stock";
import { variantPrice } from "../engine/pricing";
import { orderAmounts, isDone } from "../engine/workflow";
import { find, list, notFound, parse, route, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money, qty } from "../lib/money";
import { newId } from "../lib/rng";
import { bakuAt, daysAgo, nowIso, periodLabel } from "../lib/time";
import { productSummaryDto, reservationDto, serviceOrderSummaryDto, specName, stockLevelDto, technicianDto, serviceDto } from "../dto";
import { visibleOrders } from "./account";

/** Usta paneli (PRD §60.4): təkliflər, işlər, cədvəl, ixtisaslar, mobil anbar, rezerv, qazanc, sənədlər, statistika. */

const lim = (ctx: Ctx, code: string) => {
  const v = ctx.entitlements[code];
  return v === "UNLIMITED" || v === undefined ? null : Number(v);
};

function techWarehouse(ctx: Ctx) {
  const t = ctx.technician!;
  if (t.employmentType !== "STAFF") return null;
  return db.warehouses.find((w) => w.type === "MOBILE" && w.branchId === t.branchId) ?? db.warehouses.find((w) => w.type === "MOBILE") ?? null;
}

function offers(ctx: Ctx) {
  const me = ctx.user!.id;
  return db.serviceOrders.flatMap((o) =>
    o.stages
      .filter((s) => s.assigneeId === me && s.status === "ASSIGNED")
      .map((s) => {
        const tech = ctx.technician!;
        const loc = o.address?.location;
        const est = o.basePriceCents ?? db.services.find((x) => x.id === o.serviceId)!.priceCents;
        return {
          id: s.id,
          stageId: s.id,
          orderId: o.id,
          orderNumber: o.number,
          stageName: s.name,
          serviceName: db.services.find((x) => x.id === o.serviceId)!.name,
          categoryName: db.equipmentCategories.find((c) => c.id === db.services.find((x) => x.id === o.serviceId)!.categoryId)!.name,
          executionForm: o.executionForm,
          addressShort: o.address ? `${o.address.city}, ${o.address.street.split(",")[0]}` : L("Servis mərkəzi"),
          distanceKm: loc ? Math.round(Math.hypot(loc.lat - tech.location.lat, loc.lng - tech.location.lng) * 111 * 10) / 10 : 0,
          scheduledAt: o.scheduledAt,
          urgent: o.urgent,
          estimatedEarning: est && tech.employmentType === "INDEPENDENT" ? money(Math.round(est * 0.7)) : null,
          expiresAt: offerExpiry(s.readyAt),
          companyName: db.branding.legalName,
          problem: o.description,
          customerPreferred: o.preferredTechnicianId === me,
        };
      }),
  );
}

export const technicianHandlers = [
  route.get("/technician/dashboard", ({ ctx }) => {
    const t = requireTechnician(ctx);
    const me = ctx.user!.id;
    const jobs = visibleOrders(ctx);
    const today = new Date(bakuAt(0, 0)).getTime();
    const tomorrow = today + 86400_000;
    const monthStart = new Date(bakuAt(-(new Date().getUTCDate() - 1), 0)).toISOString();
    const lines = db.settlementLines.filter((l) => l.technicianId === t.id);
    const desk = db.cashDesks.find((d) => d.holderId === me);
    return {
      employmentType: t.employmentType,
      planName: ctx.plan?.name ?? null,
      licenseActive: t.employmentType === "STAFF" ? !!ctx.entitlements.staff_license : null,
      offers: offers(ctx).length,
      todayJobs: jobs.filter((o) => o.scheduledAt && new Date(o.scheduledAt).getTime() >= today && new Date(o.scheduledAt).getTime() < tomorrow && !["CANCELLED", "CLOSED"].includes(o.status)).map((o) => serviceOrderSummaryDto(o, ctx)),
      nextJobs: jobs.filter((o) => ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).slice(0, 6).map((o) => serviceOrderSummaryDto(o, ctx)),
      activeJobs: jobs.filter((o) => ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length,
      activeLimit: lim(ctx, "max_active_jobs"),
      monthlyAccepted: jobs.filter((o) => o.createdAt >= monthStart).length,
      monthlyLimit: lim(ctx, "max_monthly_jobs"),
      rating: t.rating,
      reviewCount: t.reviewCount,
      earningsThisMonth: money(lines.filter((l) => l.period === periodLabel()).reduce((s, l) => s + l.laborCents + l.ownMaterialCents, 0)),
      cashBalance: money(desk?.balanceCents ?? 0),
      cashLimit: money(desk?.limitCents ?? 150000),
      documentsExpiring: t.documents.filter((d) => d.status === "EXPIRED" || (d.expiresAt && new Date(d.expiresAt).getTime() < Date.now() + 30 * 86400_000)).length,
      reservationsExpiring: db.reservations.filter((r) => r.reservedForId === me && r.status === "ACTIVE" && new Date(r.expiresAt).getTime() < Date.now() + 12 * 3600_000).length,
      companies: db.partnerships.filter((p) => p.technicianId === t.id && p.status === "APPROVED").map((p) => ({ name: p.companyName, jobs: jobs.length })),
      subscriptionStatus: db.subscriptions.find((s) => s.subscriberId === me)?.status ?? null,
      entitlements: ctx.entitlements,
    };
  }),

  route.get("/technician/offers", ({ ctx }) => {
    requireTechnician(ctx);
    return offers(ctx);
  }),

  route.get("/technician/jobs", ({ ctx, url }) => {
    requireTechnician(ctx);
    const tab = url.searchParams.get("tab") ?? "active";
    const done = ["COMPLETED", "CLOSED", "CANCELLED", "REJECTED"];
    const rows = visibleOrders(ctx)
      .filter((o) => (tab === "done" ? done.includes(o.status) : !done.includes(o.status)))
      .filter((o) => !o.stages.some((s) => s.assigneeId === ctx.user!.id && s.status === "ASSIGNED") || o.technicianId === ctx.user!.id)
      .map((o) => serviceOrderSummaryDto(o, ctx));
    const sp = new URL(url);
    sp.searchParams.delete("tab");
    return list(sp, rows, { search: (o) => `${o.number} ${o.customerName}`, defaultSort: tab === "done" ? "-createdAt" : "scheduledAt" });
  }),

  /** Diaqnostika zamanı material seçimi: uyğun hissələr önə çıxır, stok ustanın anbarından (§19.1, §27.3). */
  route.get("/technician/jobs/:id/materials", ({ ctx, params, url }) => {
    requireTechnician(ctx);
    const order = visibleOrders(ctx).find((o) => o.id === params.id);
    if (!order) notFound();
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const wh = techWarehouse(ctx);
    const modelId = order.device.modelId;
    const customerCtx = { ...ctx, priceType: "RETAIL" as const, plan: null };
    return db.products
      .filter((p) => p.type !== "PHYSICAL" || p.compatibleModelIds.length)
      .filter((p) => !q || `${p.name.az} ${p.name.ru} ${p.name.en} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(q))
      .map((p) => {
        const v = p.variants[0]!;
        const compatible = !!modelId && p.compatibleModelIds.includes(modelId);
        const stock = wh ? stockRow(v.id, wh.id, "SERVICE") : null;
        return { productId: p.id, variantId: v.id, name: p.name, sku: v.sku, baseUnit: p.baseUnit, units: [p.baseUnit, ...p.conversions.map((c) => c.unit)], compatible, customerPrice: variantPrice(p, v, customerCtx).effectivePrice, technicianPrice: money(v.prices.TECHNICIAN), available: stock ? qty(Math.max(0, stock.physical - stock.reserved), p.baseUnit) : null, warehouseName: wh?.name ?? null };
      })
      .sort((a, b) => Number(b.compatible) - Number(a.compatible))
      .slice(0, 30);
  }),

  route.get("/technician/schedule", ({ ctx, url }) => {
    const t = requireTechnician(ctx);
    const from = url.searchParams.get("from") ?? bakuAt(-1, 0);
    const to = url.searchParams.get("to") ?? bakuAt(7, 0);
    const events = visibleOrders(ctx)
      .filter((o) => o.scheduledAt && o.scheduledAt >= from && o.scheduledAt <= to && !["CANCELLED", "REJECTED"].includes(o.status))
      .map((o) => ({ id: o.id, kind: "JOB", title: `${o.number} · ${db.services.find((s) => s.id === o.serviceId)!.name.az}`, titleI18n: null, start: o.scheduledAt!, end: new Date(new Date(o.scheduledAt!).getTime() + db.services.find((s) => s.id === o.serviceId)!.durationMinutes * 60_000).toISOString(), orderId: o.id, status: o.status, address: o.address ? `${o.address.city}, ${o.address.street}` : null }));
    const blocks = (scheduleBlocks.get(t.id) ?? []).filter((b) => b.start <= to && b.end >= from);
    return { events: [...events, ...blocks], workingHours: t.workingHours };
  }),

  route.post("/technician/schedule/blocks", async ({ ctx, body }) => {
    const t = requireTechnician(ctx);
    const data = await body<{ start: string; end: string; kind: "BLOCKED" | "VACATION"; title?: string }>();
    if (!data.start || !data.end || data.end <= data.start) throw validationError({ end: ["validation.dateRange"] });
    const conflict = visibleOrders(ctx).some((o) => o.scheduledAt && o.scheduledAt >= data.start && o.scheduledAt < data.end && ["CONFIRMED", "IN_PROGRESS"].includes(o.status));
    if (conflict) throw apiError(409, "SCHEDULE_CONFLICT", "error.actionNotAllowed", { start: ["validation.scheduleConflict"] });
    const block = { id: newId("block"), kind: data.kind, title: data.title ?? (data.kind === "VACATION" ? "Məzuniyyət" : "Bloklanmış vaxt"), start: data.start, end: data.end, orderId: null, status: null, address: null };
    scheduleBlocks.set(t.id, [...(scheduleBlocks.get(t.id) ?? []), block]);
    return block;
  }),

  route.delete("/technician/schedule/blocks/:id", ({ ctx, params }) => {
    const t = requireTechnician(ctx);
    scheduleBlocks.set(t.id, (scheduleBlocks.get(t.id) ?? []).filter((b) => b.id !== params.id));
    return undefined;
  }),

  route.get("/technician/specializations", ({ ctx }) => {
    const t = requireTechnician(ctx);
    const dto = technicianDto(t, ctx);
    return {
      items: dto.specializationDetails,
      limit: lim(ctx, "max_specializations"),
      available: db.specializations.filter((s) => !t.specializations.some((x) => x.specializationId === s.id)).map((s) => ({ id: s.id, name: specName(s.id), requiresCertificate: s.requiresCertificate })),
      skills: db.equipmentCategories.flatMap((c) => c.skills.map((s) => ({ id: s.id, name: s.name, selected: t.skillIds.includes(s.id) }))),
    };
  }),

  route.post("/technician/specializations", async ({ ctx, body }) => {
    const t = requireTechnician(ctx);
    const { specializationId, level, certificateName } = await body<{ specializationId: string; level: "BEGINNER" | "INTERMEDIATE" | "EXPERT"; certificateName?: string }>();
    const spec = find(db.specializations, specializationId);
    const max = lim(ctx, "max_specializations");
    if (max !== null && t.specializations.length >= max) throw apiError(403, "LIMIT_REACHED", "error.limit", { specializationId: ["validation.specializationLimit"] });
    if (spec.requiresCertificate && !certificateName) throw validationError({ certificateName: ["validation.certificateRequired"] });
    t.specializations.push({ id: newId("tspec"), specializationId, level: level ?? "INTERMEDIATE", status: "PENDING_APPROVAL", certificateExpiresAt: null });
    if (certificateName) t.documents.push({ id: newId("doc"), kind: "CERTIFICATE", name: certificateName, status: "PENDING", expiresAt: null, uploadedAt: nowIso(), note: null });
    return technicianDto(t, ctx).specializationDetails;
  }),

  route.delete("/technician/specializations/:id", ({ ctx, params }) => {
    const t = requireTechnician(ctx);
    t.specializations = t.specializations.filter((s) => s.id !== params.id);
    return undefined;
  }),

  route.get("/technician/inventory", ({ ctx, url }) => {
    const t = requireTechnician(ctx);
    const wh = techWarehouse(ctx);
    if (!wh) return { warehouse: null, employmentType: t.employmentType, items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 }, purchasable: db.products.filter((p) => p.type !== "PHYSICAL").slice(0, 8).map((p) => productSummaryDto(p, { ...ctx, priceType: "TECHNICIAN" })) };
    const rows = db.stock.filter((s) => s.warehouseId === wh.id).map(stockLevelDto);
    return { warehouse: { id: wh.id, name: wh.name, code: wh.code }, employmentType: t.employmentType, ...list(url, rows, { search: (r) => `${JSON.stringify(r.productName)} ${r.sku}`, defaultPageSize: 50 }), movements: db.movements.filter((m) => m.warehouseId === wh.id).slice(0, 15).map((m) => ({ ...m, productName: db.products.find((p) => p.id === m.productId)!.name, quantity: qty(m.quantity, m.unit) })) };
  }),

  route.get("/technician/reservations", ({ ctx, url }) => {
    requireTechnician(ctx);
    const me = ctx.user!.id;
    return { ...list(url, db.reservations.filter((r) => r.reservedForId === me).map((r) => reservationDto(r, ctx)), { defaultSort: "expiresAt" }), limit: lim(ctx, "max_reservations"), active: db.reservations.filter((r) => r.reservedForId === me && r.status === "ACTIVE").length };
  }),

  route.post("/technician/reservations", async ({ ctx, body }) => {
    requireTechnician(ctx);
    const data = parse(S.CreateReservationRequest, await body());
    const me = ctx.user!.id;
    const max = lim(ctx, "max_reservations") ?? 0;
    if (!max) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement", { _: ["validation.reservationPlan"] });
    if (db.reservations.filter((r) => r.reservedForId === me && r.status === "ACTIVE").length >= max) throw apiError(403, "LIMIT_REACHED", "error.limit", { _: ["validation.reservationLimit"] });
    // Usta rezervi planlaşdırılmış işə bağlı olmalıdır (§39)
    const order = visibleOrders(ctx).find((o) => o.id === data.serviceOrderId && !["CLOSED", "CANCELLED", "COMPLETED"].includes(o.status));
    if (!order) throw validationError({ serviceOrderId: ["validation.reservationNeedsJob"] });
    const found = findVariant(data.productId) ?? (() => { const p = db.products.find((x) => x.id === data.productId); return p ? { product: p, variant: p.variants[0]! } : null; })();
    if (!found) throw validationError({ productId: ["validation.required"] });
    const conv = found.product.conversions.find((c) => c.unit === data.unit);
    const rec = reserve({ source: "TECHNICIAN", sourceId: order.id, sourceNumber: order.number, variantId: found.variant.id, warehouseId: data.warehouseId, quantity: Number(data.quantity) * (conv?.factor ?? 1), purpose: "SERVICE", reservedForId: me, reservedForName: fullName(ctx.user), ttlHours: db.settings.reservationTtlHours });
    return reservationDto(rec, ctx);
  }),

  route.post("/technician/reservations/:id/release", ({ ctx, params }) => {
    requireTechnician(ctx);
    const r = db.reservations.find((x) => x.id === params.id && x.reservedForId === ctx.user!.id);
    if (!r) notFound();
    releaseReservation(r.id);
    return reservationDto(r, ctx);
  }),

  route.get("/technician/warehouses", () => db.warehouses.filter((w) => ["CENTRAL", "BRANCH", "SERVICE_CENTER", "MOBILE"].includes(w.type)).map((w) => ({ id: w.id, name: w.name, type: w.type }))),

  route.get("/technician/customers", ({ ctx, url }) => {
    requireTechnician(ctx);
    if (!ctx.entitlements.customer_history) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement");
    const map = new Map<string, { id: string; name: string; phone: string; city: string; orders: number; lastOrderAt: string; lastService: unknown; devices: string[]; note: string | null }>();
    for (const o of visibleOrders(ctx).filter((x) => ["COMPLETED", "CLOSED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(x.status))) {
      const c = db.users.find((u) => u.id === o.customerId)!;
      const prev = map.get(c.id);
      const svc = db.services.find((s) => s.id === o.serviceId)!.name;
      map.set(c.id, { id: c.id, name: o.endCustomer?.name ?? fullName(c), phone: maskPhone(c.phone), city: o.address?.city ?? "—", orders: (prev?.orders ?? 0) + 1, lastOrderAt: prev && prev.lastOrderAt > o.createdAt ? prev.lastOrderAt : o.createdAt, lastService: prev && prev.lastOrderAt > o.createdAt ? prev.lastService : svc, devices: [...new Set([...(prev?.devices ?? []), o.device.modelName])], note: customerNotes.get(`${ctx.user!.id}:${c.id}`) ?? null });
    }
    return { ...list(url, [...map.values()], { search: (c) => c.name, defaultSort: "-lastOrderAt" }), crm: !!ctx.entitlements.advanced_crm };
  }),

  route.put("/technician/customers/:id/note", async ({ ctx, params, body }) => {
    requireTechnician(ctx);
    if (!ctx.entitlements.advanced_crm) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement");
    const { note } = await body<{ note: string }>();
    customerNotes.set(`${ctx.user!.id}:${params.id}`, note);
    return { ok: true };
  }),

  route.get("/technician/earnings", ({ ctx }) => {
    const t = requireTechnician(ctx);
    const me = ctx.user!.id;
    const lines = db.settlementLines.filter((l) => l.technicianId === t.id);
    const sum = (status: string) => lines.filter((l) => l.status === status).reduce((s, l) => s + l.laborCents + l.ownMaterialCents - l.deductions.reduce((d, x) => d + x.cents, 0), 0);
    const desk = db.cashDesks.find((d) => d.holderId === me);
    const months = [5, 4, 3, 2, 1, 0].map((m) => {
      const d = new Date(daysAgo(m * 30));
      const label = periodLabel(d);
      const jobs = db.serviceOrders.filter((o) => o.technicianId === me && o.closedAt && periodLabel(new Date(o.closedAt)) === label);
      return { label, amount: t.employmentType === "INDEPENDENT" ? lines.filter((l) => l.period === label).reduce((s, l) => s + (l.laborCents + l.ownMaterialCents) / 100, 0) : jobs.length * 15, jobs: jobs.length };
    });
    return {
      employmentType: t.employmentType,
      period: periodLabel(),
      settlementPeriod: db.settings.settlementPeriod,
      jobsCount: db.serviceOrders.filter((o) => o.technicianId === me && o.closedAt && periodLabel(new Date(o.closedAt)) === periodLabel()).length,
      bonus: t.employmentType === "STAFF" ? money(db.serviceOrders.filter((o) => o.technicianId === me && o.closedAt && periodLabel(new Date(o.closedAt)) === periodLabel()).length * 1500) : null,
      bonusRule: t.employmentType === "STAFF" ? L("Hər bağlanmış iş üçün 15 AZN bonus (əmək haqqı sistemi ilə ödənilir)", "15 AZN бонус за каждую закрытую работу", "15 AZN bonus per closed job (paid via payroll)") : null,
      cashBalance: money(desk?.balanceCents ?? 0),
      cashLimit: money(desk?.limitCents ?? 150000),
      cashOverLimit: !!desk?.limitCents && desk.balanceCents > desk.limitCents,
      pendingHandover: money(desk?.pendingHandoverCents ?? 0),
      pending: money(sum("PENDING")),
      approved: money(sum("APPROVED")),
      paid: money(sum("PAID")),
      onHold: money(sum("ON_HOLD")),
      deductions: money(lines.reduce((s, l) => s + l.deductions.reduce((d, x) => d + x.cents, 0), 0)),
      lines: lines.map((l) => ({ ...l, laborAmount: money(l.laborCents), ownMaterialAmount: money(l.ownMaterialCents), deductions: l.deductions.map((d) => ({ ...d, amount: money(d.cents) })), payable: money(l.laborCents + l.ownMaterialCents - l.deductions.reduce((d, x) => d + x.cents, 0)) })),
      chart: months,
      cashOperations: desk ? db.cashOperations.filter((op) => op.deskId === desk.id).slice(0, 20).map((op) => ({ ...op, amount: money(op.amountCents) })) : [],
    };
  }),

  route.post("/technician/cash/handover", async ({ ctx, body }) => {
    requireTechnician(ctx);
    const desk = db.cashDesks.find((d) => d.holderId === ctx.user!.id);
    if (!desk) throw apiError(404, "NO_CASH_DESK", "error.notFound");
    const { amount } = await body<{ amount: string }>();
    const cents = Math.round(Number(amount) * 100);
    if (!(cents > 0) || cents > desk.balanceCents) throw validationError({ amount: ["validation.amountRange"] });
    desk.pendingHandoverCents += cents;
    db.cashOperations.unshift({ id: newId("cashop"), deskId: desk.id, kind: "HANDOVER", amountCents: cents, orderNumber: null, fiscalNumber: null, actorName: fullName(ctx.user), at: nowIso(), status: "PENDING", note: "Filial kassasına təhvil" });
    notify(db.users.find((u) => u.roles.includes("ACCOUNTANT"))?.id, "CASH_HANDOVER", "notif.paymentOk", L(`${fullName(ctx.user)}: ${amount} AZN nağd təhvil gözləyir`), "/cash-desks");
    return { ok: true };
  }),

  route.get("/technician/reviews", ({ ctx, url }) => {
    const t = requireTechnician(ctx);
    const rows = db.reviews.filter((r) => r.target === "TECHNICIAN" && r.targetId === t.id).map((r) => ({ ...r, orderNumber: r.orderId ? db.serviceOrders.find((o) => o.id === r.orderId)?.number ?? null : null, availableActions: !r.reply && r.status === "PUBLISHED" ? [{ code: "reply" }] : [] }));
    return { ...list(url, rows, { defaultSort: "-createdAt" }), rating: t.rating, count: t.reviewCount, distribution: [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: rows.filter((r) => r.rating === s).length })) };
  }),

  route.post("/technician/reviews/:id/reply", async ({ ctx, params, body }) => {
    const t = requireTechnician(ctx);
    const r = db.reviews.find((x) => x.id === params.id && x.targetId === t.id);
    if (!r) notFound();
    const { reply } = await body<{ reply: string }>();
    if (!reply || reply.trim().length < 3) throw validationError({ reply: ["validation.required"] });
    r.reply = reply;
    return r;
  }),

  route.get("/technician/documents", ({ ctx }) => {
    const t = requireTechnician(ctx);
    return { status: t.status, documents: t.documents, license: t.employmentType === "STAFF" ? db.staffLicenses.find((l) => l.technicianId === t.id) ?? null : null, partnerships: db.partnerships.filter((p) => p.technicianId === t.id) };
  }),

  route.post("/technician/documents", async ({ ctx, body }) => {
    const t = requireTechnician(ctx);
    const data = await body<{ kind: "ID_CARD" | "CERTIFICATE" | "DIPLOMA" | "CRIMINAL_RECORD" | "OTHER"; name: string; size: number; mimeType: string; expiresAt?: string }>();
    if (!data.name) throw validationError({ file: ["validation.required"] });
    if (data.size > 10 * 1024 * 1024) throw validationError({ file: ["validation.fileTooLarge"] });
    if (!["application/pdf", "image/jpeg", "image/png"].includes(data.mimeType)) throw validationError({ file: ["validation.fileType"] });
    const doc = { id: newId("doc"), kind: data.kind, name: data.name, status: "PENDING" as const, expiresAt: data.expiresAt ?? null, uploadedAt: nowIso(), note: null };
    t.documents.push(doc);
    return doc;
  }),

  route.get("/technician/statistics", ({ ctx }) => {
    const t = requireTechnician(ctx);
    const jobs = visibleOrders(ctx);
    const closed = jobs.filter((o) => ["CLOSED", "COMPLETED"].includes(o.status));
    const advanced = !!ctx.entitlements.advanced_statistics;
    const byService = new Map<string, { name: unknown; count: number }>();
    for (const o of closed) {
      const s = db.services.find((x) => x.id === o.serviceId)!;
      byService.set(s.id, { name: s.name, count: (byService.get(s.id)?.count ?? 0) + 1 });
    }
    return {
      advanced,
      basic: { completedJobs: t.completedJobs, rating: t.rating, onTimeRate: t.onTimeRate, activeJobs: jobs.filter((o) => ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length },
      detailed: advanced
        ? {
            revenueByMonth: [5, 4, 3, 2, 1, 0].map((m) => ({ month: periodLabel(new Date(daysAgo(m * 30))), revenue: closed.filter((o) => periodLabel(new Date(o.closedAt ?? o.createdAt)) === periodLabel(new Date(daysAgo(m * 30)))).reduce((s, o) => s + orderAmounts(o).total / 100, 0) })),
            byService: [...byService.values()],
            firstVisitFix: 78,
            warrantyClaimRate: t.warrantyClaimRate,
            avgJobMinutes: 96,
            estimateApprovalRate: 74,
            stagesCompleted: jobs.reduce((s, o) => s + o.stages.filter((st) => st.assigneeId === ctx.user!.id && isDone(st)).length, 0),
          }
        : null,
    };
  }),

  route.get("/technician/settings", ({ ctx }) => {
    const t = requireTechnician(ctx);
    return { profile: technicianDto(t, ctx), zones: db.zones.map((z) => ({ id: z.id, name: z.name, city: z.city, selected: t.zoneIds.includes(z.id), polygon: z.polygon })), zoneLimit: lim(ctx, "max_zones"), editableZones: t.employmentType === "INDEPENDENT", services: db.services.filter((s) => s.specializationIds.every((sid) => t.specializations.some((x) => x.specializationId === sid))).map(serviceDto) };
  }),

  route.patch("/technician/settings", async ({ ctx, body }) => {
    const t = requireTechnician(ctx);
    const data = await body<{ bio?: string; workingHours?: typeof t.workingHours; zoneIds?: string[]; languages?: string[]; promoted?: boolean; experienceYears?: number }>();
    if (data.bio !== undefined && data.bio.length > 600) throw validationError({ bio: ["validation.tooLong"] });
    if (data.experienceYears !== undefined) {
      if (!(Number(data.experienceYears) >= 0 && Number(data.experienceYears) <= 60)) throw validationError({ experienceYears: ["validation.amountRange"] });
      t.experienceYears = Number(data.experienceYears);
    }
    if (data.zoneIds) {
      if (t.employmentType === "STAFF") throw apiError(403, "STAFF_ZONES", "error.forbidden");
      const max = lim(ctx, "max_zones");
      if (max !== null && data.zoneIds.length > max) throw validationError({ zoneIds: ["validation.zoneLimit"] });
      if (!data.zoneIds.length) throw validationError({ zoneIds: ["validation.selectAtLeastOne"] });
      t.zoneIds = data.zoneIds;
    }
    if (data.workingHours) {
      if (data.workingHours.some((h) => !h.off && h.from >= h.to)) throw validationError({ workingHours: ["validation.dateRange"] });
      t.workingHours = data.workingHours;
    }
    if (data.bio !== undefined) t.bio = { az: data.bio, ru: data.bio, en: data.bio };
    if (data.languages) t.languages = data.languages;
    if (data.promoted !== undefined) {
      if (!ctx.entitlements.promote) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement");
      t.promoted = data.promoted;
    }
    audit(ctx, "edit", "technicians", t.id, fullName(ctx.user));
    return technicianDto(t, ctx);
  }),
];

const scheduleBlocks = new Map<string, { id: string; kind: string; title: string; start: string; end: string; orderId: null; status: null; address: null }[]>();
const customerNotes = new Map<string, string>();
