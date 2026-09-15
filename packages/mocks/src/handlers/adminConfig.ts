import { db } from "../db/state";
import { can, fullName } from "../engine/context";
import { audit, notify, issueDocument, onPaymentPaid } from "../engine/effects";
import { findVariant, move, releaseReservation, stockRow } from "../engine/stock";
import { find, list, notFound, requireAuth, requirePerm, route, validationError } from "../lib/http";
import { crud, required, applyPatch } from "../lib/crud";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money, qty } from "../lib/money";
import { newId } from "../lib/rng";
import { daysAgo, hoursFromNow, nowIso, periodLabel } from "../lib/time";
import { productGallery, attributeDisplay, branchName, documentDto, paymentDto, planDto, productCategoryDto, productDto, productSummaryDto, reservationDto, salesOrderDto, salesOrderSummaryDto, serviceDto, specName, stockLevelDto, subscriptionDto, transferDto, warehouseName } from "../dto";
import { returnDto } from "./account";
import { createProductMedia } from "./warehouse";
import { quoteDto } from "./b2b";
import { productVisible } from "../engine/pricing";

/** Admin — kataloq, satış, anbar, abunəlik, maliyyə, məzmun və təşkilat modulları (PRD §61). */

const inUse = (cond: boolean) => {
  if (cond) throw apiError(409, "IN_USE", "error.actionNotAllowed");
};

