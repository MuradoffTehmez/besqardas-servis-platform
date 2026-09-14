import { maskPhone } from "@sp/utils";
import { db } from "../db/state";
import type { DocumentRec, LogisticsTaskRec, PaymentRec, ReservationRec, SalesOrderRec, ServiceOrderRec, StageRec, StockRec, TransferRec, WarrantyRec, EstimateRec } from "../db/types";
import type { ProductRec } from "../data/catalog";
import type { ServiceRec, TemplateRec } from "../data/services";
import type { TechnicianRec, DeviceRec } from "../data/people";
import type { PlanRec } from "../data/plans";
import { money, qty, vatIncluded } from "../lib/money";
import { L, t, tr } from "../lib/i18n";
import { addMinutes, nowIso } from "../lib/time";
import { type Ctx, displayNameById, fullName, isInternal, userById } from "../engine/context";
import { categoryAncestors, productVisible, stockSummary, variantPrice } from "../engine/pricing";
import { approvedEstimate, availableActions, describeFees, estimateTotals, isDone, latestEstimate, orderAmounts, serviceOf } from "../engine/workflow";
import { roleLabels } from "../data/rbac";

/** Daxili qeydlərdən API cavab obyektlərinin (DTO) qurulması. LocalizedText sahələri cavabda lokallaşdırılır. */

export const categoryName = (id: string) => db.equipmentCategories.find((c) => c.id === id)?.name ?? L("—");
export const brandName = (id: string) => db.brands.find((b) => b.id === id)?.name ?? "—";
export const branchName = (id: string | null | undefined) => (id ? db.branches.find((b) => b.id === id)?.name ?? L("—") : null);
export const warehouseName = (id: string) => db.warehouses.find((w) => w.id === id)?.name ?? L("—");

/* ---------------- Servis və ustalar ---------------- */

export function serviceDto(s: ServiceRec) {
  const cat = db.equipmentCategories.find((c) => c.id === s.categoryId)!;
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    nameI18n: s.name,
    shortDescription: s.shortDescription,
    description: s.description,
    categoryId: s.categoryId,
    categoryName: cat.name,
    categorySlug: cat.slug,
    serviceType: s.serviceType,
    executionForms: s.executionForms,
    priceModel: s.priceModel,
    price: s.priceCents !== null ? money(s.priceCents) : null,
    requiredSpecializationIds: s.specializationIds,
    workflowTemplateIds: s.templateIds,
    estimatedDurationMinutes: s.durationMinutes,
    workWarrantyMonths: s.warrantyMonths,
    imageTone: s.imageTone,
    icon: s.icon,
    faq: s.faq.map((f) => ({ q: f.q, a: f.a })),
    seoTitle: L(`${s.name.az} — Bakı | ${db.branding.companyName}`, `${s.name.ru} — Баку | ${db.branding.companyName}`, `${s.name.en} — Baku | ${db.branding.companyName}`),
    seoDescription: s.shortDescription,
    assignmentMethod: s.assignmentMethod,
    slotMinutes: s.slotMinutes,
    travelBufferMinutes: s.travelBufferMinutes,
    problems: s.problems,
    rating: s.rating,
    completedCount: s.completedCount,
    active: s.active,
  };
}

export function specName(specId: string) {
  const sp = db.specializations.find((s) => s.id === specId);
  if (!sp) return L("—");
  const cat = categoryName(sp.categoryId);
  const types: Record<string, ReturnType<typeof L>> = {
    INSTALLATION: L("Quraşdırma", "Установка", "Installation"),
    REMOVAL: L("Sökülmə", "Демонтаж", "Removal"),
    MEASUREMENT: L("Ölçü götürmə", "Замер", "Measurement"),
    DIAGNOSTICS: L("Diaqnostika", "Диагностика", "Diagnostics"),
    REPAIR: L("Təmir", "Ремонт", "Repair"),
    PERIODIC: L("Periodik servis", "Обслуживание", "Periodic service"),
  };
  const shortCat = { az: cat.az.split(" ")[0]!, ru: (cat.ru ?? cat.az).split(" ")[0]!, en: (cat.en ?? cat.az).split(" ")[0]! };
  return L(`${shortCat.az} → ${types[sp.serviceType]!.az}`, `${shortCat.ru} → ${types[sp.serviceType]!.ru}`, `${shortCat.en} → ${types[sp.serviceType]!.en}`);
}

function nextAvailable(tech: TechnicianRec) {
  const busy = db.serviceOrders.filter((o) => o.technicianId === tech.id && o.scheduledAt && !["CLOSED", "CANCELLED", "COMPLETED"].includes(o.status)).length;
  const d = new Date();
  d.setUTCHours(5 + ((busy * 2) % 9), 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (busy > 2 ? 1 : 0) + (d.getTime() < Date.now() ? 1 : 0));
  return d.toISOString();
}

export function technicianSummaryDto(tech: TechnicianRec) {
  const user = userById(tech.userId)!;
  return {
    id: tech.id,
    fullName: fullName(user),
    avatarTone: user.avatarTone,
    avatarUrl: user.avatarUrl ?? null,
    rating: tech.rating,
    reviewCount: tech.reviewCount,
    completedJobs: tech.completedJobs,
    specializations: tech.specializations.filter((s) => s.status === "ACTIVE").map((s) => specName(s.specializationId)),
    employmentType: tech.employmentType,
    promoted: tech.promoted,
    nextAvailableAt: nextAvailable(tech),
    city: tech.city,
    experienceYears: tech.experienceYears,
    verified: tech.status === "ACTIVE" || tech.status === "VERIFIED",
  };
}

