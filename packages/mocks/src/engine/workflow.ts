import type { AvailableAction, ServiceOrderActionRequest, EstimateDecisionRequest, ServiceOrderStatus } from "@sp/types";
import { db, nextNumber } from "../db/state";
import type { EstimateLineRec, EstimateRec, LogisticsTaskRec, ServiceOrderRec, StageRec } from "../db/types";
import type { TemplateRec, ServiceRec } from "../data/services";
import { L, t, tr } from "../lib/i18n";
import { newId } from "../lib/rng";
import { addMinutes, hoursFromNow, nowIso, periodLabel } from "../lib/time";
import { percentOf, vatIncluded } from "../lib/money";
import { apiError } from "../lib/errors";
import { type Ctx, can, fullName, isManager, planForUser, userById } from "./context";
import { audit, createWarranty, issueDocument, monthsFrom, notify, recordPayment } from "./effects";
import { findVariant, move, releaseReservation, reserve, stockRow, available } from "./stock";

/**
 * Workflow mühərriki (PRD §17–20). Status keçidləri burada yoxlanılır; frontend yalnız
 * `availableActions`-da qaytarılan əməliyyatları göstərir.
 */

const DONE = ["COMPLETED", "SKIPPED", "CANCELLED"];
export const isDone = (s: StageRec) => DONE.includes(s.status);
const FINAL_ORDER: ServiceOrderStatus[] = ["CANCELLED", "REJECTED", "CLOSED"];

export function serviceOf(order: ServiceOrderRec): ServiceRec {
  return db.services.find((s) => s.id === order.serviceId)!;
}

export function templateOf(order: ServiceOrderRec): TemplateRec | undefined {
  return db.templates.find((t) => t.id === order.templateId);
}

export function instantiateStages(template: TemplateRec): StageRec[] {
  return template.stages.map((s) => ({
    id: newId("stage"),
    templateStageId: s.id,
    order: s.order,
    name: s.name,
    customerName: s.customerName,
    type: s.type,
    executor: s.executor,
    specializationId: s.executorSpecializationId,
    mandatory: s.mandatory,
    startConditions: s.startConditions,
    requirements: s.completionRequirements,
    checklist: s.checklist.map((label) => ({ label, done: false })),
    slaMinutes: s.slaMinutes,
    parallel: s.parallelWithPrevious,
    status: "PENDING",
    assigneeId: null,
    startedAt: null,
    completedAt: null,
    readyAt: null,
    photos: [],
    note: null,
    signed: false,
    failReason: null,
    logisticsTaskId: null,
  }));
}

function templateStageKey(order: ServiceOrderRec, stage: StageRec): string {
  // şablon mərhələ id-si idFor("tpl:<key>:stage:<stageKey>") formatındadır; açarı adla müəyyən edirik
  const name = stage.name.az.toLowerCase();
  if (stage.type === "LOGISTICS") {
    if (name.includes("götürmə")) return "pickup";
    if (name.includes("daşınma")) return "transport";
    if (name.includes("geri")) return "return";
    return "delivery";
  }
  return stage.type.toLowerCase();
}

export function history(order: ServiceOrderRec, ctx: Ctx | null, action: string, extra: { from?: string; to?: string; reason?: string; note?: string } = {}) {
  order.history.unshift({
    id: newId("hist"),
    at: nowIso(),
    actorName: ctx?.user ? fullName(ctx.user) : "Sistem",
    actorRole: ctx?.role ?? "SYSTEM",
    action,
    fromStatus: extra.from,
    toStatus: extra.to,
    reason: extra.reason,
    note: extra.note,
  });
  order.updatedAt = nowIso();
}

function reasonLabel(code: string | undefined, ctx: Ctx | null): string | undefined {
  if (!code) return undefined;
  const r = db.reasonCodes.find((x) => x.code === code);
  return r ? tr(r.label, ctx?.locale ?? "az") : code;
}

/* ------------------------------------------------------------------ */
/* Smeta hesablamaları (§19)                                           */
/* ------------------------------------------------------------------ */

export function latestEstimate(order: ServiceOrderRec): EstimateRec | null {
  return order.estimates.length ? order.estimates[order.estimates.length - 1]! : null;
}

export function approvedEstimate(order: ServiceOrderRec): EstimateRec | null {
  const e = latestEstimate(order);
  return e && (e.status === "APPROVED" || e.status === "PARTIALLY_APPROVED") ? e : null;
}

export function estimateTotals(order: ServiceOrderRec, estimate: EstimateRec) {
  const customer = userById(order.customerId);
  const plan = customer ? planForUser(customer, "CUSTOMER", null) : null;
  const serviceDisc = Number(plan?.entitlements.service_discount_percent ?? 0);
  const productDisc = Number(plan?.entitlements.product_discount_percent ?? 0);
  let subtotal = 0;
  let discount = 0;
  const discounts: { code: string; label: ReturnType<typeof L>; cents: number }[] = [];
  let svcDiscCents = 0;
  let prodDiscCents = 0;
  for (const line of estimate.lines) {
    if (line.declined) continue;
    const total = Math.round(line.unitCents * Number(line.quantity));
    if (line.type === "DISCOUNT") {
      discount += Math.abs(total);
      discounts.push({ code: "LINE_DISCOUNT", label: line.name, cents: Math.abs(total) });
      continue;
    }
    subtotal += total;
    if (order.companyId) continue;
    if ((line.type === "LABOR" || line.type === "EXTRA") && serviceDisc) svcDiscCents += percentOf(total, serviceDisc);
    if (line.type === "MATERIAL" && !line.ownMaterial && productDisc) prodDiscCents += percentOf(total, productDisc);
  }
  if (svcDiscCents) discounts.push({ code: "SUB_SERVICE", label: L(`Abunə servis endirimi (${serviceDisc}%)`, `Скидка по подписке на сервис (${serviceDisc}%)`, `Subscription service discount (${serviceDisc}%)`), cents: svcDiscCents });
  if (prodDiscCents) discounts.push({ code: "SUB_PRODUCT", label: L(`Abunə məhsul endirimi (${productDisc}%)`, `Скидка по подписке на товары (${productDisc}%)`, `Subscription product discount (${productDisc}%)`), cents: prodDiscCents });
  discount += svcDiscCents + prodDiscCents;
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, vat: vatIncluded(total), total, discounts };
}

export function orderAmounts(order: ServiceOrderRec) {
  const service = serviceOf(order);
  const est = approvedEstimate(order);
  let total = 0;
  if (est) total = estimateTotals(order, est).total;
  else if (order.basePriceCents !== null && !["CANCELLED", "REJECTED"].includes(order.status)) total = order.basePriceCents;
  else if (service.priceModel === "FIXED" && service.priceCents && !["CANCELLED", "REJECTED"].includes(order.status)) total = service.priceCents;
  total += order.fees.filter((f) => !f.waived && f.cents > 0).reduce((s, f) => s + f.cents, 0);
  const paid = db.payments.filter((p) => p.orderId === order.id && (p.status === "PAID" || p.status === "PARTIALLY_REFUNDED")).reduce((s, p) => s + p.amountCents - p.refundedCents, 0);
  return { total, paid, due: Math.max(0, total - paid) };
}

/* ------------------------------------------------------------------ */
/* Mərhələlərin hazırlığı və sifariş statusu                             */
/* ------------------------------------------------------------------ */

export function techHasSpec(techId: string, specId: string | null) {
  if (!specId) return true;
  const tech = db.technicians.find((t) => t.id === techId);
  return !!tech?.specializations.some((s) => s.specializationId === specId && s.status === "ACTIVE");
}

function conditionsMet(order: ServiceOrderRec, stage: StageRec) {
  return stage.startConditions.every((c) => {
    if (c === "ESTIMATE_APPROVED") return !!approvedEstimate(order);
    if (c === "MATERIAL_RESERVED") return db.reservations.some((r) => r.sourceId === order.id);
    if (c === "ADVANCE_PAID") return orderAmounts(order).paid > 0;
    return true;
  });
}

export function advance(order: ServiceOrderRec, ctx: Ctx | null) {
  if (FINAL_ORDER.includes(order.status) || order.status === "ON_HOLD" || order.status === "DRAFT") return;
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 30) {
    changed = false;
    order.stages.forEach((stage, i) => {
      if (stage.status !== "PENDING") return;
      if (order.status === "NEW" && i > 0) return;
      const blockers = order.stages.slice(0, stage.parallel ? Math.max(i - 1, 0) : i).filter((s) => !isDone(s));
      if (blockers.length) return;
      if (!conditionsMet(order, stage)) return;
      stage.status = "READY";
      stage.readyAt = nowIso();
      onStageReady(order, stage, ctx);
      changed = true;
    });
  }
  recomputeStatus(order, ctx);
}

function onStageReady(order: ServiceOrderRec, stage: StageRec, ctx: Ctx | null) {
  switch (stage.executor) {
    case "SYSTEM":
      completeSystemStage(order, stage, ctx);
      break;
    case "TECHNICIAN": {
      if (order.technicianId && techHasSpec(order.technicianId, stage.specializationId)) {
        stage.assigneeId = order.technicianId;
        stage.status = "ACCEPTED";
      }
      if (stage.type === "WAIT_PART") autoSkipWaitPart(order, stage, ctx);
      break;
    }
    case "WAREHOUSE_EMPLOYEE":
      if (stage.type === "WAIT_PART") autoSkipWaitPart(order, stage, ctx);
      break;
    case "CUSTOMER": {
      const est = latestEstimate(order);
      if (est?.status === "SENT") stage.status = "WAITING_FOR_APPROVAL";
      break;
    }
    case "COURIER":
      if (stage.type === "LOGISTICS") ensureLogisticsTask(order, stage);
      break;
  }
}

