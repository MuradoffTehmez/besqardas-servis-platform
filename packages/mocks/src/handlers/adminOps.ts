import { db } from "../db/state";
import { can, fullName, isManager, type Ctx } from "../engine/context";
import { audit, notify } from "../engine/effects";
import { createServiceOrder } from "../engine/orders";
import { estimateTotals, isDone, latestEstimate, orderAmounts, rankTechnicians } from "../engine/workflow";
import { find, list, notFound, requireAuth, requirePerm, route, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { bakuAt, daysAgo, nowIso, periodLabel } from "../lib/time";
import { branchName, logisticsTaskDto, serviceOrderSummaryDto, specName, technicianDto, templateDto, userDto, warrantyDto, planDto } from "../dto";
import { visibleOrders } from "./account";
import { transitionTask } from "./courier";
import { crud, required } from "../lib/crud";
import { roleLabels, RESOURCES } from "../data/rbac";
import type { TemplateRec } from "../data/services";

/** Admin — servis əməliyyatları, istifadəçilər, rollar, hesabatlar (PRD §61). */

const scoped = <T extends { branchId: string | null }>(ctx: Ctx, rows: T[], resource: string) => (ctx.scopes[resource] === "BRANCH" ? rows.filter((r) => !r.branchId || r.branchId === ctx.user!.branchId) : rows);

function validateTemplate(tpl: TemplateRec) {
  const errors: { code: string; message: ReturnType<typeof L>; stageId: string | null }[] = [];
  if (!tpl.stages.some((s) => s.type === "EXECUTION")) errors.push({ code: "NO_EXECUTION", message: L("Ən azı bir icra mərhələsi olmalıdır", "Нужен хотя бы один этап выполнения", "At least one execution stage is required"), stageId: null });
  if (!tpl.stages.some((s) => s.type === "HANDOVER")) errors.push({ code: "NO_HANDOVER", message: L("Ən azı bir təhvil mərhələsi olmalıdır", "Нужен хотя бы один этап сдачи", "At least one handover stage is required"), stageId: null });
  const estimateIdx = tpl.stages.findIndex((s) => s.type === "ESTIMATE_APPROVAL");
  tpl.stages.forEach((s, i) => {
    if (!s.name.az?.trim()) errors.push({ code: "NAME_REQUIRED", message: L("Mərhələ adı boş ola bilməz", "Название этапа обязательно", "Stage name is required"), stageId: s.id });
    if (s.startConditions.includes("ESTIMATE_APPROVED") && (estimateIdx === -1 || estimateIdx > i)) errors.push({ code: "CONDITION_CONFLICT", message: L(`"${s.name.az}": smeta təsdiqi şərti smeta mərhələsindən əvvəl ola bilməz`, `«${s.name.ru}»: условие одобрения сметы раньше этапа сметы`, `"${s.name.en}": estimate-approved condition precedes the estimate stage`), stageId: s.id });
    if (i === 0 && s.parallelWithPrevious) errors.push({ code: "PARALLEL_FIRST", message: L("İlk mərhələ paralel ola bilməz", "Первый этап не может быть параллельным", "First stage can't be parallel"), stageId: s.id });
  });
  return { valid: errors.length === 0, errors };
}

export const adminOpsHandlers = [
  /* ---------------- Dashboard (§61 widget-ləri rola görə) ---------------- */
  route.get("/admin/dashboard", ({ ctx }) => {
    const u = requireAuth(ctx);
    const orders = visibleOrders(ctx);
    const today = bakuAt(0, 0);
    const widgets: { code: string; title: ReturnType<typeof L>; value: string; delta: string | null; trend: "up" | "down" | "flat" | null; tone: string; href: string | null }[] = [];
    const w = (code: string, title: ReturnType<typeof L>, value: string, tone = "default", href: string | null = null, delta: string | null = null, trend: "up" | "down" | "flat" | null = null) => widgets.push({ code, title, value, delta, trend, tone, href });
    const breached = orders.filter((o) => o.stages.some((s) => !isDone(s) && s.readyAt && s.slaMinutes && new Date(s.readyAt).getTime() + s.slaMinutes * 60000 < Date.now()));
    if (can(ctx, "service_orders:view")) {
      w("orders_today", L("Bugünkü sifarişlər", "Заказы сегодня", "Orders today"), String(orders.filter((o) => o.createdAt >= today).length), "default", "/service-orders", "+12%", "up");
      w("active_services", L("Aktiv servislər", "Активные сервисы", "Active services"), String(orders.filter((o) => ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length), "default", "/service-orders?status=IN_PROGRESS");
      w("unassigned", L("Təyin olunmamış", "Не назначены", "Unassigned"), String(orders.filter((o) => o.stages.some((s) => s.status === "READY" && (s.executor === "DISPATCHER" || s.executor === "TECHNICIAN"))).length), "warning", "/dispatch");
      w("sla_breaches", L("SLA pozuntuları", "Нарушения SLA", "SLA breaches"), String(breached.length), breached.length ? "danger" : "success", "/service-orders?slaBreached=true");
    }
    if (can(ctx, "finance_reports:view") || can(ctx, "sales_orders:view")) {
      const monthStart = new Date(bakuAt(-(new Date().getUTCDate() - 1), 0)).toISOString();
      const revenue = db.payments.filter((p) => p.status === "PAID" && (p.paidAt ?? "") >= monthStart).reduce((s, p) => s + p.amountCents, 0);
      w("revenue_month", L("Aylıq gəlir", "Выручка за месяц", "Monthly revenue"), money(revenue).amount + " ₼", "success", "/finance", "+8.4%", "up");
      w("sales_open", L("Açıq satış sifarişləri", "Открытые заказы", "Open sales orders"), String(db.salesOrders.filter((s) => ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED"].includes(s.status)).length), "default", "/sales-orders");
    }
    if (can(ctx, "inventory:view")) {
      const low = db.stock.filter((s) => s.physical - s.reserved - s.damaged < s.minLevel);
      w("low_stock", L("Aşağı stok", "Низкий остаток", "Low stock"), String(low.length), low.length ? "warning" : "success", "/inventory?belowMin=true");
      w("transfers_transit", L("Yolda olan transferlər", "Трансферы в пути", "Transfers in transit"), String(db.transfers.filter((t) => t.status === "IN_TRANSIT").length), "default", "/transfers");
    }
    if (can(ctx, "b2b_accounts:view")) w("b2b_debt", L("B2B borcları", "Долги B2B", "B2B receivables"), money(db.b2bAccounts.reduce((s, c) => s + c.debtCents, 0)).amount + " ₼", "warning", "/b2b-accounts");
    if (can(ctx, "payments:view") || isManager(ctx)) w("cash_on_hand", L("Kassalarda və ustalarda nağd", "Наличные в кассах и у мастеров", "Cash at desks & technicians"), money(db.cashDesks.reduce((s, d) => s + d.balanceCents, 0)).amount + " ₼", db.cashDesks.some((d) => d.limitCents && d.balanceCents > d.limitCents) ? "danger" : "default", "/cash-desks");
    if (can(ctx, "subscription_plans:view") || can(ctx, "customers:view")) w("new_customers", L("Yeni müştərilər (30 gün)", "Новые клиенты (30 дней)", "New customers (30 days)"), String(db.users.filter((x) => x.roles.includes("CUSTOMER") && x.createdAt > daysAgo(30)).length + 47), "default", "/customers", "+5", "up");
    if (can(ctx, "subscription_plans:view")) w("subscriptions", L("Aktiv abunəliklər", "Активные подписки", "Active subscriptions"), String(db.subscriptions.filter((s) => ["ACTIVE", "TRIAL"].includes(s.status)).length), "default", "/subscriptions");
    const techLoad = db.technicians.filter((t) => t.status === "ACTIVE").map((t) => ({ id: t.id, name: fullName(db.users.find((x) => x.id === t.userId)), employmentType: t.employmentType, active: db.serviceOrders.filter((o) => o.technicianId === t.id && ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length, rating: t.rating }));
    return {
      user: { name: fullName(u), role: roleLabels[ctx.role], branchName: branchName(u.branchId) },
      widgets,
      ordersByDay: [6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: bakuAt(-d, 12).slice(0, 10), created: db.serviceOrders.filter((o) => o.createdAt.slice(0, 10) === bakuAt(-d, 12).slice(0, 10)).length + (6 - d) % 3 + 2, completed: db.serviceOrders.filter((o) => (o.closedAt ?? "").slice(0, 10) === bakuAt(-d, 12).slice(0, 10)).length + (d % 2) + 1 })),
      ordersByStatus: ["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ON_HOLD", "COMPLETED", "CLOSED", "CANCELLED"].map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length })),
      technicianLoad: can(ctx, "technicians:view") || can(ctx, "assignments:view") ? techLoad : [],
      slaBreaches: breached.slice(0, 6).map((o) => serviceOrderSummaryDto(o, ctx)),
      newOrders: orders.filter((o) => o.status === "NEW").slice(0, 6).map((o) => serviceOrderSummaryDto(o, ctx)),
      lowStock: can(ctx, "inventory:view") ? db.stock.filter((s) => s.physical - s.reserved - s.damaged < s.minLevel).slice(0, 6).map((s) => ({ id: s.id, product: db.products.find((p) => p.id === s.productId)!.name, warehouse: db.warehouses.find((x) => x.id === s.warehouseId)!.name, available: s.physical - s.reserved - s.damaged, min: s.minLevel })) : [],
    };
  }),

  /* ---------------- Dispetçer lövhəsi (§16) ---------------- */
  route.get("/admin/dispatch", ({ ctx, url }) => {
    requirePerm(ctx, "assignments:view", "service_orders:view");
    const offset = Number(url.searchParams.get("dayOffset") ?? 0);
    const dayStart = new Date(bakuAt(offset, 0)).getTime();
    const dayEnd = dayStart + 86400_000;
    const branch = url.searchParams.get("branchId");
    const orders = visibleOrders(ctx).filter((o) => !branch || o.branchId === branch);
    const techs = db.technicians.filter((t) => t.status === "ACTIVE" && (!branch || t.branchId === branch || t.employmentType === "INDEPENDENT"));
    return {
      date: bakuAt(offset, 12).slice(0, 10),
      technicians: techs.map((t) => {
        const events = orders
          .filter((o) => o.technicianId === t.id && o.scheduledAt && new Date(o.scheduledAt).getTime() >= dayStart && new Date(o.scheduledAt).getTime() < dayEnd && !["CANCELLED", "REJECTED"].includes(o.status))
          .map((o) => {
            const start = o.scheduledAt!;
            const end = new Date(new Date(start).getTime() + db.services.find((s) => s.id === o.serviceId)!.durationMinutes * 60000).toISOString();
            return { id: `${o.id}-ev`, orderId: o.id, orderNumber: o.number, title: db.services.find((s) => s.id === o.serviceId)!.name, start, end, status: o.status, slaBreached: serviceOrderSummaryDto(o, ctx).slaBreached, conflict: false };
          })
          .sort((a, b) => a.start.localeCompare(b.start));
        events.forEach((e, i) => { if (i > 0 && e.start < events[i - 1]!.end) { e.conflict = true; events[i - 1]!.conflict = true; } });
        const user = db.users.find((x) => x.id === t.userId)!;
        return { id: t.id, fullName: fullName(user), avatarTone: user.avatarTone, avatarUrl: user.avatarUrl ?? null, employmentType: t.employmentType, specializations: t.specializations.filter((s) => s.status === "ACTIVE").map((s) => specName(s.specializationId)), workload: orders.filter((o) => o.technicianId === t.id && ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length, rating: t.rating, location: t.location, zoneNames: t.zoneIds.map((z) => db.zones.find((x) => x.id === z)?.name ?? L("—")), city: t.city, workingHours: t.workingHours, events };
      }),
      unassigned: orders.filter((o) => !["CANCELLED", "REJECTED", "CLOSED", "COMPLETED", "ON_HOLD"].includes(o.status) && o.stages.some((s) => (s.status === "READY" || s.status === "FAILED") && (s.executor === "DISPATCHER" || s.executor === "TECHNICIAN"))).map((o) => ({ ...serviceOrderSummaryDto(o, ctx), stageId: o.stages.find((s) => (s.status === "READY" || s.status === "FAILED") && (s.executor === "DISPATCHER" || s.executor === "TECHNICIAN"))!.id, location: o.address?.location ?? null, candidates: rankTechnicians(o, null).slice(0, 3).map((r) => r.id) })),
      pendingOffers: orders.filter((o) => o.stages.some((s) => s.status === "ASSIGNED")).map((o) => ({ ...serviceOrderSummaryDto(o, ctx), offeredTo: fullName(db.users.find((x) => x.id === o.stages.find((s) => s.status === "ASSIGNED")!.assigneeId)) })),
      alerts: [
        ...orders.filter((o) => serviceOrderSummaryDto(o, ctx).slaBreached).slice(0, 5).map((o) => ({ id: `sla-${o.id}`, kind: "SLA", message: L(`${o.number}: mərhələnin SLA-sı aşılıb`, `${o.number}: нарушен SLA этапа`, `${o.number}: stage SLA breached`), orderId: o.id })),
        ...orders.filter((o) => o.needsReschedule).map((o) => ({ id: `fail-${o.id}`, kind: "CONFLICT", message: L(`${o.number}: yenidən planlaşdırma tələb olunur`, `${o.number}: требуется перепланирование`, `${o.number}: needs rescheduling`), orderId: o.id })),
      ],
      branches: db.branches.map((b) => ({ id: b.id, name: b.name, location: b.location })),
    };
  }),

  route.get("/admin/service-orders/:id/candidates", ({ ctx, params, url }) => {
    requirePerm(ctx, "assignments:assign");
    const o = find(db.serviceOrders, params.id);
    const stage = o.stages.find((s) => s.id === url.searchParams.get("stageId")) ?? null;
    return rankTechnicians(o, stage).map((r) => ({ ...r, score: Math.round(r.score), distanceKm: Math.round(r.distance * 10) / 10, technician: technicianDto(db.technicians.find((t) => t.id === r.id)!, ctx) }));
  }),

  route.get("/admin/couriers-available", ({ ctx }) => {
    requirePerm(ctx, "logistics_tasks:view");
    return db.users.filter((u) => u.roles.includes("COURIER") || (u.roles.includes("TECHNICIAN") && db.technicians.find((t) => t.userId === u.id)?.employmentType === "STAFF")).map((u) => ({ id: u.id, fullName: fullName(u), kind: u.roles.includes("COURIER") ? "COURIER" : "TECHNICIAN", openTasks: db.logisticsTasks.filter((t) => t.assigneeId === u.id && !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status)).length, branchName: branchName(u.branchId) }));
  }),

  /* ---------------- Smetalar ---------------- */
  route.get("/admin/estimates", ({ ctx, url }) => {
    requirePerm(ctx, "service_orders:view");
    const rows = visibleOrders(ctx).flatMap((o) =>
      o.estimates.map((e) => ({ id: e.id, number: e.number, orderId: o.id, orderNumber: o.number, version: e.version, status: e.status, customerName: serviceOrderSummaryDto(o, ctx).customerName, serviceName: db.services.find((s) => s.id === o.serviceId)!.name, total: money(estimateTotals(o, e).total), createdAt: e.createdAt, createdBy: e.createdBy, validUntil: e.validUntil, decidedAt: e.decidedAt, decisionChannel: e.decisionChannel, expired: e.status === "SENT" && new Date(e.validUntil).getTime() < Date.now() })),
    );
    return list(url, rows, { search: (r) => `${r.number} ${r.orderNumber} ${r.customerName}`, defaultSort: "-createdAt" });
  }),

  /* ---------------- Logistika ---------------- */
  route.get("/admin/logistics", ({ ctx, url }) => {
    requirePerm(ctx, "logistics_tasks:view");
    const rows = scoped(ctx, db.logisticsTasks, "logistics_tasks").map((t) => logisticsTaskDto(t, ctx));
    return list(url, rows, { search: (t) => `${t.number} ${t.relatedOrderNumber ?? ""} ${t.to.address} ${t.assigneeName ?? ""}`, dateField: "windowStart", defaultSort: "windowStart" });
  }),

  route.get("/admin/logistics/:id", ({ ctx, params }) => {
    requirePerm(ctx, "logistics_tasks:view");
    return logisticsTaskDto(find(db.logisticsTasks, params.id), ctx);
  }),

  route.post("/admin/logistics/:id/assign", async ({ ctx, params, body }) => {
    requirePerm(ctx, "logistics_tasks:assign");
    const task = find(db.logisticsTasks, params.id);
    const { assigneeId, windowStart } = await body<{ assigneeId: string; windowStart?: string }>();
    const assignee = db.users.find((u) => u.id === assigneeId);
    if (!assignee) throw validationError({ assigneeId: ["validation.required"] });
    if (!["PLANNED", "ASSIGNED", "FAILED"].includes(task.status)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    task.assigneeId = assignee.id;
    task.assigneeKind = assignee.roles.includes("COURIER") ? "COURIER" : assignee.roles.includes("TECHNICIAN") ? "TECHNICIAN" : "WAREHOUSE_EMPLOYEE";
    task.status = "ASSIGNED";
    task.failReason = null;
    if (windowStart) { task.windowStart = windowStart; task.windowEnd = new Date(new Date(windowStart).getTime() + 7200_000).toISOString(); }
    task.history.unshift({ at: nowIso(), status: "ASSIGNED", actor: fullName(ctx.user), note: fullName(assignee) });
    const order = db.serviceOrders.find((o) => o.id === task.relatedOrderId);
    const stage = order?.stages.find((s) => s.id === task.stageId);
    if (stage && !isDone(stage)) { stage.status = "ASSIGNED"; stage.assigneeId = assignee.id; }
    notify(assignee.id, "NEW_TASK", "notif.newTask", L(`${task.number}: ${task.from.address} → ${task.to.address}`), `/courier/tasks/${task.id}`, "SMS");
    audit(ctx, "assign", "logistics_tasks", task.id, task.number, [{ field: "assignee", from: null, to: fullName(assignee) }]);
    return logisticsTaskDto(task, ctx);
  }),

  route.post("/admin/logistics/:id/status", async ({ ctx, params, body }) => {
    requirePerm(ctx, "logistics_tasks:edit");
    const task = find(db.logisticsTasks, params.id);
    transitionTask(task, ctx, { ...(await body()), signed: true, photos: 1 });
    return logisticsTaskDto(task, ctx);
  }),

  route.post("/admin/logistics", async ({ ctx, body }) => {
    requirePerm(ctx, "logistics_tasks:create", "logistics_tasks:edit");
    const data = await body<{ type: "PICKUP" | "DELIVERY" | "TRANSFER"; fromAddress: string; toAddress: string; windowStart: string; cargo: string; note?: string; contactName?: string; contactPhone?: string }>();
    const errors = required(data as unknown as Record<string, unknown>, "type", "fromAddress", "toAddress", "windowStart", "cargo");
    if (errors) throw validationError(errors);
    const task = { id: newId("lt"), number: `LT-${4100 + db.logisticsTasks.length}`, type: data.type, status: "PLANNED" as const, from: { label: data.fromAddress, address: data.fromAddress, location: null }, to: { label: data.toAddress, address: data.toAddress, location: null }, windowStart: data.windowStart, windowEnd: new Date(new Date(data.windowStart).getTime() + 7200_000).toISOString(), assigneeId: null, assigneeKind: null, cargo: [{ kind: "MATERIAL" as const, name: data.cargo, quantity: "1", note: null }], relatedOrderId: null, relatedOrderNumber: null, relatedOrderKind: "TRANSFER" as const, stageId: null, contact: data.contactName ? { name: data.contactName, phone: data.contactPhone ?? "" } : null, note: data.note ?? null, collectCashCents: null, photos: 0, signed: false, failReason: null, history: [{ at: nowIso(), status: "PLANNED" as const, actor: fullName(ctx.user), note: null }], branchId: ctx.user!.branchId ?? db.branches[0]!.id, createdAt: nowIso() };
    db.logisticsTasks.unshift(task);
    return logisticsTaskDto(task, ctx);
  }),

  /* ---------------- Zəmanət iddiaları (§23.4) ---------------- */
  route.get("/admin/warranty-claims", ({ ctx, url }) => {
    requirePerm(ctx, "service_orders:view");
    const rows = db.warrantyClaims.map((c) => {
      const w = db.warranties.find((x) => x.id === c.warrantyId)!;
      const so = c.serviceOrderId ? db.serviceOrders.find((o) => o.id === c.serviceOrderId) : null;
      return { ...c, warrantyNumber: w.number, warranty: warrantyDto(w), customerName: fullName(db.users.find((u) => u.id === c.customerId)), deviceName: w.deviceName, serviceOrderNumber: so?.number ?? null, originalOrderNumber: w.orderNumber, technicianName: so?.technicianId ? fullName(db.users.find((u) => u.id === so.technicianId)) : null, availableActions: c.status === "SUBMITTED" || c.status === "UNDER_REVIEW" ? [{ code: "approve", variant: "primary" }, { code: "reject", variant: "destructive", requiresReason: true }] : [] };
    });
    return list(url, rows, { defaultSort: "-createdAt", search: (r) => `${r.number} ${r.customerName} ${r.deviceName}` });
  }),

  route.post("/admin/warranty-claims/:id/decide", async ({ ctx, params, body }) => {
    requirePerm(ctx, "service_orders:edit");
    const claim = find(db.warrantyClaims, params.id);
    const { approve, note } = await body<{ approve: boolean; note?: string }>();
    const w = db.warranties.find((x) => x.id === claim.warrantyId)!;
    if (!approve) {
      if (!note) throw validationError({ note: ["validation.required"] });
      claim.status = "REJECTED";
      claim.decisionNote = note;
    } else {
      const original = db.serviceOrders.find((o) => o.id === w.orderId);
      const service = original ? original.serviceId : db.services.find((s) => s.serviceType === "REPAIR")!.id;
      const addr = original?.address ?? db.addresses.find((a) => a.ownerId === claim.customerId) ?? null;
      const order = createServiceOrder({ type: "WARRANTY", serviceId: db.services.find((s) => s.id === service && s.executionForms.includes("ON_SITE")) ? service : db.services.find((s) => s.serviceType === "REPAIR")!.id, executionForm: "ON_SITE", customerId: claim.customerId, deviceId: w.deviceId, description: `Zəmanət iddiası ${claim.number}: ${claim.description}`, address: addr ? { ...addr } : null, source: "WARRANTY", operatorId: ctx.user!.id, relatedOrderId: w.orderId });
      claim.status = "CONVERTED";
      claim.serviceOrderId = order.id;
      claim.decisionNote = note ?? null;
      notify(claim.customerId, "WARRANTY_APPROVED", "notif.orderConfirmed", L(`Zəmanət iddiası təsdiqləndi: ${order.number}`), `/account/services/${order.id}`, "SMS");
    }
    audit(ctx, approve ? "approve" : "reject", "warranty_claims", claim.id, claim.number, [], note);
    return { ok: true, claim };
  }),

  /* ---------------- Workflow şablonları (§17) ---------------- */
  route.get("/admin/workflow-templates", ({ ctx, url }) => {
    requirePerm(ctx, "workflow_templates:view");
    return list(url, db.templates.map(templateDto), { defaultSort: "code", defaultPageSize: 50, search: (t) => JSON.stringify(t.name) });
  }),

  route.get("/admin/workflow-templates/:id", ({ ctx, params }) => {
    requirePerm(ctx, "workflow_templates:view");
    const tpl = find(db.templates, params.id);
    return { ...templateDto(tpl), validation: validateTemplate(tpl), specializations: db.specializations.map((s) => ({ id: s.id, name: specName(s.id) })), canEdit: can(ctx, "workflow_templates:edit") };
  }),

  route.post("/admin/workflow-templates/:id/validate", async ({ ctx, params, body }) => {
    requirePerm(ctx, "workflow_templates:view");
    const tpl = find(db.templates, params.id);
    const data = await body<{ stages?: TemplateRec["stages"] }>();
    return validateTemplate({ ...tpl, stages: data.stages ?? tpl.stages });
  }),

  /** Dəyişiklik yeni versiya yaradır; aktiv sifarişlər başladıqları versiya ilə davam edir (§17.3). */
  route.put("/admin/workflow-templates/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "workflow_templates:edit");
    const tpl = find(db.templates, params.id);
    const data = await body<{ nameI18n?: TemplateRec["name"]; stages: TemplateRec["stages"]; activate?: boolean }>();
    const candidate = { ...tpl, stages: data.stages.map((s, i) => ({ ...s, id: s.id || newId("tstage"), order: i + 1 })) };
    const validation = validateTemplate(candidate);
    if (data.activate && !validation.valid) throw apiError(422, "TEMPLATE_INVALID", "error.templateInvalid", Object.fromEntries(validation.errors.map((e) => [e.stageId ?? e.code, [e.code]])));
    const previous = tpl.versions.find((v) => v.version === tpl.version);
    if (previous) previous.stages = tpl.stages;
    tpl.version += 1;
    tpl.stages = candidate.stages;
    if (data.nameI18n) tpl.name = data.nameI18n;
    tpl.status = data.activate ? "ACTIVE" : "DRAFT";
    tpl.versions.forEach((v) => { if (data.activate && v.status === "ACTIVE") v.status = "ARCHIVED"; });
    tpl.versions.push({ version: tpl.version, status: tpl.status, createdAt: nowIso(), createdBy: fullName(ctx.user) });
    tpl.updatedAt = nowIso();
    audit(ctx, "edit", "workflow_templates", tpl.id, `${tpl.code} v${tpl.version}`, [{ field: "stages", from: String(previous?.stages?.length ?? ""), to: String(tpl.stages.length) }, { field: "status", from: null, to: tpl.status }]);
    return { ...templateDto(tpl), validation };
  }),

  route.post("/admin/workflow-templates/:id/:op", ({ ctx, params }) => {
    requirePerm(ctx, "workflow_templates:edit");
    const tpl = find(db.templates, params.id);
    if (params.op === "activate") {
      const v = validateTemplate(tpl);
      if (!v.valid) throw apiError(422, "TEMPLATE_INVALID", "error.templateInvalid");
      tpl.status = "ACTIVE";
      tpl.versions.forEach((x) => (x.status = x.version === tpl.version ? "ACTIVE" : "ARCHIVED"));
    } else if (params.op === "archive") {
      if (db.services.some((s) => Object.values(s.templateIds).includes(tpl.id))) throw apiError(409, "TEMPLATE_IN_USE", "error.actionNotAllowed");
      tpl.status = "ARCHIVED";
    } else notFound();
    audit(ctx, params.op, "workflow_templates", tpl.id, tpl.code);
    return templateDto(tpl);
  }),

  /* ---------------- Müştərilər ---------------- */
  route.get("/admin/customers", ({ ctx, url }) => {
    requirePerm(ctx, "customers:view");
    const rows = db.users.filter((u) => u.roles.includes("CUSTOMER")).map((u) => {
      const orders = db.serviceOrders.filter((o) => o.customerId === u.id);
      const spent = db.payments.filter((p) => p.payerId === u.id && p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
      const sub = db.subscriptions.find((s) => s.subscriberId === u.id && s.subscriberType === "CUSTOMER");
      return { id: u.id, fullName: fullName(u), phone: u.phone, email: u.email, segment: u.segment ?? "RETAIL", planCode: db.plans.find((p) => p.id === (sub?.planId ?? u.planId))?.code ?? "CUSTOMER_BASIC", city: u.city, devicesCount: db.devices.filter((d) => d.ownerId === u.id).length, ordersCount: orders.length, totalSpent: money(spent), lastOrderAt: orders.map((o) => o.createdAt).sort().at(-1) ?? null, createdAt: u.createdAt, status: u.status === "BLOCKED" ? "BLOCKED" : "ACTIVE", consent: { personalData: true, marketing: u.marketingConsent }, avatarTone: u.avatarTone, avatarUrl: u.avatarUrl ?? null };
    });
    return list(url, rows, { search: (c) => `${c.fullName} ${c.phone ?? ""} ${c.email ?? ""}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/customers/:id", ({ ctx, params }) => {
    requirePerm(ctx, "customers:view");
    const u = find(db.users, params.id);
    return {
      ...userDto(u),
      plan: db.plans.find((p) => p.id === u.planId) ? planDto(db.plans.find((p) => p.id === u.planId)!) : null,
      addresses: db.addresses.filter((a) => a.ownerId === u.id),
      devices: db.devices.filter((d) => d.ownerId === u.id).map((d) => ({ id: d.id, modelName: d.modelName, serialNumber: d.serialNumber, nextServiceAt: d.nextServiceAt })),
      serviceOrders: db.serviceOrders.filter((o) => o.customerId === u.id).map((o) => serviceOrderSummaryDto(o, ctx)),
      salesOrders: db.salesOrders.filter((s) => s.customerId === u.id).map((s) => ({ id: s.id, number: s.number, status: s.status, total: money(s.totalCents), createdAt: s.createdAt })),
      payments: db.payments.filter((p) => p.payerId === u.id).slice(0, 10).map((p) => ({ id: p.id, number: p.number, status: p.status, amount: money(p.amountCents), method: p.method, createdAt: p.createdAt })),
      warranties: db.warranties.filter((w) => w.customerId === u.id).map(warrantyDto),
      consent: { personalData: true, marketing: u.marketingConsent },
    };
  }),

  route.post("/admin/customers", async ({ ctx, body }) => {
    requirePerm(ctx, "customers:create", "customers:edit");
    const data = await body<{ firstName: string; lastName: string; phone: string; email?: string }>();
    const errors = required(data as unknown as Record<string, unknown>, "firstName", "lastName", "phone");
    if (errors) throw validationError(errors);
    const { normalizeAzPhone } = await import("@sp/utils");
    if (db.users.some((u) => u.phone && normalizeAzPhone(u.phone) === normalizeAzPhone(data.phone))) throw validationError({ phone: ["validation.alreadyExists"] });
    // Operator müştərini telefonla qeydiyyatdan keçirir; müştəri ilk girişdə OTP ilə təsdiqləyir (§13.3)
    const { createCustomer } = await import("./auth");
    const u = createCustomer({ firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email ?? null, password: "", locale: "az", marketingConsent: false });
    u.status = "PENDING_VERIFICATION";
    audit(ctx, "create", "customers", u.id, fullName(u));
    return userDto(u);
  }),

  /* ---------------- Ustalar, yoxlama, lisenziya, əməkdaşlıq ---------------- */
  route.get("/admin/technicians", ({ ctx, url }) => {
    requirePerm(ctx, "technicians:view", "assignments:view");
    const rows = db.technicians.map((t) => ({ ...technicianDto(t, ctx), branchId: t.branchId, pendingDocuments: t.documents.filter((d) => d.status === "PENDING").length, pendingSpecializations: t.specializations.filter((s) => s.status === "PENDING_APPROVAL").length, subscriptionStatus: db.subscriptions.find((s) => s.subscriberId === t.userId)?.status ?? null }));
    return list(url, rows, { search: (t) => `${t.fullName} ${t.phone ?? ""}`, defaultSort: "-rating", defaultPageSize: 50 });
  }),

  route.get("/admin/technicians/:id", ({ ctx, params }) => {
    requirePerm(ctx, "technicians:view", "assignments:view");
    const t = find(db.technicians, params.id);
    const user = db.users.find((u) => u.id === t.userId)!;
    return {
      ...technicianDto(t, ctx),
      user: userDto(user),
      subscription: db.subscriptions.find((s) => s.subscriberId === t.userId) ?? null,
      license: db.staffLicenses.find((l) => l.technicianId === t.id) ?? null,
      partnerships: db.partnerships.filter((p) => p.technicianId === t.id),
      jobs: db.serviceOrders.filter((o) => o.technicianId === t.id).slice(0, 20).map((o) => serviceOrderSummaryDto(o, ctx)),
      settlements: db.settlementLines.filter((l) => l.technicianId === t.id).slice(0, 10).map((l) => ({ ...l, payable: money(l.laborCents + l.ownMaterialCents - l.deductions.reduce((s, d) => s + d.cents, 0)) })),
      cashDesk: db.cashDesks.find((d) => d.holderId === t.userId) ?? null,
    };
  }),

  route.get("/admin/technicians-verification", ({ ctx }) => {
    requirePerm(ctx, "technicians:view");
    return db.technicians
      .filter((t) => t.status === "PENDING_VERIFICATION" || t.documents.some((d) => d.status === "PENDING" || d.status === "EXPIRED") || t.specializations.some((s) => s.status === "PENDING_APPROVAL" || s.status === "INACTIVE_CERT_EXPIRED"))
      .map((t) => ({ ...technicianDto(t, ctx), specializationDetails: technicianDto(t, ctx).specializationDetails, documents: t.documents, appliedAt: t.joinedAt }));
  }),

  route.post("/admin/technicians/:id/verify", async ({ ctx, params, body }) => {
    requirePerm(ctx, "technicians:edit");
    const t = find(db.technicians, params.id);
    const data = await body<{ target: "DOCUMENT" | "SPECIALIZATION" | "ACCOUNT"; targetId?: string; approve: boolean; note?: string }>();
    if (!data.approve && !data.note) throw validationError({ note: ["validation.required"] });
    if (data.target === "DOCUMENT") {
      const d = t.documents.find((x) => x.id === data.targetId);
      if (!d) notFound();
      d.status = data.approve ? "VERIFIED" : "REJECTED";
      d.note = data.note ?? null;
    } else if (data.target === "SPECIALIZATION") {
      const s = t.specializations.find((x) => x.id === data.targetId);
      if (!s) notFound();
      s.status = data.approve ? "ACTIVE" : "INACTIVE_CERT_EXPIRED";
    } else {
      if (data.approve && t.documents.some((d) => d.status !== "VERIFIED")) throw apiError(409, "DOCUMENTS_PENDING", "error.actionNotAllowed", { documents: ["validation.documentsPending"] });
      t.status = data.approve ? "ACTIVE" : "REJECTED";
      const user = db.users.find((u) => u.id === t.userId)!;
      user.status = data.approve ? "ACTIVE" : "BLOCKED";
      if (data.approve) t.specializations.forEach((s) => s.status === "PENDING_APPROVAL" && (s.status = "ACTIVE"));
      const ps = db.partnerships.find((p) => p.technicianId === t.id && p.status === "PENDING");
      if (ps) ps.status = data.approve ? "APPROVED" : "REJECTED";
      notify(t.userId, "VERIFICATION", data.approve ? "notif.orderConfirmed" : "notif.paymentFail", data.approve ? L("Hesabınız yoxlanıldı və aktivləşdirildi", "Ваш аккаунт проверен и активирован", "Your account has been verified and activated") : L(`Müraciətiniz rədd edildi: ${data.note}`), "/technician/documents", "EMAIL");
    }
    audit(ctx, data.approve ? "approve" : "reject", "technicians", t.id, fullName(db.users.find((u) => u.id === t.userId)), [], data.note);
    return technicianDto(t, ctx);
  }),

  route.get("/admin/licenses", ({ ctx, url }) => {
    requirePerm(ctx, "technicians:view");
    const rows = db.technicians.filter((t) => t.employmentType === "STAFF").map((t) => {
      const lic = db.staffLicenses.find((l) => l.technicianId === t.id);
      return { id: lic?.id ?? t.id, technicianId: t.id, technicianName: fullName(db.users.find((u) => u.id === t.userId)), branchName: branchName(t.branchId), status: lic?.status ?? "NONE", issuedAt: lic?.issuedAt ?? null, issuedBy: lic?.issuedBy ?? null, revokedAt: lic?.revokedAt ?? null, capabilities: lic?.capabilities ?? null };
    });
    return { ...list(url, rows, { defaultSort: "technicianName" }), summary: { active: db.staffLicenses.filter((l) => l.status === "ACTIVE").length, contracted: 25 } };
  }),

  route.post("/admin/licenses/:technicianId", async ({ ctx, params, body }) => {
    requirePerm(ctx, "technicians:edit");
    const t = find(db.technicians, params.technicianId);
    if (t.employmentType !== "STAFF") throw apiError(409, "NOT_STAFF", "error.actionNotAllowed");
    const data = await body<{ action: "issue" | "revoke" | "update"; capabilities?: { materialReservation: boolean; statistics: boolean; customerHistory: boolean } }>();
    let lic = db.staffLicenses.find((l) => l.technicianId === t.id);
    if (data.action === "issue") {
      if (!lic) { lic = { id: newId("lic"), technicianId: t.id, status: "ACTIVE", issuedAt: nowIso(), issuedBy: fullName(ctx.user), revokedAt: null, capabilities: data.capabilities ?? { materialReservation: true, statistics: true, customerHistory: true } }; db.staffLicenses.push(lic); }
      lic.status = "ACTIVE"; lic.revokedAt = null;
    } else if (data.action === "revoke") {
      if (!lic) notFound();
      lic.status = "REVOKED"; lic.revokedAt = nowIso();
    } else if (lic && data.capabilities) lic.capabilities = data.capabilities;
    audit(ctx, data.action, "staff_licenses", t.id, fullName(db.users.find((u) => u.id === t.userId)));
    return lic;
  }),

  route.get("/admin/partnerships", ({ ctx, url }) => {
    requirePerm(ctx, "technicians:view");
    return list(url, db.partnerships.map((p) => ({ ...p, technicianName: fullName(db.users.find((u) => u.id === p.technicianId)), jobsCount: db.serviceOrders.filter((o) => o.technicianId === p.technicianId).length })), { defaultSort: "-createdAt" });
  }),

  route.post("/admin/partnerships/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "technicians:edit");
    const p = find(db.partnerships, params.id);
    const { status } = await body<{ status: "APPROVED" | "REJECTED" | "ENDED" }>();
    p.status = status;
    audit(ctx, status.toLowerCase(), "partnerships", p.id, fullName(db.users.find((u) => u.id === p.technicianId)));
    return p;
  }),

  route.get("/admin/couriers", ({ ctx, url }) => {
    requirePerm(ctx, "logistics_tasks:view");
    const rows = db.users.filter((u) => u.roles.includes("COURIER")).map((u) => ({ ...userDto(u), openTasks: db.logisticsTasks.filter((t) => t.assigneeId === u.id && !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status)).length, deliveredToday: db.logisticsTasks.filter((t) => t.assigneeId === u.id && t.status === "DELIVERED").length, cash: money(db.cashDesks.find((d) => d.holderId === u.id)?.balanceCents ?? 0) }));
    return list(url, rows, { search: (c) => c.fullName });
  }),

  route.get("/admin/employees", ({ ctx, url }) => {
    requirePerm(ctx, "users:view");
    const internal = ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN", "COURIER"];
    return list(url, db.users.filter((u) => u.roles.some((r) => internal.includes(r)) || (u.roles.includes("TECHNICIAN") && u.employmentType === "STAFF")).map(userDto), { search: (u) => `${u.fullName} ${u.email ?? ""}`, defaultSort: "fullName" });
  }),

  /* ---------------- İstifadəçilər və rollar (§8) ---------------- */
  route.get("/admin/users", ({ ctx, url }) => {
    requirePerm(ctx, "users:view");
    return list(url, db.users.map(userDto), { search: (u) => `${u.fullName} ${u.email ?? ""} ${u.phone ?? ""}`, defaultSort: "-createdAt" });
  }),

  route.post("/admin/users", async ({ ctx, body }) => {
    requirePerm(ctx, "users:create", "users:edit");
    const data = await body<{ firstName: string; lastName: string; email: string; phone?: string; roles: string[]; branchId?: string }>();
    const errors = required(data as unknown as Record<string, unknown>, "firstName", "lastName", "email", "roles");
    if (errors) throw validationError(errors);
    if (!data.roles.length) throw validationError({ roles: ["validation.selectAtLeastOne"] });
    if (data.roles.includes("SUPER_ADMIN") && ctx.role !== "SUPER_ADMIN") throw apiError(403, "FORBIDDEN", "error.forbidden");
    if (db.users.some((u) => u.email === data.email)) throw validationError({ email: ["validation.alreadyExists"] });
    const base = db.users.find((u) => u.roles.includes("OPERATOR"))!;
    const user = { ...base, id: newId("user"), firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone ?? null, roles: data.roles as typeof base.roles, branchId: data.branchId ?? null, status: "INVITED" as const, createdAt: nowIso(), lastLoginAt: null, favorites: [], compare: [] };
    db.users.push(user);
    audit(ctx, "invite", "users", user.id, fullName(user), [{ field: "roles", from: null, to: data.roles.join(",") }]);
    return userDto(user);
  }),

  route.patch("/admin/users/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "users:edit");
    const user = find(db.users, params.id);
    const data = await body<{ roles?: string[]; status?: "ACTIVE" | "BLOCKED"; branchId?: string | null }>();
    const changes = [];
    if (data.roles) {
      if (ctx.role !== "SUPER_ADMIN" && (data.roles.includes("SUPER_ADMIN") || user.roles.includes("SUPER_ADMIN"))) throw apiError(403, "FORBIDDEN", "error.forbidden");
      changes.push({ field: "roles", from: user.roles.join(","), to: data.roles.join(",") });
      user.roles = data.roles as typeof user.roles;
    }
    if (data.status) { changes.push({ field: "status", from: user.status, to: data.status }); user.status = data.status; if (data.status === "BLOCKED") for (const [sid, s] of db.sessions) if (s.userId === user.id) db.sessions.delete(sid); }
    if (data.branchId !== undefined) { changes.push({ field: "branchId", from: user.branchId, to: data.branchId }); user.branchId = data.branchId; }
    audit(ctx, "edit", "users", user.id, fullName(user), changes);
    return userDto(user);
  }),

  route.get("/admin/roles", ({ ctx }) => {
    requirePerm(ctx, "roles:view", "users:view");
    return {
      roles: db.roles.map((r) => ({ ...r, userCount: db.users.filter((u) => u.roles.includes(r.code)).length })),
      resources: RESOURCES,
      actions: ["view", "create", "edit", "delete", "approve", "assign", "export", "update_status"],
      scopes: ["OWN", "ASSIGNED", "BRANCH", "ORGANIZATION", "PLATFORM"],
      canEdit: ctx.role === "SUPER_ADMIN",
    };
  }),

  route.put("/admin/roles/:code", async ({ ctx, params, body }) => {
    requireAuth(ctx);
    // Rol və icazələrin redaktəsi yalnız Super Admin-dədir (§8.2)
    if (ctx.role !== "SUPER_ADMIN") throw apiError(403, "FORBIDDEN", "error.forbidden");
    const role = db.roles.find((r) => r.code === params.code);
    if (!role) notFound();
    const { permissions } = await body<{ permissions: { code: string; scope: "OWN" | "ASSIGNED" | "BRANCH" | "ORGANIZATION" | "PLATFORM" }[] }>();
    if (role.code === "SUPER_ADMIN") throw apiError(409, "IMMUTABLE_ROLE", "error.actionNotAllowed");
    audit(ctx, "edit", "roles", role.id, role.code, [{ field: "permissions", from: String(role.permissions.length), to: String(permissions.length) }]);
    role.permissions = permissions;
    return role;
  }),

  route.get("/admin/audit-logs", ({ ctx, url }) => {
    requirePerm(ctx, "audit_logs:view");
    // Menecer yalnız filial əhatəsində, tam audit log yalnız Super Admin-dədir
    const rows = ctx.role === "SUPER_ADMIN" ? db.auditLogs : db.auditLogs.filter((a) => !["roles", "settings"].includes(a.resource) || ctx.role === "ADMIN");
    return list(url, rows, { search: (a) => `${a.actorName} ${a.resourceLabel} ${a.action} ${a.resource}`, dateField: "at", defaultSort: "-at", defaultPageSize: 30 });
  }),

  /* ---------------- Hesabatlar və KPI (§2, §61) ---------------- */
  route.get("/admin/reports", ({ ctx, url }) => {
    requirePerm(ctx, "finance_reports:view", "service_orders:view");
    const orders = visibleOrders(ctx);
    const branch = url.searchParams.get("branchId");
    const scopedOrders = branch ? orders.filter((o) => o.branchId === branch) : orders;
    const byService = new Map<string, { name: unknown; count: number }>();
    for (const o of scopedOrders) { const s = db.services.find((x) => x.id === o.serviceId)!; byService.set(s.id, { name: s.name, count: (byService.get(s.id)?.count ?? 0) + 1 }); }
    const productQty = new Map<string, { name: unknown; quantity: number; revenue: number }>();
    for (const so of db.salesOrders) for (const l of so.lines) { const prev = productQty.get(l.productId); productQty.set(l.productId, { name: l.name, quantity: (prev?.quantity ?? 0) + Number(l.quantity), revenue: (prev?.revenue ?? 0) + l.totalCents / 100 }); }
    return {
      kpis: db.kpiTargets.map((k) => ({ code: k.code, name: k.name, value: k.current, target: k.target, unit: k.unit, ok: k.comparator === "LTE" ? Number(k.current) <= Number(k.target) : Number(k.current) >= Number(k.target) })),
      ordersByStatus: ["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ON_HOLD", "COMPLETED", "CLOSED", "CANCELLED"].map((s) => ({ status: s, count: scopedOrders.filter((o) => o.status === s).length })),
      ordersByDay: [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: bakuAt(-d, 12).slice(0, 10), created: scopedOrders.filter((o) => o.createdAt.slice(0, 10) === bakuAt(-d, 12).slice(0, 10)).length + ((d * 7) % 4) + 1, completed: scopedOrders.filter((o) => (o.closedAt ?? "").slice(0, 10) === bakuAt(-d, 12).slice(0, 10)).length + ((d * 3) % 3) })),
      revenueByBranch: db.branches.map((b) => ({ branch: b.name, service: scopedOrders.filter((o) => o.branchId === b.id).reduce((s, o) => s + orderAmounts(o).paid / 100, 0), sales: db.salesOrders.filter((s) => s.branchId === b.id && s.status !== "CANCELLED").reduce((s, x) => s + x.totalCents / 100, 0) / (b.code === "BAK-N" ? 1 : 4) })),
      technicianPerformance: db.technicians.filter((t) => t.status === "ACTIVE").map((t) => ({ name: fullName(db.users.find((u) => u.id === t.userId)), jobs: scopedOrders.filter((o) => o.technicianId === t.id).length, rating: t.rating, firstVisitFix: 70 + Math.round(t.onTimeRate / 5), warrantyRate: t.warrantyClaimRate, employmentType: t.employmentType })),
      topServices: [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 8),
      topProducts: [...productQty.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      subscriptions: db.plans.filter((p) => p.group !== "CUSTOM").map((p) => ({ plan: p.name, active: db.subscriptions.filter((s) => s.planId === p.id && ["ACTIVE", "TRIAL"].includes(s.status)).length, churn: db.subscriptions.filter((s) => s.planId === p.id && ["CANCELLED", "EXPIRED"].includes(s.status)).length })),
      estimateFunnel: { sent: scopedOrders.filter((o) => o.estimates.length).length, approved: scopedOrders.filter((o) => ["APPROVED", "PARTIALLY_APPROVED"].includes(latestEstimate(o)?.status ?? "")).length, rejected: scopedOrders.filter((o) => latestEstimate(o)?.status === "REJECTED").length },
      period: periodLabel(),
    };
  }),

  ...crud("/admin/kpi-targets", {
    perm: "kpi_targets",
    get: () => db.kpiTargets,
    set: (items) => (db.kpiTargets = items),
    label: (k) => k.code,
    defaultSort: "code",
    validate: (b) => (b.target !== undefined && !(Number(b.target) >= 0) ? { target: ["validation.number"] } : null),
  }),
];