export function technicianDto(tech: TechnicianRec, ctx: Ctx) {
  const user = userById(tech.userId)!;
  const internal = isInternal(ctx) || ctx.user?.id === tech.userId;
  const sub = db.subscriptions.find((s) => s.subscriberId === tech.userId && s.subscriberType === "TECHNICIAN");
  const plan = db.plans.find((p) => p.id === (sub?.planId ?? user.planId));
  return {
    ...technicianSummaryDto(tech),
    bio: tech.bio,
    phone: internal ? user.phone : null,
    email: internal ? user.email : null,
    status: tech.status,
    branchId: tech.branchId,
    branchName: branchName(tech.branchId),
    zoneNames: tech.zoneIds.map((z) => db.zones.find((x) => x.id === z)?.name ?? L("—")),
    skills: tech.skillIds.map((sid) => db.equipmentCategories.flatMap((c) => c.skills).find((s) => s.id === sid)?.name ?? L("—")),
    specializationDetails: tech.specializations.map((s) => {
      const sp = db.specializations.find((x) => x.id === s.specializationId)!;
      return { id: s.id, specializationId: s.specializationId, name: specName(s.specializationId), categoryName: categoryName(sp.categoryId), serviceType: sp.serviceType, level: s.level, active: s.status === "ACTIVE", status: s.status, certificateExpiresAt: s.certificateExpiresAt };
    }),
    languages: tech.languages,
    planCode: tech.employmentType === "INDEPENDENT" ? plan?.code ?? null : null,
    licenseStatus: tech.employmentType === "STAFF" ? db.staffLicenses.find((l) => l.technicianId === tech.id)?.status ?? null : null,
    documents: internal ? tech.documents : [],
    workingHours: tech.workingHours,
    workload: db.serviceOrders.filter((o) => o.technicianId === tech.id && ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length,
    warrantyClaimRate: tech.warrantyClaimRate,
    onTimeRate: tech.onTimeRate,
    location: tech.location,
    joinedAt: tech.joinedAt,
    reviews: db.reviews
      .filter((r) => r.target === "TECHNICIAN" && r.targetId === tech.id && r.status === "PUBLISHED")
      .slice(0, 20)
      .map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reply: r.reply })),
  };
}

/* ---------------- Kataloq ---------------- */

export function productCategoryDto(c: (typeof db.productCategories)[number]) {
  const path: string[] = [];
  let cur: typeof c | undefined = c;
  while (cur) {
    path.unshift(cur.slug);
    cur = cur.parentId ? db.productCategories.find((x) => x.id === cur!.parentId) : undefined;
  }
  const descendantIds = db.productCategories.filter((x) => categoryAncestors(x.id).includes(c.id)).map((x) => x.id);
  return {
    id: c.id,
    parentId: c.parentId,
    slug: c.slug,
    path,
    name: c.name,
    nameI18n: c.name,
    imageUrl: `illu:${c.imageTone}`,
    attributeSetIds: c.attributeCodes,
    order: c.order,
    active: c.active,
    productCount: db.products.filter((p) => descendantIds.includes(p.categoryId) && p.status === "ACTIVE").length,
    seoTitle: L(`${c.name.az} — qiymətlər və çatdırılma`, `${c.name.ru} — цены и доставка`, `${c.name.en} — prices & delivery`),
    seoDescription: L(`${c.name.az}: rəsmi zəmanət, quraşdırma və servis bir yerdə.`, `${c.name.ru}: официальная гарантия, установка и сервис.`, `${c.name.en}: official warranty, installation and service.`),
    costingMethod: c.costingMethod,
  };
}

