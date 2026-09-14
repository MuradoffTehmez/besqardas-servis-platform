import { normalizeAzPhone } from "@sp/utils";
import { db } from "../db/state";
import { fullName, type Ctx } from "../engine/context";
import { notify, audit } from "../engine/effects";
import { findVariant } from "../engine/stock";
import { variantPrice } from "../engine/pricing";
import { createServiceOrder } from "../engine/orders";
import { orderAmounts } from "../engine/workflow";
import { find, list, notFound, parse, requireAuth, route, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { daysAgo, daysFromNow, nowIso, periodLabel } from "../lib/time";
import { checkDataUrl } from "../lib/upload";
import * as S from "@sp/schemas";
import { deviceDto, serviceOrderSummaryDto } from "../dto";
import { getCart } from "./cartShared";

/** B2B panelləri (PRD §44–45): Korporativ, Partner, Topdan. Phase 2 funksiyaları. */

function company(ctx: Ctx) {
  const u = requireAuth(ctx);
  if (!["CORPORATE_CUSTOMER", "PARTNER", "WHOLESALE_CUSTOMER"].includes(ctx.role) || !ctx.company) throw apiError(403, "FORBIDDEN", "error.forbidden");
  return { u, c: ctx.company };
}

function requireCompanyRole(ctx: Ctx, ...roles: string[]) {
  const { u } = company(ctx);
  if (!roles.includes(u.companyRole ?? "")) throw apiError(403, "FORBIDDEN", "error.forbidden");
}

function siteDto(a: (typeof db.addresses)[number]) {
  const devices = db.devices.filter((d) => d.siteId === a.id);
  const orders = db.serviceOrders.filter((o) => o.siteId === a.id);
  const manager = db.users.find((u) => u.companyId === a.ownerId && u.companyRole === "SITE_MANAGER");
  return { id: a.id, name: a.label, address: a, managerName: manager && a.label === "Logistika anbarı" ? fullName(manager) : null, deviceCount: devices.length, openOrders: orders.filter((o) => !["CLOSED", "CANCELLED", "COMPLETED"].includes(o.status)).length, nextServiceAt: db.periodicVisits.filter((v) => v.siteId === a.id && v.status === "PLANNED").map((v) => v.plannedAt).sort()[0] ?? null, slaCompliance: 90 + (a.label.length % 9) };
}

export const b2bHandlers = [
  route.get("/b2b/dashboard", ({ ctx }) => {
    const { c } = company(ctx);
    const orders = db.serviceOrders.filter((o) => o.companyId === c.id || o.partnerCompanyId === c.id);
    const sales = db.salesOrders.filter((s) => s.companyId === c.id);
    const commissions = db.commissions.filter((x) => x.partnerId === c.id);
    return {
      segment: c.segment,
      companyName: c.legalName,
      creditLimit: money(c.creditLimitCents),
      currentDebt: money(c.debtCents),
      availableCredit: money(Math.max(0, c.creditLimitCents - c.debtCents)),
      overdue: money(c.segment === "PARTNER" ? 120000 : 0),
      commissionBalance: c.segment === "PARTNER" ? money(commissions.filter((x) => ["PENDING", "APPROVED"].includes(x.status)).reduce((s, x) => s + x.amountCents, 0)) : null,
      openOrders: sales.filter((s) => !["COMPLETED", "CANCELLED", "RETURNED"].includes(s.status)).length,
      openServices: orders.filter((o) => !["CLOSED", "CANCELLED", "REJECTED"].includes(o.status)).length,
      pendingApprovals: orders.filter((o) => o.approvalPending).length + orders.filter((o) => o.status === "WAITING_FOR_CUSTOMER").length,
      addressUsage: c.segment === "CORPORATE" ? { used: db.addresses.filter((a) => a.ownerId === c.id).length, limit: c.addressLimit } : null,
      sla: c.segment === "CORPORATE" ? { compliance: 94.5, avgReactionMinutes: 48, breaches: orders.filter((o) => o.stages.some((s) => s.readyAt && s.slaMinutes && !s.completedAt && new Date(s.readyAt).getTime() + s.slaMinutes * 60000 < Date.now())).length } : null,
      campaigns: db.campaigns,
      recentOrders: [
        ...sales.map((s) => ({ id: s.id, number: s.number, kind: "SALES", status: s.status, total: money(s.totalCents), createdAt: s.createdAt })),
        ...orders.map((o) => ({ id: o.id, number: o.number, kind: "SERVICE", status: o.status, total: orderAmounts(o).total ? money(orderAmounts(o).total) : null, createdAt: o.createdAt })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
      spendByMonth: [5, 4, 3, 2, 1, 0].map((m) => {
        const label = periodLabel(new Date(daysAgo(m * 30)));
        return { month: label, amount: sales.filter((s) => periodLabel(new Date(s.createdAt)) === label).reduce((sum, s) => sum + s.totalCents / 100, 0) + orders.filter((o) => periodLabel(new Date(o.createdAt)) === label).reduce((sum, o) => sum + orderAmounts(o).total / 100, 0) };
      }),
      contract: c.contract,
      accountManager: c.accountManager,
      paymentTerms: c.paymentTerms,
      deferredDays: c.deferredDays,
      minOrder: money(c.minOrderCents),
      priceList: c.priceType,
    };
  }),

  /* ---------------- Korporativ ---------------- */
  route.get("/b2b/sites", ({ ctx }) => {
    const { c } = company(ctx);
    return { items: db.addresses.filter((a) => a.ownerId === c.id).map(siteDto), limit: c.addressLimit, used: db.addresses.filter((a) => a.ownerId === c.id).length };
  }),

  route.post("/b2b/sites", async ({ ctx, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER", "APPROVER");
    const data = parse(S.AddressInput, await body());
    // Limitə çatdıqda bloklanır, satış əməkdaşına artım sorğusu təklif olunur (§44.3)
    if (c.addressLimit !== null && db.addresses.filter((a) => a.ownerId === c.id).length >= c.addressLimit) throw apiError(403, "LIMIT_REACHED", "error.limit", { _: ["validation.siteLimit"] });
    const rec = { ...data, id: newId("site"), ownerId: c.id, isDefault: false, location: data.location ?? { lat: 40.4, lng: 49.86 } };
    db.addresses.push(rec);
    return siteDto(rec);
  }),

  route.post("/b2b/limit-increase", async ({ ctx, body }) => {
    const { c, u } = company(ctx);
    const { requested, comment } = await body<{ requested: number; comment?: string }>();
    if (!(requested > (c.addressLimit ?? 0))) throw validationError({ requested: ["validation.limitIncrease"] });
    notify(db.users.find((x) => x.roles.includes("SALES_EMPLOYEE"))?.id, "LIMIT_REQUEST", "notif.orderCreated", L(`${c.legalName}: ünvan limitinin ${requested}-ə artırılması sorğusu`), "/b2b-accounts");
    audit(ctx, "limit_increase_request", "b2b_accounts", c.id, c.legalName, [{ field: "addressLimit", from: String(c.addressLimit), to: String(requested) }], comment);
    return { id: newId("lir"), status: "SENT", requestedBy: fullName(u), createdAt: nowIso() };
  }),

  route.get("/b2b/devices", ({ ctx, url }) => {
    const { c } = company(ctx);
    const rows = db.devices.filter((d) => d.ownerId === c.id).map((d) => ({ ...deviceDto(d), siteName: db.addresses.find((a) => a.id === d.siteId)?.label ?? "—", openOrders: db.serviceOrders.filter((o) => o.deviceId === d.id && !["CLOSED", "CANCELLED"].includes(o.status)).length }));
    return list(url, rows, { search: (d) => `${d.modelName} ${d.nickname ?? ""} ${d.serialNumber ?? ""}`, defaultPageSize: 50 });
  }),

  route.post("/b2b/services/:id/approve", async ({ ctx, params, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER", "APPROVER");
    const o = db.serviceOrders.find((x) => x.id === params.id && x.companyId === c.id);
    if (!o) notFound();
    const { approved, comment } = await body<{ approved: boolean; comment?: string }>();
    o.approvalPending = false;
    o.history.unshift({ id: newId("h"), at: nowIso(), actorName: fullName(ctx.user), action: approved ? "company_approved" : "company_rejected", note: comment });
    if (!approved) { o.status = "CANCELLED"; o.cancelReason = comment ?? "Şirkət daxili təsdiqdən keçmədi"; }
    return serviceOrderSummaryDto(o, ctx);
  }),

  route.get("/b2b/schedule", ({ ctx, url }) => {
    const { c } = company(ctx);
    const rows = db.periodicVisits.filter((v) => v.companyId === c.id).map((v) => {
      const d = db.devices.find((x) => x.id === v.deviceId);
      return { id: v.id, siteName: db.addresses.find((a) => a.id === v.siteId)?.label ?? "—", siteId: v.siteId, deviceName: d?.nickname ?? d?.modelName ?? "—", serviceName: db.services.find((s) => s.id === v.serviceId)!.name, plannedAt: v.plannedAt, status: v.status, orderNumber: v.orderId ? db.serviceOrders.find((o) => o.id === v.orderId)?.number ?? null : null, orderId: v.orderId };
    });
    return list(url, rows, { dateField: "plannedAt", defaultSort: "plannedAt", defaultPageSize: 50 });
  }),

  route.post("/b2b/schedule/:id/create-order", ({ ctx, params }) => {
    const { c, u } = company(ctx);
    const v = db.periodicVisits.find((x) => x.id === params.id && x.companyId === c.id);
    if (!v || v.status !== "PLANNED") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const site = db.addresses.find((a) => a.id === v.siteId)!;
    const o = createServiceOrder({ serviceId: v.serviceId, executionForm: "ON_SITE", customerId: u.id, companyId: c.id, siteId: site.id, deviceId: v.deviceId, description: "Planlı (periodik) servis — müqavilə qrafiki", address: { ...site }, contactChannel: "EMAIL", scheduledAt: new Date(v.plannedAt).getTime() > Date.now() ? v.plannedAt : daysFromNow(2), source: "AUTO", type: "PERIODIC" });
    v.status = "ORDER_CREATED";
    v.orderId = o.id;
    return { orderId: o.id, orderNumber: o.number };
  }),

  route.get("/b2b/contracts", ({ ctx }) => {
    const { c } = company(ctx);
    const contracts = db.corporateContracts.filter((x) => x.companyId === c.id);
    if (!contracts.length && c.contract) return [{ id: `contract-${c.id}`, number: c.contract.number, title: c.segment === "PARTNER" ? "Partnyorluq müqaviləsi" : "Topdan satış müqaviləsi", startsAt: c.contract.startsAt, endsAt: c.contract.endsAt, status: new Date(c.contract.endsAt).getTime() > Date.now() ? "ACTIVE" : "EXPIRED", sla: null, coveredSites: 0, coveredDevices: 0, periodicVisitsPerYear: 0, fileName: c.contract.fileName, terms: { paymentTerms: c.paymentTerms, deferredDays: c.deferredDays, creditLimit: money(c.creditLimitCents), priceList: c.priceType } }];
    return contracts;
  }),

  route.get("/b2b/reports", ({ ctx }) => {
    const { c } = company(ctx);
    const orders = db.serviceOrders.filter((o) => o.companyId === c.id);
    const bySite = db.addresses.filter((a) => a.ownerId === c.id).map((a) => ({ site: a.label, orders: orders.filter((o) => o.siteId === a.id).length, spend: orders.filter((o) => o.siteId === a.id).reduce((s, o) => s + orderAmounts(o).total / 100, 0), devices: db.devices.filter((d) => d.siteId === a.id).length }));
    const byCategory = db.equipmentCategories.map((cat) => ({ category: cat.name, orders: orders.filter((o) => o.device.categoryId === cat.id).length, spend: orders.filter((o) => o.device.categoryId === cat.id).reduce((s, o) => s + orderAmounts(o).total / 100, 0) })).filter((x) => x.orders);
    const topDevices = db.devices.filter((d) => d.ownerId === c.id).map((d) => ({ device: d.nickname ?? d.modelName, orders: orders.filter((o) => o.deviceId === d.id).length, spend: orders.filter((o) => o.deviceId === d.id).reduce((s, o) => s + orderAmounts(o).total / 100, 0) })).sort((a, b) => b.spend - a.spend).slice(0, 10);
    return { bySite, byCategory, topDevices, sla: { compliance: 94.5, reactionAvgMinutes: 48, urgentArrivalAvgMinutes: 190, breaches: 2 }, totals: { orders: orders.length, spend: money(orders.reduce((s, o) => s + orderAmounts(o).total, 0)) } };
  }),

  /* ---------------- Şirkət profili ---------------- */
  route.get("/b2b/company", ({ ctx }) => {
    const { u, c } = company(ctx);
    const plan = db.plans.find((p) => p.id === c.planId);
    return {
      id: c.id, legalName: c.legalName, voen: c.voen, segment: c.segment, status: c.status, legalAddress: c.legalAddress, actualAddress: c.actualAddress,
      bankDetails: c.bankDetails, contactName: c.contactName, contactPhone: c.contactPhone, contactEmail: c.contactEmail, website: c.website ?? null, logoUrl: c.logoUrl ?? null,
      accountManager: c.accountManager, contract: c.contract, paymentTerms: c.paymentTerms, deferredDays: c.deferredDays, discountPercent: c.discountPercent,
      creditLimit: money(c.creditLimitCents), planName: plan?.name ?? null, eInvoiceRequired: c.eInvoiceRequired, createdAt: c.createdAt,
      userCount: db.users.filter((x) => x.companyId === c.id).length, userLimit: c.userLimit, addressCount: db.addresses.filter((a) => a.ownerId === c.id).length, addressLimit: c.addressLimit,
      canEdit: u.companyRole === "OWNER" || u.companyRole === "ACCOUNTANT", canEditLogo: u.companyRole === "OWNER", myRole: u.companyRole,
    };
  }),

  route.patch("/b2b/company", async ({ ctx, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER", "ACCOUNTANT");
    const b = await body<{ actualAddress?: string; contactName?: string; contactPhone?: string; contactEmail?: string; website?: string; bankDetails?: { bank: string; iban: string; swift: string } }>();
    const errors: Record<string, string[]> = {};
    if (b.contactEmail !== undefined && !/^\S+@\S+\.\S+$/.test(b.contactEmail)) errors.contactEmail = ["validation.email"];
    if (b.contactPhone !== undefined && !/^\+994\d{9}$/.test(normalizeAzPhone(b.contactPhone))) errors.contactPhone = ["validation.phone"];
    if (b.bankDetails?.iban && !/^AZ\d{2}[A-Z]{4}[A-Z0-9]{20}$/.test(b.bankDetails.iban.replace(/\s/g, "").toUpperCase())) errors["bankDetails.iban"] = ["validation.iban"];
    if (b.website && !/^https?:\/\/\S+\.\S+/.test(b.website)) errors.website = ["validation.url"];
    if (Object.keys(errors).length) throw validationError(errors);
    if (b.actualAddress !== undefined) c.actualAddress = b.actualAddress;
    if (b.contactName !== undefined) c.contactName = b.contactName;
    if (b.contactPhone !== undefined) c.contactPhone = normalizeAzPhone(b.contactPhone);
    if (b.contactEmail !== undefined) c.contactEmail = b.contactEmail;
    if (b.website !== undefined) c.website = b.website || null;
    if (b.bankDetails) c.bankDetails = { bank: b.bankDetails.bank, iban: b.bankDetails.iban.replace(/\s/g, "").toUpperCase(), swift: b.bankDetails.swift.toUpperCase() };
    audit(ctx, "edit_company", "b2b_accounts", c.id, c.legalName);
    return { ok: true };
  }),

  route.put("/b2b/company/logo", async ({ ctx, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER");
    const { dataUrl } = await body<{ dataUrl: string | null }>();
    if (dataUrl) checkDataUrl(dataUrl, "logo", { maxMb: 2 });
    c.logoUrl = dataUrl || null;
    return { logoUrl: c.logoUrl };
  }),

  route.get("/b2b/users", ({ ctx }) => {
    const { c } = company(ctx);
    return { items: db.users.filter((u) => u.companyId === c.id).map((u) => ({ id: u.id, fullName: fullName(u), email: u.email ?? "", phone: u.phone ?? "", role: u.companyRole, siteIds: [], siteNames: u.companyRole === "SITE_MANAGER" ? ["Logistika anbarı"] : [], approvalLimit: u.companyRole === "APPROVER" || u.companyRole === "OWNER" ? null : money(100000), status: u.status === "INVITED" ? "INVITED" : "ACTIVE", lastLoginAt: u.lastLoginAt })), limit: c.userLimit };
  }),

  route.post("/b2b/users", async ({ ctx, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER");
    const data = await body<{ firstName: string; lastName: string; email: string; phone: string; role: "ORDERER" | "APPROVER" | "ACCOUNTANT" | "SITE_MANAGER" }>();
    if (c.userLimit !== null && db.users.filter((u) => u.companyId === c.id).length >= c.userLimit) throw apiError(403, "LIMIT_REACHED", "error.limit");
    if (!data.email?.includes("@")) throw validationError({ email: ["validation.email"] });
    if (db.users.some((u) => u.email === data.email)) throw validationError({ email: ["validation.alreadyExists"] });
    const role = c.segment === "CORPORATE" ? "CORPORATE_CUSTOMER" : c.segment === "PARTNER" ? "PARTNER" : "WHOLESALE_CUSTOMER";
    const base = db.users.find((u) => u.companyId === c.id)!;
    db.users.push({ ...base, id: newId("user"), firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone ? normalizeAzPhone(data.phone) : null, roles: [role], companyRole: data.role, status: "INVITED", lastLoginAt: null, createdAt: nowIso(), favorites: [], compare: [] });
    return { ok: true };
  }),

  route.patch("/b2b/users/:id", async ({ ctx, params, body }) => {
    const { c } = company(ctx);
    requireCompanyRole(ctx, "OWNER");
    const user = db.users.find((u) => u.id === params.id && u.companyId === c.id);
    if (!user) notFound();
    const data = await body<{ role?: "ORDERER" | "APPROVER" | "ACCOUNTANT" | "SITE_MANAGER"; status?: "ACTIVE" | "BLOCKED" }>();
    if (user.companyRole === "OWNER") throw apiError(409, "OWNER_IMMUTABLE", "error.actionNotAllowed");
    if (data.role) user.companyRole = data.role;
    if (data.status) user.status = data.status;
    return { ok: true };
  }),

  route.get("/b2b/balance", ({ ctx }) => {
    const { c } = company(ctx);
    let balance = 0;
    const entries = [
      ...db.salesOrders.filter((s) => s.companyId === c.id).map((s) => ({ id: s.id, date: s.createdAt, document: s.number, description: L("Satış sifarişi", "Заказ", "Sales order"), debit: s.totalCents, credit: 0, dueAt: c.paymentTerms === "DEFERRED" ? new Date(new Date(s.createdAt).getTime() + c.deferredDays * 86400_000).toISOString() : null })),
      ...db.serviceOrders.filter((o) => (o.companyId === c.id || o.partnerCompanyId === c.id) && ["COMPLETED", "CLOSED"].includes(o.status)).map((o) => ({ id: o.id, date: o.closedAt ?? o.updatedAt, document: o.number, description: L("Servis sifarişi", "Сервисный заказ", "Service order"), debit: orderAmounts(o).total, credit: 0, dueAt: null })),
      ...db.payments.filter((p) => p.payerId === c.id && p.status === "PAID").map((p) => ({ id: p.id, date: p.paidAt ?? p.createdAt, document: p.number, description: L("Ödəniş", "Оплата", "Payment"), debit: 0, credit: p.amountCents, dueAt: null })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        balance += e.debit - e.credit;
        return { ...e, debit: money(e.debit), credit: money(e.credit), balance: money(balance) };
      });
    return { creditLimit: money(c.creditLimitCents), currentDebt: money(c.debtCents), availableCredit: money(Math.max(0, c.creditLimitCents - c.debtCents)), overdue: money(c.segment === "PARTNER" ? 120000 : 0), entries: entries.reverse() };
  }),

  route.post("/b2b/reconciliation-act", ({ ctx }) => {
    const { c } = company(ctx);
    const doc = { id: newId("doc"), number: `UA-${Math.floor(Math.random() * 900 + 100)}`, series: "UA", type: "RECONCILIATION_ACT" as const, status: "ISSUED" as const, issuedAt: nowIso(), ownerId: c.id, counterpartyName: c.legalName, counterpartyVoen: c.voen, orderType: "B2B" as const, orderId: null, orderNumber: null, lines: [{ name: L(`Üzləşmə aktı — ${periodLabel()}`), quantity: "1", unit: "pcs", unitCents: c.debtCents, vatRate: 0 }], vatIncluded: true, qrCode: null, fiscalNumber: null, correctionOf: null, syncStatus: "NOT_SENT" as const, meta: { period: periodLabel() } };
    db.documents.unshift(doc);
    return { documentId: doc.id, number: doc.number };
  }),

  /* ---------------- Partner ---------------- */
  route.get("/b2b/commissions", ({ ctx, url }) => {
    const { c } = company(ctx);
    const type = db.partnerTypes.find((p) => p.id === c.partnerTypeId);
    const rows = db.commissions.filter((x) => x.partnerId === c.id).map((x) => ({ ...x, base: money(x.baseCents), amount: money(x.amountCents), partnerName: c.legalName, availableActions: [] }));
    return { ...list(url, rows, { defaultSort: "-createdAt" }), enabled: c.commissionEnabled, model: type?.commissionModel ?? null, base: type?.commissionBase ?? null, rates: type?.serviceRates ?? [], defaultRate: type?.defaultRate ?? null, totals: { pending: money(rows.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amountCents, 0)), approved: money(rows.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amountCents, 0)), paid: money(rows.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amountCents, 0)) } };
  }),

  /* ---------------- Topdan ---------------- */
  route.post("/b2b/quick-order/validate", async ({ ctx, body }) => {
    const { c } = company(ctx);
    const { lines } = await body<{ lines: { sku: string; quantity: string }[] }>();
    let total = 0;
    const out = (lines ?? []).filter((l) => l.sku?.trim()).map((l) => {
      const product = db.products.find((p) => p.variants.some((v) => v.sku.toUpperCase() === l.sku.trim().toUpperCase()));
      const variant = product?.variants.find((v) => v.sku.toUpperCase() === l.sku.trim().toUpperCase());
      const qty = Number(l.quantity);
      if (!product || !variant) return { sku: l.sku, quantity: { value: l.quantity, unit: "pcs" }, found: false, name: null, unitPrice: null, total: null, minQuantity: null, error: L("SKU tapılmadı", "SKU не найден", "SKU not found"), variantId: null };
      if (!(qty > 0)) return { sku: l.sku, quantity: { value: l.quantity, unit: product.baseUnit }, found: true, name: product.name, unitPrice: null, total: null, minQuantity: null, error: L("Miqdar yanlışdır", "Неверное количество", "Invalid quantity"), variantId: variant.id };
      const price = variantPrice(product, variant, ctx);
      let unit = Math.round(Number(price.effectivePrice.amount) * 100);
      const tier = [...(price.tiers ?? [])].reverse().find((t) => qty >= Number(t.minQuantity));
      if (tier) unit = Math.round(Number(tier.price.amount) * 100);
      const lineTotal = Math.round(unit * qty);
      total += lineTotal;
      const minQ = product.baseUnit === "pcs" ? 1 : 10;
      return { sku: variant.sku, quantity: { value: String(qty), unit: product.baseUnit }, found: true, name: product.name, unitPrice: money(unit), total: money(lineTotal), minQuantity: String(minQ), error: qty < minQ ? L(`Minimum ${minQ}`, `Минимум ${minQ}`, `Minimum ${minQ}`) : null, variantId: variant.id };
    });
    return { lines: out, total: money(total), minOrderAmount: money(c.minOrderCents), meetsMinimum: total >= c.minOrderCents };
  }),

  route.post("/b2b/quick-order/add-to-cart", async ({ ctx, body }) => {
    company(ctx);
    const { lines } = await body<{ lines: { variantId: string; quantity: string }[] }>();
    const cart = getCart(ctx, true)!;
    for (const l of lines) {
      const found = findVariant(l.variantId);
      if (!found) continue;
      cart.items.push({ id: newId("ci"), variantId: l.variantId, productId: found.product.id, quantity: l.quantity, unit: found.product.baseUnit, withInstallation: false, priceSnapshotCents: 0 });
    }
    return { itemCount: cart.items.length };
  }),

  route.get("/b2b/quotes", ({ ctx, url }) => {
    const { c } = company(ctx);
    const rows = db.quotes.filter((q) => q.companyId === c.id).map((q) => quoteDto(q));
    return list(url, rows, { defaultSort: "-requestedAt" });
  }),

  route.post("/b2b/quotes", async ({ ctx, body }) => {
    const { c } = company(ctx);
    const { lines, note } = await body<{ lines: { sku: string; quantity: string }[]; note?: string }>();
    const resolved = (lines ?? []).map((l) => ({ v: db.products.flatMap((p) => p.variants).find((v) => v.sku.toUpperCase() === l.sku?.trim().toUpperCase()), q: Number(l.quantity) }));
    if (!resolved.length || resolved.some((r) => !r.v || !(r.q > 0))) throw validationError({ lines: ["validation.skuInvalid"] });
    const q = { id: newId("quote"), number: `KT-${800 + db.quotes.length + 1}`, companyId: c.id, status: "REQUESTED" as const, lines: resolved.map((r) => ({ variantId: r.v!.id, quantity: r.q, unitCents: null })), validUntil: null, requestedAt: nowIso(), note: note ?? null };
    db.quotes.unshift(q);
    notify(db.users.find((u) => u.roles.includes("SALES_EMPLOYEE"))?.id, "QUOTE_REQUEST", "notif.orderCreated", L(`${c.legalName}: yeni kommersiya təklifi sorğusu ${q.number}`), "/quotes");
    return quoteDto(q);
  }),

  route.post("/b2b/quotes/:id/:decision", ({ ctx, params }) => {
    const { c } = company(ctx);
    const q = db.quotes.find((x) => x.id === params.id && x.companyId === c.id);
    if (!q) notFound();
    if (q.status !== "SENT") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (params.decision === "accept") {
      q.status = "ACCEPTED";
      const cart = getCart(ctx, true)!;
      for (const l of q.lines) {
        const found = findVariant(l.variantId)!;
        cart.items.push({ id: newId("ci"), variantId: l.variantId, productId: found.product.id, quantity: String(l.quantity), unit: found.product.baseUnit, withInstallation: false, priceSnapshotCents: l.unitCents ?? 0 });
      }
    } else q.status = "REJECTED";
    return quoteDto(q);
  }),
];

export function quoteDto(q: (typeof db.quotes)[number]) {
  const c = find(db.b2bAccounts, q.companyId);
  const lines = q.lines.map((l) => {
    const found = findVariant(l.variantId)!;
    return { sku: found.variant.sku, name: found.product.name, quantity: { value: String(l.quantity), unit: found.product.baseUnit }, unitPrice: l.unitCents !== null ? money(l.unitCents) : null, total: l.unitCents !== null ? money(Math.round(l.unitCents * l.quantity)) : null };
  });
  const total = q.lines.every((l) => l.unitCents !== null) ? money(q.lines.reduce((s, l) => s + Math.round((l.unitCents ?? 0) * l.quantity), 0)) : null;
  return { id: q.id, number: q.number, companyName: c.legalName, status: q.status, lines, total, validUntil: q.validUntil, requestedAt: q.requestedAt, managerName: c.accountManager, note: q.note, availableActions: q.status === "SENT" ? [{ code: "accept", variant: "primary" }, { code: "reject", variant: "destructive" }] : [] };
}