export const adminConfigHandlers = [
  /* ---------------- Servis konfiqurasiyası ---------------- */
  ...crud("/admin/services", {
    perm: "catalog",
    get: () => db.services,
    set: (x) => (db.services = x),
    toDto: (s) => ({ ...serviceDto(s), templates: Object.entries(s.templateIds).map(([form, id]) => ({ form, id, name: db.templates.find((t) => t.id === id)?.name })), specializations: s.specializationIds.map((id) => ({ id, name: specName(id) })), priceCents: s.priceCents }),
    label: (s) => s.slug,
    search: (s) => `${s.name.az} ${s.name.ru} ${s.name.en} ${s.slug}`,
    validate: (b, rec) => (rec ? (b.priceModel === "FIXED" && b.priceCents === null ? { priceCents: ["validation.required"] } : null) : required(b, "nameI18n", "slug", "categoryId", "serviceType", "priceModel")),
    create: (b) => ({ id: newId("service"), slug: String(b.slug), name: b.name as never, shortDescription: (b.shortDescription as never) ?? L(""), description: (b.description as never) ?? L(""), categoryId: String(b.categoryId), serviceType: b.serviceType as never, executionForms: (b.executionForms as never) ?? ["ON_SITE"], priceModel: b.priceModel as never, priceCents: (b.priceCents as number) ?? null, specializationIds: (b.specializationIds as string[]) ?? [], templateIds: (b.templateIds as never) ?? { ON_SITE: db.templates[1]!.id }, durationMinutes: Number(b.durationMinutes ?? 60), warrantyMonths: Number(b.warrantyMonths ?? 3), imageTone: "sky", icon: "wrench", faq: [], problems: [], assignmentMethod: "DISPATCHER" as const, slotMinutes: 60, travelBufferMinutes: 30, rating: 0, completedCount: 0, active: true }),
    beforeDelete: (s) => inUse(db.serviceOrders.some((o) => o.serviceId === s.id)),
  }),

  ...crud("/admin/fee-rules", {
    perm: "fee_rules",
    get: () => db.feeRules,
    set: (x) => (db.feeRules = x),
    toDto: (r) => ({ ...r, categoryName: r.categoryId ? db.equipmentCategories.find((c) => c.id === r.categoryId)?.name ?? null : null }),
    label: (r) => r.name.az,
    validate: (b, rec) => (rec ? null : required(b, "nameI18n", "type", "trigger", "amountType", "amount")),
    create: (b) => ({ id: newId("fee"), name: b.name as never, type: b.type as never, categoryId: (b.categoryId as string) ?? null, serviceType: (b.serviceType as string) ?? null, executionForm: (b.executionForm as never) ?? null, timeCondition: (b.timeCondition as never) ?? null, zone: (b.zone as never) ?? "ANY", excludedPlans: (b.excludedPlans as string[]) ?? [], trigger: b.trigger as never, amountType: b.amountType as never, amount: String(b.amount), onEstimateApproved: (b.onEstimateApproved as never) ?? "WAIVE", validFrom: (b.validFrom as string) ?? nowIso(), validTo: (b.validTo as string) ?? null, active: b.active !== false }),
  }),

  ...crud("/admin/reason-codes", {
    perm: "reason_codes",
    get: () => db.reasonCodes,
    set: (x) => (db.reasonCodes = x),
    label: (r) => r.code,
    defaultSort: "category",
    validate: (b, rec) => (rec ? null : required(b, "code", "category", "labelI18n")),
    create: (b) => ({ id: newId("reason"), code: String(b.code).toUpperCase(), category: String(b.category), label: b.label as never, labelI18n: b.label as never, active: true, order: db.reasonCodes.length }),
  }),

  /* ---------------- B2B hesabları və partner tipləri ---------------- */
  ...crud("/admin/b2b-accounts", {
    perm: "b2b_accounts",
    get: () => db.b2bAccounts,
    set: (x) => (db.b2bAccounts = x),
    label: (c) => c.legalName,
    search: (c) => `${c.legalName} ${c.voen}`,
    defaultSort: "-createdAt",
    toDto: (c) => ({ ...c, creditLimit: money(c.creditLimitCents), currentDebt: money(c.debtCents), minOrder: money(c.minOrderCents), priceListName: c.priceType, addressCount: db.addresses.filter((a) => a.ownerId === c.id).length, userCount: db.users.filter((u) => u.companyId === c.id).length, planName: db.plans.find((p) => p.id === c.planId)?.name ?? null, partnerTypeName: db.partnerTypes.find((p) => p.id === c.partnerTypeId)?.name ?? null, users: db.users.filter((u) => u.companyId === c.id).map((u) => ({ id: u.id, fullName: fullName(u), email: u.email, companyRole: u.companyRole, status: u.status })), orders: db.salesOrders.filter((s) => s.companyId === c.id).length + db.serviceOrders.filter((o) => o.companyId === c.id || o.partnerCompanyId === c.id).length, availableActions: c.status === "PENDING_REVIEW" ? [{ code: "approve", variant: "primary" }, { code: "reject", variant: "destructive", requiresReason: true }] : c.status === "ACTIVE" ? [{ code: "suspend", variant: "destructive", requiresReason: true }] : [{ code: "activate", variant: "primary" }] }),
    validate: (b): Record<string, string[]> | null => (b.creditLimitCents !== undefined && Number(b.creditLimitCents) < 0 ? { creditLimitCents: ["validation.positive"] } : b.voen !== undefined && !/^\d{10}$/.test(String(b.voen)) ? { voen: ["validation.voen"] } : null),
  }),

  route.post("/admin/b2b-accounts/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "b2b_accounts:edit");
    const c = find(db.b2bAccounts, params.id);
    const { note } = await body<{ note?: string }>();
    const map: Record<string, typeof c.status> = { approve: "ACTIVE", reject: "REJECTED", suspend: "SUSPENDED", activate: "ACTIVE" };
    const status = map[params.op];
    if (!status) notFound();
    if (["reject", "suspend"].includes(params.op) && !note) throw validationError({ note: ["validation.required"] });
    const before = c.status;
    c.status = status;
    if (params.op === "approve") {
      c.accountManager = fullName(ctx.user);
      if (!db.users.some((u) => u.companyId === c.id)) {
        const base = db.users.find((u) => u.roles.includes("CORPORATE_CUSTOMER"))!;
        const role = c.segment === "CORPORATE" ? "CORPORATE_CUSTOMER" : c.segment === "PARTNER" ? "PARTNER" : "WHOLESALE_CUSTOMER";
        db.users.push({ ...base, id: newId("user"), firstName: c.contactName.split(" ")[0] ?? c.contactName, lastName: c.contactName.split(" ").slice(1).join(" ") || "—", email: c.contactEmail, phone: c.contactPhone, roles: [role], companyId: c.id, companyRole: "OWNER", status: "INVITED", createdAt: nowIso(), lastLoginAt: null, favorites: [], compare: [] });
      }
    }
    audit(ctx, params.op, "b2b_accounts", c.id, c.legalName, [{ field: "status", from: before, to: status }], note);
    return { ok: true, status };
  }),

  ...crud("/admin/partner-types", {
    perm: "b2b_accounts",
    get: () => db.partnerTypes,
    set: (x) => (db.partnerTypes = x),
    label: (p) => p.code,
    toDto: (p) => ({ ...p, partnerCount: db.b2bAccounts.filter((c) => c.partnerTypeId === p.id).length }),
    validate: (b, rec) => (rec ? null : required(b, "code", "nameI18n")),
    create: (b) => ({ id: newId("ptype"), code: String(b.code).toUpperCase(), name: b.name as never, capabilities: (b.capabilities as never) ?? { partnerPricing: true, ordersForEndCustomer: false, notifyEndCustomer: false, invoiceRecipient: "PARTNER", commission: false }, commissionModel: (b.commissionModel as never) ?? null, commissionBase: (b.commissionBase as never) ?? "NET_OF_VAT", defaultRate: (b.defaultRate as string) ?? null, serviceRates: (b.serviceRates as never) ?? [], active: true }),
    beforeDelete: (p) => inUse(db.b2bAccounts.some((c) => c.partnerTypeId === p.id)),
  }),

  /* ---------------- Kataloq və PIM (§24–27) ---------------- */
  route.get("/admin/products", ({ ctx, url }) => {
    requirePerm(ctx, "catalog:view");
    const adminCtx = { ...ctx, priceType: "RETAIL" as const, plan: null };
    const rows = db.products.map((p) => ({ ...productSummaryDto(p, adminCtx), status: p.status, sku: p.variants[0]!.sku, skuCount: p.variants.length, stockTotal: db.stock.filter((s) => s.productId === p.id).reduce((s, x) => s + x.physical, 0), brandId: p.brandId, visibility: p.visibility, retailPrice: money(p.variants[0]!.prices.RETAIL), createdAt: p.createdAt }));
    return list(url, rows, { search: (p) => `${JSON.stringify(p.name)} ${p.sku} ${p.brandName}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/products/:id", ({ ctx, params }) => {
    requirePerm(ctx, "catalog:view");
    const p = find(db.products, params.id);
    const adminCtx = { ...ctx, priceType: "RETAIL" as const, plan: null };
    const codes = (() => { const out: string[] = []; let c = db.productCategories.find((x) => x.id === p.categoryId); const chain = []; while (c) { chain.unshift(c); c = c.parentId ? db.productCategories.find((x) => x.id === c!.parentId) : undefined; } chain.forEach((x) => x.attributeCodes.forEach((a) => !out.includes(a) && out.push(a))); return out; })();
    return {
      ...productDto(p, adminCtx),
      variantsAdmin: p.variants.map((v) => ({ ...v, prices: Object.fromEntries(Object.entries(v.prices).map(([k, c]) => [k, money(c)])), stock: db.stock.filter((s) => s.variantId === v.id).map(stockLevelDto) })),
      attributeSchema: codes.map((code) => { const a = db.attributes.find((x) => x.code === code)!; return { ...a, nameI18n: a.name, value: p.attributes[code] ?? null }; }),
      rawAttributes: p.attributes,
      conversions: p.conversions.map((c) => ({ ...c, packagePrice: c.packagePriceCents ? money(c.packagePriceCents) : null })),
      categoryId: p.categoryId,
      brandId: p.brandId,
      type: p.type,
      baseUnit: p.baseUnit,
      compatibleModelIds: p.compatibleModelIds,
      returnRestrictionKey: p.returnRestriction,
      warrantyMonths: p.warrantyMonths,
      installServiceId: p.installServiceId,
      gallery: productGallery(p),
    };
  }),

  route.post("/admin/products", async ({ ctx, body }) => {
    requirePerm(ctx, "catalog:create", "catalog:edit");
    const b = await body<Record<string, unknown>>();
    const errors = required(b, "nameI18n", "slug", "brandId", "categoryId", "baseUnit", "type", "sku", "retailPrice");
    if (errors) throw validationError(errors);
    if (db.products.some((p) => p.slug === b.slug)) throw validationError({ slug: ["validation.alreadyExists"] });
    if (db.products.some((p) => p.variants.some((v) => v.sku === b.sku))) throw validationError({ sku: ["validation.alreadyExists"] });
    const retail = Math.round(Number(b.retailPrice) * 100);
    if (!(retail > 0)) throw validationError({ retailPrice: ["validation.positive"] });
    if (b.barcode && db.products.some((p) => p.variants.some((v) => v.barcode === b.barcode))) throw validationError({ barcode: ["validation.alreadyExists"] });
    if (b.barcode && !/^\d{8,14}$/.test(String(b.barcode))) throw validationError({ barcode: ["validation.barcode"] });
    const initial = b.initialStock as { warehouseId?: string; quantity?: string; unitCost?: string; purpose?: "SALES" | "SERVICE"; zone?: string } | undefined;
    if (initial?.quantity && Number(initial.quantity) > 0) {
      const e: Record<string, string[]> = {};
      if (!initial.warehouseId) e["initialStock.warehouseId"] = ["validation.required"];
      if (!(Number(initial.unitCost) >= 0) || !initial.unitCost) e["initialStock.unitCost"] = ["validation.required"];
      if (Object.keys(e).length) throw validationError(e);
    }
    const prices = b.prices as Record<string, string> | undefined;
    const p = { ...db.products[0]!, id: newId("product"), slug: String(b.slug), name: b.nameI18n as never, description: (b.descriptionI18n as never) ?? L(""), highlights: [], type: b.type as never, brandId: String(b.brandId), modelId: (b.modelId as string) ?? null, categoryId: String(b.categoryId), baseUnit: String(b.baseUnit), conversions: [], attributes: (b.attributes as Record<string, string>) ?? {}, variantAttrCodes: [], variants: [{ id: newId("variant"), sku: String(b.sku), barcode: String(b.barcode ?? ""), attributes: {}, prices: { RETAIL: retail, TECHNICIAN: prices?.TECHNICIAN ? Math.round(Number(prices.TECHNICIAN) * 100) : Math.round(retail * 0.8), PARTNER: prices?.PARTNER ? Math.round(Number(prices.PARTNER) * 100) : Math.round(retail * 0.75), WHOLESALE: prices?.WHOLESALE ? Math.round(Number(prices.WHOLESALE) * 100) : Math.round(retail * 0.7) }, weightKg: String(b.weightKg ?? "1"), dimensionsCm: String(b.dimensionsCm ?? "—") }], rating: 0, reviewCount: 0, isNew: true, imageKind: db.productCategories.find((c) => c.id === b.categoryId)?.slug.includes("kondisioner") ? "ac" : "box", imageTone: "slate", warrantyMonths: Number(b.warrantyMonths ?? 12), media: [] as never[], installServiceId: null, compatibleModelIds: [], analogIds: [], oemCode: null, visibility: [], status: (b.status as never) ?? "DRAFT", createdAt: nowIso(), returnRestriction: null, videoUrl: null, bulky: false };
    db.products.unshift(p);
    const images = (b.images as { dataUrl: string; name?: string }[] | undefined) ?? [];
    if (images.length) createProductMedia(ctx, p.id, images);
    audit(ctx, "create", "catalog", p.id, p.slug);
    // ilkin qalıq — mal qəbulu hərəkəti kimi qeydə alınır
    let movementNumber: string | null = null;
    if (initial?.quantity && Number(initial.quantity) > 0) {
      const mv = move({ type: "RECEIPT", warehouseId: initial.warehouseId!, variantId: p.variants[0]!.id, baseQuantity: Number(initial.quantity), quantity: String(initial.quantity), unit: p.baseUnit, direction: "IN", purpose: initial.purpose ?? "SALES", actorName: fullName(ctx.user), unitCostCents: Math.round(Number(initial.unitCost) * 100), reason: "İlkin qalıq", relatedDocument: p.variants[0]!.sku });
      if (initial.zone) stockRow(p.variants[0]!.id, initial.warehouseId!, initial.purpose ?? "SALES").zone = initial.zone;
      movementNumber = mv.number;
    }
    return { id: p.id, variantId: p.variants[0]!.id, movementNumber };
  }),

  route.patch("/admin/products/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "catalog:edit");
    const p = find(db.products, params.id);
    const b = await body<Record<string, unknown>>();
    const changes = [];
    // atribut validasiyası — məcburi və ədədi tiplər
    if (b.attributes) {
      const attrs = b.attributes as Record<string, string>;
      const errors: Record<string, string[]> = {};
      for (const [code, value] of Object.entries(attrs)) {
        const a = db.attributes.find((x) => x.code === code);
        if (a && (a.type === "NUMBER" || a.type === "NUMBER_UNIT") && value !== "" && !Number.isFinite(Number(value))) errors[`attributes.${code}`] = ["validation.number"];
        if (a?.required && !value) errors[`attributes.${code}`] = ["validation.required"];
      }
      if (Object.keys(errors).length) throw validationError(errors);
    }
    if (b.variants) {
      const variants = b.variants as { id: string; prices: Record<string, string>; sku: string; barcode: string }[];
      for (const v of variants) {
        const rec = p.variants.find((x) => x.id === v.id);
        if (!rec) continue;
        for (const [k, amount] of Object.entries(v.prices ?? {})) {
          const cents = Math.round(Number(amount) * 100);
          if (!(cents > 0)) throw validationError({ [`variants.${v.id}.${k}`]: ["validation.positive"] });
          if ((rec.prices as Record<string, number>)[k] !== cents) changes.push({ field: `${rec.sku}.${k}`, from: money((rec.prices as Record<string, number>)[k]!).amount, to: money(cents).amount });
          (rec.prices as Record<string, number>)[k] = cents;
        }
        if (v.sku) rec.sku = v.sku;
        if (v.barcode !== undefined) rec.barcode = v.barcode;
      }
      delete b.variants;
    }
    if (b.conversions) {
      p.conversions = (b.conversions as { unit: string; factor: string | number; packagePrice?: string | null }[]).map((c) => {
        if (!(Number(c.factor) > 0)) throw validationError({ conversions: ["validation.positive"] });
        return { unit: c.unit, factor: Number(c.factor), packagePriceCents: c.packagePrice ? Math.round(Number(c.packagePrice) * 100) : undefined };
      });
      delete b.conversions;
    }
    changes.push(...applyPatch(p, b));
    audit(ctx, "edit", "catalog", p.id, p.slug, changes);
    return { ok: true };
  }),

  ...crud("/admin/categories", {
    perm: "catalog",
    get: () => db.productCategories,
    set: (x) => (db.productCategories = x),
    toDto: (c) => ({ ...productCategoryDto(c), attributeCodes: c.attributeCodes, costingMethod: c.costingMethod, parentName: db.productCategories.find((x) => x.id === c.parentId)?.name ?? null, depth: productCategoryDto(c).path.length - 1 }),
    label: (c) => c.slug,
    defaultSort: "order",
    validate: (b, rec) => {
      if (b.parentId && rec && (b.parentId === rec.id)) return { parentId: ["validation.cycle"] };
      return rec ? null : required(b, "nameI18n", "slug");
    },
    create: (b) => ({ id: newId("pcat"), parentId: (b.parentId as string) || null, slug: String(b.slug), name: b.name as never, attributeCodes: (b.attributeCodes as string[]) ?? [], order: Number(b.order ?? 99), active: true, imageTone: "slate", costingMethod: null }),
    beforeDelete: (c) => inUse(db.products.some((p) => p.categoryId === c.id) || db.productCategories.some((x) => x.parentId === c.id)),
  }),

  ...crud("/admin/brands", {
    perm: "catalog",
    get: () => db.brands,
    set: (x) => (db.brands = x),
    toDto: (b) => ({ ...b, logoText: b.name, seriesCount: db.series.filter((s) => s.brandId === b.id).length, modelCount: db.models.filter((m) => m.brandId === b.id).length, productCount: db.products.filter((p) => p.brandId === b.id).length }),
    label: (b) => b.name,
    defaultSort: "name",
    validate: (b, rec) => (rec ? null : required(b, "name", "slug")),
    create: (b) => ({ id: newId("brand"), slug: String(b.slug), name: String(b.name), country: String(b.country ?? ""), active: true }),
    beforeDelete: (b) => inUse(db.products.some((p) => p.brandId === b.id)),
  }),

  ...crud("/admin/series", {
    perm: "catalog",
    get: () => db.series,
    set: (x) => (db.series = x),
    toDto: (s) => ({ ...s, brandName: db.brands.find((b) => b.id === s.brandId)?.name }),
    validate: (b, rec) => (rec ? null : required(b, "name", "brandId")),
    create: (b) => ({ id: newId("series"), brandId: String(b.brandId), name: String(b.name) }),
  }),

  ...crud("/admin/models", {
    perm: "catalog",
    get: () => db.models,
    set: (x) => (db.models = x),
    toDto: (m) => ({ ...m, brandName: db.brands.find((b) => b.id === m.brandId)?.name, seriesName: db.series.find((s) => s.id === m.seriesId)?.name ?? null, categoryName: db.equipmentCategories.find((c) => c.id === m.categoryId)?.name, fullName: `${db.brands.find((b) => b.id === m.brandId)?.name} ${m.name}`, compatiblePartCount: db.products.filter((p) => p.compatibleModelIds.includes(m.id)).length, deviceCount: db.devices.filter((d) => d.modelId === m.id).length }),
    label: (m) => m.name,
    search: (m) => `${m.name} ${m.code}`,
    validate: (b, rec) => (rec ? null : required(b, "name", "brandId", "categoryId", "code")),
    create: (b) => ({ id: newId("model"), brandId: String(b.brandId), seriesId: (b.seriesId as string) || null, categoryId: String(b.categoryId), name: String(b.name), code: String(b.code) }),
    beforeDelete: (m) => inUse(db.devices.some((d) => d.modelId === m.id)),
  }),

  ...crud("/admin/attributes", {
    perm: "catalog",
    get: () => db.attributes,
    set: (x) => (db.attributes = x),
    toDto: (a) => ({ ...a, categoryNames: db.productCategories.filter((c) => c.attributeCodes.includes(a.code)).map((c) => c.name), usage: db.products.filter((p) => p.attributes[a.code] !== undefined || p.variants.some((v) => v.attributes[a.code] !== undefined)).length }),
    label: (a) => a.code,
    defaultSort: "code",
    validate: (b, rec) => {
      if (!rec) { const e = required(b, "code", "nameI18n", "type"); if (e) return e; if (db.attributes.some((a) => a.code === b.code)) return { code: ["validation.alreadyExists"] }; }
      if (["SELECT", "MULTISELECT"].includes(String(b.type ?? rec?.type)) && Array.isArray(b.options) && !(b.options as unknown[]).length) return { options: ["validation.selectAtLeastOne"] };
      return null;
    },
    create: (b) => ({ id: newId("attr"), code: String(b.code), name: b.name as never, type: b.type as never, unit: (b.unit as string) || null, required: !!b.required, filterable: b.filterable !== false, filterDisplay: (b.filterDisplay as never) ?? "CHECKBOX", comparable: !!b.comparable, variantDefining: !!b.variantDefining, group: (b.group as never) ?? L("Əsas", "Основные", "Main"), options: (b.options as never) ?? [] }),
    beforeDelete: (a) => inUse(db.products.some((p) => p.attributes[a.code] !== undefined)),
  }),

  route.get("/admin/compatibility", ({ ctx, url }) => {
    requirePerm(ctx, "catalog:view");
    const rows = db.products.flatMap((p) => p.compatibleModelIds.map((mid) => { const m = db.models.find((x) => x.id === mid)!; return { id: `${p.id}:${mid}`, productId: p.id, productName: p.name, sku: p.variants[0]!.sku, modelId: mid, modelFullName: `${db.brands.find((b) => b.id === m.brandId)?.name} ${m.name}`, source: "MANUAL", createdAt: p.createdAt }; }));
    return list(url, rows, { search: (r) => `${JSON.stringify(r.productName)} ${r.sku} ${r.modelFullName}`, defaultSort: "sku" });
  }),

  route.post("/admin/compatibility", async ({ ctx, body }) => {
    requirePerm(ctx, "catalog:edit");
    const { productId, modelIds, seriesId, csv } = await body<{ productId?: string; modelIds?: string[]; seriesId?: string; csv?: string }>();
    let added = 0;
    const errors: string[] = [];
    const link = (p: (typeof db.products)[number], mid: string) => { if (!p.compatibleModelIds.includes(mid)) { p.compatibleModelIds.push(mid); added++; } };
    if (csv) {
      // Toplu import: "SKU;MODEL_KODU" sətirləri
      csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
        const [sku, code] = line.split(/[;,]/).map((x) => x?.trim());
        const p = db.products.find((x) => x.variants.some((v) => v.sku === sku));
        const m = db.models.find((x) => x.code === code || x.name === code);
        if (!p || !m) errors.push(`${i + 1}: ${line}`);
        else link(p, m.id);
      });
    } else {
      const p = find(db.products, productId ?? "");
      const ids = seriesId ? db.models.filter((m) => m.seriesId === seriesId).map((m) => m.id) : modelIds ?? [];
      if (!ids.length) throw validationError({ modelIds: ["validation.selectAtLeastOne"] });
      ids.forEach((mid) => link(p, mid));
    }
    audit(ctx, "edit", "catalog", productId ?? "import", "compatibility", [{ field: "compatibility", from: null, to: `+${added}` }]);
    return { added, errors };
  }),

  route.delete("/admin/compatibility/:id", ({ ctx, params }) => {
    requirePerm(ctx, "catalog:edit");
    const [productId, modelId] = params.id.split(":");
    const p = find(db.products, productId!);
    p.compatibleModelIds = p.compatibleModelIds.filter((m) => m !== modelId);
    return undefined;
  }),

  ...crud("/admin/units", {
    perm: "catalog",
    get: () => db.units,
    set: (x) => (db.units = x),
    label: (u) => u.code,
    validate: (b, rec) => (rec ? (b.precision !== undefined && !(Number(b.precision) >= 0 && Number(b.precision) <= 4) ? { precision: ["validation.precision"] } : null) : required(b, "code", "nameI18n", "short")),
    create: (b) => ({ id: newId("unit"), code: String(b.code), name: b.name as never, nameI18n: b.name as never, short: String(b.short), precision: Number(b.precision ?? 0), system: false }),
    beforeDelete: (u) => inUse(u.system || db.products.some((p) => p.baseUnit === u.code)),
  }),

  route.get("/admin/unit-conversions", ({ ctx, url }) => {
    requirePerm(ctx, "catalog:view");
    const rows = db.products.flatMap((p) => p.conversions.map((c) => ({ id: `${p.id}:${c.unit}`, productId: p.id, productName: p.name, baseUnit: p.baseUnit, unit: c.unit, factor: String(c.factor), packagePrice: c.packagePriceCents ? money(c.packagePriceCents) : null, unitPrice: money(p.variants[0]!.prices.RETAIL), savingPercent: c.packagePriceCents ? Math.round((1 - c.packagePriceCents / (p.variants[0]!.prices.RETAIL * c.factor)) * 100) : 0 })));
    return list(url, rows, { search: (r) => JSON.stringify(r.productName) });
  }),

  /* ---------------- Satış (§31–32, §46) ---------------- */
  route.get("/admin/sales-orders", ({ ctx, url }) => {
    requirePerm(ctx, "sales_orders:view");
    return list(url, db.salesOrders.map(salesOrderSummaryDto), { search: (s) => `${s.number} ${s.customerName} ${s.companyName ?? ""}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/sales-orders/:id", ({ ctx, params }) => {
    requirePerm(ctx, "sales_orders:view");
    const s = find(db.salesOrders, params.id);
    return { ...salesOrderDto(s, ctx), customerPhone: db.users.find((u) => u.id === s.customerId)?.phone, logistics: db.logisticsTasks.filter((t) => t.relatedOrderId === s.id).map((t) => ({ id: t.id, number: t.number, status: t.status })), reservations: db.reservations.filter((r) => r.sourceId === s.id).map((r) => reservationDto(r, ctx)) };
  }),

  route.post("/admin/sales-orders/:id/actions", async ({ ctx, params, body }) => {
    requirePerm(ctx, "sales_orders:edit");
    const s = find(db.salesOrders, params.id);
    const { action, note, amount } = await body<{ action: string; note?: string; amount?: string }>();
    const allowed = salesOrderDto(s, ctx).availableActions.map((a) => a.code);
    if (!allowed.includes(action)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const before = s.status;
    const to: Record<string, typeof s.status> = { start_processing: "PROCESSING", ready_for_pickup: "READY_FOR_PICKUP", ship: "SHIPPED", mark_delivered: "DELIVERED", complete: "COMPLETED", cancel: "CANCELLED" };
    if (action === "refund") {
      requirePerm(ctx, "payments:edit");
      const p = db.payments.find((x) => x.orderId === s.id && ["PAID", "PARTIALLY_REFUNDED"].includes(x.status));
      if (!p) throw apiError(409, "NO_PAYMENT", "error.actionNotAllowed");
      const cents = amount ? Math.round(Number(amount) * 100) : p.amountCents - p.refundedCents;
      if (!(cents > 0) || cents > p.amountCents - p.refundedCents) throw validationError({ amount: ["validation.amountRange"] });
      p.refundedCents += cents;
      p.status = p.refundedCents >= p.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
      issueDocument({ type: "FISCAL_RECEIPT", ownerId: p.payerId, counterpartyName: p.payerName, counterpartyVoen: null, orderType: "SALES", orderId: s.id, orderNumber: s.number, lines: [{ name: L(`Qaytarma çeki — ${s.number}`), quantity: "1", unit: "pcs", unitCents: -cents, vatRate: 18 }], vatIncluded: true, meta: { refund: "true" } });
    } else {
      if (action === "cancel" && !note) throw validationError({ note: ["validation.required"] });
      s.status = to[action]!;
      if (action === "ship" || action === "ready_for_pickup") {
        for (const l of s.lines) {
          const res = db.reservations.find((r) => r.sourceId === s.id && r.variantId === l.variantId && r.status === "ACTIVE");
          if (res) releaseReservation(res.id, "CONSUMED");
          move({ type: "SALE_ISSUE", warehouseId: res?.warehouseId ?? db.warehouses[0]!.id, variantId: l.variantId, baseQuantity: Number(l.baseQuantity), quantity: l.quantity, unit: l.unit, direction: "OUT", actorName: fullName(ctx.user), relatedDocument: s.number });
        }
        if (action === "ship" && s.address && !db.logisticsTasks.some((t) => t.relatedOrderId === s.id)) {
          db.logisticsTasks.unshift({ id: newId("lt"), number: `LT-${4200 + db.logisticsTasks.length}`, type: "DELIVERY", status: "PLANNED", from: { label: "Mərkəzi anbar", address: "Bakı, Təbriz küç. 44", location: db.branches[0]!.location }, to: { label: s.address.label, address: `${s.address.city}, ${s.address.street}`, location: s.address.location ?? null }, windowStart: hoursFromNow(3), windowEnd: hoursFromNow(5), assigneeId: null, assigneeKind: null, cargo: s.lines.map((l) => ({ kind: "PRODUCT" as const, name: l.name.az, quantity: `${l.quantity} ${l.unit}`, note: null })), relatedOrderId: s.id, relatedOrderNumber: s.number, relatedOrderKind: "SALES", stageId: null, contact: { name: fullName(db.users.find((u) => u.id === s.customerId)), phone: db.users.find((u) => u.id === s.customerId)?.phone ?? "" }, note: null, collectCashCents: s.paymentMethod === "CASH" ? s.totalCents : null, photos: 0, signed: false, failReason: null, history: [{ at: nowIso(), status: "PLANNED", actor: fullName(ctx.user), note: null }], branchId: s.branchId, createdAt: nowIso() });
        }
      }
      if (action === "cancel") db.reservations.filter((r) => r.sourceId === s.id && r.status === "ACTIVE").forEach((r) => releaseReservation(r.id));
      notify(s.customerId, "SALES_STATUS", "notif.orderConfirmed", L(`${s.number}: status yeniləndi`, `${s.number}: статус обновлён`, `${s.number}: status updated`), `/account/orders/${s.id}`);
    }
    s.history.unshift({ id: newId("h"), at: nowIso(), actorName: fullName(ctx.user), action, fromStatus: before, toStatus: s.status, note });
    audit(ctx, action, "sales_orders", s.id, s.number, [{ field: "status", from: before, to: s.status }], note);
    return salesOrderDto(s, ctx);
  }),

  route.get("/admin/returns", ({ ctx, url }) => {
    requirePerm(ctx, "sales_orders:view");
    return list(url, db.returns.map(returnDto), { defaultSort: "-createdAt", search: (r) => `${r.number} ${r.salesOrderNumber} ${r.customerName}` });
  }),

  route.post("/admin/returns/:id/actions", async ({ ctx, params, body }) => {
    requirePerm(ctx, "sales_orders:edit");
    const r = find(db.returns, params.id);
    const { action, note, inspectionResult, refundMethod } = await body<{ action: string; note?: string; inspectionResult?: "RESELLABLE" | "DAMAGED" | "RETURN_TO_SUPPLIER"; refundMethod?: "ORIGINAL" | "BALANCE" }>();
    if (!returnDto(r).availableActions.some((a) => a.code === action)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const so = db.salesOrders.find((s) => s.id === r.salesOrderId)!;
    const before = r.status;
    if (action === "reject" && !note) throw validationError({ note: ["validation.required"] });
    if (action === "inspect" && !inspectionResult) throw validationError({ inspectionResult: ["validation.required"] });
    const map: Record<string, typeof r.status> = { approve: "APPROVED", reject: "REJECTED", receive: "RECEIVED", inspect: "INSPECTED", refund: "REFUNDED", close: "CLOSED" };
    r.status = map[action]!;
    if (action === "receive") {
      for (const l of r.lines) { const line = so.lines.find((x) => x.id === l.lineId); if (line) move({ type: "RETURN", warehouseId: db.warehouses.find((w) => w.type === "QUARANTINE")!.id, variantId: line.variantId, baseQuantity: Number(l.quantity), direction: "IN", actorName: fullName(ctx.user), relatedDocument: r.number, reason: "Müştəri qaytarması" }); }
    }
    if (action === "inspect") r.inspectionResult = inspectionResult!;
    if (action === "refund") {
      requirePerm(ctx, "payments:edit");
      const cents = r.lines.reduce((sum, l) => sum + (so.lines.find((x) => x.id === l.lineId)?.unitCents ?? 0) * Number(l.quantity), 0);
      r.refundCents = cents;
      r.refundMethod = refundMethod ?? "ORIGINAL";
      const p = db.payments.find((x) => x.orderId === so.id && ["PAID", "PARTIALLY_REFUNDED"].includes(x.status));
      if (p) { p.refundedCents = Math.min(p.amountCents, p.refundedCents + cents); p.status = p.refundedCents >= p.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED"; }
      for (const l of r.lines) { const line = so.lines.find((x) => x.id === l.lineId); if (line) line.returnedQuantity = String(Number(line.returnedQuantity) + Number(l.quantity)); }
      so.status = so.lines.every((l) => Number(l.returnedQuantity) >= Number(l.quantity)) ? "RETURNED" : "COMPLETED";
      notify(r.customerId, "REFUND", "notif.paymentOk", L(`${r.number}: ${money(cents).amount} AZN geri qaytarıldı`), "/account/returns");
    }
    if (action === "reject") so.status = "COMPLETED";
    r.history.unshift({ id: newId("h"), at: nowIso(), actorName: fullName(ctx.user), action, fromStatus: before, toStatus: r.status, note });
    audit(ctx, action, "returns", r.id, r.number, [{ field: "status", from: before, to: r.status }], note);
    return returnDto(r);
  }),

  route.get("/admin/quotes", ({ ctx, url }) => {
    requirePerm(ctx, "sales_orders:view");
    return list(url, db.quotes.map((q) => ({ ...quoteDto(q), availableActions: q.status === "REQUESTED" ? [{ code: "send", variant: "primary" }] : [] })), { defaultSort: "-requestedAt" });
  }),

  route.post("/admin/quotes/:id/send", async ({ ctx, params, body }) => {
    requirePerm(ctx, "sales_orders:edit");
    const q = find(db.quotes, params.id);
    const { prices, validDays } = await body<{ prices: string[]; validDays: number }>();
    if (!prices || prices.length !== q.lines.length || prices.some((p) => !(Number(p) > 0))) throw validationError({ prices: ["validation.positive"] });
    q.lines.forEach((l, i) => (l.unitCents = Math.round(Number(prices[i]) * 100)));
    q.status = "SENT";
    q.validUntil = hoursFromNow(24 * (validDays || 7));
    const owner = db.users.find((u) => u.companyId === q.companyId && u.companyRole === "OWNER");
    notify(owner?.id, "QUOTE_SENT", "notif.orderConfirmed", L(`Kommersiya təklifi hazırdır: ${q.number}`), "/wholesale/quotes", "EMAIL");
    audit(ctx, "send", "quotes", q.id, q.number);
    return quoteDto(q);
  }),

  ...crud("/admin/price-lists", {
    perm: "price_rules",
    get: () => db.priceLists,
    set: (x) => (db.priceLists = x),
    toDto: (p) => ({ ...p, itemCount: db.products.reduce((s, x) => s + x.variants.length, 0), currency: "AZN", sample: db.products.slice(0, 6).map((x) => ({ productId: x.id, name: x.name, sku: x.variants[0]!.sku, price: money(p.priceType === "CORPORATE" ? x.variants[0]!.prices.RETAIL : x.variants[0]!.prices[p.priceType]) })) }),
    label: (p) => p.priceType,
  }),

  ...crud("/admin/promotions", {
    perm: "price_rules",
    get: () => db.promotions,
    set: (x) => (db.promotions = x),
    toDto: (p) => ({ ...p, maxDiscount: p.maxDiscountCents !== null ? money(p.maxDiscountCents) : null, categoryNames: p.categoryIds.map((id) => db.productCategories.find((c) => c.id === id)?.name) }),
    label: (p) => p.code,
    defaultSort: "priority",
    validate: (b, rec) => {
      if (!rec) { const e = required(b, "code", "nameI18n", "kind", "value", "stacking", "priority"); if (e) return e; if (db.promotions.some((p) => p.code === b.code)) return { code: ["validation.alreadyExists"] }; }
      const stacking = b.stacking ?? rec?.stacking;
      const list2 = (b.combinableWith as string[] | undefined) ?? rec?.combinableWith ?? [];
      if (stacking === "COMBINABLE_WITH_LIST" && !list2.length) return { combinableWith: ["validation.selectAtLeastOne"] };
      if (b.value !== undefined && !(Number(b.value) > 0)) return { value: ["validation.positive"] };
      if ((b.kind ?? rec?.kind) === "PERCENT" && Number(b.value ?? rec?.value) > 100) return { value: ["validation.percent"] };
      return null;
    },
    create: (b) => ({ id: newId("promo"), code: String(b.code).toUpperCase(), name: b.name as never, kind: b.kind as never, value: Number(b.value), stacking: b.stacking as never, combinableWith: (b.combinableWith as string[]) ?? [], priority: Number(b.priority), base: (b.base as never) ?? "BASE_PRICE", maxDiscountCents: b.maxDiscount ? Math.round(Number(b.maxDiscount) * 100) : null, categoryIds: (b.categoryIds as string[]) ?? [], productIds: [], segments: (b.segments as string[]) ?? ["RETAIL"], planCodes: (b.planCodes as string[]) ?? [], appliesTo: (b.appliesTo as never) ?? "PRODUCTS", startsAt: (b.startsAt as string) ?? nowIso(), endsAt: (b.endsAt as string) ?? null, active: b.active !== false, usageCount: 0, promoCode: b.kind === "PROMO_CODE" ? String(b.code).toUpperCase() : null }),
  }),

  /* ---------------- Anbar (§34–40) ---------------- */
  route.get("/admin/inventory", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    const sp = url.searchParams;
    let rows = db.stock.map(stockLevelDto);
    if (sp.get("belowMin") === "true") { rows = rows.filter((r) => r.belowMin); sp.delete("belowMin"); }
    const totals = { skus: new Set(rows.map((r) => r.variantId)).size, value: money(db.stock.reduce((s, x) => s + x.physical * x.avgCostCents, 0)), belowMin: db.stock.filter((s) => s.physical - s.reserved - s.damaged < s.minLevel).length, reserved: db.reservations.filter((r) => r.status === "ACTIVE").length };
    return { ...list(url, rows, { search: (r) => `${JSON.stringify(r.productName)} ${r.sku}`, defaultSort: "sku", defaultPageSize: 30 }), totals };
  }),

  route.patch("/admin/inventory/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "inventory:edit");
    const row = find(db.stock, params.id);
    const { minLevel, zone } = await body<{ minLevel?: number; zone?: string }>();
    if (minLevel !== undefined) { if (!(minLevel >= 0)) throw validationError({ minLevel: ["validation.positive"] }); row.minLevel = minLevel; }
    if (zone !== undefined) row.zone = zone;
    return stockLevelDto(row);
  }),

  ...crud("/admin/warehouses", {
    perm: "inventory",
    get: () => db.warehouses,
    set: (x) => (db.warehouses = x),
    toDto: (w) => ({ ...w, branchName: branchName(w.branchId), groupName: db.warehouseGroups.find((g) => g.id === w.groupId)?.name ?? null, skuCount: db.stock.filter((s) => s.warehouseId === w.id && s.physical > 0).length, stockValue: money(db.stock.filter((s) => s.warehouseId === w.id).reduce((s, x) => s + x.physical * x.avgCostCents, 0)) }),
    label: (w) => w.code,
    defaultSort: "code",
    validate: (b, rec) => (rec ? null : required(b, "code", "nameI18n", "type", "branchId", "responsibleName")),
    create: (b) => ({ id: newId("wh"), code: String(b.code), name: b.name as never, type: b.type as never, branchId: String(b.branchId), groupId: (b.groupId as string) || null, responsibleName: String(b.responsibleName), zones: (b.zones as string[]) ?? [], active: true }),
    beforeDelete: (w) => inUse(db.stock.some((s) => s.warehouseId === w.id && s.physical > 0)),
  }),

  ...crud("/admin/warehouse-groups", {
    perm: "inventory",
    get: () => db.warehouseGroups,
    set: (x) => (db.warehouseGroups = x),
    toDto: (g) => ({ ...g, warehouseIds: db.warehouses.filter((w) => w.groupId === g.id).map((w) => w.id), warehouseNames: db.warehouses.filter((w) => w.groupId === g.id).map((w) => w.name) }),
    validate: (b, rec) => (rec ? null : required(b, "nameI18n")),
    create: (b) => ({ id: newId("wg"), name: b.name as never, costingMethod: (b.costingMethod as never) ?? null }),
  }),

  route.get("/admin/stock-movements", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    const rows = db.movements.map((m) => { const p = db.products.find((x) => x.id === m.productId)!; return { ...m, warehouseName: warehouseName(m.warehouseId), productName: p.name, sku: p.variants.find((v) => v.id === m.variantId)?.sku ?? "", quantity: qty(m.quantity, m.unit, 3), baseQuantity: qty(m.baseQuantity, p.baseUnit, 3), unitCost: money(m.unitCostCents) }; });
    return list(url, rows, { search: (m) => `${m.number} ${m.sku} ${m.relatedDocument ?? ""}`, dateField: "at", defaultSort: "-at", defaultPageSize: 30 });
  }),

  /** Hərəkətlər silinmir, yalnız əks hərəkətlə düzəldilir (§38). */
  route.post("/admin/stock-movements", async ({ ctx, body }) => {
    requirePerm(ctx, "inventory:edit");
    const b = await body<{ type: "RECEIPT" | "WRITE_OFF" | "PURPOSE_CHANGE" | "ADJUSTMENT" | "RETURN"; warehouseId: string; variantId: string; quantity: string; unit: string; direction?: "IN" | "OUT"; purpose?: "SALES" | "SERVICE"; reason?: string; unitCost?: string; reversalOf?: string }>();
    const errors = required(b as unknown as Record<string, unknown>, "type", "warehouseId", "variantId", "quantity", "unit");
    if (errors) throw validationError(errors);
    if (!(Number(b.quantity) > 0)) throw validationError({ quantity: ["validation.positive"] });
    if (["WRITE_OFF", "ADJUSTMENT", "PURPOSE_CHANGE"].includes(b.type) && !b.reason) throw validationError({ reason: ["validation.required"] });
    const found = findVariant(b.variantId);
    if (!found) throw validationError({ variantId: ["validation.required"] });
    const conv = found.product.conversions.find((c) => c.unit === b.unit);
    const base = Number(b.quantity) * (conv?.factor ?? 1);
    const actor = fullName(ctx.user);
    if (b.reversalOf) {
      const orig = find(db.movements, b.reversalOf);
      const mv = move({ type: orig.type, warehouseId: orig.warehouseId, variantId: orig.variantId, baseQuantity: orig.baseQuantity, direction: orig.direction === "IN" ? "OUT" : "IN", actorName: actor, reason: `Əks hərəkət: ${orig.number}`, relatedDocument: orig.number });
      mv.reversalOf = orig.number;
      audit(ctx, "reverse", "inventory", orig.id, orig.number);
      return mv;
    }
    if (b.type === "PURPOSE_CHANGE") {
      const from = b.purpose === "SERVICE" ? "SALES" : "SERVICE";
      const src = stockRow(b.variantId, b.warehouseId, from);
      if (src.physical - src.reserved - src.damaged < base) throw apiError(409, "INSUFFICIENT_STOCK", "error.stock", { quantity: ["validation.insufficientStock"] });
      move({ type: "PURPOSE_CHANGE", warehouseId: b.warehouseId, variantId: b.variantId, baseQuantity: base, quantity: b.quantity, unit: b.unit, direction: "OUT", purpose: from, actorName: actor, reason: b.reason });
      const mv = move({ type: "PURPOSE_CHANGE", warehouseId: b.warehouseId, variantId: b.variantId, baseQuantity: base, quantity: b.quantity, unit: b.unit, direction: "IN", purpose: b.purpose ?? "SERVICE", actorName: actor, reason: b.reason });
      return mv;
    }
    const direction = b.type === "RECEIPT" || b.type === "RETURN" ? "IN" : b.type === "WRITE_OFF" ? "OUT" : b.direction ?? "IN";
    const mv = move({ type: b.type, warehouseId: b.warehouseId, variantId: b.variantId, baseQuantity: base, quantity: b.quantity, unit: b.unit, direction, purpose: b.purpose ?? "SALES", actorName: actor, reason: b.reason, unitCostCents: b.unitCost ? Math.round(Number(b.unitCost) * 100) : undefined, enforce: direction === "OUT" });
    audit(ctx, "create", "inventory", mv.id, mv.number, [{ field: b.type, from: null, to: `${direction} ${b.quantity} ${b.unit}` }], b.reason);
    return mv;
  }),

  route.get("/admin/reservations", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    return list(url, db.reservations.map((r) => reservationDto(r, ctx)), { search: (r) => `${r.number} ${r.sourceNumber} ${r.sku} ${r.reservedFor}`, defaultSort: "expiresAt" });
  }),

  route.post("/admin/reservations/:id/:op", ({ ctx, params }) => {
    requirePerm(ctx, "inventory:edit");
    const r = find(db.reservations, params.id);
    if (r.status !== "ACTIVE") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (params.op === "release") releaseReservation(r.id);
    else if (params.op === "extend") r.expiresAt = new Date(new Date(r.expiresAt).getTime() + 24 * 3600_000).toISOString();
    else notFound();
    audit(ctx, params.op, "reservations", r.id, r.number);
    return reservationDto(r, ctx);
  }),

  route.get("/admin/transfers", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    return list(url, db.transfers.map((t) => transferDto(t, ctx)), { search: (t) => `${t.number} ${JSON.stringify(t.fromWarehouseName)} ${JSON.stringify(t.toWarehouseName)}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/transfers/:id", ({ ctx, params }) => {
    requirePerm(ctx, "inventory:view");
    return transferDto(find(db.transfers, params.id), ctx);
  }),

  route.post("/admin/transfers", async ({ ctx, body }) => {
    requirePerm(ctx, "inventory:create", "inventory:edit");
    const b = await body<{ fromWarehouseId: string; toWarehouseId: string; lines: { variantId: string; quantity: string; unit: string }[]; note?: string }>();
    if (!b.fromWarehouseId || !b.toWarehouseId) throw validationError({ fromWarehouseId: ["validation.required"] });
    if (b.fromWarehouseId === b.toWarehouseId) throw validationError({ toWarehouseId: ["validation.sameWarehouse"] });
    if (!b.lines?.length) throw validationError({ lines: ["validation.selectAtLeastOne"] });
    const lines = b.lines.map((l, i) => {
      const found = findVariant(l.variantId);
      if (!found || !(Number(l.quantity) > 0)) throw validationError({ [`lines.${i}`]: ["validation.required"] });
      const base = Number(l.quantity) * (found.product.conversions.find((c) => c.unit === l.unit)?.factor ?? 1);
      const src = db.stock.filter((s) => s.variantId === l.variantId && s.warehouseId === b.fromWarehouseId).reduce((s, x) => s + x.physical - x.reserved - x.damaged, 0);
      if (src < base) throw apiError(409, "INSUFFICIENT_STOCK", "error.stock", { [`lines.${i}`]: ["validation.insufficientStock"] });
      return { id: newId("trl"), productId: found.product.id, variantId: l.variantId, quantity: base, receivedQuantity: null };
    });
    const tr = { id: newId("tr"), number: `TR-${2205 + db.transfers.length}`, fromWarehouseId: b.fromWarehouseId, toWarehouseId: b.toWarehouseId, status: "DRAFT" as const, lines, createdAt: nowIso(), createdBy: fullName(ctx.user), shippedAt: null, receivedAt: null, discrepancyNote: b.note ?? null, history: [{ id: newId("h"), at: nowIso(), actorName: fullName(ctx.user), action: "created", toStatus: "DRAFT" }] };
    db.transfers.unshift(tr);
    audit(ctx, "create", "transfers", tr.id, tr.number);
    return transferDto(tr, ctx);
  }),

  route.post("/admin/transfers/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "inventory:edit");
    const tr = find(db.transfers, params.id);
    const allowed = transferDto(tr, ctx).availableActions.map((a) => a.code);
    if (!allowed.includes(params.op)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const before = tr.status;
    const actor = fullName(ctx.user);
    const purposeOf = (variantId: string, wh: string) => (db.stock.find((s) => s.variantId === variantId && s.warehouseId === wh && s.purpose === "SERVICE" && s.physical > 0) ? "SERVICE" : "SALES");
    if (params.op === "approve") tr.status = "APPROVED";
    if (params.op === "cancel") tr.status = "CANCELLED";
    if (params.op === "ship") {
      for (const l of tr.lines) {
        const purpose = purposeOf(l.variantId, tr.fromWarehouseId);
        move({ type: "TRANSFER_OUT", warehouseId: tr.fromWarehouseId, variantId: l.variantId, baseQuantity: l.quantity, direction: "OUT", purpose, actorName: actor, relatedDocument: tr.number, enforce: true });
        stockRow(l.variantId, tr.toWarehouseId, purpose).inTransit += l.quantity;
      }
      tr.status = "IN_TRANSIT";
      tr.shippedAt = nowIso();
    }
    if (params.op === "receive") {
      const { received, note } = await body<{ received: Record<string, string>; note?: string }>();
      // Uyğunsuzluq qeydi stok hərəkətlərindən əvvəl yoxlanılır
      if (tr.lines.some((l) => Number(received?.[l.id] ?? l.quantity) !== l.quantity) && !note) throw validationError({ note: ["validation.discrepancyNote"] });
      let discrepancy = false;
      for (const l of tr.lines) {
        const got = Number(received?.[l.id] ?? l.quantity);
        if (!(got >= 0) || got > l.quantity) throw validationError({ [`received.${l.id}`]: ["validation.amountRange"] });
        l.receivedQuantity = got;
        if (got !== l.quantity) discrepancy = true;
        const purpose = purposeOf(l.variantId, tr.fromWarehouseId);
        const row = stockRow(l.variantId, tr.toWarehouseId, purpose);
        row.inTransit = Math.max(0, row.inTransit - l.quantity);
        if (got > 0) move({ type: "TRANSFER_IN", warehouseId: tr.toWarehouseId, variantId: l.variantId, baseQuantity: got, direction: "IN", purpose, actorName: actor, relatedDocument: tr.number });
      }
      tr.status = discrepancy ? (tr.lines.some((l) => (l.receivedQuantity ?? 0) > 0) ? "DISCREPANCY" : "PARTIALLY_RECEIVED") : "RECEIVED";
      tr.discrepancyNote = discrepancy ? note ?? null : null;
      tr.receivedAt = nowIso();
    }
    tr.history.unshift({ id: newId("h"), at: nowIso(), actorName: actor, action: params.op, fromStatus: before, toStatus: tr.status });
    audit(ctx, params.op, "transfers", tr.id, tr.number, [{ field: "status", from: before, to: tr.status }]);
    return transferDto(tr, ctx);
  }),

  route.get("/admin/stock-counts", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    return list(url, db.stockCounts.map(stockCountDto), { defaultSort: "-scheduledAt" });
  }),

  route.get("/admin/stock-counts/:id", ({ ctx, params }) => {
    requirePerm(ctx, "inventory:view");
    return stockCountDto(find(db.stockCounts, params.id));
  }),

  route.post("/admin/stock-counts", async ({ ctx, body }) => {
    requirePerm(ctx, "inventory:edit");
    const b = await body<{ warehouseId: string; scope: "FULL" | "ZONE" | "CATEGORY" | "MOBILE"; scheduledAt: string; blockMovements: boolean }>();
    const errors = required(b as unknown as Record<string, unknown>, "warehouseId", "scope", "scheduledAt");
    if (errors) throw validationError(errors);
    const sc = { id: newId("sc"), number: `SC-${304 + db.stockCounts.length}`, scope: b.scope, warehouseId: b.warehouseId, status: "DRAFT" as const, blockMovements: !!b.blockMovements, lines: db.stock.filter((s) => s.warehouseId === b.warehouseId).map((s) => ({ id: newId("scl"), variantId: s.variantId, system: s.physical, counted: null })), scheduledAt: b.scheduledAt, createdBy: fullName(ctx.user) };
    db.stockCounts.unshift(sc);
    return stockCountDto(sc);
  }),

  route.patch("/admin/stock-counts/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "inventory:edit");
    const sc = find(db.stockCounts, params.id);
    const { counts, action } = await body<{ counts?: Record<string, string>; action?: "start" | "submit" | "approve" | "cancel" }>();
    if (counts) for (const [lineId, v] of Object.entries(counts)) { const l = sc.lines.find((x) => x.id === lineId); if (l) { if (v !== "" && !(Number(v) >= 0)) throw validationError({ [lineId]: ["validation.number"] }); l.counted = v === "" ? null : Number(v); } }
    if (action === "start") sc.status = "IN_PROGRESS";
    if (action === "submit") { if (sc.lines.some((l) => l.counted === null)) throw validationError({ counts: ["validation.countAll"] }); sc.status = "PENDING_APPROVAL"; }
    if (action === "approve") {
      if (sc.status !== "PENDING_APPROVAL") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
      // Fərqlər təsdiqləndikdən sonra düzəliş hərəkəti yaradılır (§40.3)
      for (const l of sc.lines) {
        const diff = (l.counted ?? l.system) - l.system;
        if (diff) move({ type: "ADJUSTMENT", warehouseId: sc.warehouseId, variantId: l.variantId, baseQuantity: Math.abs(diff), direction: diff > 0 ? "IN" : "OUT", purpose: db.stock.find((s) => s.variantId === l.variantId && s.warehouseId === sc.warehouseId)?.purpose ?? "SALES", actorName: fullName(ctx.user), reason: `Sayım nəticəsi (${sc.number})`, relatedDocument: sc.number });
      }
      sc.status = "APPROVED";
      audit(ctx, "approve", "stock_counts", sc.id, sc.number);
    }
    if (action === "cancel") sc.status = "CANCELLED";
    return stockCountDto(sc);
  }),

  route.get("/admin/purchases", ({ ctx, url }) => {
    requirePerm(ctx, "purchases:view");
    return list(url, db.purchases.map(purchaseDto), { search: (p) => `${p.number} ${p.supplierName}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/purchases/:id", ({ ctx, params }) => {
    requirePerm(ctx, "purchases:view");
    return purchaseDto(find(db.purchases, params.id));
  }),

  route.post("/admin/purchases", async ({ ctx, body }) => {
    requirePerm(ctx, "purchases:create", "purchases:edit");
    const b = await body<{ supplierId: string; warehouseId: string; expectedAt?: string; lines: { variantId: string; quantity: string; unitCost: string }[] }>();
    if (!b.supplierId || !b.warehouseId) throw validationError({ supplierId: ["validation.required"] });
    if (!b.lines?.length || b.lines.some((l) => !findVariant(l.variantId) || !(Number(l.quantity) > 0) || !(Number(l.unitCost) > 0))) throw validationError({ lines: ["validation.linesInvalid"] });
    const po = { id: newId("po"), number: `PO-${7012 + db.purchases.length}`, supplierId: b.supplierId, warehouseId: b.warehouseId, status: "DRAFT" as const, lines: b.lines.map((l) => ({ id: newId("pol"), variantId: l.variantId, quantity: Number(l.quantity), receivedQuantity: 0, unitCostCents: Math.round(Number(l.unitCost) * 100) })), expectedAt: b.expectedAt ?? null, createdAt: nowIso(), invoiceNumber: null };
    db.purchases.unshift(po);
    audit(ctx, "create", "purchases", po.id, po.number);
    return purchaseDto(po);
  }),

  route.post("/admin/purchases/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "purchases:edit");
    const po = find(db.purchases, params.id);
    const before = po.status;
    if (params.op === "send" && po.status === "DRAFT") po.status = "SENT";
    else if (params.op === "confirm" && po.status === "SENT") po.status = "CONFIRMED";
    else if (params.op === "cancel" && ["DRAFT", "SENT", "CONFIRMED"].includes(po.status)) po.status = "CANCELLED";
    else if (params.op === "close" && po.status === "RECEIVED") po.status = "CLOSED";
    else if (params.op === "receive" && ["SENT", "CONFIRMED", "PARTIALLY_RECEIVED"].includes(po.status)) {
      const { received, invoiceNumber } = await body<{ received: Record<string, string>; invoiceNumber?: string }>();
      for (const l of po.lines) {
        const got = Number(received?.[l.id] ?? 0);
        if (got < 0 || got > l.quantity - l.receivedQuantity) throw validationError({ [`received.${l.id}`]: ["validation.amountRange"] });
        if (got > 0) move({ type: "RECEIPT", warehouseId: po.warehouseId, variantId: l.variantId, baseQuantity: got, direction: "IN", actorName: fullName(ctx.user), relatedDocument: po.number, unitCostCents: l.unitCostCents, reason: db.suppliers.find((s) => s.id === po.supplierId)?.name });
        l.receivedQuantity += got;
      }
      if (invoiceNumber) po.invoiceNumber = invoiceNumber;
      po.status = po.lines.every((l) => l.receivedQuantity >= l.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED";
    } else throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    audit(ctx, params.op, "purchases", po.id, po.number, [{ field: "status", from: before, to: po.status }]);
    return purchaseDto(po);
  }),

  ...crud("/admin/suppliers", {
    perm: "purchases",
    get: () => db.suppliers,
    set: (x) => (db.suppliers = x),
    toDto: (s) => ({ ...s, debt: money(s.debtCents), productCount: new Set(db.purchases.filter((p) => p.supplierId === s.id).flatMap((p) => p.lines.map((l) => l.variantId))).size, purchaseCount: db.purchases.filter((p) => p.supplierId === s.id).length }),
    label: (s) => s.name,
    search: (s) => `${s.name} ${s.voen}`,
    validate: (b, rec) => (b.voen !== undefined && !/^\d{10}$/.test(String(b.voen)) ? { voen: ["validation.voen"] } : rec ? null : required(b, "name", "voen", "contactName", "phone")),
    create: (b) => ({ id: newId("sup"), name: String(b.name), voen: String(b.voen), contactName: String(b.contactName), phone: String(b.phone), email: String(b.email ?? ""), paymentTerms: String(b.paymentTerms ?? "Ön ödəniş"), productIds: [], debtCents: 0, active: true }),
    beforeDelete: (s) => inUse(db.purchases.some((p) => p.supplierId === s.id)),
  }),

  route.get("/admin/costing-methods", ({ ctx }) => {
    requirePerm(ctx, "finance_reports:view", "inventory:view");
    return db.costingRules.map((r) => ({ ...r, targetName: r.level === "COMPANY" ? L("Şirkət standartı", "Стандарт компании", "Company default") : r.level === "CATEGORY" ? db.productCategories.find((c) => c.id === r.targetId)?.name : r.level === "WAREHOUSE_GROUP" ? db.warehouseGroups.find((g) => g.id === r.targetId)?.name : db.products.find((p) => p.id === r.targetId)?.name }));
  }),

  route.post("/admin/costing-methods", async ({ ctx, body }) => {
    requirePerm(ctx, "finance_reports:edit");
    const b = await body<{ level: "PRODUCT" | "CATEGORY" | "WAREHOUSE_GROUP" | "COMPANY"; targetId: string | null; method: "WEIGHTED_AVERAGE" | "FIFO" }>();
    if (b.level !== "COMPANY" && !b.targetId) throw validationError({ targetId: ["validation.required"] });
    const existing = db.costingRules.find((r) => r.level === b.level && r.targetId === (b.targetId ?? null));
    // Metod dəyişikliyi növbəti hesabat dövrünün əvvəlindən qüvvəyə minir (§40.4)
    const next = new Date();
    next.setUTCMonth(next.getUTCMonth() + 1, 1);
    next.setUTCHours(0, 0, 0, 0);
    if (existing) { audit(ctx, "edit", "costing_methods", existing.id, `${b.level}`, [{ field: "method", from: existing.method, to: b.method }]); existing.method = b.method; existing.effectiveFrom = next.toISOString(); existing.updatedBy = fullName(ctx.user); return existing; }
    const rec = { id: newId("cost"), level: b.level, targetId: b.targetId ?? null, method: b.method, effectiveFrom: next.toISOString(), updatedBy: fullName(ctx.user) };
    db.costingRules.push(rec);
    audit(ctx, "create", "costing_methods", rec.id, b.level);
    return rec;
  }),

  route.delete("/admin/costing-methods/:id", ({ ctx, params }) => {
    requirePerm(ctx, "finance_reports:edit");
    const r = find(db.costingRules, params.id);
    if (r.level === "COMPANY") throw apiError(409, "COMPANY_DEFAULT_REQUIRED", "error.actionNotAllowed");
    db.costingRules = db.costingRules.filter((x) => x !== r);
    return undefined;
  }),

  /* ---------------- Abunəlik (§41) ---------------- */
  route.get("/admin/subscription-plans", ({ ctx }) => {
    requirePerm(ctx, "subscription_plans:view");
    return { plans: db.plans.map(planDto), entitlementDefinitions: db.entitlementDefinitions };
  }),

  route.patch("/admin/subscription-plans/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "subscription_plans:edit");
    const p = find(db.plans, params.id);
    const b = await body<Record<string, unknown>>();
    if (b.prices) for (const pr of b.prices as { price: { amount: string } }[]) if (!(Number(pr.price.amount) >= 0)) throw validationError({ prices: ["validation.positive"] });
    if (b.entitlements) {
      for (const [code, v] of Object.entries(b.entitlements as Record<string, unknown>)) {
        const def = db.entitlementDefinitions.find((d) => d.code === code);
        if (def?.valueType === "NUMBER" && !(Number(v) >= 0)) throw validationError({ [`entitlements.${code}`]: ["validation.number"] });
      }
    }
    const changes = applyPatch(p, b);
    p.updatedAt = nowIso();
    audit(ctx, "edit", "subscription_plans", p.id, p.code, changes);
    return planDto(p);
  }),

  route.post("/admin/subscription-plans", async ({ ctx, body }) => {
    requirePerm(ctx, "subscription_plans:create", "subscription_plans:edit");
    const b = await body<Record<string, unknown>>();
    const errors = required(b, "code", "nameI18n", "group");
    if (errors) throw validationError(errors);
    if (db.plans.some((p) => p.code === b.code)) throw validationError({ code: ["validation.alreadyExists"] });
    const template = db.plans.find((p) => p.group === b.group) ?? db.plans[0]!;
    const plan = { ...structuredClone(template), id: newId("plan"), code: String(b.code).toUpperCase(), name: b.nameI18n as never, description: (b.descriptionI18n as never) ?? L(""), tier: Number(b.tier ?? template.tier + 1), visibility: "INVITE_ONLY" as const, highlight: false, updatedAt: nowIso() };
    db.plans.push(plan);
    audit(ctx, "create", "subscription_plans", plan.id, plan.code);
    return planDto(plan);
  }),

  route.get("/admin/subscriptions", ({ ctx, url }) => {
    requirePerm(ctx, "subscription_plans:view");
    return list(url, db.subscriptions.map(subscriptionDto), { search: (s) => `${s.subscriberName} ${s.planCode}`, defaultSort: "currentPeriodEnd" });
  }),

  /* ---------------- Maliyyə (§47–51) ---------------- */
  route.get("/admin/payments", ({ ctx, url }) => {
    requirePerm(ctx, "payments:view");
    return list(url, db.payments.map((p) => paymentDto(p, ctx)), { search: (p) => `${p.number} ${p.orderNumber} ${p.payerName}`, defaultSort: "-createdAt" });
  }),

  route.post("/admin/payments/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "payments:edit");
    const p = find(db.payments, params.id);
    const { amount, reason } = await body<{ amount?: string; reason?: string }>();
    if (!paymentDto(p, ctx).availableActions.some((a) => a.code === params.op)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (params.op === "refund") {
      if (!reason) throw validationError({ reason: ["validation.required"] });
      const cents = amount ? Math.round(Number(amount) * 100) : p.amountCents - p.refundedCents;
      if (!(cents > 0) || cents > p.amountCents - p.refundedCents) throw validationError({ amount: ["validation.amountRange"] });
      p.refundedCents += cents;
      p.status = p.refundedCents >= p.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
      issueDocument({ type: "FISCAL_RECEIPT", ownerId: p.payerId, counterpartyName: p.payerName, counterpartyVoen: null, orderType: p.orderType === "B2B_INVOICE" ? "B2B" : p.orderType, orderId: p.orderId, orderNumber: p.orderNumber, lines: [{ name: L(`Qaytarma çeki — ${p.number}`), quantity: "1", unit: "pcs", unitCents: -cents, vatRate: 18 }], vatIncluded: true, meta: { refund: "true", reason } });
      // Geri ödəniş olunmuş sifarişlər üzrə hesablaşma düzəlişi (§51.3)
      const line = db.settlementLines.find((l) => l.orderId === p.orderId);
      if (line) line.deductions.push({ kind: "REFUND_ADJUSTMENT", label: L("Geri ödəniş düzəlişi"), cents: Math.round(cents * 0.7) });
      const com = db.commissions.find((c) => c.orderId === p.orderId);
      if (com) com.status = com.status === "PAID" ? "PAID" : "CANCELLED";
    }
    if (params.op === "mark_paid") { p.status = "PAID"; onPaymentPaid(p); }
    if (params.op === "cancel") p.status = "CANCELLED";
    audit(ctx, params.op, "payments", p.id, p.number, [{ field: "status", from: null, to: p.status }], reason);
    return paymentDto(p, ctx);
  }),

  route.get("/admin/documents", ({ ctx, url }) => {
    requirePerm(ctx, "payments:view", "finance_reports:view", "sales_orders:view");
    return list(url, db.documents.map((d) => documentDto(d, ctx)), { search: (d) => `${d.number} ${d.counterpartyName} ${d.orderNumber ?? ""}`, dateField: "issuedAt", defaultSort: "-issuedAt", defaultPageSize: 25 });
  }),

  route.post("/admin/documents/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "payments:edit");
    const d = find(db.documents, params.id);
    const { reason } = await body<{ reason?: string }>();
    // Verilmiş sənəd silinmir — ləğv və ya düzəliş sənədi ilə düzəldilir (§49.3)
    if (params.op === "cancel_document") {
      if (!reason) throw validationError({ reason: ["validation.required"] });
      d.status = "CANCELLED";
    } else if (params.op === "issue_correction") {
      d.status = "CORRECTED";
      const corr = issueDocument({ type: d.type, ownerId: d.ownerId, counterpartyName: d.counterpartyName, counterpartyVoen: d.counterpartyVoen, orderType: d.orderType, orderId: d.orderId, orderNumber: d.orderNumber, lines: d.lines, vatIncluded: d.vatIncluded, meta: { ...d.meta, correction: "true" } });
      corr.correctionOf = d.number;
    } else if (params.op === "resend") {
      d.syncStatus = "SENT";
    } else notFound();
    audit(ctx, params.op, "documents", d.id, d.number, [], reason);
    return documentDto(d, ctx);
  }),

  route.get("/admin/cash-desks", ({ ctx }) => {
    requirePerm(ctx, "payments:view");
    return db.cashDesks.map((d) => ({ ...d, balance: money(d.balanceCents), limit: d.limitCents ? money(d.limitCents) : null, overLimit: !!d.limitCents && d.balanceCents > d.limitCents, pendingHandover: money(d.pendingHandoverCents), branchName: branchName(d.branchId), operations: db.cashOperations.filter((o) => o.deskId === d.id).slice(0, 15).map((o) => ({ ...o, amount: money(o.amountCents) })) }));
  }),

  route.post("/admin/cash-desks/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "payments:edit");
    const desk = find(db.cashDesks, params.id);
    const b = await body<{ operationId?: string; countedAmount?: string; note?: string }>();
    const actor = fullName(ctx.user);
    if (params.op === "confirm_handover") {
      const op = db.cashOperations.find((o) => o.id === b.operationId && o.deskId === desk.id && o.status === "PENDING");
      if (!op) notFound();
      const counted = b.countedAmount !== undefined ? Math.round(Number(b.countedAmount) * 100) : op.amountCents;
      const branchDesk = db.cashDesks.find((x) => x.type === "BRANCH" && x.branchId === desk.branchId) ?? db.cashDesks[0]!;
      desk.balanceCents -= op.amountCents;
      desk.pendingHandoverCents = Math.max(0, desk.pendingHandoverCents - op.amountCents);
      branchDesk.balanceCents += counted;
      op.status = counted === op.amountCents ? "CONFIRMED" : "DISPUTED";
      db.cashOperations.unshift({ id: newId("cashop"), deskId: branchDesk.id, kind: "HANDOVER_CONFIRMED", amountCents: counted, orderNumber: null, fiscalNumber: null, actorName: actor, at: nowIso(), status: "CONFIRMED", note: desk.holderName });
      if (counted !== op.amountCents) {
        // Uyğunsuzluq: fərq aktı yaradılır, menecer təsdiqləyir (§50)
        db.cashOperations.unshift({ id: newId("cashop"), deskId: desk.id, kind: "DISCREPANCY", amountCents: op.amountCents - counted, orderNumber: null, fiscalNumber: null, actorName: actor, at: nowIso(), status: "PENDING", note: b.note ?? "Fərq aktı" });
        notify(db.users.find((u) => u.roles.includes("MANAGER"))?.id, "CASH_DISCREPANCY", "notif.paymentFail", L(`${desk.holderName}: kassa təhvilində ${money(op.amountCents - counted).amount} AZN fərq`), "/cash-desks");
      }
    } else if (params.op === "open_shift") {
      desk.shiftStatus = "OPEN"; desk.shiftOpenedAt = nowIso();
      db.cashOperations.unshift({ id: newId("cashop"), deskId: desk.id, kind: "SHIFT_OPEN", amountCents: desk.balanceCents, orderNumber: null, fiscalNumber: null, actorName: actor, at: nowIso(), status: "CONFIRMED", note: null });
    } else if (params.op === "close_shift") {
      desk.shiftStatus = "CLOSED";
      db.cashOperations.unshift({ id: newId("cashop"), deskId: desk.id, kind: "SHIFT_CLOSE", amountCents: desk.balanceCents, orderNumber: null, fiscalNumber: null, actorName: actor, at: nowIso(), status: "CONFIRMED", note: "Gün sonu hesabatı" });
    } else notFound();
    audit(ctx, params.op, "cash_desks", desk.id, desk.holderName);
    return { ok: true };
  }),

  route.get("/admin/technician-settlements", ({ ctx, url }) => {
    requirePerm(ctx, "technician_settlements:view");
    const groups = new Map<string, { id: string; technicianId: string; technicianName: string; period: string; lines: typeof db.settlementLines }>();
    for (const l of db.settlementLines) {
      const key = `${l.technicianId}:${l.period}`;
      if (!groups.has(key)) groups.set(key, { id: key, technicianId: l.technicianId, technicianName: fullName(db.users.find((u) => u.id === l.technicianId)), period: l.period, lines: [] });
      groups.get(key)!.lines.push(l);
    }
    const rows = [...groups.values()].map((g) => {
      const gross = g.lines.reduce((s, l) => s + l.laborCents + l.ownMaterialCents, 0);
      const ded = g.lines.reduce((s, l) => s + l.deductions.reduce((d, x) => d + x.cents, 0), 0);
      const statuses = new Set(g.lines.map((l) => l.status));
      const status = statuses.size === 1 ? [...statuses][0]! : statuses.has("PENDING") ? "PENDING" : statuses.has("APPROVED") ? "APPROVED" : "ON_HOLD";
      const actions = [];
      if (can(ctx, "technician_settlements:approve") && g.lines.some((l) => l.status === "PENDING")) actions.push({ code: "approve", variant: "primary" as const });
      if (can(ctx, "technician_settlements:edit") && g.lines.some((l) => l.status === "APPROVED")) actions.push({ code: "pay", variant: "primary" as const });
      return { ...g, status, lineCount: g.lines.length, gross: money(gross), deductions: money(ded), payable: money(gross - ded), approvedBy: g.lines.find((l) => l.approvedBy)?.approvedBy ?? null, paidAt: g.lines.find((l) => l.paidAt)?.paidAt ?? null, lines: g.lines.map((l) => ({ ...l, laborAmount: money(l.laborCents), ownMaterialAmount: money(l.ownMaterialCents), deductions: l.deductions.map((d) => ({ ...d, amount: money(d.cents) })), payable: money(l.laborCents + l.ownMaterialCents - l.deductions.reduce((d, x) => d + x.cents, 0)) })), availableActions: actions };
    });
    return list(url, rows, { search: (r) => r.technicianName, defaultSort: "-period" });
  }),

  route.post("/admin/technician-settlements/:key/:op", async ({ ctx, params, body }) => {
    const [techId, period] = decodeURIComponent(params.key).split(":");
    const { lineId, reason } = await body<{ lineId?: string; reason?: string }>();
    const lines = db.settlementLines.filter((l) => l.technicianId === techId && l.period === period && (!lineId || l.id === lineId));
    if (!lines.length) notFound();
    const actor = fullName(ctx.user);
    if (params.op === "approve") { requirePerm(ctx, "technician_settlements:approve"); lines.filter((l) => l.status === "PENDING").forEach((l) => { l.status = "APPROVED"; l.approvedBy = actor; }); }
    else if (params.op === "pay") {
      requirePerm(ctx, "technician_settlements:edit");
      const paying = lines.filter((l) => l.status === "APPROVED");
      if (!paying.length) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
      paying.forEach((l) => { l.status = "PAID"; l.paidAt = nowIso(); });
      issueDocument({ type: "SETTLEMENT_ACT", ownerId: techId!, counterpartyName: fullName(db.users.find((u) => u.id === techId)), counterpartyVoen: null, orderType: "SETTLEMENT", orderId: null, orderNumber: `${period}`, lines: paying.map((l) => ({ name: L(`${l.orderNumber} — iş haqqı`), quantity: "1", unit: "pcs", unitCents: l.laborCents + l.ownMaterialCents - l.deductions.reduce((d, x) => d + x.cents, 0), vatRate: 0 })), vatIncluded: true, meta: { period: period! } });
      notify(techId, "SETTLEMENT_PAID", "notif.paymentOk", L(`${period} dövrü üzrə hesablaşma ödənildi`, `Выплата за ${period} произведена`, `Settlement for ${period} paid`), "/technician/earnings", "EMAIL");
    } else if (params.op === "hold") {
      requirePerm(ctx, "technician_settlements:edit");
      if (!reason) throw validationError({ reason: ["validation.required"] });
      lines.forEach((l) => { l.status = "ON_HOLD"; l.holdReason = reason; });
    } else if (params.op === "release") { requirePerm(ctx, "technician_settlements:edit"); lines.filter((l) => l.status === "ON_HOLD").forEach((l) => { l.status = "PENDING"; l.holdReason = null; }); }
    else notFound();
    audit(ctx, params.op, "technician_settlements", `${techId}:${period}`, `${fullName(db.users.find((u) => u.id === techId))} — ${period}`, [], reason);
    return { ok: true };
  }),

  route.get("/admin/partner-commissions", ({ ctx, url }) => {
    requirePerm(ctx, "partner_commissions:view");
    const rows = db.commissions.map((c) => ({ ...c, partnerName: db.b2bAccounts.find((b) => b.id === c.partnerId)?.legalName ?? "—", base: money(c.baseCents), amount: money(c.amountCents), availableActions: [...(c.status === "PENDING" ? [{ code: "approve", variant: "primary" }, { code: "cancel", variant: "destructive" }] : []), ...(c.status === "APPROVED" ? [{ code: "pay", variant: "primary" }] : [])] }));
    return list(url, rows, { search: (r) => `${r.partnerName} ${r.orderNumber}`, defaultSort: "-createdAt" });
  }),

  route.post("/admin/partner-commissions/:id/:op", ({ ctx, params }) => {
    requirePerm(ctx, "partner_commissions:edit");
    const c = find(db.commissions, params.id);
    const map: Record<string, [string, typeof c.status]> = { approve: ["PENDING", "APPROVED"], pay: ["APPROVED", "PAID"], cancel: ["PENDING", "CANCELLED"] };
    const rule = map[params.op];
    if (!rule || c.status !== rule[0]) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    c.status = rule[1];
    if (rule[1] === "PAID") c.paidAt = nowIso();
    audit(ctx, params.op, "partner_commissions", c.id, c.orderNumber);
    return { ok: true };
  }),

  route.get("/admin/finance", ({ ctx }) => {
    requirePerm(ctx, "finance_reports:view");
    const paid = db.payments.filter((p) => ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status));
    const sum = (f: (p: (typeof paid)[number]) => boolean) => paid.filter(f).reduce((s, p) => s + p.amountCents, 0);
    const refunds = db.payments.reduce((s, p) => s + p.refundedCents, 0);
    const revenue = sum(() => true) - refunds;
    const expenses = Math.round(revenue * 0.58);
    return {
      period: periodLabel(),
      revenue: money(revenue),
      expenses: money(expenses),
      profit: money(revenue - expenses),
      serviceRevenue: money(sum((p) => p.orderType === "SERVICE")),
      salesRevenue: money(sum((p) => p.orderType === "SALES")),
      subscriptionRevenue: money(sum((p) => p.orderType === "SUBSCRIPTION") + db.subscriptions.filter((s) => s.status === "ACTIVE").reduce((s, x) => s + x.priceCents, 0)),
      refunds: money(refunds),
      receivables: money(db.b2bAccounts.reduce((s, c) => s + c.debtCents, 0)),
      payables: money(db.suppliers.reduce((s, x) => s + x.debtCents, 0)),
      cashOnHand: money(db.cashDesks.reduce((s, d) => s + d.balanceCents, 0)),
      bankBalance: money(18754300),
      vatPayable: money(Math.round(revenue - revenue / 1.18) - Math.round(expenses * 0.12)),
      settlementsPending: money(db.settlementLines.filter((l) => l.status !== "PAID").reduce((s, l) => s + l.laborCents + l.ownMaterialCents, 0)),
      revenueByMonth: [5, 4, 3, 2, 1, 0].map((m) => { const label = periodLabel(new Date(daysAgo(m * 30))); const inMonth = paid.filter((p) => periodLabel(new Date(p.paidAt ?? p.createdAt)) === label); return { month: label, service: inMonth.filter((p) => p.orderType === "SERVICE").reduce((s, p) => s + p.amountCents / 100, 0) + 3200 * (6 - m), sales: inMonth.filter((p) => p.orderType === "SALES").reduce((s, p) => s + p.amountCents / 100, 0) + 5400 * (6 - m), subscriptions: 900 + 120 * (6 - m) }; }),
      expensesByCategory: [{ name: L("Alışlar", "Закупки", "Purchases"), value: Math.round(expenses * 0.55) / 100 }, { name: L("Əmək haqqı", "Зарплата", "Payroll"), value: Math.round(expenses * 0.25) / 100 }, { name: L("Usta hesablaşmaları", "Выплаты мастерам", "Technician settlements"), value: Math.round(expenses * 0.1) / 100 }, { name: L("Logistika", "Логистика", "Logistics"), value: Math.round(expenses * 0.06) / 100 }, { name: L("Digər", "Прочее", "Other"), value: Math.round(expenses * 0.04) / 100 }],
      receivablesAging: [{ bucket: "0–30", amount: 12400 }, { bucket: "31–60", amount: 4350 }, { bucket: "61–90", amount: 1890 }, { bucket: "90+", amount: 0 }],
      accountingExport: { adapter: "AccountingExporter", lastExportAt: daysAgo(1), statuses: { NOT_SENT: db.documents.filter((d) => d.syncStatus === "NOT_SENT").length, SENT: db.documents.filter((d) => d.syncStatus === "SENT").length, FAILED: 0, ACKNOWLEDGED: 0 } },
    };
  }),

  ...crud("/admin/tax-settings", {
    perm: "finance_reports",
    get: () => db.taxSettings,
    set: (x) => (db.taxSettings = x),
    label: (t) => t.name,
    validate: (b) => (b.rate !== undefined && !(Number(b.rate) >= 0 && Number(b.rate) <= 100) ? { rate: ["validation.percent"] } : null),
    create: (b) => ({ id: newId("tax"), name: String(b.name), rate: String(b.rate ?? "0"), appliesTo: String(b.appliesTo ?? ""), exempt: !!b.exempt, b2cIncluded: true, b2bSeparate: true, active: true }),
  }),

  /* ---------------- Kommunikasiya ---------------- */
  ...crud("/admin/notification-templates", {
    perm: "notification_templates",
    get: () => db.notificationTemplates,
    set: (x) => (db.notificationTemplates = x),
    label: (t) => `${t.event}:${t.channel}`,
    defaultSort: "event",
    validate: (b) => {
      for (const k of ["body", "bodyI18n"]) { const v = b[k] as { az?: string } | undefined; if (v && !v.az) return { [k]: ["validation.required"] }; }
      return null;
    },
    create: (b) => ({ id: newId("ntpl"), event: String(b.event), channel: b.channel as never, recipient: String(b.recipient ?? "CUSTOMER"), subject: (b.subject as never) ?? L(""), body: (b.body as never) ?? L(""), variables: ["orderNumber", "customerName", "serviceName", "link"], active: true, mandatory: false, updatedAt: nowIso() }),
    beforeDelete: (t) => inUse(t.mandatory),
  }),

  route.get("/admin/reviews", ({ ctx, url }) => {
    requirePerm(ctx, "reviews:view");
    const rows = db.reviews.map((r) => ({ ...r, targetName: r.target === "TECHNICIAN" ? fullName(db.users.find((u) => u.id === r.targetId)) : r.target === "SERVICE" ? db.services.find((s) => s.id === r.targetId)?.name : db.products.find((p) => p.id === r.targetId)?.name, orderNumber: r.orderId ? db.serviceOrders.find((o) => o.id === r.orderId)?.number ?? null : null, availableActions: [...(r.status === "PENDING" ? [{ code: "publish", variant: "primary" }, { code: "reject", variant: "destructive" }] : []), ...(!r.reply ? [{ code: "reply" }] : [])] }));
    return list(url, rows, { search: (r) => `${r.authorName} ${r.comment}`, defaultSort: "-createdAt" });
  }),

  route.post("/admin/reviews/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "reviews:edit");
    const r = find(db.reviews, params.id);
    const { reply } = await body<{ reply?: string }>();
    if (params.op === "publish") r.status = "PUBLISHED";
    else if (params.op === "reject") r.status = "REJECTED";
    else if (params.op === "reply") { if (!reply) throw validationError({ reply: ["validation.required"] }); r.reply = reply; }
    else if (params.op === "dismiss_report") r.reported = false;
    else notFound();
    audit(ctx, params.op, "reviews", r.id, r.authorName);
    return r;
  }),

  /* ---------------- Sayt məzmunu ---------------- */
  ...crud("/admin/content/pages", { perm: "content", get: () => db.contentPages, set: (x) => (db.contentPages = x), label: (p) => p.slug, validate: (b, rec) => (rec ? null : required(b, "slug", "titleI18n")), create: (b) => ({ id: newId("page"), slug: String(b.slug), title: b.title as never, body: (b.body as never) ?? L(""), status: "DRAFT", updatedAt: nowIso() }) }),
  ...crud("/admin/content/faq", { perm: "content", get: () => db.faq, set: (x) => (db.faq = x), defaultSort: "order", validate: (b, rec) => (rec ? null : required(b, "questionI18n", "answerI18n", "category")), create: (b) => ({ id: newId("faq"), category: String(b.category), question: b.question as never, answer: b.answer as never, order: db.faq.length + 1, status: "DRAFT" as const }) }),
  ...crud("/admin/content/banners", { perm: "content", get: () => db.banners, set: (x) => (db.banners = x), validate: (b, rec) => (rec ? null : required(b, "titleI18n", "placement", "ctaHref")), create: (b) => ({ id: newId("banner"), placement: String(b.placement), title: b.title as never, subtitle: (b.subtitle as never) ?? L(""), ctaLabel: (b.ctaLabel as never) ?? L("Ətraflı", "Подробнее", "Learn more"), ctaHref: String(b.ctaHref), tone: String(b.tone ?? "primary"), activeFrom: nowIso(), activeTo: null, status: "DRAFT" }) }),

  /* ---------------- Təşkilat ---------------- */
  ...crud("/admin/branches", {
    perm: "branches",
    get: () => db.branches,
    set: (x) => (db.branches = x),
    toDto: (b) => ({ ...b, warehouseIds: db.warehouses.filter((w) => w.branchId === b.id).map((w) => w.id), warehouseCount: db.warehouses.filter((w) => w.branchId === b.id).length, zoneIds: db.zones.filter((z) => z.branchId === b.id).map((z) => z.id), employeeCount: db.users.filter((u) => u.branchId === b.id).length, openOrders: db.serviceOrders.filter((o) => o.branchId === b.id && !["CLOSED", "CANCELLED"].includes(o.status)).length }),
    label: (b) => b.code,
    validate: (b, rec) => (rec ? null : required(b, "code", "nameI18n", "city", "address", "phone")),
    create: (b) => ({ id: newId("branch"), code: String(b.code), name: b.name as never, city: String(b.city), address: String(b.address), location: (b.location as never) ?? { lat: 40.4, lng: 49.86 }, phone: String(b.phone), email: String(b.email ?? ""), workingHours: db.branches[0]!.workingHours, hasServiceCenter: !!b.hasServiceCenter, managerName: String(b.managerName ?? ""), active: true }),
    beforeDelete: (b) => inUse(db.warehouses.some((w) => w.branchId === b.id) || db.users.some((u) => u.branchId === b.id)),
  }),

  ...crud("/admin/service-zones", {
    perm: "branches",
    get: () => db.zones,
    set: (x) => (db.zones = x),
    toDto: (z) => ({ ...z, branchName: branchName(z.branchId), technicianCount: db.technicians.filter((t) => t.zoneIds.includes(z.id)).length }),
    validate: (b, rec) => (b.polygon && (b.polygon as unknown[]).length < 3 ? { polygon: ["validation.polygon"] } : rec ? null : required(b, "nameI18n", "branchId", "city")),
    create: (b) => ({ id: newId("zone"), name: b.name as never, branchId: String(b.branchId), city: String(b.city), polygon: (b.polygon as never) ?? [], outOfCity: !!b.outOfCity, active: true }),
  }),

  route.get("/admin/settings", ({ ctx }) => {
    requirePerm(ctx, "settings:view");
    return db.settings;
  }),

  route.put("/admin/settings", async ({ ctx, body }) => {
    requirePerm(ctx, "settings:edit");
    const b = await body<Record<string, unknown>>();
    if (b.offerResponseMinutes !== undefined && !(Number(b.offerResponseMinutes) > 0)) throw validationError({ offerResponseMinutes: ["validation.positive"] });
    if (b.estimateValidityDays !== undefined && !(Number(b.estimateValidityDays) > 0)) throw validationError({ estimateValidityDays: ["validation.positive"] });
    const changes = applyPatch(db.settings, b);
    audit(ctx, "edit", "settings", "org", "Təşkilat ayarları", changes);
    return db.settings;
  }),

  route.get("/admin/branding", ({ ctx }) => {
    requirePerm(ctx, "settings:view");
    return db.branding;
  }),

  route.put("/admin/branding", async ({ ctx, body }) => {
    requirePerm(ctx, "settings:edit");
    const b = await body<Record<string, unknown>>();
    const colors = b.colors as Record<string, string> | undefined;
    if (colors) for (const [k, v] of Object.entries(colors)) if (!/^#[0-9a-f]{6}$/i.test(v)) throw validationError({ [`colors.${k}`]: ["validation.color"] });
    const changes = applyPatch(db.branding, b);
    audit(ctx, "edit", "settings", "branding", "Brend ayarları", changes);
    return db.branding;
  }),

  route.get("/admin/integrations", ({ ctx }) => {
    requirePerm(ctx, "integrations:view");
    return db.integrations;
  }),

  route.patch("/admin/integrations/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "integrations:edit");
    const i = find(db.integrations, params.id);
    const b = await body<{ active?: boolean; primary?: boolean; mode?: "SANDBOX" | "LIVE"; apiKey?: string }>();
    // Gizli açarlar şifrələnir və UI-da göstərilmir (Əlavə E.1)
    if (b.apiKey) { i.maskedKey = `${b.apiKey.slice(0, 3)}_****${b.apiKey.slice(-4)}`; i.configured = true; }
    if (b.primary) db.integrations.filter((x) => x.area === i.area).forEach((x) => (x.primary = false));
    if (b.mode === "LIVE" && !i.configured) throw validationError({ mode: ["validation.integrationNotConfigured"] });
    applyPatch(i, { active: b.active ?? i.active, primary: b.primary ?? i.primary, mode: b.mode ?? i.mode });
    audit(ctx, "edit", "integrations", i.id, `${i.area}:${i.provider}`, [{ field: "config", from: null, to: JSON.stringify({ ...b, apiKey: b.apiKey ? "****" : undefined }) }]);
    return i;
  }),

  route.post("/admin/integrations/:id/test", ({ ctx, params }) => {
    requirePerm(ctx, "integrations:view");
    const i = find(db.integrations, params.id);
    const ok = i.configured && i.health !== "DOWN";
    i.lastEventAt = nowIso();
    return { ok, latencyMs: ok ? 180 + (i.id.charCodeAt(0) % 200) : null, message: ok ? L("Bağlantı uğurludur", "Соединение успешно", "Connection successful") : L("Açar konfiqurasiya olunmayıb", "Ключ не настроен", "Key is not configured") };
  }),

  route.get("/admin/lookups", ({ ctx }) => {
    requireAuth(ctx);
    return {
      branches: db.branches.map((b) => ({ id: b.id, name: b.name })),
      warehouses: db.warehouses.map((w) => ({ id: w.id, name: w.name, type: w.type, blocked: db.stockCounts.some((sc) => sc.warehouseId === w.id && sc.blockMovements && sc.status === "IN_PROGRESS") })),
      categories: db.productCategories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
      equipmentCategories: db.equipmentCategories.map((c) => ({ id: c.id, name: c.name })),
      brands: db.brands.map((b) => ({ id: b.id, name: b.name })),
      models: db.models.map((m) => ({ id: m.id, name: `${db.brands.find((b) => b.id === m.brandId)?.name} ${m.name}`, code: m.code, seriesId: m.seriesId })),
      series: db.series.map((s) => ({ id: s.id, name: `${db.brands.find((b) => b.id === s.brandId)?.name} ${s.name}` })),
      units: db.units.map((u) => ({ code: u.code, name: u.name, short: u.short })),
      specializations: db.specializations.map((s) => ({ id: s.id, name: specName(s.id) })),
      templates: db.templates.map((t) => ({ id: t.id, name: t.name, executionForm: t.executionForm })),
      suppliers: db.suppliers.map((s) => ({ id: s.id, name: s.name })),
      plans: db.plans.map((p) => ({ id: p.id, code: p.code, name: p.name, group: p.group })),
      partnerTypes: db.partnerTypes.map((p) => ({ id: p.id, name: p.name })),
      variants: db.products.flatMap((p) => p.variants.map((v) => ({ id: v.id, sku: v.sku, barcode: v.barcode, name: p.name, baseUnit: p.baseUnit, units: [p.baseUnit, ...p.conversions.map((c) => c.unit)] }))),
      services: db.services.map((s) => ({ id: s.id, name: s.name, executionForms: s.executionForms })),
      customers: db.users.filter((u) => u.roles.includes("CUSTOMER")).map((u) => ({ id: u.id, name: fullName(u), phone: u.phone })),
      reasonCodes: db.reasonCodes.filter((r) => r.active).map((r) => ({ code: r.code, category: r.category, label: r.label })),
      attributes: db.attributes.map((a) => ({ code: a.code, name: a.name, type: a.type })),
      promotions: db.promotions.map((p) => ({ code: p.code, name: p.name })),
      ticketCategories: db.ticketCategories.map((c) => ({ id: c.id, name: c.name })),
      hiddenProducts: db.products.filter((p) => !productVisible(p, { ...ctx, priceType: "RETAIL" })).length,
      attributeOptions: db.attributes.map((a) => ({ code: a.code, options: a.options.map((o) => ({ value: o.value, label: attributeDisplay(a.code, o.value) })) })),
    };
  }),
];