export function inheritedAttributeCodes(categoryId: string): string[] {
  const codes: string[] = [];
  for (const id of [...categoryAncestors(categoryId)].reverse()) {
    const c = db.productCategories.find((x) => x.id === id);
    for (const code of c?.attributeCodes ?? []) if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

export function attributeDisplay(code: string, value: string) {
  const a = db.attributes.find((x) => x.code === code);
  if (!a) return L(value);
  if (a.type === "BOOLEAN") return value === "true" ? L("Bəli", "Да", "Yes") : L("Xeyr", "Нет", "No");
  const opt = a.options.find((o) => o.value === value);
  const base = opt ? opt.label : L(value);
  if (!a.unit) return base;
  return { az: `${base.az} ${a.unit}`, ru: `${base.ru} ${a.unit}`, en: `${base.en} ${a.unit}` };
}

export function productSummaryDto(p: ProductRec, ctx: Ctx) {
  const brand = db.brands.find((b) => b.id === p.brandId)!;
  const model = db.models.find((m) => m.id === p.modelId);
  const cat = db.productCategories.find((c) => c.id === p.categoryId)!;
  const variant = p.variants[0]!;
  const stocks = p.variants.map((v) => stockSummary(v.id));
  const available = stocks.reduce((s, x) => s + x.available, 0);
  const price = variantPrice(p, variant, ctx);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    brandName: brand.name,
    brandSlug: brand.slug,
    modelName: model ? `${brand.name} ${model.name}` : null,
    categoryId: p.categoryId,
    categoryName: cat.name,
    categoryPath: productCategoryDto(cat).path,
    imageUrl: productImageUrl(p),
    imageTone: p.imageTone,
    rating: p.rating,
    reviewCount: p.reviewCount,
    price,
    stockStatus: available <= 0 ? "OUT_OF_STOCK" : stocks.some((s) => s.status === "IN_STOCK") ? "IN_STOCK" : "LOW",
    isNew: p.isNew,
    hasPromotion: price.appliedDiscounts.some((d) => d.applied),
    baseUnit: p.baseUnit,
    variantCount: p.variants.length,
    defaultVariantId: variant.id,
    highlights: p.highlights,
    country: p.country,
    installable: !!p.installServiceId,
  };
}

/** Əsas şəkil: yüklənmiş media varsa onun ünvanı, yoxdursa illüstrasiya açarı. */
export function productImageUrl(p: ProductRec) {
  const media = p.media ?? [];
  return (media.find((m) => m.primary) ?? media[0])?.url ?? `illu:${p.imageKind}`;
}

export function productGallery(p: ProductRec) {
  if (p.media?.length) return [...p.media].sort((a, b) => Number(b.primary) - Number(a.primary)).map((m) => ({ id: m.id, url: m.url, name: m.name, mimeType: m.mimeType, size: m.size, alt: m.alt, altI18n: m.alt, primary: m.primary, synthetic: false }));
  return [0, 1, 2, 3].map((i) => ({ id: `${p.id}-g${i}`, url: `illu:${p.imageKind}:${i}`, name: `${p.slug}-${i}.jpg`, mimeType: "image/jpeg", size: 180000, alt: p.name, altI18n: p.name, primary: i === 0, synthetic: true }));
}

export function productDto(p: ProductRec, ctx: Ctx) {
  const summary = productSummaryDto(p, ctx);
  const brand = db.brands.find((b) => b.id === p.brandId)!;
  const install = p.installServiceId ? db.services.find((s) => s.id === p.installServiceId) : null;
  const variantAttrs = p.variantAttrCodes.map((code) => {
    const a = db.attributes.find((x) => x.code === code)!;
    const values = [...new Set(p.variants.map((v) => v.attributes[code]).filter(Boolean))] as string[];
    return { code, name: a.name, options: values };
  });
  const attrCodes = inheritedAttributeCodes(p.categoryId);
  const allAttrs = { ...p.attributes, ...(p.variants[0]?.attributes ?? {}) };
  return {
    ...summary,
    nameI18n: p.name,
    description: p.description,
    descriptionI18n: p.description,
    sku: p.variants[0]!.sku,
    gallery: productGallery(p),
    videoUrl: p.videoUrl,
    variants: p.variants.map((v) => {
      const st = stockSummary(v.id);
      return { id: v.id, sku: v.sku, barcode: v.barcode, name: Object.entries(v.attributes).map(([c, val]) => tr(attributeDisplay(c, val), ctx.locale)).join(" · ") || v.sku, attributes: v.attributes, price: variantPrice(p, v, ctx), stockStatus: st.status, available: qty(st.available, p.baseUnit), weightKg: v.weightKg, dimensionsCm: v.dimensionsCm };
    }),
    variantAttributes: variantAttrs,
    attributes: Object.entries(allAttrs)
      .filter(([code]) => attrCodes.includes(code) || db.attributes.some((a) => a.code === code))
      .map(([code, value]) => {
        const a = db.attributes.find((x) => x.code === code)!;
        return { code, name: a?.name ?? L(code), group: a?.group ?? L("Əsas"), value, displayValue: attributeDisplay(code, value), comparable: a?.comparable ?? false };
      }),
    branchStock: db.branches.map((b) => {
      const whs = db.warehouses.filter((w) => w.branchId === b.id && ["CENTRAL", "BRANCH"].includes(w.type)).map((w) => w.id);
      const avail = db.stock.filter((s) => s.productId === p.id && whs.includes(s.warehouseId) && s.purpose === "SALES").reduce((sum, s) => sum + Math.max(0, s.physical - s.reserved - s.damaged), 0);
      return { branchId: b.id, branchName: b.name, available: qty(avail, p.baseUnit), status: avail <= 0 ? "OUT_OF_STOCK" : avail <= 3 ? "LOW" : "IN_STOCK" };
    }),
    compatibleModels: p.compatibleModelIds.map((id) => {
      const m = db.models.find((x) => x.id === id)!;
      return { id, fullName: `${brandName(m.brandId)} ${m.name}` };
    }),
    analogs: p.analogIds.map((id) => db.products.find((x) => x.id === id)).filter(Boolean).map((a) => ({ id: a!.id, slug: a!.slug, name: a!.name, oemCode: a!.oemCode })),
    warranty: { months: p.warrantyMonths, type: p.warrantyMonths ? "MANUFACTURER" : "NONE" },
    deliveryOptions: [
      { method: "COURIER", label: t("delivery.courier", ctx.locale), price: money(p.bulky ? 1500 : 1000), eta: t(p.bulky ? "eta.2days" : "eta.tomorrow", ctx.locale) },
      { method: "PICKUP", label: t("delivery.pickup", ctx.locale), price: money(0), eta: t("eta.today", ctx.locale) },
      ...(install ? [{ method: "WITH_INSTALLATION", label: t("delivery.withInstallation", ctx.locale), price: install.priceCents ? money(install.priceCents) : null, eta: t("eta.install", ctx.locale) }] : []),
    ],
    installationService: install ? { serviceId: install.id, slug: install.slug, name: install.name, price: money(install.priceCents ?? 0) } : null,
    related: db.products
      .filter((x) => x.id !== p.id && (x.categoryId === p.categoryId || x.brandId === p.brandId) && productVisible(x, ctx))
      .slice(0, 8)
      .map((x) => productSummaryDto(x, ctx)),
    returnRestriction: p.returnRestriction ? t(p.returnRestriction, ctx.locale) : null,
    visibility: p.visibility,
    unitConversions: p.conversions.map((c) => ({ unit: c.unit, factor: String(c.factor) })),
    status: p.status,
    createdAt: p.createdAt,
    brandId: brand.id,
    modelId: p.modelId,
    oemCode: p.oemCode,
  };
}

/* ---------------- Servis sifarişi ---------------- */

export function stageDto(order: ServiceOrderRec, s: StageRec, ctx: Ctx) {
  const assignee = userById(s.assigneeId);
  const due = s.slaMinutes && s.readyAt ? addMinutes(s.readyAt, s.slaMinutes) : null;
  const slaBreached = !!due && !isDone(s) && new Date(due).getTime() < Date.now() && !["PENDING"].includes(s.status);
  return {
    id: s.id,
    templateStageId: s.templateStageId,
    order: s.order,
    name: s.name,
    customerName: s.customerName,
    type: s.type,
    executor: s.executor,
    status: s.status,
    mandatory: s.mandatory,
    assigneeId: s.assigneeId,
    assigneeName: assignee ? fullName(assignee) : null,
    specializationName: s.specializationId ? specName(s.specializationId) : null,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    dueAt: due,
    slaBreached,
    completionRequirements: s.requirements,
    checklist: s.checklist,
    photos: s.photos,
    note: s.note,
    signed: s.signed,
    failReason: s.failReason,
    logisticsTaskId: ctx.role === "CUSTOMER" ? null : s.logisticsTaskId,
  };
}

export function estimateDto(order: ServiceOrderRec, e: EstimateRec, ctx: Ctx) {
  const totals = estimateTotals(order, e);
  return {
    id: e.id,
    number: e.number,
    orderId: order.id,
    version: e.version,
    status: e.status,
    lines: e.lines.map((l) => ({
      id: l.id,
      type: l.type,
      name: l.name,
      productId: l.productId,
      sku: l.sku,
      quantity: qty(l.quantity, l.unit, 3),
      unitPrice: money(l.unitCents),
      total: money(Math.round(l.unitCents * Number(l.quantity))),
      optional: l.optional,
      declined: l.declined,
      warrantyMonths: l.warrantyMonths,
      ownMaterial: l.ownMaterial,
      vatRate: l.vatRate.toFixed(2),
    })),
    subtotal: money(totals.subtotal),
    discountTotal: money(totals.discount),
    vatTotal: money(totals.vat),
    total: money(totals.total),
    appliedDiscounts: totals.discounts.map((d) => ({ code: d.code, label: d.label, amount: money(d.cents) })),
    validUntil: e.validUntil,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
    decidedAt: e.decidedAt,
    decisionChannel: e.decisionChannel,
    rejectReason: e.rejectReason,
    previousVersions: order.estimates.filter((x) => x.version < e.version).map((x) => ({ version: x.version, total: money(estimateTotals(order, x).total), status: x.status, createdAt: x.createdAt })),
    applicableFees: describeFees(order, ctx.locale),
    availableActions: availableActions(order, ctx).filter((a) => ["approve_estimate", "partial_approve", "reject_estimate", "ask_question"].includes(a.code)),
  };
}

function progressOf(order: ServiceOrderRec) {
  const total = order.stages.length || 1;
  return Math.round((order.stages.filter(isDone).length / total) * 100);
}

export function currentStage(order: ServiceOrderRec) {
  return order.stages.find((s) => !isDone(s) && s.status !== "PENDING") ?? null;
}

export function serviceOrderSummaryDto(o: ServiceOrderRec, ctx: Ctx) {
  const service = serviceOf(o);
  const customer = userById(o.customerId);
  const tech = userById(o.technicianId);
  const cur = currentStage(o);
  const customerView = ctx.role === "CUSTOMER" || ctx.role === "CORPORATE_CUSTOMER" || ctx.role === "PARTNER";
  const visibleStage = customerView ? [...o.stages].reverse().find((s) => s.customerName && s.status !== "PENDING") ?? null : cur;
  const amounts = orderAmounts(o);
  const breached = o.stages.some((s) => stageDto(o, s, ctx).slaBreached);
  return {
    id: o.id,
    number: o.number,
    type: o.type,
    status: o.status,
    serviceName: service.name,
    serviceSlug: service.slug,
    categoryName: categoryName(service.categoryId),
    executionForm: o.executionForm,
    customerName: o.endCustomer ? `${o.endCustomer.name}` : fullName(customer),
    customerPhone: ctx.role === "TECHNICIAN" && !o.stages.some((s) => s.assigneeId === ctx.user?.id && ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(s.status)) ? maskPhone(customer?.phone) : o.endCustomer?.phone ?? customer?.phone ?? null,
    technicianName: tech ? fullName(tech) : null,
    technicianId: o.technicianId,
    currentStageName: visibleStage ? (customerView ? visibleStage.customerName : visibleStage.name) : null,
    currentStageStatus: visibleStage?.status ?? null,
    scheduledAt: o.scheduledAt,
    urgent: o.urgent,
    total: amounts.total ? money(amounts.total) : null,
    branchName: branchName(o.branchId),
    source: o.source,
    slaBreached: breached,
    createdAt: o.createdAt,
    companyName: o.companyId ? db.b2bAccounts.find((c) => c.id === o.companyId)?.legalName ?? null : o.partnerCompanyId ? db.b2bAccounts.find((c) => c.id === o.partnerCompanyId)?.legalName ?? null : null,
    addressShort: o.address ? `${o.address.city}, ${o.address.street}` : o.executionForm === "CARRY_IN" ? tr(db.branches.find((b) => b.id === o.branchId)!.name, ctx.locale) : null,
    progress: progressOf(o),
    needsReschedule: o.needsReschedule,
  };
}

export function serviceOrderDto(o: ServiceOrderRec, ctx: Ctx) {
  const summary = serviceOrderSummaryDto(o, ctx);
  const customer = userById(o.customerId);
  const tpl = db.templates.find((t) => t.id === o.templateId);
  const est = latestEstimate(o);
  const amounts = orderAmounts(o);
  const customerView = ctx.role === "CUSTOMER" || ctx.role === "CORPORATE_CUSTOMER" || ctx.role === "PARTNER";
  const techAccepted = !!o.technicianId && o.stages.some((s) => s.assigneeId === o.technicianId && ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(s.status));
  const stages = o.stages
    .filter((s) => !customerView || s.customerName)
    .filter((s) => ctx.role !== "TECHNICIAN" || true)
    .map((s) => stageDto(o, s, ctx));
  const plan = customer ? db.plans.find((p) => p.id === customer.planId) : null;
  return {
    ...summary,
    serviceId: o.serviceId,
    templateId: o.templateId,
    templateName: tpl?.name ?? L("—"),
    templateVersion: o.templateVersion,
    customerId: o.customerId,
    customerEmail: isInternal(ctx) || customerView ? customer?.email ?? null : null,
    customerPlan: plan?.name ?? null,
    device: {
      deviceId: o.deviceId,
      categoryName: categoryName(o.device.categoryId),
      brandName: brandName(o.device.brandId),
      modelName: o.device.modelName,
      serialNumber: o.device.serialNumber,
      location: o.deviceLocation,
      qrCode: o.deviceId ? db.devices.find((d) => d.id === o.deviceId)?.qrCode ?? null : null,
    },
    problem: { code: o.problemCode, label: o.problemCode ? serviceOf(o).problems.find((p) => p.code === o.problemCode)?.label ?? null : null, description: o.description },
    attachments: o.attachments,
    address: o.address,
    contactChannel: o.contactChannel,
    note: o.note,
    stages,
    estimate: est ? estimateDto(o, est, ctx) : null,
    materials: customerView
      ? []
      : o.materials.map((m) => ({ id: m.id, productId: m.productId, name: m.name, sku: m.sku, quantity: qty(m.quantity, m.unit, 3), warehouseName: warehouseName(m.warehouseId), ownMaterial: m.ownMaterial, cost: isInternal(ctx) && m.costCents !== null ? money(m.costCents) : null, at: m.at })),
    history: customerView ? o.history.filter((h) => ["created", "confirm", "status_changed", "estimate_approved", "estimate_rejected", "estimate_partially_approved", "payment_recorded", "warranty_activated", "reschedule", "cancel"].includes(h.action)) : o.history,
    payments: db.payments.filter((p) => p.orderId === o.id).map((p) => ({ id: p.id, number: p.number, method: p.method, status: p.status, amount: money(p.amountCents), createdAt: p.createdAt })),
    documents: db.documents.filter((d) => d.orderId === o.id).map((d) => ({ id: d.id, number: d.number, type: d.type, status: d.status, createdAt: d.issuedAt })),
    paymentStatus: amounts.total === 0 ? "NONE" : amounts.paid >= amounts.total ? "PAID" : amounts.paid > 0 ? "PARTIALLY_PAID" : "PENDING",
    paidAmount: money(amounts.paid),
    dueAmount: money(amounts.due),
    fees: o.fees.map((f) => ({ type: f.type, label: f.label, amount: money(f.cents), waived: f.waived })),
    warrantyId: o.warrantyId,
    relatedOrderNumber: o.relatedOrderId ? db.serviceOrders.find((x) => x.id === o.relatedOrderId)?.number ?? null : null,
    salesOrderNumber: o.salesOrderId ? db.salesOrders.find((x) => x.id === o.salesOrderId)?.number ?? null : null,
    operatorName: o.operatorId ? fullName(userById(o.operatorId)) : null,
    assignmentMethod: o.assignmentMethod,
    logisticsTaskIds: o.stages.map((s) => s.logisticsTaskId).filter(Boolean),
    endCustomer: o.endCustomer,
    cancellationTerms: t("terms.cancel", ctx.locale),
    cancelReason: o.cancelReason,
    availableActions: availableActions(o, ctx),
    technicianPhoneVisible: techAccepted,
    technicianPhone: techAccepted ? userById(o.technicianId)?.phone ?? null : null,
    oldPartDisposition: o.oldPartDisposition,
    preferredTechnicianName: o.preferredTechnicianId ? fullName(userById(o.preferredTechnicianId)) : null,
    siteName: o.siteId ? db.addresses.find((a) => a.id === o.siteId)?.label ?? null : null,
    warrantyNumber: o.warrantyId ? db.warranties.find((w) => w.id === o.warrantyId)?.number ?? null : null,
    hasApprovedEstimate: !!approvedEstimate(o),
  };
}

/* ---------------- Satış ---------------- */

export function salesOrderSummaryDto(s: SalesOrderRec) {
  const customer = userById(s.customerId);
  const payments = db.payments.filter((p) => p.orderId === s.id);
  const paid = payments.filter((p) => ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status)).reduce((sum, p) => sum + p.amountCents, 0);
  return {
    id: s.id,
    number: s.number,
    status: s.status,
    customerName: fullName(customer),
    companyName: s.companyId ? db.b2bAccounts.find((c) => c.id === s.companyId)?.legalName ?? null : null,
    itemCount: s.lines.length,
    total: money(s.totalCents),
    paymentStatus: payments.some((p) => p.status === "REFUNDED") ? "REFUNDED" : paid >= s.totalCents ? "PAID" : payments.some((p) => p.status === "FAILED") ? "FAILED" : paid > 0 ? "PARTIALLY_PAID" : "PENDING",
    deliveryMethod: s.deliveryMethod,
    createdAt: s.createdAt,
    branchName: branchName(s.branchId),
    channel: s.channel,
  };
}

