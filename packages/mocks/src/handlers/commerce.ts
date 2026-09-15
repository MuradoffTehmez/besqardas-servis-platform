import { HttpResponse } from "msw";
import * as S from "@sp/schemas";
import { db, nextNumber } from "../db/state";
import type { AddressSnapshot, SalesOrderRec } from "../db/types";
import { fullName, type Ctx } from "../engine/context";
import { findVariant, reserve, releaseReservation } from "../engine/stock";
import { issueDocument, notify, onPaymentPaid, recordPayment } from "../engine/effects";
import { createServiceOrder } from "../engine/orders";
import { orderAmounts, recomputeStatus } from "../engine/workflow";
import { installmentCents, installmentPlans } from "../engine/pricing";
import { find, json, localize, parse, requireAuth, route, setCookie, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L, t } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { addMinutes, bakuAt, daysFromNow, nowIso } from "../lib/time";
import { computeCart, getCart } from "./cartShared";
import { paymentDto } from "../dto";

/** Səbət, checkout və ödəniş axını (PRD §31, §47–48). Frontend provayderə birbaşa qoşulmur. */

function cartResponse(ctx: Ctx, extraHeaders: [string, string][] = []) {
  const cart = getCart(ctx);
  const body = cart ? (({ _raw, ...rest }) => rest)(computeCart(cart, ctx)) : { id: null, items: [], promoCode: null, promoError: null, totals: { subtotal: money(0), discountTotal: money(0), installationTotal: money(0), deliveryTotal: money(0), vatTotal: money(0), total: money(0), appliedDiscounts: [], vatIncluded: true, itemsTotal: money(0), promoDiscount: money(0) }, itemCount: 0, merged: false };
  const headers = new Headers({ "content-type": "application/json" });
  for (const [k, v] of extraHeaders) headers.append(k, v);
  return new HttpResponse(JSON.stringify(localize(body, ctx.locale)), { headers });
}

function ensureGuestKey(ctx: Ctx): [string, string][] {
  if (ctx.user || ctx.guestKey) return [];
  const cid = newId("guest");
  ctx.guestKey = cid;
  return [["Set-Cookie", setCookie("cid", cid, 60 * 60 * 24 * 30)]];
}

function deliveryPrice(subtotalCents: number, method: string) {
  if (method !== "COURIER") return 0;
  return subtotalCents >= Math.round(Number(db.settings.freeDeliveryThreshold.amount) * 100) ? 0 : Math.round(Number(db.settings.deliveryFlatRate.amount) * 100);
}