function autoSkipWaitPart(order: ServiceOrderRec, stage: StageRec, ctx: Ctx | null) {
  const est = approvedEstimate(order);
  const missing = (est?.lines ?? []).filter((l) => l.type === "MATERIAL" && !l.declined && !l.ownMaterial && l.variantId).some((l) => {
    const reserved = db.reservations.some((r) => r.sourceId === order.id && r.variantId === l.variantId && r.status === "ACTIVE");
    return !reserved;
  });
  if (!missing) {
    stage.status = "SKIPPED";
    stage.completedAt = nowIso();
    stage.note = "Material stokda var — mərhələ avtomatik keçildi";
    history(order, ctx, "stage_auto_skipped", { note: tr(stage.name, "az") });
  } else {
    stage.status = "WAITING_FOR_PART";
    stage.startedAt = nowIso();
  }
}

function completeSystemStage(order: ServiceOrderRec, stage: StageRec, ctx: Ctx | null) {
  stage.status = "COMPLETED";
  stage.startedAt = nowIso();
  stage.completedAt = nowIso();
  const customer = userById(order.customerId);
  if (stage.type === "WARRANTY" && !order.warrantyId) {
    const service = serviceOf(order);
    const plan = customer ? planForUser(customer, "CUSTOMER", null) : null;
    const months = service.warrantyMonths + Number(plan?.entitlements.extended_warranty_months ?? 0);
    if (months > 0) {
      const w = createWarranty({
        type: plan && Number(plan.entitlements.extended_warranty_months ?? 0) > 0 ? "EXTENDED" : "WORK",
        deviceId: order.deviceId,
        deviceName: order.device.modelName,
        serialNumber: order.device.serialNumber,
        customerId: order.customerId,
        orderId: order.id,
        orderNumber: order.number,
        coverage: L(`${tr(service.name, "az")} üzrə görülən işlər və quraşdırılan hissələr`, `Работы и установленные запчасти по услуге «${tr(service.name, "ru")}»`, `Work and installed parts for ${tr(service.name, "en")}`),
        startsAt: nowIso(),
        endsAt: monthsFrom(nowIso(), months),
      });
      order.warrantyId = w.id;
      issueDocument({
        type: "WARRANTY",
        ownerId: order.customerId,
        counterpartyName: customer ? fullName(customer) : "—",
        counterpartyVoen: null,
        orderType: "SERVICE",
        orderId: order.id,
        orderNumber: order.number,
        lines: [{ name: w.coverage, quantity: String(months), unit: "month", unitCents: 0, vatRate: 0 }],
        vatIncluded: true,
        meta: { warrantyNumber: w.number, code: w.code, endsAt: w.endsAt },
        deviceId: order.deviceId,
      });
    }
    history(order, ctx, "warranty_activated");
  }
  if (stage.type === "READY_NOTICE") {
    notify(order.customerId, "DEVICE_READY", "notif.deviceReady", L(`${order.number}: cihazınızı servis mərkəzindən götürə bilərsiniz`, `${order.number}: устройство можно забрать`, `${order.number}: your device is ready for pickup`), `/account/services/${order.id}`, "SMS");
  }
}