export function salesOrderDto(s: SalesOrderRec, ctx: Ctx) {
  const actions: { code: string; variant?: string; requiresReason?: boolean; reasonCategory?: string }[] = [];
  const own = ctx.user?.id === s.customerId || (!!s.companyId && ctx.user?.companyId === s.companyId);
  if (own && ["PENDING_PAYMENT"].includes(s.status)) actions.push({ code: "pay", variant: "primary" }, { code: "cancel", variant: "destructive" });
  if (own && ["CONFIRMED", "PROCESSING"].includes(s.status)) actions.push({ code: "cancel", variant: "destructive" });
  if (own && ["DELIVERED", "COMPLETED"].includes(s.status) && s.lines.some((l) => Number(l.returnedQuantity) < Number(l.quantity))) actions.push({ code: "request_return" });
  if (own && ["DELIVERED", "COMPLETED"].includes(s.status)) actions.push({ code: "reorder" });
  if (isInternal(ctx)) {
    const next: Record<string, string> = { CONFIRMED: "start_processing", PROCESSING: s.deliveryMethod === "PICKUP" ? "ready_for_pickup" : "ship", READY_FOR_PICKUP: "mark_delivered", SHIPPED: "mark_delivered", DELIVERED: "complete" };
    if (next[s.status]) actions.push({ code: next[s.status]!, variant: "primary" });
    if (!["CANCELLED", "COMPLETED", "RETURNED"].includes(s.status)) actions.push({ code: "cancel", variant: "destructive", requiresReason: true, reasonCategory: "CANCELLED" });
    if (db.payments.some((p) => p.orderId === s.id && p.status === "PAID")) actions.push({ code: "refund", variant: "destructive" });
  }
  return {
    ...salesOrderSummaryDto(s),
    lines: s.lines.map((l) => {
      const p = db.products.find((x) => x.id === l.productId);
      return { id: l.id, productId: l.productId, slug: p?.slug ?? "", name: l.name, sku: l.sku, quantity: qty(l.quantity, l.unit, 3), unitPrice: money(l.unitCents), total: money(l.totalCents), returnable: !p?.returnRestriction, returnedQuantity: Number(l.returnedQuantity) ? qty(l.returnedQuantity, l.unit) : null, imageTone: p?.imageTone ?? "slate", imageUrl: p ? productImageUrl(p) : null };
    }),
    subtotal: money(s.subtotalCents),
    discountTotal: money(s.discountCents),
    deliveryTotal: money(s.deliveryCents),
    installationTotal: money(s.installationCents),
    vatTotal: money(s.vatCents),
    vatIncluded: s.vatIncluded,
    address: s.address,
    pickupBranchName: branchName(s.pickupBranchId),
    paymentMethod: s.paymentMethod,
    payments: db.payments.filter((p) => p.orderId === s.id).map((p) => ({ id: p.id, number: p.number, method: p.method, status: p.status, amount: money(p.amountCents), createdAt: p.createdAt })),
    documents: db.documents.filter((d) => d.orderId === s.id).map((d) => ({ id: d.id, number: d.number, type: d.type, status: d.status, createdAt: d.issuedAt })),
    serviceOrderNumber: s.serviceOrderId ? db.serviceOrders.find((o) => o.id === s.serviceOrderId)?.number ?? null : null,
    serviceOrderId: s.serviceOrderId,
    history: s.history,
    availableActions: actions,
    trackingNote: db.logisticsTasks.find((tk) => tk.relatedOrderId === s.id) ? L("Kuryer tapşırığı yaradılıb", "Создана задача курьеру", "Courier task created") : null,
    appliedDiscounts: s.appliedDiscounts.map((d) => ({ code: d.code, label: d.label, amount: money(d.cents) })),
  };
}