export const commerceHandlers = [
  route.get("/cart", ({ ctx }) => cartResponse(ctx)),

  route.post("/cart/items", async ({ ctx, body }) => {
    const data = parse(S.AddToCartRequest, await body());
    const headers = ensureGuestKey(ctx);
    const found = findVariant(data.variantId);
    if (!found) throw apiError(404, "NOT_FOUND", "error.notFound");
    if (Number(data.quantity) <= 0) throw validationError({ quantity: ["validation.positive"] });
    const cart = getCart(ctx, true)!;
    const existing = cart.items.find((i) => i.variantId === data.variantId && i.unit === data.unit);
    const computed = computeCart({ ...cart, items: [{ id: "tmp", variantId: data.variantId, productId: found.product.id, quantity: "1", unit: data.unit, withInstallation: false, priceSnapshotCents: 0 }] }, ctx);
    const snapshot = Math.round(Number(computed.items[0]!.unitPriceForUnit.amount) * 100);
    if (existing) {
      existing.quantity = String(Number(existing.quantity) + Number(data.quantity));
      existing.withInstallation ||= data.withInstallation;
      existing.priceSnapshotCents = snapshot;
    } else {
      cart.items.push({ id: newId("ci"), variantId: data.variantId, productId: found.product.id, quantity: data.quantity, unit: data.unit, withInstallation: data.withInstallation, priceSnapshotCents: snapshot });
    }
    cart.updatedAt = nowIso();
    return cartResponse(ctx, headers);
  }),

  route.patch("/cart/items/:id", async ({ ctx, params, body }) => {
    const cart = getCart(ctx);
    if (!cart) throw apiError(404, "NOT_FOUND", "error.notFound");
    const item = find(cart.items, params.id);
    const data = await body<{ quantity?: string; unit?: string; withInstallation?: boolean }>();
    if (data.quantity !== undefined) {
      if (!(Number(data.quantity) > 0)) throw validationError({ quantity: ["validation.positive"] });
      item.quantity = data.quantity;
    }
    if (data.unit) item.unit = data.unit;
    if (data.withInstallation !== undefined) item.withInstallation = data.withInstallation;
    const computed = computeCart({ ...cart, items: [item] }, ctx);
    item.priceSnapshotCents = Math.round(Number(computed.items[0]!.unitPriceForUnit.amount) * 100);
    return cartResponse(ctx);
  }),

  route.delete("/cart/items/:id", ({ ctx, params }) => {
    const cart = getCart(ctx);
    if (cart) cart.items = cart.items.filter((i) => i.id !== params.id);
    return cartResponse(ctx);
  }),

  route.post("/cart/promo", async ({ ctx, body }) => {
    const { code } = await body<{ code: string | null }>();
    const cart = getCart(ctx, true)!;
    cart.promoCode = code?.trim() ? code.trim().toUpperCase() : null;
    return cartResponse(ctx);
  }),

  route.get("/checkout/options", ({ ctx, url }) => {
    const user = requireAuth(ctx);
    const cart = getCart(ctx);
    if (!cart || !cart.items.length) throw apiError(409, "CART_EMPTY", "error.validation");
    const c = computeCart(cart, ctx);
    const needsInstallation = cart.items.some((i) => i.withInstallation);
    const b2b = !!ctx.company;
    const method = url.searchParams.get("deliveryMethod") ?? "COURIER";
    const totalCents = c._raw.total + deliveryPrice(c._raw.subtotal, method);
    const ownerId = ctx.role === "CORPORATE_CUSTOMER" || b2b ? user.companyId! : user.id;
    return {
      deliveryMethods: [
        { method: "COURIER", label: t("delivery.courier", ctx.locale), price: money(deliveryPrice(c._raw.subtotal, "COURIER")), eta: t("eta.2days", ctx.locale), available: true },
        { method: "PICKUP", label: t("delivery.pickup", ctx.locale), price: money(0), eta: t("eta.today", ctx.locale), available: true },
        { method: "WITH_INSTALLATION", label: t("delivery.withInstallation", ctx.locale), price: money(0), eta: t("eta.install", ctx.locale), available: needsInstallation },
      ],
      pickupBranches: db.branches.map((b) => {
        const whs = db.warehouses.filter((w) => w.branchId === b.id && ["CENTRAL", "BRANCH"].includes(w.type)).map((w) => w.id);
        const allInStock = cart.items.every((i) => db.stock.filter((s) => s.variantId === i.variantId && whs.includes(s.warehouseId) && s.purpose === "SALES").reduce((sum, s) => sum + s.physical - s.reserved - s.damaged, 0) >= Number(i.quantity));
        return { id: b.id, name: b.name, address: `${b.city}, ${b.address}`, allInStock, readyIn: allInStock ? L("2 saat ərzində", "В течение 2 часов", "Within 2 hours") : L("1–2 iş günü", "1–2 рабочих дня", "1–2 business days") };
      }),
      addresses: db.addresses.filter((a) => a.ownerId === ownerId),
      addressRules: { oneTimeAllowed: !!ctx.entitlements.one_time_address, maxAddresses: Number(ctx.entitlements.max_addresses ?? 1), source: b2b ? "B2B_CONTRACT" : "PLAN" },
      paymentMethods: [
        { method: "CARD_ONLINE", label: t("pay.card", ctx.locale), available: true, note: null },
        { method: "CASH", label: t("pay.cash", ctx.locale), available: !b2b && method !== "WITH_INSTALLATION", note: null },
        { method: "CARD_POS", label: t("pay.pos", ctx.locale), available: !b2b && method === "COURIER", note: null },
        { method: "INSTALLMENT", label: t("pay.installment", ctx.locale), available: !b2b && totalCents >= 30000, note: totalCents >= 30000 ? null : t("pay.installmentMin", ctx.locale) },
        { method: "BANK_TRANSFER", label: t("pay.transfer", ctx.locale), available: b2b, note: b2b ? null : t("pay.b2bOnly", ctx.locale) },
        { method: "BALANCE", label: t("pay.balance", ctx.locale), available: b2b && ctx.company!.paymentTerms === "DEFERRED", note: b2b ? null : t("pay.b2bOnly", ctx.locale) },
      ],
      installmentOffers: b2b ? [] : installmentPlans(totalCents),
      installationSlots: needsInstallation
        ? [1, 2, 3, 4, 5].map((d) => ({ date: bakuAt(d, 0).slice(0, 10), slots: [10, 13, 16].map((h) => ({ start: bakuAt(d, h), end: bakuAt(d, h + 3), available: (d + h) % 4 !== 0 })) }))
        : [],
      requiresInvoiceDetails: b2b,
      needsInstallation,
      company: ctx.company ? { name: ctx.company.legalName, voen: ctx.company.voen, creditAvailable: money(ctx.company.creditLimitCents - ctx.company.debtCents) } : null,
      summary: (({ _raw, ...rest }) => rest)({ ...c, totals: { ...c.totals, deliveryTotal: money(deliveryPrice(c._raw.subtotal, method)), total: money(totalCents) } }),
    };
  }),

  route.post("/checkout", async ({ ctx, body }) => {
    const user = requireAuth(ctx);
    const data = parse(S.CheckoutRequest, await body());
    const existing = db.salesOrders.find((s) => s.idempotencyKey === data.idempotencyKey);
    if (existing) {
      const pay = db.payments.find((p) => p.orderId === existing.id);
      return { salesOrderId: existing.id, salesOrderNumber: existing.number, serviceOrderNumber: null, paymentId: pay?.id ?? null, redirectUrl: pay && pay.status === "INITIATED" ? `/checkout/pay?paymentId=${pay.id}` : null };
    }
    const cart = getCart(ctx);
    if (!cart || !cart.items.length) throw apiError(409, "CART_EMPTY", "error.validation");
    const c = computeCart(cart, ctx);
    const b2b = !!ctx.company;

    // Ünvan qaydaları — plan imkanlarına görə (§31.2)
    let address: AddressSnapshot | null = null;
    if (data.deliveryMethod !== "PICKUP") {
      if (data.oneTimeAddress) {
        if (!ctx.entitlements.one_time_address) throw apiError(403, "ENTITLEMENT_REQUIRED", "error.entitlement", { oneTimeAddress: ["validation.planOneTimeAddress"] });
        address = { id: newId("addr"), label: "Birdəfəlik ünvan", city: data.oneTimeAddress.city, street: data.oneTimeAddress.street, building: data.oneTimeAddress.building, apartment: data.oneTimeAddress.apartment, isDefault: false, oneTime: true };
      } else {
        const ownerId = b2b ? user.companyId : user.id;
        const a = db.addresses.find((x) => x.id === data.addressId && x.ownerId === ownerId);
        if (!a) throw validationError({ addressId: ["validation.required"] });
        address = { ...a };
      }
    } else if (!data.pickupBranchId) throw validationError({ pickupBranchId: ["validation.required"] });
    if (b2b && !data.invoice) throw validationError({ invoice: ["validation.required"] });
    if (data.paymentMethod === "BALANCE" && ctx.company) {
      const credit = ctx.company.creditLimitCents - ctx.company.debtCents;
      if (credit < c._raw.total) throw apiError(409, "CREDIT_LIMIT", "error.limit", { paymentMethod: ["validation.creditLimit"] });
    }
    if (data.paymentMethod === "INSTALLMENT" && c._raw.total < 30000) throw validationError({ paymentMethod: ["validation.installmentMin"] });

    const delivery = deliveryPrice(c._raw.subtotal, data.deliveryMethod);
    const cashCents = b2b ? Math.round((c._raw.total + delivery) * 1.18) : c._raw.total + delivery;
    // Kredit ilə alışda seçilmiş müddətin faizi yekun məbləğə əlavə olunur
    const totalCents = data.paymentMethod === "INSTALLMENT" ? installmentCents(cashCents, data.installmentMonths ?? 12) : cashCents;
    const number = nextNumber(db.settings.orderNumberPrefix.sales, 5100);
    const so: SalesOrderRec = {
      id: newId("so-sales"),
      number,
      status: ["CARD_ONLINE", "INSTALLMENT"].includes(data.paymentMethod) ? "PENDING_PAYMENT" : "CONFIRMED",
      customerId: user.id,
      companyId: user.companyId,
      lines: cart.items.map((item) => {
        const found = findVariant(item.variantId)!;
        const line = c.items.find((x) => x!.id === item.id)!;
        const conv = found.product.conversions.find((cv) => cv.unit === item.unit);
        return { id: newId("sol"), productId: found.product.id, variantId: item.variantId, name: found.product.name, sku: found.variant.sku, quantity: item.quantity, unit: item.unit, baseQuantity: String(Number(item.quantity) * (conv?.factor ?? 1)), unitCents: Math.round(Number(line.unitPriceForUnit.amount) * 100), totalCents: Math.round(Number(line.lineTotal.amount) * 100), returnedQuantity: "0" };
      }),
      subtotalCents: c._raw.subtotal,
      discountCents: c._raw.promoCents,
      deliveryCents: delivery,
      installationCents: c._raw.installation,
      vatCents: b2b ? cashCents - (c._raw.total + delivery) : Math.round(totalCents - totalCents / 1.18),
      totalCents,
      vatIncluded: !b2b,
      deliveryMethod: data.deliveryMethod,
      address,
      pickupBranchId: data.pickupBranchId ?? null,
      paymentMethod: data.paymentMethod,
      serviceOrderId: null,
      history: [{ id: newId("h"), at: nowIso(), actorName: fullName(user), action: "created", toStatus: "PENDING_PAYMENT" }],
      channel: b2b ? "B2B" : "WEB",
      branchId: db.branches[0]!.id,
      createdAt: nowIso(),
      idempotencyKey: data.idempotencyKey,
      appliedDiscounts: c.totals.appliedDiscounts.filter((d) => d.applied).map((d) => ({ code: d.code, label: L(d.label), cents: Math.round(Number(d.amount.amount) * 100) })),
    };
    // Rezervasiya (§39) — ikiqat satışın qarşısı
    for (const line of so.lines) {
      reserve({ source: "SALES_ORDER", sourceId: so.id, sourceNumber: so.number, variantId: line.variantId, warehouseId: db.warehouses[0]!.id, quantity: Number(line.baseQuantity), purpose: "SALES", reservedForId: user.id, reservedForName: fullName(user), ttlHours: 72, enforce: false });
    }
    db.salesOrders.unshift(so);
    if (b2b && data.paymentMethod === "BALANCE" && ctx.company) ctx.company.debtCents += totalCents;

    // Məhsul + quraşdırma → əlaqəli servis sifarişi (§31.4)
    let serviceOrderNumber: string | null = null;
    const installItem = cart.items.find((i) => i.withInstallation);
    if (installItem && address) {
      const found = findVariant(installItem.variantId)!;
      const svc = db.services.find((s) => s.id === found.product.installServiceId);
      if (svc) {
        const order = createServiceOrder({ serviceId: svc.id, executionForm: "ON_SITE", customerId: user.id, companyId: user.companyId, description: `Quraşdırma: ${found.product.name.az} (${so.number})`, address, contactChannel: "CALL", scheduledAt: data.installationSlot ?? null, source: "PRODUCT_PURCHASE", salesOrderId: so.id, device: { categoryId: db.equipmentCategories[found.product.categoryId === db.productCategories[3]!.id ? 1 : 0]!.id, brandId: found.product.brandId, modelId: found.product.modelId, modelName: found.product.name.az, serialNumber: null } });
        so.serviceOrderId = order.id;
        serviceOrderNumber = order.number;
      }
    }

    let paymentId: string | null = null;
    let redirectUrl: string | null = null;
    if (["CARD_ONLINE", "INSTALLMENT"].includes(data.paymentMethod)) {
      const p = recordPayment({ payerId: b2b ? user.companyId! : user.id, payerName: ctx.company?.legalName ?? fullName(user), orderType: "SALES", orderId: so.id, orderNumber: so.number, method: data.paymentMethod, amountCents: totalCents, status: "INITIATED", installmentMonths: data.installmentMonths ?? null, idempotencyKey: `${data.idempotencyKey}:pay` });
      paymentId = p.id;
      redirectUrl = `/checkout/pay?paymentId=${p.id}`;
    } else {
      so.history.unshift({ id: newId("h"), at: nowIso(), actorName: "Sistem", action: "status_changed", fromStatus: "PENDING_PAYMENT", toStatus: "CONFIRMED" });
      if (b2b) issueDocument({ type: "INVOICE", ownerId: user.companyId!, counterpartyName: ctx.company!.legalName, counterpartyVoen: ctx.company!.voen, orderType: "SALES", orderId: so.id, orderNumber: so.number, lines: so.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitCents: l.unitCents, vatRate: 18 })), vatIncluded: false, meta: { invoice: JSON.stringify(data.invoice ?? {}) } });
    }
    cart.items = [];
    cart.promoCode = null;
    notify(user.id, "ORDER_CREATED", "notif.orderCreated", L(`${so.number} sifarişiniz qəbul edildi`, `Заказ ${so.number} принят`, `Order ${so.number} received`), `/account/orders/${so.id}`);
    return { salesOrderId: so.id, salesOrderNumber: so.number, serviceOrderNumber, paymentId, redirectUrl };
  }),

  // ---- Ödənişlər ----
  route.post("/payments", async ({ ctx, body }) => {
    const user = requireAuth(ctx);
    const data = parse(S.InitiatePaymentRequest, await body());
    let orderNumber = "";
    let amountCents = 0;
    let orderId: string | null = data.orderId;
    if (data.orderType === "SERVICE") {
      const o = find(db.serviceOrders, data.orderId);
      orderNumber = o.number;
      amountCents = data.amount ? Math.round(Number(data.amount) * 100) : orderAmounts(o).due;
    } else if (data.orderType === "SALES") {
      const s = find(db.salesOrders, data.orderId);
      orderNumber = s.number;
      amountCents = s.totalCents;
    } else if (data.orderType === "SUBSCRIPTION") {
      const sub = find(db.subscriptions, data.orderId);
      orderNumber = `SUB-${sub.id.slice(0, 6).toUpperCase()}`;
      amountCents = sub.priceCents;
    } else {
      orderNumber = data.orderId;
      orderId = null;
      amountCents = Math.round(Number(data.amount ?? "0") * 100);
    }
    if (amountCents <= 0) throw validationError({ amount: ["validation.positive"] });
    const p = recordPayment({ payerId: user.companyId ?? user.id, payerName: ctx.company?.legalName ?? fullName(user), orderType: data.orderType, orderId, orderNumber, method: data.method, amountCents, status: "INITIATED", idempotencyKey: data.idempotencyKey, installmentMonths: data.installmentMonths ?? null });
    return { paymentId: p.id, redirectUrl: `/checkout/pay?paymentId=${p.id}`, payment: paymentDto(p, ctx) };
  }),

  route.get("/payments/:id", ({ ctx, params }) => {
    requireAuth(ctx);
    const p = find(db.payments, params.id);
    const so = p.orderType === "SALES" ? db.salesOrders.find((s) => s.id === p.orderId) : null;
    const svc = p.orderType === "SERVICE" ? db.serviceOrders.find((s) => s.id === p.orderId) : null;
    return { ...paymentDto(p, ctx), salesOrderId: so?.id ?? null, serviceOrderId: svc?.id ?? null, subscriptionId: p.orderType === "SUBSCRIPTION" ? p.orderId : null };
  }),

  /** Provayderin ödəniş səhifəsinin simulyasiyası (webhook əvəzi). */
  route.post("/payments/:id/provider-callback", async ({ ctx, params, body }) => {
    const p = find(db.payments, params.id);
    const { outcome } = await body<{ outcome: "success" | "fail" | "cancel" }>();
    if (!["INITIATED", "PENDING"].includes(p.status)) return paymentDto(p, ctx);
    if (outcome === "success") {
      p.status = "PAID";
      p.paidAt = nowIso();
      onPaymentPaid(p);
      if (p.orderType === "SALES") {
        const so = db.salesOrders.find((s) => s.id === p.orderId);
        if (so && so.status === "PENDING_PAYMENT") {
          so.status = "CONFIRMED";
          so.history.unshift({ id: newId("h"), at: nowIso(), actorName: "Epoint", action: "payment_paid", fromStatus: "PENDING_PAYMENT", toStatus: "CONFIRMED" });
          issueDocument({ type: "INVOICE", ownerId: so.companyId ?? so.customerId, counterpartyName: p.payerName, counterpartyVoen: null, orderType: "SALES", orderId: so.id, orderNumber: so.number, lines: so.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitCents: l.unitCents, vatRate: 18 })), vatIncluded: so.vatIncluded, meta: {} });
        }
      }
      if (p.orderType === "SERVICE") {
        const o = db.serviceOrders.find((x) => x.id === p.orderId);
        if (o) {
          o.history.unshift({ id: newId("h"), at: nowIso(), actorName: "Epoint", action: "payment_recorded", note: `${(p.amountCents / 100).toFixed(2)} AZN · CARD_ONLINE` });
          recomputeStatus(o, null);
        }
      }
      if (p.orderType === "SUBSCRIPTION") {
        const sub = db.subscriptions.find((s) => s.id === p.orderId);
        if (sub) {
          if (sub.pendingPlanId) { sub.planId = sub.pendingPlanId; sub.pendingPlanId = null; }
          sub.status = "ACTIVE";
          sub.graceUntil = null;
          sub.currentPeriodEnd = daysFromNow(sub.period === "MONTH_12" ? 365 : sub.period === "MONTH_6" ? 182 : sub.period === "MONTH_3" ? 91 : 30);
          const u = db.users.find((x) => x.id === sub.subscriberId);
          if (u) u.planId = sub.planId;
        }
      }
      notify(p.payerId, "PAYMENT_OK", "notif.paymentOk", L(`${p.orderNumber}: ödəniş uğurla tamamlandı`, `${p.orderNumber}: оплата прошла`, `${p.orderNumber}: payment successful`), null, "EMAIL");
    } else {
      p.status = outcome === "cancel" ? "CANCELLED" : "FAILED";
      p.failureReason = outcome === "cancel" ? "İstifadəçi ödənişi ləğv etdi" : "Bank əməliyyatı rədd etdi (05)";
      notify(p.payerId, "PAYMENT_FAIL", "notif.paymentFail", L(`${p.orderNumber}: ödəniş uğursuz oldu`, `${p.orderNumber}: оплата не прошла`, `${p.orderNumber}: payment failed`), null, "EMAIL");
    }
    return paymentDto(p, ctx);
  }),

  route.post("/sales-orders/:id/cancel", ({ ctx, params }) => {
    const user = requireAuth(ctx);
    const so = find(db.salesOrders, params.id);
    if (so.customerId !== user.id && so.companyId !== user.companyId && !["ADMIN", "SUPER_ADMIN", "SALES_EMPLOYEE", "MANAGER", "OPERATOR"].includes(ctx.role)) throw apiError(403, "FORBIDDEN", "error.forbidden");
    if (["SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "RETURNED"].includes(so.status)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const before = so.status;
    so.status = "CANCELLED";
    so.history.unshift({ id: newId("h"), at: nowIso(), actorName: fullName(user), action: "cancel", fromStatus: before, toStatus: "CANCELLED" });
    db.reservations.filter((r) => r.sourceId === so.id && r.status === "ACTIVE").forEach((r) => releaseReservation(r.id));
    db.payments.filter((p) => p.orderId === so.id && p.status === "INITIATED").forEach((p) => (p.status = "CANCELLED"));
    return json({ ok: true }, ctx.locale);
  }),

  route.post("/sales-orders/:id/reorder", ({ ctx, params }) => {
    requireAuth(ctx);
    const so = find(db.salesOrders, params.id);
    const cart = getCart(ctx, true)!;
    for (const l of so.lines) cart.items.push({ id: newId("ci"), variantId: l.variantId, productId: l.productId, quantity: l.quantity, unit: l.unit, withInstallation: false, priceSnapshotCents: l.unitCents });
    return cartResponse(ctx);
  }),

  route.get("/checkout/slots-window", () => ({ from: nowIso(), to: addMinutes(nowIso(), 60 * 24 * 7) })),
];