export function recomputeStatus(order: ServiceOrderRec, ctx: Ctx | null) {
  if (FINAL_ORDER.includes(order.status) || order.status === "ON_HOLD" || order.status === "DRAFT") return;
  const before = order.status;
  const mandatoryDone = order.stages.filter((s) => s.mandatory).every(isDone);
  if (mandatoryDone) {
    for (const s of order.stages) if (!isDone(s)) { s.status = "SKIPPED"; s.completedAt = nowIso(); }
    order.status = "COMPLETED";
  } else if (order.status === "NEW" && !isDone(order.stages[0]!)) {
    order.status = "NEW";
  } else if (order.stages.some((s) => s.status === "WAITING_FOR_APPROVAL")) {
    order.status = "WAITING_FOR_CUSTOMER";
  } else if (order.stages.filter(isDone).length > 1 || order.stages.slice(1).some((s) => ["IN_PROGRESS", "ON_THE_WAY", "ARRIVED", "WAITING_FOR_PART", "BLOCKED", "FAILED"].includes(s.status))) {
    order.status = "IN_PROGRESS";
  } else {
    order.status = "CONFIRMED";
  }
  if (before !== order.status) {
    history(order, ctx, "status_changed", { from: before, to: order.status });
    if (order.status === "COMPLETED") {
      notify(order.customerId, "ORDER_COMPLETED", "notif.orderCompleted", L(`${order.number} tamamlandı. Rəyinizi bildirin.`, `${order.number} завершён. Оставьте отзыв.`, `${order.number} is completed. Leave a review.`), `/account/services/${order.id}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Logistika (§21)                                                      */
/* ------------------------------------------------------------------ */

function serviceCenterPoint(order: ServiceOrderRec) {
  const branch = db.branches.find((b) => b.hasServiceCenter && b.city === (order.address?.city ?? "Bakı")) ?? db.branches[0]!;
  return { label: `Servis mərkəzi — ${tr(branch.name, "az")}`, address: `${branch.city}, ${branch.address}`, location: branch.location };
}

export function ensureLogisticsTask(order: ServiceOrderRec, stage: StageRec): LogisticsTaskRec {
  if (stage.logisticsTaskId) {
    const existing = db.logisticsTasks.find((t) => t.id === stage.logisticsTaskId);
    if (existing) return existing;
  }
  const key = templateStageKey(order, stage);
  const customer = userById(order.customerId);
  const addr = order.address;
  const customerPoint = {
    label: order.endCustomer?.name ?? (customer ? fullName(customer) : "Müştəri"),
    address: addr ? `${addr.city}, ${addr.street}${addr.apartment ? `, mənzil ${addr.apartment}` : ""}` : order.endCustomer?.address ?? "—",
    location: addr?.location ?? null,
  };
  const center = serviceCenterPoint(order);
  const central = db.warehouses[0]!;
  const warehousePoint = { label: tr(central.name, "az"), address: "Bakı, Təbriz küç. 44 (anbar girişi)", location: db.branches[0]!.location };
  const device = `${order.device.modelName}${order.device.serialNumber ? ` (S/N ${order.device.serialNumber})` : ""}`;
  let type: LogisticsTaskRec["type"] = "DELIVERY";
  let from = warehousePoint;
  let to = customerPoint;
  let cargo: LogisticsTaskRec["cargo"] = [];
  if (key === "pickup") {
    type = "PICKUP";
    from = customerPoint;
    to = center;
    cargo = [{ kind: "DEVICE", name: device, quantity: "1", note: "Qəbul aktı, foto və müştəri imzası tələb olunur" }];
  } else if (key === "transport") {
    type = "TRANSFER";
    from = customerPoint;
    to = center;
    cargo = [{ kind: "DEVICE", name: device, quantity: "1", note: null }];
  } else if (key === "return") {
    type = "DELIVERY";
    from = center;
    to = customerPoint;
    cargo = [{ kind: "DEVICE", name: device, quantity: "1", note: "Təhvil aktı və imza" }];
  } else {
    const est = approvedEstimate(order);
    cargo = (est?.lines ?? [])
      .filter((l) => l.type === "MATERIAL" && !l.declined)
      .map((l) => ({ kind: (l.productId && findVariant(l.variantId ?? "")?.product.type === "PHYSICAL" ? "PRODUCT" : "MATERIAL") as "PRODUCT" | "MATERIAL", name: tr(l.name, "az"), quantity: `${l.quantity} ${l.unit}`, note: null }));
    if (!cargo.length) cargo = [{ kind: "PRODUCT", name: order.device.modelName, quantity: "1", note: null }];
  }
  const window = order.scheduledAt && new Date(order.scheduledAt).getTime() > Date.now() ? order.scheduledAt : hoursFromNow(3);
  const task: LogisticsTaskRec = {
    id: newId("lt"),
    number: nextNumber("LT", 4000),
    type,
    status: "PLANNED",
    from,
    to,
    windowStart: window,
    windowEnd: addMinutes(window, 120),
    assigneeId: null,
    assigneeKind: null,
    cargo,
    relatedOrderId: order.id,
    relatedOrderNumber: order.number,
    relatedOrderKind: "SERVICE",
    stageId: stage.id,
    contact: order.endCustomer ? { name: order.endCustomer.name, phone: order.endCustomer.phone } : customer ? { name: fullName(customer), phone: customer.phone ?? "" } : null,
    note: order.note,
    collectCashCents: null,
    photos: 0,
    signed: false,
    failReason: null,
    history: [{ at: nowIso(), status: "PLANNED", actor: "Sistem", note: null }],
    branchId: order.branchId,
    createdAt: nowIso(),
  };
  db.logisticsTasks.unshift(task);
  stage.logisticsTaskId = task.id;
  return task;
}

/** Kuryer statusu dəyişəndə mərhələni və cihazın yerini sinxronlaşdırır. */
export function syncStageFromTask(task: LogisticsTaskRec, ctx: Ctx | null) {
  if (!task.relatedOrderId || !task.stageId) return;
  const order = db.serviceOrders.find((o) => o.id === task.relatedOrderId);
  const stage = order?.stages.find((s) => s.id === task.stageId);
  if (!order || !stage || isDone(stage)) return;
  const key = templateStageKey(order, stage);
  switch (task.status) {
    case "ASSIGNED":
      stage.status = "ASSIGNED";
      stage.assigneeId = task.assigneeId;
      break;
    case "ON_THE_WAY":
      stage.status = "ON_THE_WAY";
      stage.startedAt ??= nowIso();
      if (key === "delivery") notify(order.customerId, "COURIER_ON_WAY", "notif.technicianOnWay", L("Kuryer yoldadır", "Курьер в пути", "Courier is on the way"), `/account/services/${order.id}`);
      break;
    case "PICKED_UP":
    case "IN_TRANSIT":
      stage.status = "IN_PROGRESS";
      stage.startedAt ??= nowIso();
      order.deviceLocation = key === "delivery" ? order.deviceLocation : "IN_TRANSIT";
      break;
    case "DELIVERED": {
      stage.status = "COMPLETED";
      stage.completedAt = nowIso();
      stage.signed = task.signed;
      if (key === "pickup" || key === "transport") order.deviceLocation = key === "transport" ? "SERVICE_CENTER" : "IN_TRANSIT";
      if (key === "pickup") {
        issueDocument({ type: "INTAKE_ACT", ownerId: order.customerId, counterpartyName: fullName(userById(order.customerId)), counterpartyVoen: null, orderType: "SERVICE", orderId: order.id, orderNumber: order.number, lines: [{ name: L(order.device.modelName), quantity: "1", unit: "pcs", unitCents: 0, vatRate: 0 }], vatIncluded: true, meta: { signed: String(task.signed), photos: String(task.photos) } });
      }
      if (key === "return") {
        order.deviceLocation = "DELIVERED";
        const idx = order.stages.indexOf(stage);
        const next = order.stages[idx + 1];
        if (next && next.type === "HANDOVER" && next.executor === "COURIER") {
          next.status = "READY";
          next.assigneeId = task.assigneeId;
        }
      }
      history(order, ctx, "stage_completed", { note: tr(stage.name, "az") });
      advance(order, ctx);
      break;
    }
    case "FAILED":
      stage.status = "FAILED";
      stage.failReason = task.failReason;
      order.needsReschedule = true;
      history(order, ctx, "stage_failed", { reason: task.failReason ?? undefined });
      break;
  }
  recomputeStatus(order, ctx);
}

/* ------------------------------------------------------------------ */
/* availableActions (§18.4)                                            */
/* ------------------------------------------------------------------ */

function isOrderCustomer(order: ServiceOrderRec, ctx: Ctx) {
  if (!ctx.user) return false;
  if (order.customerId === ctx.user.id) return true;
  if (order.companyId && ctx.user.companyId === order.companyId) return true;
  if (order.partnerCompanyId && ctx.user.companyId === order.partnerCompanyId) return true;
  return false;
}

const FIELD_STAGE = ["ARRIVAL", "MEASUREMENT"];

function stageActions(order: ServiceOrderRec, stage: StageRec, ctx: Ctx): AvailableAction[] {
  const out: AvailableAction[] = [];
  const me = ctx.user?.id;
  const isAssignee = !!me && stage.assigneeId === me && ctx.role === "TECHNICIAN";
  const manager = isManager(ctx);
  const onBehalf = manager ? { onBehalf: true } : undefined;
  const actAsTech = isAssignee || manager;
  const dispatcher = can(ctx, "assignments:assign");
  const operator = can(ctx, "service_orders:edit") && ctx.role !== "TECHNICIAN";
  const warehouse = can(ctx, "inventory:edit") && ctx.role !== "TECHNICIAN";
  const add = (code: string, extra: Partial<AvailableAction> = {}) => out.push({ code, stageId: stage.id, ...extra });

  if (order.status === "ON_HOLD" || FINAL_ORDER.includes(order.status)) return out;

  switch (stage.executor) {
    case "OPERATOR":
      if (stage.status === "READY" && stage.type !== "CHECK" && (operator || manager)) add("complete_stage", { variant: "primary" });
      break;
    case "DISPATCHER":
      if (["READY", "ASSIGNED"].includes(stage.status) && dispatcher) {
        add("assign", { variant: stage.status === "READY" ? "primary" : "secondary" });
        add("auto_assign");
      }
      if (stage.status === "ASSIGNED") {
        if (isAssignee || manager) add("accept", { variant: "primary", payload: onBehalf });
        if (isAssignee || manager) add("decline", { requiresReason: true, reasonCategory: "DECLINE_JOB", variant: "destructive", payload: onBehalf });
      }
      break;
    case "TECHNICIAN":
      if (stage.status === "READY" && dispatcher) {
        add("assign", { variant: "primary" });
        add("auto_assign");
      }
      if (stage.status === "ASSIGNED") {
        if (dispatcher) add("assign");
        if (actAsTech) {
          add("accept", { variant: "primary", payload: onBehalf });
          add("decline", { requiresReason: true, reasonCategory: "DECLINE_JOB", variant: "destructive", payload: onBehalf });
        }
      }
      if (stage.status === "ACCEPTED" && actAsTech) {
        if (FIELD_STAGE.includes(stage.type) || (stage.type === "EXECUTION" && order.executionForm === "ON_SITE" && !order.stages.some((s) => s.type === "ARRIVAL"))) add("start_travel", { variant: "primary", payload: onBehalf });
        else add("start", { variant: "primary", payload: onBehalf });
        if (dispatcher) add("assign");
      }
      if (stage.status === "ON_THE_WAY" && actAsTech) {
        add("arrive", { variant: "primary", payload: onBehalf });
        add("customer_absent", { requiresReason: true, reasonCategory: "FAILED", variant: "destructive", payload: onBehalf });
      }
      if (stage.status === "ARRIVED" && actAsTech) {
        add("start", { variant: "primary", payload: onBehalf });
        add("customer_absent", { requiresReason: true, reasonCategory: "FAILED", variant: "destructive", payload: onBehalf });
      }
      if (stage.status === "IN_PROGRESS" && actAsTech) {
        const idx = order.stages.indexOf(stage);
        const nextMandatory = order.stages.slice(idx + 1).find((s) => s.mandatory || s.type === "ESTIMATE_APPROVAL");
        if (["DIAGNOSTICS", "MATERIAL_CALC", "MEASUREMENT"].includes(stage.type) && nextMandatory?.type === "ESTIMATE_APPROVAL") add("submit_estimate", { variant: "primary", payload: onBehalf });
        else add("complete_stage", { variant: "primary", payload: { ...onBehalf, requirements: stage.requirements } });
        if (stage.type === "EXECUTION") {
          add("consume_materials", { payload: onBehalf });
          add("wait_part", { payload: onBehalf });
        }
        add("block", { requiresReason: true, reasonCategory: "ON_HOLD", payload: onBehalf });
      }
      if (stage.status === "WAITING_FOR_PART" && (actAsTech || warehouse)) add("part_arrived", { variant: "primary" });
      if (stage.status === "BLOCKED" && (actAsTech || operator)) add("unblock", { variant: "primary" });
      if (stage.status === "READY" && stage.type === "HANDOVER" && actAsTech) add("complete_stage", { variant: "primary" });
      break;
    case "WAREHOUSE_EMPLOYEE":
      if (["READY", "IN_PROGRESS"].includes(stage.status) && warehouse) add("complete_stage", { variant: "primary" });
      if (stage.status === "WAITING_FOR_PART" && warehouse) add("part_arrived", { variant: "primary" });
      break;
    case "CUSTOMER": {
      const est = latestEstimate(order);
      if (stage.status === "WAITING_FOR_APPROVAL" && est?.status === "SENT") {
        const customer = isOrderCustomer(order, ctx);
        const phone = operator && !customer;
        const signature = (isAssignee || (ctx.role === "TECHNICIAN" && order.technicianId === me)) && !customer;
        if (customer || phone || signature || manager) {
          const channel = customer ? "CABINET" : signature ? "SIGNATURE" : "PHONE";
          add("approve_estimate", { variant: "primary", payload: { channel } });
          if (est.lines.some((l) => l.optional)) add("partial_approve", { payload: { channel } });
          add("reject_estimate", { requiresReason: true, reasonCategory: "ESTIMATE_REJECT", variant: "destructive", payload: { channel } });
          if (customer) add("ask_question");
        }
      }
      if (stage.status === "READY" && (actAsTech || (order.technicianId === me && ctx.role === "TECHNICIAN") || operator)) add("submit_estimate", { variant: "primary" });
      break;
    }
    case "COURIER":
      if (["READY", "ASSIGNED"].includes(stage.status) && can(ctx, "logistics_tasks:assign")) add("assign_courier", { variant: stage.status === "READY" ? "primary" : "secondary" });
      if (stage.type === "HANDOVER" && stage.status === "READY" && (manager || (ctx.role === "COURIER" && stage.assigneeId === me))) add("complete_stage", { variant: "primary" });
      if (stage.type === "LOGISTICS" && manager && !isDone(stage) && stage.status !== "PENDING") add("complete_stage", { payload: onBehalf });
      break;
  }
  if (!stage.mandatory && !isDone(stage) && stage.status !== "PENDING" && (operator || dispatcher)) add("skip", { variant: "secondary" });
  if (stage.status === "FAILED" && (operator || dispatcher)) add("reschedule", { requiresReason: true, reasonCategory: "RESCHEDULE", variant: "primary" });
  return out;
}

export function availableActions(order: ServiceOrderRec, ctx: Ctx): AvailableAction[] {
  const out: AvailableAction[] = [];
  const operator = can(ctx, "service_orders:edit") && ctx.role !== "TECHNICIAN";
  const manager = isManager(ctx);
  const customer = isOrderCustomer(order, ctx);
  const add = (code: string, extra: Partial<AvailableAction> = {}) => out.push({ code, ...extra });

  if (order.status === "NEW") {
    if (operator) {
      if (order.stages[0]?.type === "CHECK") add("confirm", { variant: "primary" });
      add("reject", { requiresReason: true, reasonCategory: "REJECTED", variant: "destructive" });
    }
  }
  if (["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(order.status)) {
    if (operator) {
      add("hold", { requiresReason: true, reasonCategory: "ON_HOLD" });
      add("reschedule", { requiresReason: true, reasonCategory: "RESCHEDULE" });
    }
    const executionStarted = order.stages.some((s) => s.type === "EXECUTION" && (s.status === "IN_PROGRESS" || s.status === "COMPLETED"));
    if (operator || (customer && !executionStarted)) add("cancel", { requiresReason: true, reasonCategory: "CANCELLED", variant: "destructive" });
    if (customer && !operator && !order.stages.some((s) => ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(s.status))) add("reschedule", { requiresReason: true, reasonCategory: "RESCHEDULE" });
    const service = serviceOf(order);
    if (can(ctx, "assignments:assign") && service.executionForms.length > 1 && !executionStarted) add("change_execution_form");
  }
  if (order.status === "ON_HOLD" && operator) {
    add("resume", { variant: "primary" });
    add("cancel", { requiresReason: true, reasonCategory: "CANCELLED", variant: "destructive" });
  }

  const { due } = orderAmounts(order);
  if (due > 0 && ["IN_PROGRESS", "COMPLETED", "WAITING_FOR_CUSTOMER"].includes(order.status)) {
    const tech = ctx.role === "TECHNICIAN" && order.technicianId === ctx.user?.id;
    if (can(ctx, "payments:edit") || manager || tech || operator) add("record_payment", { payload: { dueAmount: (due / 100).toFixed(2) } });
    if (customer && ctx.role !== "TECHNICIAN") add("pay_online", { variant: "primary", payload: { dueAmount: (due / 100).toFixed(2) } });
  }
  if (order.status === "COMPLETED" && due === 0 && (can(ctx, "payments:edit") || manager)) add("close", { variant: "primary" });
  if (order.fees.some((f) => !f.waived && f.cents > 0) && (manager || can(ctx, "fee_rules:approve"))) add("waive_fee", { requiresReason: true, reasonCategory: "FEE_WAIVE" });
  if (ctx.role !== "CUSTOMER" && ctx.role !== "GUEST" && (operator || manager || ctx.role === "TECHNICIAN")) add("add_note");

  for (const stage of order.stages) out.push(...stageActions(order, stage, ctx));
  return out;
}

/* ------------------------------------------------------------------ */
/* Əməliyyatların icrası                                                */
/* ------------------------------------------------------------------ */

function requireAction(order: ServiceOrderRec, ctx: Ctx, code: string, stageId?: string) {
  const allowed = availableActions(order, ctx).find((a) => a.code === code && (!stageId || !a.stageId || a.stageId === stageId));
  if (!allowed) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
  return allowed;
}

function getStage(order: ServiceOrderRec, stageId?: string) {
  const stage = order.stages.find((s) => s.id === stageId);
  if (!stage) throw apiError(404, "STAGE_NOT_FOUND", "error.notFound");
  return stage;
}

function needReason(req: ServiceOrderActionRequest) {
  if (!req.reasonCode) throw apiError(422, "VALIDATION", "error.validation", { reasonCode: ["validation.required"] });
}

function technicianWarehouse(techId: string | null, order: ServiceOrderRec) {
  const tech = db.technicians.find((t) => t.id === techId);
  if (order.executionForm !== "ON_SITE") return db.warehouses.find((w) => w.type === "SERVICE_CENTER")!.id;
  if (tech?.employmentType === "STAFF") {
    const van = db.warehouses.find((w) => w.type === "MOBILE" && w.branchId === tech.branchId);
    if (van) return van.id;
  }
  return db.warehouses[0]!.id;
}

export function buildEstimateLines(order: ServiceOrderRec, lines: NonNullable<ServiceOrderActionRequest["lines"]>, ctx: Ctx): EstimateLineRec[] {
  return lines.map((l) => {
    let name = L(l.name);
    let unitCents = Math.round(Number(l.unitPrice ?? "0") * 100);
    let sku: string | null = null;
    let variantId: string | null = null;
    let productId: string | null = null;
    let warrantyMonths: number | null = l.type === "LABOR" ? serviceOf(order).warrantyMonths : null;
    if (l.productId) {
      const product = db.products.find((p) => p.id === l.productId || p.variants.some((v) => v.id === l.productId));
      const variant = product?.variants.find((v) => v.id === l.productId) ?? product?.variants[0];
      if (product && variant) {
        productId = product.id;
        variantId = variant.id;
        sku = variant.sku;
        name = product.name;
        warrantyMonths = product.warrantyMonths || null;
        if (!l.ownMaterial) {
          // §19.1 — material qiymətini sistem hesablayır, usta dəyişə bilməz
          const conv = product.conversions.find((c) => c.unit === l.unit);
          unitCents = conv?.packagePriceCents ?? Math.round(variant.prices.RETAIL * (conv?.factor ?? 1));
          if (order.companyId) {
            const company = db.b2bAccounts.find((c) => c.id === order.companyId);
            unitCents -= percentOf(unitCents, company?.discountPercent ?? 0);
          }
        }
      }
    }
    return {
      id: newId("eline"),
      type: l.type,
      name,
      productId,
      variantId,
      sku,
      quantity: l.quantity,
      unit: l.unit,
      unitCents: l.type === "DISCOUNT" ? -Math.abs(unitCents) : unitCents,
      optional: l.optional,
      declined: false,
      warrantyMonths,
      ownMaterial: l.ownMaterial,
      vatRate: 18,
    };
  });
}

export function addEstimate(order: ServiceOrderRec, lines: EstimateLineRec[], ctx: Ctx | null, createdAt = nowIso()) {
  const prev = latestEstimate(order);
  if (prev && prev.status === "SENT") prev.status = "EXPIRED";
  const version = (prev?.version ?? 0) + 1;
  if (order.type === "WARRANTY") {
    const sub = lines.reduce((s, l) => s + Math.round(l.unitCents * Number(l.quantity)), 0);
    lines.push({ id: newId("eline"), type: "DISCOUNT", name: L("Zəmanət halı — ödənişsiz", "Гарантийный случай — бесплатно", "Warranty case — free of charge"), productId: null, variantId: null, sku: null, quantity: "1", unit: "pcs", unitCents: -sub, optional: false, declined: false, warrantyMonths: null, ownMaterial: false, vatRate: 18 });
  }
  const est: EstimateRec = {
    id: newId("est"),
    number: `SM-${order.number.replace(/\D/g, "")}-${version}`,
    version,
    status: "SENT",
    lines,
    discountPercent: 0,
    createdAt,
    createdBy: ctx?.user ? fullName(ctx.user) : "Sistem",
    validUntil: new Date(new Date(createdAt).getTime() + db.settings.estimateValidityDays * 86400_000).toISOString(),
    decidedAt: null,
    decisionChannel: null,
    rejectReason: null,
  };
  order.estimates.push(est);
  return est;
}

function completeStage(order: ServiceOrderRec, stage: StageRec, req: ServiceOrderActionRequest, ctx: Ctx) {
  const manager = isManager(ctx);
  if (req.checklist) stage.checklist = req.checklist;
  if (req.photos?.length) stage.photos.push(...req.photos.map((p) => ({ id: newId("att"), url: `/mock-uploads/${encodeURIComponent(p.name)}`, name: p.name, mimeType: "image/jpeg", size: 240_000 })));
  if (req.signed) stage.signed = true;
  if (req.note) stage.note = req.note;
  const missing: string[] = [];
  if (stage.requirements.includes("PHOTO") && !stage.photos.length) missing.push("photos");
  if (stage.requirements.includes("SIGNATURE") && !stage.signed) missing.push("signed");
  if (stage.requirements.includes("CHECKLIST") && stage.checklist.some((c) => !c.done)) missing.push("checklist");
  if (stage.requirements.includes("NOTE") && !stage.note) missing.push("note");
  if (missing.length && !(manager && req.note?.includes("[simulyasiya]"))) {
    throw apiError(422, "REQUIREMENTS_NOT_MET", "error.requirements", Object.fromEntries(missing.map((m) => [m, ["validation.required"]])));
  }
  if (stage.type === "HANDOVER") {
    const customer = userById(order.customerId);
    const est = approvedEstimate(order);
    const service = serviceOf(order);
    const lines = est
      ? est.lines.filter((l) => !l.declined).map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitCents: l.unitCents, vatRate: 18 }))
      : [{ name: service.name, quantity: "1", unit: "pcs", unitCents: order.basePriceCents ?? service.priceCents ?? 0, vatRate: 18 }];
    const counterparty = order.companyId ? db.b2bAccounts.find((c) => c.id === order.companyId) : null;
    issueDocument({ type: "SERVICE_ACT", ownerId: order.companyId ?? order.customerId, counterpartyName: counterparty?.legalName ?? fullName(customer), counterpartyVoen: counterparty?.voen ?? null, orderType: "SERVICE", orderId: order.id, orderNumber: order.number, lines, vatIncluded: true, meta: { signed: String(stage.signed) }, deviceId: order.deviceId });
    issueDocument({ type: "INVOICE", ownerId: order.companyId ?? order.customerId, counterpartyName: counterparty?.legalName ?? fullName(customer), counterpartyVoen: counterparty?.voen ?? null, orderType: "SERVICE", orderId: order.id, orderNumber: order.number, lines, vatIncluded: !counterparty, meta: {} });
    if (counterparty?.eInvoiceRequired) issueDocument({ type: "E_INVOICE", ownerId: counterparty.id, counterpartyName: counterparty.legalName, counterpartyVoen: counterparty.voen, orderType: "SERVICE", orderId: order.id, orderNumber: order.number, lines, vatIncluded: false, meta: {} });
    if (order.executionForm !== "ON_SITE") order.deviceLocation = "DELIVERED";
    if (req.payment && Number(req.payment.amount) > 0) {
      applyPayment(order, req.payment, ctx);
    }
  }
  if (stage.type === "EXECUTION") consumeApprovedMaterials(order, stage, ctx);
  if (stage.type === "INTAKE") {
    order.deviceLocation = "SERVICE_CENTER";
    issueDocument({ type: "INTAKE_ACT", ownerId: order.customerId, counterpartyName: fullName(userById(order.customerId)), counterpartyVoen: null, orderType: "SERVICE", orderId: order.id, orderNumber: order.number, lines: [{ name: L(order.device.modelName), quantity: "1", unit: "pcs", unitCents: 0, vatRate: 0 }], vatIncluded: true, meta: { signed: String(stage.signed) } });
    if (order.status === "NEW") order.status = "CONFIRMED";
  }
  if (stage.type === "WAREHOUSE_PREP") reserveApprovedMaterials(order, ctx, true);
  if (stage.logisticsTaskId) {
    const task = db.logisticsTasks.find((t) => t.id === stage.logisticsTaskId);
    if (task && !["DELIVERED", "CANCELLED"].includes(task.status)) {
      task.status = "DELIVERED";
      task.history.unshift({ at: nowIso(), status: "DELIVERED", actor: fullName(ctx.user), note: "Menecer tərəfindən tamamlandı" });
    }
  }
  stage.status = "COMPLETED";
  stage.completedAt = nowIso();
  stage.startedAt ??= nowIso();
  history(order, ctx, "stage_completed", { note: tr(stage.name, "az") });
}

function consumeApprovedMaterials(order: ServiceOrderRec, stage: StageRec, ctx: Ctx) {
  const est = approvedEstimate(order);
  if (!est) return;
  const warehouseId = technicianWarehouse(stage.assigneeId ?? order.technicianId, order);
  for (const line of est.lines.filter((l) => l.type === "MATERIAL" && !l.declined && l.variantId)) {
    if (order.materials.some((m) => m.variantId === line.variantId)) continue;
    const found = findVariant(line.variantId!);
    if (!found) continue;
    const conv = found.product.conversions.find((c) => c.unit === line.unit);
    const base = Number(line.quantity) * (conv?.factor ?? 1);
    if (!line.ownMaterial) {
      const res = db.reservations.find((r) => r.sourceId === order.id && r.variantId === line.variantId && r.status === "ACTIVE");
      const whId = res?.warehouseId ?? warehouseId;
      if (res) releaseReservation(res.id, "CONSUMED");
      const mv = move({ type: "SERVICE_CONSUMPTION", warehouseId: whId, variantId: line.variantId!, baseQuantity: base, quantity: line.quantity, unit: line.unit, direction: "OUT", purpose: "SERVICE", actorName: fullName(ctx.user), relatedDocument: order.number, reason: "Servis sərfiyyatı" });
      order.materials.push({ id: newId("mat"), productId: found.product.id, variantId: line.variantId!, name: found.product.name, sku: found.variant.sku, quantity: line.quantity, unit: line.unit, warehouseId: whId, ownMaterial: false, costCents: Math.round(mv.unitCostCents * base), at: nowIso() });
    } else {
      order.materials.push({ id: newId("mat"), productId: found.product.id, variantId: line.variantId!, name: found.product.name, sku: found.variant.sku, quantity: line.quantity, unit: line.unit, warehouseId, ownMaterial: true, costCents: null, at: nowIso() });
    }
  }
  history(order, ctx, "materials_consumed");
}

export function reserveApprovedMaterials(order: ServiceOrderRec, ctx: Ctx | null, strict = false) {
  const est = approvedEstimate(order);
  if (!est) return;
  for (const line of est.lines.filter((l) => l.type === "MATERIAL" && !l.declined && !l.ownMaterial && l.variantId)) {
    if (db.reservations.some((r) => r.sourceId === order.id && r.variantId === line.variantId && r.status !== "RELEASED" && r.status !== "EXPIRED")) continue;
    const found = findVariant(line.variantId!);
    if (!found) continue;
    const conv = found.product.conversions.find((c) => c.unit === line.unit);
    const base = Number(line.quantity) * (conv?.factor ?? 1);
    const candidates = [technicianWarehouse(order.technicianId, order), db.warehouses[0]!.id, db.warehouses[2]!.id];
    const whId = candidates.find((w) => available(stockRow(line.variantId!, w, "SERVICE")) >= base);
    if (!whId) {
      if (strict) continue;
      continue;
    }
    reserve({ source: "SERVICE_ORDER", sourceId: order.id, sourceNumber: order.number, variantId: line.variantId!, warehouseId: whId, quantity: base, purpose: "SERVICE", reservedForId: order.technicianId ?? order.customerId, reservedForName: order.technicianId ? fullName(userById(order.technicianId)) : order.number });
  }
}

function applyPayment(order: ServiceOrderRec, payment: { method: string; amount: string }, ctx: Ctx) {
  const amountCents = Math.round(Number(payment.amount) * 100);
  const { due } = orderAmounts(order);
  if (amountCents <= 0) throw apiError(422, "VALIDATION", "error.validation", { amount: ["validation.positive"] });
  const customer = userById(order.customerId);
  const method = payment.method as "CASH" | "CARD_POS" | "BANK_TRANSFER" | "CARD_ONLINE";
  if (method === "CASH" && ctx.technician?.employmentType === "INDEPENDENT" && !db.settings.independentCashAllowed) {
    throw apiError(403, "CASH_NOT_ALLOWED", "error.forbidden");
  }
  recordPayment({
    payerId: order.companyId ?? order.customerId,
    payerName: order.companyId ? db.b2bAccounts.find((c) => c.id === order.companyId)!.legalName : fullName(customer),
    orderType: "SERVICE",
    orderId: order.id,
    orderNumber: order.number,
    method,
    amountCents: Math.min(amountCents, due || amountCents),
    kind: amountCents < due ? "PARTIAL" : "FULL",
    collectedById: method === "CASH" ? ctx.user?.id ?? null : null,
  });
  history(order, ctx, "payment_recorded", { note: `${payment.amount} AZN · ${payment.method}` });
  notify(order.customerId, "PAYMENT_OK", "notif.paymentOk", L(`${order.number}: ${payment.amount} AZN ödəniş qəbul edildi`, `${order.number}: получена оплата ${payment.amount} AZN`, `${order.number}: payment of ${payment.amount} AZN received`), `/account/services/${order.id}`);
}

export function closeOrder(order: ServiceOrderRec, ctx: Ctx | null) {
  const before = order.status;
  order.status = "CLOSED";
  order.closedAt = nowIso();
  history(order, ctx, "status_changed", { from: before, to: "CLOSED" });
  // Müstəqil usta hesablaşması (§51.3)
  const tech = db.technicians.find((t) => t.id === order.technicianId);
  if (tech?.employmentType === "INDEPENDENT") {
    const est = approvedEstimate(order);
    const service = serviceOf(order);
    const labor = est ? est.lines.filter((l) => !l.declined && (l.type === "LABOR" || l.type === "EXTRA")).reduce((s, l) => s + Math.round(l.unitCents * Number(l.quantity)), 0) : Math.round((order.basePriceCents ?? service.priceCents ?? 0) * 0.7);
    const own = est ? est.lines.filter((l) => !l.declined && l.ownMaterial).reduce((s, l) => s + Math.round(l.unitCents * Number(l.quantity)), 0) : 0;
    const cash = db.payments.filter((p) => p.orderId === order.id && p.method === "CASH" && p.collectedById === tech.userId).reduce((s, p) => s + p.amountCents, 0);
    const deductions = [];
    if (cash) deductions.push({ kind: "CASH_COLLECTED" as const, label: L("Şirkət adına qəbul edilmiş nağd", "Наличные, принятые от имени компании", "Cash collected on behalf of company"), cents: cash });
    db.settlementLines.unshift({ id: newId("stl"), technicianId: tech.id, orderId: order.id, orderNumber: order.number, companyName: db.branding.legalName, closedAt: nowIso(), laborCents: labor, ownMaterialCents: own, deductions, status: "PENDING", period: periodLabel(), paidAt: null, holdReason: null, approvedBy: null });
  }
  // Partner komissiyası (§45.4)
  if (order.partnerCompanyId) {
    const partner = db.b2bAccounts.find((c) => c.id === order.partnerCompanyId);
    const type = db.partnerTypes.find((p) => p.id === partner?.partnerTypeId);
    if (partner?.commissionEnabled && type?.capabilities.commission) {
      const { total } = orderAmounts(order);
      const service = serviceOf(order);
      const rateRow = type.serviceRates.find((r) => r.serviceTypeLabel.toLowerCase().includes(tr(db.equipmentCategories.find((c) => c.id === service.categoryId)!.name, "az").split(" ")[0]!.toLowerCase().slice(0, 5)));
      const model = rateRow?.model ?? "PERCENT";
      const rate = rateRow?.value ?? type.defaultRate ?? "5";
      const base = type.commissionBase === "NET_OF_VAT" ? total - vatIncluded(total) : total;
      const amount = model === "FIXED" ? Math.round(Number(rate) * 100) : percentOf(base, Number(rate));
      db.commissions.unshift({ id: newId("com"), partnerId: partner.id, orderId: order.id, orderNumber: order.number, orderType: "SERVICE", baseCents: base, model, rate, amountCents: amount, status: "PENDING", createdAt: nowIso(), paidAt: null });
    }
  }
  audit(ctx, "close", "service_orders", order.id, order.number);
}

export function applyAction(order: ServiceOrderRec, req: ServiceOrderActionRequest, ctx: Ctx) {
  const action = requireAction(order, ctx, req.action, req.stageId);
  const behalf = action.payload && (action.payload as { onBehalf?: boolean }).onBehalf ? " (icraçı adına)" : "";
  const reason = reasonLabel(req.reasonCode, ctx);
  const before = order.status;

  switch (req.action) {
    case "confirm": {
      const check = order.stages[0]!;
      check.status = "COMPLETED";
      check.startedAt = nowIso();
      check.completedAt = nowIso();
      order.status = "CONFIRMED";
      order.operatorId ??= ctx.user?.id ?? null;
      history(order, ctx, "confirm", { from: before, to: "CONFIRMED" });
      notify(order.customerId, "ORDER_CONFIRMED", "notif.orderConfirmed", L(`${order.number} təsdiqləndi`, `${order.number} подтверждён`, `${order.number} confirmed`), `/account/services/${order.id}`, "SMS");
      // müştərinin seçdiyi usta varsa, təklif göndərilir
      advance(order, ctx);
      const pendingTech = order.preferredTechnicianId;
      if (pendingTech) {
        const target = order.stages.find((s) => s.status === "READY" && (s.executor === "DISPATCHER" || s.executor === "TECHNICIAN"));
        if (target) offerToTechnician(order, target, pendingTech, ctx);
      }
      break;
    }
    case "reject":
      needReason(req);
      order.status = "REJECTED";
      order.cancelReason = reason ?? null;
      order.stages.forEach((s) => !isDone(s) && (s.status = "CANCELLED"));
      history(order, ctx, "reject", { from: before, to: "REJECTED", reason });
      break;
    case "hold":
      needReason(req);
      order.prevStatus = order.status;
      order.status = "ON_HOLD";
      history(order, ctx, "hold", { from: before, to: "ON_HOLD", reason });
      break;
    case "resume":
      order.status = order.prevStatus ?? "CONFIRMED";
      order.prevStatus = null;
      history(order, ctx, "resume", { from: before, to: order.status });
      advance(order, ctx);
      break;
    case "cancel": {
      needReason(req);
      const departed = order.stages.some((s) => ["ON_THE_WAY", "ARRIVED"].includes(s.status) || (s.type === "ARRIVAL" && s.status === "COMPLETED"));
      if (departed) applyFeeRules(order, "ON_CANCEL_AFTER_DEPARTURE", ctx);
      order.status = "CANCELLED";
      order.cancelReason = reason ?? null;
      order.stages.forEach((s) => !isDone(s) && (s.status = "CANCELLED"));
      db.reservations.filter((r) => r.sourceId === order.id && r.status === "ACTIVE").forEach((r) => releaseReservation(r.id));
      db.logisticsTasks.filter((tk) => tk.relatedOrderId === order.id && !["DELIVERED", "CANCELLED"].includes(tk.status)).forEach((tk) => (tk.status = "CANCELLED"));
      history(order, ctx, "cancel", { from: before, to: "CANCELLED", reason });
      break;
    }
    case "reschedule": {
      needReason(req);
      if (req.scheduledAt) order.scheduledAt = req.scheduledAt;
      const failed = req.stageId ? getStage(order, req.stageId) : order.stages.find((s) => s.status === "FAILED");
      if (failed && failed.status === "FAILED") {
        failed.status = failed.assigneeId ? "ACCEPTED" : "READY";
        failed.failReason = null;
        if (failed.logisticsTaskId) {
          const task = db.logisticsTasks.find((x) => x.id === failed.logisticsTaskId);
          if (task) {
            task.status = task.assigneeId ? "ASSIGNED" : "PLANNED";
            task.failReason = null;
            if (req.scheduledAt) { task.windowStart = req.scheduledAt; task.windowEnd = addMinutes(req.scheduledAt, 120); }
          }
        }
      }
      order.needsReschedule = false;
      history(order, ctx, "reschedule", { reason, note: req.scheduledAt });
      notify(order.customerId, "RESCHEDULED", "notif.orderConfirmed", L(`${order.number}: vaxt dəyişdirildi`, `${order.number}: время изменено`, `${order.number}: time changed`), `/account/services/${order.id}`);
      if (order.technicianId) notify(order.technicianId, "RESCHEDULED", "notif.newOffer", L(`${order.number}: vaxt dəyişdirildi`, `${order.number}: время изменено`, `${order.number}: rescheduled`), `/technician/jobs/${order.id}`);
      break;
    }
    case "change_execution_form": {
      const service = serviceOf(order);
      const form = req.executionForm;
      if (!form || !service.executionForms.includes(form) || form === order.executionForm) throw apiError(422, "VALIDATION", "error.validation", { executionForm: ["validation.required"] });
      const tplId = service.templateIds[form]!;
      const tpl = db.templates.find((x) => x.id === tplId)!;
      const doneTypes = new Set(order.stages.filter((s) => s.status === "COMPLETED").map((s) => s.type));
      order.executionForm = form;
      order.templateId = tpl.id;
      order.templateVersion = tpl.version;
      order.stages = instantiateStages(tpl);
      for (const s of order.stages) {
        if (doneTypes.has(s.type) && ["CHECK", "ASSIGNMENT", "ARRIVAL", "DIAGNOSTICS", "INTAKE"].includes(s.type)) { s.status = "COMPLETED"; s.completedAt = nowIso(); s.assigneeId = order.technicianId; }
      }
      history(order, ctx, "change_execution_form", { note: form });
      notify(order.customerId, "FORM_CHANGED", "notif.orderConfirmed", L(`${order.number}: icra forması dəyişdirildi`, `${order.number}: изменён формат выполнения`, `${order.number}: service format changed`), `/account/services/${order.id}`, "SMS");
      advance(order, ctx);
      break;
    }
    case "assign":
    case "auto_assign": {
      const stage = getStage(order, req.stageId);
      let techId = req.technicianId;
      if (req.action === "auto_assign" || !techId) techId = rankTechnicians(order, stage)[0]?.id;
      if (!techId) throw apiError(409, "NO_CANDIDATES", "error.notFound");
      if (!techHasSpec(techId, stage.specializationId)) throw apiError(422, "SPECIALIZATION_MISMATCH", "error.validation", { technicianId: ["validation.specialization"] });
      offerToTechnician(order, stage, techId, ctx);
      if (req.scheduledAt) order.scheduledAt = req.scheduledAt;
      break;
    }
    case "accept": {
      const stage = getStage(order, req.stageId);
      const techId = stage.assigneeId!;
      if (stage.executor === "DISPATCHER") {
        stage.status = "COMPLETED";
        stage.completedAt = nowIso();
      } else {
        stage.status = "ACCEPTED";
      }
      order.technicianId ??= techId;
      history(order, ctx, "accept" + (behalf ? "_on_behalf" : ""), { note: fullName(userById(techId)) });
      notify(order.customerId, "TECHNICIAN_ASSIGNED", "notif.technicianAssigned", L(`${order.number}: ${fullName(userById(techId))} işi qəbul etdi`, `${order.number}: мастер ${fullName(userById(techId))} принял заказ`, `${order.number}: ${fullName(userById(techId))} accepted the job`), `/account/services/${order.id}`, "PUSH");
      advance(order, ctx);
      break;
    }
    case "decline": {
      needReason(req);
      const stage = getStage(order, req.stageId);
      history(order, ctx, "decline", { reason, note: fullName(userById(stage.assigneeId)) });
      stage.assigneeId = null;
      stage.status = "READY";
      if (order.assignmentMethod === "CUSTOMER_CHOICE") order.assignmentMethod = "DISPATCHER";
      break;
    }
    case "start_travel": {
      const stage = getStage(order, req.stageId);
      stage.status = "ON_THE_WAY";
      stage.startedAt = nowIso();
      history(order, ctx, "start_travel");
      notify(order.customerId, "TECHNICIAN_ON_WAY", "notif.technicianOnWay", L(`${order.number}: usta yola çıxdı`, `${order.number}: мастер выехал`, `${order.number}: technician is on the way`), `/account/services/${order.id}`, "SMS");
      break;
    }
    case "arrive": {
      const stage = getStage(order, req.stageId);
      if (stage.type === "ARRIVAL") {
        stage.status = "COMPLETED";
        stage.completedAt = nowIso();
      } else stage.status = "ARRIVED";
      history(order, ctx, "arrive");
      advance(order, ctx);
      break;
    }
    case "start": {
      const stage = getStage(order, req.stageId);
      stage.status = "IN_PROGRESS";
      stage.startedAt ??= nowIso();
      stage.assigneeId ??= ctx.user?.id ?? null;
      history(order, ctx, "start", { note: tr(stage.name, "az") + behalf });
      break;
    }
    case "customer_absent": {
      needReason(req);
      const stage = getStage(order, req.stageId);
      stage.status = "FAILED";
      stage.failReason = reason ?? null;
      if (req.photos?.length) stage.photos.push(...req.photos.map((p) => ({ id: newId("att"), url: `/mock-uploads/${p.name}`, name: p.name, mimeType: "image/jpeg", size: 200_000 })));
      order.needsReschedule = true;
      history(order, ctx, "customer_absent", { reason, note: req.note });
      break;
    }
    case "submit_estimate": {
      const stage = getStage(order, req.stageId);
      if (!req.lines?.length) throw apiError(422, "VALIDATION", "error.validation", { lines: ["validation.selectAtLeastOne"] });
      const lines = buildEstimateLines(order, req.lines, ctx);
      const est = addEstimate(order, lines, ctx);
      if (stage.type !== "ESTIMATE_APPROVAL") {
        if (req.note) stage.note = req.note;
        if (req.photos?.length) stage.photos.push(...req.photos.map((p) => ({ id: newId("att"), url: `/mock-uploads/${p.name}`, name: p.name, mimeType: "image/jpeg", size: 200_000 })));
        stage.status = "COMPLETED";
        stage.completedAt = nowIso();
      }
      const approval = order.stages.find((s) => s.type === "ESTIMATE_APPROVAL" && !isDone(s));
      if (approval && approval.status !== "PENDING") approval.status = "WAITING_FOR_APPROVAL";
      history(order, ctx, "submit_estimate", { note: est.number });
      notify(order.customerId, "ESTIMATE_READY", "notif.estimateReady", L(`${order.number}: smeta hazırdır, təsdiqinizi gözləyirik`, `${order.number}: смета готова, ждём вашего решения`, `${order.number}: estimate is ready for your approval`), `/account/services/${order.id}`, "WHATSAPP");
      advance(order, ctx);
      break;
    }
    case "consume_materials": {
      const stage = getStage(order, req.stageId);
      for (const m of req.materials ?? []) {
        const found = findVariant(m.productId) ?? (() => { const p = db.products.find((x) => x.id === m.productId); return p ? { product: p, variant: p.variants[0]! } : null; })();
        if (!found) continue;
        const conv = found.product.conversions.find((c) => c.unit === m.unit);
        const base = Number(m.quantity) * (conv?.factor ?? 1);
        const whId = technicianWarehouse(stage.assigneeId, order);
        if (!m.ownMaterial) move({ type: "SERVICE_CONSUMPTION", warehouseId: whId, variantId: found.variant.id, baseQuantity: base, quantity: m.quantity, unit: m.unit, direction: "OUT", purpose: "SERVICE", actorName: fullName(ctx.user), relatedDocument: order.number, reason: "Servis sərfiyyatı" });
        order.materials.push({ id: newId("mat"), productId: found.product.id, variantId: found.variant.id, name: found.product.name, sku: found.variant.sku, quantity: m.quantity, unit: m.unit, warehouseId: whId, ownMaterial: m.ownMaterial, costCents: m.ownMaterial ? null : Math.round(found.variant.prices.RETAIL * 0.62 * base), at: nowIso() });
      }
      history(order, ctx, "materials_consumed");
      break;
    }
    case "wait_part": {
      const stage = getStage(order, req.stageId);
      stage.status = "WAITING_FOR_PART";
      history(order, ctx, "wait_part", { note: req.note });
      break;
    }
    case "part_arrived": {
      const stage = getStage(order, req.stageId);
      if (stage.type === "WAIT_PART") {
        stage.status = "COMPLETED";
        stage.completedAt = nowIso();
        reserveApprovedMaterials(order, ctx);
        advance(order, ctx);
      } else stage.status = "IN_PROGRESS";
      history(order, ctx, "part_arrived");
      break;
    }
    case "block": {
      needReason(req);
      const stage = getStage(order, req.stageId);
      stage.status = "BLOCKED";
      stage.failReason = reason ?? null;
      history(order, ctx, "block", { reason });
      break;
    }
    case "unblock": {
      const stage = getStage(order, req.stageId);
      stage.status = "IN_PROGRESS";
      stage.failReason = null;
      history(order, ctx, "unblock");
      break;
    }
    case "complete_stage": {
      const stage = getStage(order, req.stageId);
      completeStage(order, stage, req, ctx);
      advance(order, ctx);
      break;
    }
    case "skip": {
      const stage = getStage(order, req.stageId);
      stage.status = "SKIPPED";
      stage.completedAt = nowIso();
      history(order, ctx, "skip", { note: tr(stage.name, "az") });
      advance(order, ctx);
      break;
    }
    case "assign_courier": {
      const stage = getStage(order, req.stageId);
      const task = ensureLogisticsTask(order, stage);
      const courierId = req.technicianId ?? db.users.find((u) => u.roles.includes("COURIER"))!.id;
      const courier = userById(courierId);
      task.assigneeId = courierId;
      task.assigneeKind = courier?.roles.includes("TECHNICIAN") ? "TECHNICIAN" : "COURIER";
      task.status = "ASSIGNED";
      if (req.scheduledAt) { task.windowStart = req.scheduledAt; task.windowEnd = addMinutes(req.scheduledAt, 120); }
      task.history.unshift({ at: nowIso(), status: "ASSIGNED", actor: fullName(ctx.user), note: fullName(courier) });
      stage.status = "ASSIGNED";
      stage.assigneeId = courierId;
      notify(courierId, "NEW_TASK", "notif.newTask", L(`${task.number}: ${task.from.address} → ${task.to.address}`), `/courier/tasks/${task.id}`, "SMS");
      history(order, ctx, "assign_courier", { note: fullName(courier) });
      break;
    }
    case "approve_estimate":
    case "partial_approve":
    case "reject_estimate":
    case "ask_question": {
      const decision = req.action === "approve_estimate" ? "APPROVE" : req.action === "partial_approve" ? "PARTIAL" : req.action === "reject_estimate" ? "REJECT" : "QUESTION";
      const channel = ((action.payload as { channel?: string } | undefined)?.channel ?? "CABINET") as EstimateDecisionRequest["channel"];
      decideEstimate(order, { decision, declinedLineIds: req.declinedLineIds ?? [], reasonCode: req.reasonCode, comment: req.note, channel }, ctx);
      break;
    }
    case "record_payment": {
      if (!req.payment) throw apiError(422, "VALIDATION", "error.validation", { amount: ["validation.required"] });
      applyPayment(order, req.payment, ctx);
      break;
    }
    case "close":
      closeOrder(order, ctx);
      break;
    case "waive_fee":
      needReason(req);
      order.fees.forEach((f) => (f.waived = true));
      history(order, ctx, "waive_fee", { reason });
      audit(ctx, "waive_fee", "service_orders", order.id, order.number, [], reason);
      break;
    case "add_note":
      history(order, ctx, "note", { note: req.note });
      break;
    case "pay_online":
      break;
    default:
      throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
  }
  recomputeStatus(order, ctx);
  audit(ctx, req.action, "service_orders", order.id, order.number, before !== order.status ? [{ field: "status", from: before, to: order.status }] : [], reason);
}

export function offerToTechnician(order: ServiceOrderRec, stage: StageRec, techId: string, ctx: Ctx | null) {
  stage.assigneeId = techId;
  stage.status = "ASSIGNED";
  stage.readyAt = nowIso();
  history(order, ctx, "assign", { note: fullName(userById(techId)) });
  notify(techId, "NEW_OFFER", "notif.newOffer", L(`${order.number}: ${tr(serviceOf(order).name, "az")}`, `${order.number}: ${tr(serviceOf(order).name, "ru")}`, `${order.number}: ${tr(serviceOf(order).name, "en")}`), `/technician/jobs?tab=offers`, "PUSH");
}

/** §15.3 — uyğunluq sıralaması (çəkilər konfiqurasiya olunur; burada sabit nümunə çəkilər). */
export function rankTechnicians(order: ServiceOrderRec, stage: StageRec | null) {
  const service = serviceOf(order);
  const requiredSpecs = stage?.specializationId ? [stage.specializationId] : service.specializationIds;
  const city = order.address?.city ?? db.branches.find((b) => b.id === order.branchId)?.city ?? "Bakı";
  return db.technicians
    .filter((tech) => tech.status === "ACTIVE")
    .filter((tech) => requiredSpecs.every((sid) => tech.specializations.some((s) => s.specializationId === sid && s.status === "ACTIVE")))
    .filter((tech) => tech.city === city)
    .filter((tech) => (tech.employmentType === "STAFF" ? db.staffLicenses.some((l) => l.technicianId === tech.id && l.status === "ACTIVE") : db.subscriptions.some((s) => s.subscriberId === tech.userId && ["ACTIVE", "TRIAL"].includes(s.status))))
    .map((tech) => {
      const load = db.serviceOrders.filter((o) => o.technicianId === tech.id && ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length;
      const loc = order.address?.location;
      const distance = loc ? Math.hypot(loc.lat - tech.location.lat, loc.lng - tech.location.lng) * 111 : 5;
      const plan = tech.employmentType === "INDEPENDENT" ? db.plans.find((p) => p.id === db.users.find((u) => u.id === tech.userId)?.planId) : null;
      const priority = Number(plan?.entitlements.priority_level ?? 1);
      const previous = db.serviceOrders.some((o) => o.customerId === order.customerId && o.technicianId === tech.id && o.id !== order.id);
      const score = tech.rating * 20 - distance * 2 - load * 6 + priority * 4 + (previous ? 8 : 0) - tech.warrantyClaimRate * 3 + (tech.employmentType === "STAFF" ? 3 : 0);
      return { id: tech.id, score, distance, load };
    })
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/* Smeta qərarı (§19.3) və haqq qaydaları (§20)                          */
/* ------------------------------------------------------------------ */

export function applicableFeeRules(order: ServiceOrderRec) {
  const service = serviceOf(order);
  const customer = userById(order.customerId);
  const plan = customer ? planForUser(customer, "CUSTOMER", null) : null;
  const zone = order.address?.location ? db.zones.find((z) => z.city === order.address!.city && z.outOfCity) : null;
  return db.feeRules.filter((r) => {
    if (!r.active) return false;
    if (r.validTo && new Date(r.validTo).getTime() < new Date(order.createdAt).getTime()) return false;
    if (new Date(r.validFrom).getTime() > new Date(order.createdAt).getTime()) return false;
    if (r.categoryId && r.categoryId !== service.categoryId) return false;
    if (r.serviceType && r.serviceType !== service.serviceType) return false;
    if (r.executionForm && r.executionForm !== order.executionForm) return false;
    if (plan && r.excludedPlans.includes(plan.code)) return false;
    if (r.zone === "OUT_OF_CITY" && !zone) return false;
    if (r.timeCondition && order.scheduledAt) {
      const d = new Date(order.scheduledAt);
      const hour = (d.getUTCHours() + 4) % 24;
      const weekend = [0, 6].includes(d.getUTCDay());
      const inHours = r.timeCondition.from && r.timeCondition.to ? hour >= Number(r.timeCondition.from.slice(0, 2)) || hour < Number(r.timeCondition.to.slice(0, 2)) : false;
      if (!(r.timeCondition.weekends && weekend) && !inHours) return false;
    }
    return true;
  });
}

export function applyFeeRules(order: ServiceOrderRec, trigger: "ON_ESTIMATE_REJECT" | "ON_CANCEL_AFTER_DEPARTURE" | "ALWAYS", ctx: Ctx | null) {
  const rules = applicableFeeRules(order).filter((r) => r.trigger === trigger);
  const base = orderAmounts(order).total;
  for (const r of rules) {
    const cents = r.amountType === "FIXED" ? Math.round(Number(r.amount) * 100) : percentOf(base, Number(r.amount));
    order.fees.push({ type: r.type, label: r.name, cents, trigger: r.trigger, waived: false });
    history(order, ctx, "fee_applied", { note: `${tr(r.name, "az")}: ${(cents / 100).toFixed(2)} AZN` });
  }
  return rules.length;
}

export function decideEstimate(order: ServiceOrderRec, req: EstimateDecisionRequest, ctx: Ctx) {
  const est = latestEstimate(order);
  if (!est || est.status !== "SENT") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
  const approval = order.stages.find((s) => s.type === "ESTIMATE_APPROVAL" && !isDone(s));
  const reason = reasonLabel(req.reasonCode, ctx);
  if (new Date(est.validUntil).getTime() < Date.now()) {
    est.status = "EXPIRED";
    throw apiError(409, "ESTIMATE_EXPIRED", "error.actionNotAllowed");
  }
  switch (req.decision) {
    case "APPROVE":
    case "PARTIAL": {
      if (req.decision === "PARTIAL") {
        for (const line of est.lines) {
          if (req.declinedLineIds.includes(line.id)) {
            if (!line.optional) throw apiError(422, "VALIDATION", "error.validation", { declinedLineIds: ["validation.onlyOptional"] });
            line.declined = true;
          }
        }
      }
      est.status = req.decision === "PARTIAL" && est.lines.some((l) => l.declined) ? "PARTIALLY_APPROVED" : "APPROVED";
      est.decidedAt = nowIso();
      est.decisionChannel = req.channel;
      if (approval) {
        approval.status = "COMPLETED";
        approval.completedAt = nowIso();
        approval.signed = req.channel === "SIGNATURE";
      }
      history(order, ctx, req.decision === "PARTIAL" ? "estimate_partially_approved" : "estimate_approved", { note: `${est.number} · ${req.channel}` });
      reserveApprovedMaterials(order, ctx);
      // qüvvədə olan haqlar: smeta təsdiqlənərsə yekun məbləğə daxil edilir və ya silinir
      order.fees = order.fees.filter((f) => f.trigger !== "ON_ESTIMATE_REJECT");
      advance(order, ctx);
      break;
    }
    case "REJECT": {
      if (!req.reasonCode) throw apiError(422, "VALIDATION", "error.validation", { reasonCode: ["validation.required"] });
      est.status = "REJECTED";
      est.decidedAt = nowIso();
      est.decisionChannel = req.channel;
      est.rejectReason = reason ?? null;
      history(order, ctx, "estimate_rejected", { reason });
      const feeCount = applyFeeRules(order, "ON_ESTIMATE_REJECT", ctx);
      if (order.executionForm === "ON_SITE") {
        if (feeCount) {
          // haqq ödənilməlidir — qalan icra mərhələləri ləğv, təhvil qalır
          order.stages.forEach((s) => {
            if (!isDone(s) && !["HANDOVER"].includes(s.type)) s.status = "CANCELLED";
          });
          if (approval) approval.status = "COMPLETED";
          const handover = order.stages.find((s) => s.type === "HANDOVER");
          if (handover) handover.status = "READY";
          order.status = "IN_PROGRESS";
        } else {
          order.status = "CANCELLED";
          order.cancelReason = reason ?? "Smetadan imtina";
          order.stages.forEach((s) => !isDone(s) && (s.status = "CANCELLED"));
          history(order, ctx, "status_changed", { from: "WAITING_FOR_CUSTOMER", to: "CANCELLED", reason });
        }
      } else {
        // CARRY_IN / PICKUP_DELIVERY: cihazın qaytarılması mərhələsinə keçilir
        if (approval) { approval.status = "COMPLETED"; approval.completedAt = nowIso(); }
        order.stages.forEach((s) => {
          if (isDone(s)) return;
          if (["EXECUTION", "TEST", "WAIT_PART", "WARRANTY", "READY_NOTICE"].includes(s.type)) s.status = "SKIPPED";
        });
        order.status = "IN_PROGRESS";
        advance(order, ctx);
      }
      break;
    }
    case "QUESTION":
      history(order, ctx, "estimate_question", { note: req.comment });
      if (order.operatorId) notify(order.operatorId, "ESTIMATE_QUESTION", "notif.estimateReady", L(`${order.number}: müştərinin smeta ilə bağlı sualı var`, `${order.number}: вопрос клиента по смете`, `${order.number}: customer question about estimate`), `/service-orders/${order.id}`);
      break;
  }
  recomputeStatus(order, ctx);
}

export function describeFees(order: ServiceOrderRec, locale: "az" | "ru" | "en") {
  const rules = applicableFeeRules(order);
  if (!rules.length) return [{ type: "DIAGNOSTICS", label: t("fee.none", locale), amount: { amount: "0.00", currency: "AZN" }, trigger: "ON_ESTIMATE_REJECT" }];
  return rules.map((r) => ({ type: r.type, label: tr(r.name, locale), amount: { amount: r.amountType === "FIXED" ? Number(r.amount).toFixed(2) : `${r.amount}%`, currency: r.amountType === "FIXED" ? "AZN" : "%" }, trigger: r.trigger }));
}