/* ---------------- Maliyyə və sənədlər ---------------- */

export function paymentDto(p: PaymentRec, ctx: Ctx) {
  const actions = [];
  if (ctx.role === "ACCOUNTANT" || ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN") {
    if (["PAID", "PARTIALLY_REFUNDED"].includes(p.status) && p.refundedCents < p.amountCents) actions.push({ code: "refund", variant: "destructive" as const, requiresReason: true });
    if (p.status === "PENDING" || p.status === "INITIATED") actions.push({ code: "mark_paid" }, { code: "cancel", variant: "destructive" as const });
  }
  return {
    id: p.id,
    number: p.number,
    status: p.status,
    method: p.method,
    kind: p.kind,
    amount: money(p.amountCents),
    refundedAmount: money(p.refundedCents),
    payerName: p.payerName,
    orderType: p.orderType,
    orderNumber: p.orderNumber,
    orderId: p.orderId,
    provider: p.provider,
    fiscalNumber: p.fiscalNumber,
    collectedBy: p.collectedById ? fullName(userById(p.collectedById)) : null,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
    failureReason: p.failureReason,
    installmentMonths: p.installmentMonths,
    availableActions: actions,
  };
}

export function documentDto(d: DocumentRec, ctx: Ctx) {
  const lines = d.lines.map((l) => {
    const total = Math.round(l.unitCents * Number(l.quantity));
    const vat = d.vatIncluded ? vatIncluded(total, l.vatRate) : Math.round((total * l.vatRate) / 100);
    return { name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: money(l.unitCents), vatRate: l.vatRate.toFixed(2), vat: money(vat), total: money(d.vatIncluded ? total : total + vat) };
  });
  const total = lines.reduce((s, l) => s + Math.round(Number(l.total.amount) * 100), 0);
  const vat = lines.reduce((s, l) => s + Math.round(Number(l.vat.amount) * 100), 0);
  const actions = [];
  if (isInternal(ctx) && d.status === "ISSUED" && ["ACCOUNTANT", "ADMIN", "SUPER_ADMIN"].includes(ctx.role)) actions.push({ code: "cancel_document", variant: "destructive" as const, requiresReason: true }, { code: "issue_correction" });
  if (d.type === "E_INVOICE" && d.syncStatus !== "ACKNOWLEDGED" && isInternal(ctx)) actions.push({ code: "resend" });
  return {
    id: d.id,
    number: d.number,
    series: d.series,
    type: d.type,
    status: d.status,
    issuedAt: d.issuedAt,
    counterpartyName: d.counterpartyName,
    counterpartyVoen: d.counterpartyVoen,
    orderNumber: d.orderNumber,
    orderId: d.orderId,
    orderType: d.orderType,
    total: money(total),
    vatTotal: money(vat),
    locale: ctx.locale,
    lines,
    issuer: { name: db.branding.legalName, voen: db.branding.voen, address: db.branding.contacts.address },
    qrCode: d.qrCode,
    fiscalNumber: d.fiscalNumber,
    verifyUrl: d.type === "WARRANTY" && d.meta.code ? `/warranty/verify/${d.meta.code}` : d.fiscalNumber ? `https://monitoring.e-kassa.gov.az/#/index?doc=${d.fiscalNumber}` : null,
    meta: d.meta,
    correctionOf: d.correctionOf,
    syncStatus: d.syncStatus,
    availableActions: actions,
    brand: { companyName: db.branding.companyName, logoText: db.branding.logoText, primary: db.branding.colors.primary, footer: db.branding.documentFooter },
  };
}