function stockCountDto(sc: (typeof db.stockCounts)[number]) {
  const lines = sc.lines.map((l) => {
    const found = findVariant(l.variantId)!;
    return { id: l.id, variantId: l.variantId, productName: found.product.name, sku: found.variant.sku, system: qty(l.system, found.product.baseUnit, 3), counted: l.counted !== null ? qty(l.counted, found.product.baseUnit, 3) : null, difference: l.counted !== null ? qty(l.counted - l.system, found.product.baseUnit, 3) : null };
  });
  const counted = sc.lines.filter((l) => l.counted !== null);
  const accurate = counted.filter((l) => l.counted === l.system).length;
  const next: Record<string, string[]> = { DRAFT: ["start", "cancel"], IN_PROGRESS: ["submit", "cancel"], PENDING_APPROVAL: ["approve"] };
  return { ...sc, warehouseName: warehouseName(sc.warehouseId), lines, accuracy: counted.length ? Math.round((accurate / counted.length) * 1000) / 10 : null, progress: sc.lines.length ? Math.round((counted.length / sc.lines.length) * 100) : 0, availableActions: (next[sc.status] ?? []).map((code) => ({ code, variant: code === "cancel" ? "destructive" : "primary" })) };
}

function purchaseDto(po: (typeof db.purchases)[number]) {
  const next: Record<string, string[]> = { DRAFT: ["send", "cancel"], SENT: ["confirm", "receive", "cancel"], CONFIRMED: ["receive", "cancel"], PARTIALLY_RECEIVED: ["receive"], RECEIVED: ["close"] };
  const lines = po.lines.map((l) => { const found = findVariant(l.variantId)!; return { id: l.id, variantId: l.variantId, productName: found.product.name, sku: found.variant.sku, quantity: qty(l.quantity, found.product.baseUnit), receivedQuantity: qty(l.receivedQuantity, found.product.baseUnit), remaining: l.quantity - l.receivedQuantity, unitCost: money(l.unitCostCents), total: money(l.unitCostCents * l.quantity) }; });
  return { ...po, supplierName: db.suppliers.find((s) => s.id === po.supplierId)?.name ?? "—", warehouseName: warehouseName(po.warehouseId), lines, total: money(po.lines.reduce((s, l) => s + l.unitCostCents * l.quantity, 0)), availableActions: (next[po.status] ?? []).map((code) => ({ code, variant: code === "cancel" ? "destructive" : "primary" })) };
}