export function warrantyDto(w: WarrantyRec) {
  const expired = new Date(w.endsAt).getTime() < Date.now();
  return {
    id: w.id,
    number: w.number,
    code: w.code,
    type: w.type,
    status: w.void ? "VOID" : expired ? "EXPIRED" : "ACTIVE",
    deviceId: w.deviceId,
    deviceName: w.deviceName,
    serialNumber: w.serialNumber,
    coverage: w.coverage,
    startsAt: w.startsAt,
    endsAt: w.endsAt,
    orderNumber: w.orderNumber,
    orderId: w.orderId,
    customerName: fullName(userById(w.customerId)),
    canClaim: !w.void && !expired && !db.warrantyClaims.some((c) => c.warrantyId === w.id && ["SUBMITTED", "UNDER_REVIEW"].includes(c.status)),
  };
}

export function deviceDto(d: DeviceRec) {
  const warranties = db.warranties.filter((w) => w.deviceId === d.id && !w.void);
  const until = warranties.map((w) => w.endsAt).sort().at(-1) ?? null;
  const days = until ? (new Date(until).getTime() - Date.now()) / 86400_000 : null;
  const address = db.addresses.find((a) => a.id === d.addressId);
  const activeOrder = db.serviceOrders.find((o) => o.deviceId === d.id && o.executionForm !== "ON_SITE" && !["CLOSED", "CANCELLED", "COMPLETED"].includes(o.status));
  return {
    id: d.id,
    addressId: d.addressId,
    addressLabel: address?.label ?? "—",
    categoryId: d.categoryId,
    categoryName: categoryName(d.categoryId),
    brandId: d.brandId,
    brandName: brandName(d.brandId),
    modelId: d.modelId,
    modelName: d.modelName,
    nickname: d.nickname,
    serialNumber: d.serialNumber,
    purchasedAt: d.purchasedAt,
    installedAt: d.installedAt,
    nextServiceAt: d.nextServiceAt,
    warrantyStatus: days === null ? "NONE" : days < 0 ? "EXPIRED" : days < 45 ? "EXPIRING" : "ACTIVE",
    warrantyUntil: until,
    qrCode: d.qrCode,
    source: d.source,
    location: activeOrder?.deviceLocation ?? d.location,
    imageTone: d.imageTone,
    ownerName: displayNameById(d.ownerId),
    sharedWithFamily: db.familyMembers.some((f) => f.sharedDeviceIds.includes(d.id)),
    siteId: d.siteId ?? null,
  };
}

/* ---------------- Anbar ---------------- */

export function stockLevelDto(s: StockRec) {
  const p = db.products.find((x) => x.id === s.productId)!;
  const v = p.variants.find((x) => x.id === s.variantId)!;
  const wh = db.warehouses.find((w) => w.id === s.warehouseId)!;
  const cat = db.productCategories.find((c) => c.id === p.categoryId)!;
  const precision = p.baseUnit === "kg" ? 3 : p.baseUnit === "pcs" ? 0 : 2;
  const available = s.physical - s.reserved - s.damaged;
  return {
    id: s.id,
    productId: p.id,
    variantId: v.id,
    productName: p.variants.length > 1 ? { az: `${p.name.az} · ${Object.values(v.attributes).join(" / ")}`, ru: `${p.name.ru} · ${Object.values(v.attributes).join(" / ")}`, en: `${p.name.en} · ${Object.values(v.attributes).join(" / ")}` } : p.name,
    sku: v.sku,
    categoryName: cat.name,
    warehouseId: wh.id,
    warehouseName: wh.name,
    warehouseType: wh.type,
    branchName: branchName(wh.branchId),
    purpose: s.purpose,
    physical: qty(s.physical, p.baseUnit, precision),
    reserved: qty(s.reserved, p.baseUnit, precision),
    damaged: qty(s.damaged, p.baseUnit, precision),
    available: qty(available, p.baseUnit, precision),
    inTransit: qty(s.inTransit, p.baseUnit, precision),
    onOrder: qty(s.onOrder, p.baseUnit, precision),
    minLevel: qty(s.minLevel, p.baseUnit, precision),
    belowMin: available < s.minLevel,
    avgCost: money(s.avgCostCents),
    zone: s.zone,
    conversions: p.conversions.map((c) => ({ unit: c.unit, factor: String(c.factor) })),
  };
}

export function reservationDto(r: ReservationRec, ctx: Ctx) {
  const p = db.products.find((x) => x.id === r.productId)!;
  const actions = [];
  if (r.status === "ACTIVE" && (isInternal(ctx) || ctx.user?.id === r.reservedForId)) actions.push({ code: "release", variant: "destructive" as const });
  if (r.status === "ACTIVE" && isInternal(ctx)) actions.push({ code: "extend" });
  return {
    id: r.id,
    number: r.number,
    source: r.source,
    sourceNumber: r.sourceNumber,
    sourceId: r.sourceId,
    productId: r.productId,
    productName: p.name,
    sku: p.variants.find((v) => v.id === r.variantId)?.sku ?? "",
    warehouseName: warehouseName(r.warehouseId),
    quantity: qty(r.quantity, p.baseUnit, 3),
    status: r.status,
    reservedFor: r.reservedForName,
    expiresAt: r.expiresAt,
    expiringSoon: r.status === "ACTIVE" && new Date(r.expiresAt).getTime() - Date.now() < 12 * 3600_000,
    createdAt: r.createdAt,
    availableActions: actions,
  };
}

export function transferDto(tr: TransferRec, ctx: Ctx) {
  const next: Record<string, { code: string; variant?: "primary" | "destructive" }[]> = {
    DRAFT: [{ code: "approve", variant: "primary" }, { code: "cancel", variant: "destructive" }],
    APPROVED: [{ code: "ship", variant: "primary" }, { code: "cancel", variant: "destructive" }],
    IN_TRANSIT: [{ code: "receive", variant: "primary" }],
  };
  return {
    id: tr.id,
    number: tr.number,
    fromWarehouseId: tr.fromWarehouseId,
    fromWarehouseName: warehouseName(tr.fromWarehouseId),
    toWarehouseId: tr.toWarehouseId,
    toWarehouseName: warehouseName(tr.toWarehouseId),
    status: tr.status,
    lines: tr.lines.map((l) => {
      const p = db.products.find((x) => x.id === l.productId)!;
      return { id: l.id, productId: l.productId, productName: p.name, sku: p.variants.find((v) => v.id === l.variantId)?.sku ?? "", quantity: qty(l.quantity, p.baseUnit), receivedQuantity: l.receivedQuantity !== null ? qty(l.receivedQuantity, p.baseUnit) : null };
    }),
    createdAt: tr.createdAt,
    createdBy: tr.createdBy,
    shippedAt: tr.shippedAt,
    receivedAt: tr.receivedAt,
    discrepancyNote: tr.discrepancyNote,
    history: tr.history,
    availableActions: ctx.permissions.includes("inventory:edit") || ctx.permissions.includes("*") ? next[tr.status] ?? [] : [],
  };
}

/* ---------------- Logistika ---------------- */

export function logisticsTaskDto(task: LogisticsTaskRec, ctx: Ctx) {
  const assignee = userById(task.assigneeId);
  const active = !["DELIVERED", "FAILED", "CANCELLED"].includes(task.status);
  const isCourier = ctx.role === "COURIER";
  const flow: Record<string, string[]> = { ASSIGNED: ["start"], ON_THE_WAY: ["picked_up", "fail"], PICKED_UP: ["in_transit", "fail"], IN_TRANSIT: ["delivered", "fail"] };
  const actions: { code: string; variant?: "primary" | "destructive"; requiresReason?: boolean; reasonCategory?: string }[] = [];
  if ((isCourier && task.assigneeId === ctx.user?.id) || ctx.role === "SUPER_ADMIN" || ctx.role === "ADMIN" || ctx.role === "DISPATCHER" || ctx.role === "MANAGER") {
    for (const code of flow[task.status] ?? []) actions.push({ code, variant: code === "fail" ? "destructive" : "primary", requiresReason: code === "fail", reasonCategory: code === "fail" ? "FAILED" : undefined });
  }
  if (!isCourier && (ctx.permissions.includes("logistics_tasks:assign") || ctx.permissions.includes("*")) && ["PLANNED", "ASSIGNED"].includes(task.status)) actions.push({ code: "assign" });
  if (!isCourier && ctx.permissions.some((p) => p === "logistics_tasks:edit" || p === "*") && task.status === "FAILED") actions.push({ code: "replan", variant: "primary" });
  return {
    id: task.id,
    number: task.number,
    type: task.type,
    status: task.status,
    from: task.from,
    to: task.to,
    windowStart: task.windowStart,
    windowEnd: task.windowEnd,
    assigneeId: task.assigneeId,
    assigneeName: assignee ? fullName(assignee) : null,
    assigneeKind: task.assigneeKind,
    cargo: task.cargo,
    relatedOrderNumber: task.relatedOrderNumber,
    relatedOrderId: isCourier ? null : task.relatedOrderId,
    relatedOrderKind: task.relatedOrderKind,
    contact: !isCourier || active ? task.contact : null,
    contactHidden: isCourier && !active,
    note: task.note,
    collectCash: task.collectCashCents ? money(task.collectCashCents) : null,
    photos: task.photos,
    signed: task.signed,
    failReason: task.failReason,
    history: task.history,
    availableActions: actions,
    branchName: branchName(task.branchId),
  };
}

/* ---------------- Plan və abunə ---------------- */

export function planDto(p: PlanRec) {
  return {
    id: p.id,
    code: p.code,
    group: p.group,
    name: p.name,
    nameI18n: p.name,
    description: p.description,
    descriptionI18n: p.description,
    tier: p.tier,
    prices: p.prices,
    trialDays: p.trialDays,
    visibility: p.visibility,
    entitlements: p.entitlements,
    highlight: p.highlight,
    subscriberCount: db.subscriptions.filter((s) => s.planId === p.id && ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD"].includes(s.status)).length + (p.code === "CUSTOMER_BASIC" ? db.users.filter((u) => u.roles.includes("CUSTOMER")).length * 37 : 0),
    updatedAt: p.updatedAt,
  };
}

export function subscriptionDto(s: (typeof db.subscriptions)[number]) {
  const plan = db.plans.find((p) => p.id === s.planId)!;
  const subscriber = s.subscriberType === "CORPORATE" ? db.b2bAccounts.find((c) => c.id === s.subscriberId)?.legalName ?? "—" : userById(s.subscriberId) ? fullName(userById(s.subscriberId)) : `Müştəri #${s.subscriberId.slice(0, 4).toUpperCase()}`;
  const usage: { code: string; used: number; limit: number | null }[] = [];
  const lim = (code: string) => (typeof plan.entitlements[code] === "number" ? (plan.entitlements[code] as number) : null);
  if (s.subscriberType === "CUSTOMER") {
    usage.push({ code: "max_devices", used: db.devices.filter((d) => d.ownerId === s.subscriberId).length, limit: lim("max_devices") });
    usage.push({ code: "max_addresses", used: db.addresses.filter((a) => a.ownerId === s.subscriberId).length, limit: lim("max_addresses") });
    usage.push({ code: "max_active_orders", used: db.serviceOrders.filter((o) => o.customerId === s.subscriberId && !["CLOSED", "CANCELLED", "REJECTED", "COMPLETED"].includes(o.status)).length, limit: lim("max_active_orders") });
    usage.push({ code: "family_members", used: db.familyMembers.filter((f) => f.ownerId === s.subscriberId).length, limit: lim("family_members") });
  }
  if (s.subscriberType === "TECHNICIAN") {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    usage.push({ code: "max_monthly_jobs", used: db.serviceOrders.filter((o) => o.technicianId === s.subscriberId && o.createdAt >= monthStart.toISOString()).length, limit: lim("max_monthly_jobs") });
    usage.push({ code: "max_active_jobs", used: db.serviceOrders.filter((o) => o.technicianId === s.subscriberId && ["CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status)).length, limit: lim("max_active_jobs") });
    usage.push({ code: "max_specializations", used: db.technicians.find((x) => x.id === s.subscriberId)?.specializations.length ?? 0, limit: lim("max_specializations") });
    usage.push({ code: "max_reservations", used: db.reservations.filter((r) => r.reservedForId === s.subscriberId && r.status === "ACTIVE").length, limit: lim("max_reservations") });
  }
  return {
    id: s.id,
    subscriberId: s.subscriberId,
    subscriberName: subscriber,
    subscriberType: s.subscriberType,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    status: s.status,
    period: s.period,
    price: money(s.priceCents),
    startedAt: s.startedAt,
    currentPeriodEnd: s.currentPeriodEnd,
    autoRenew: s.autoRenew,
    pendingPlanCode: s.pendingPlanId ? db.plans.find((p) => p.id === s.pendingPlanId)?.code ?? null : null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    graceUntil: s.graceUntil,
    usage,
  };
}

export function templateDto(tpl: TemplateRec) {
  const svcs = db.services.filter((s) => Object.values(s.templateIds).includes(tpl.id));
  return {
    id: tpl.id,
    code: tpl.code,
    name: tpl.name,
    nameI18n: tpl.name,
    serviceIds: svcs.map((s) => s.id),
    serviceNames: svcs.map((s) => s.name),
    executionForm: tpl.executionForm,
    version: tpl.version,
    status: tpl.status,
    stages: tpl.stages.map((s) => ({ ...s, nameI18n: s.name, customerNameI18n: s.customerName })),
    activeOrders: db.serviceOrders.filter((o) => o.templateId === tpl.id && !["CLOSED", "CANCELLED", "REJECTED"].includes(o.status)).length,
    versions: tpl.versions.map(({ version, status, createdAt, createdBy }) => ({ version, status, createdAt, createdBy })),
    updatedAt: tpl.updatedAt,
  };
}

export function userDto(u: (typeof db.users)[number]) {
  return {
    id: u.id,
    fullName: fullName(u),
    email: u.email,
    phone: u.phone,
    roles: u.roles,
    roleLabels: u.roles.map((r) => roleLabels[r]),
    branchId: u.branchId,
    branchName: branchName(u.branchId),
    status: u.status === "PENDING_VERIFICATION" ? "INVITED" : u.status,
    twoFactorEnabled: u.twoFactorEnabled,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    avatarTone: u.avatarTone,
    avatarUrl: u.avatarUrl ?? null,
    companyName: u.companyId ? db.b2bAccounts.find((c) => c.id === u.companyId)?.legalName ?? null : null,
  };
}

export const now = nowIso;
