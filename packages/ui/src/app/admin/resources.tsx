"use client";
import React from "react";
import { useI18n } from "../core/i18n";
import { Link } from "../core/router";
import { EnumBadge, KeyValue, Stars } from "../kit/base";
import { ResourcePage, type ResourceConfig } from "./crud";

/**
 * Sadə konfiqurasiya resursları (PRD §61): kataloq, qiymət, anbar lüğətləri, maliyyə, kommunikasiya, məzmun, təşkilat.
 * Hər biri eyni server-side cədvəl + forma mühərrikindən istifadə edir.
 */

export type ResourceKey =
  | "services" | "feeRules" | "reasonCodes" | "b2bAccounts" | "partnerTypes" | "categories" | "brands" | "series" | "models" | "attributes" | "units"
  | "priceLists" | "promotions" | "warehouses" | "warehouseGroups" | "suppliers" | "taxSettings" | "notificationTemplates" | "pages" | "faq" | "banners"
  | "branches" | "zones" | "kpiTargets" | "subscriptions" | "payments" | "invoices" | "fiscalReceipts" | "reservations" | "commissions" | "reviews"
  | "estimates" | "auditLogs" | "customers" | "couriers" | "employees" | "returns" | "salesOrders" | "stockMovements" | "unitConversions"
  | "ticketCategories" | "cannedResponses";

export function useResourceConfig(key: ResourceKey): ResourceConfig {
  const { t, money, enumLabel, text, dateTime, minutes } = useI18n();
  const f = (k: string) => t(`adm.f.${k}`);
  const n = (k: string) => t(`adm.nav.${k}`);
  const docs = (type: string | undefined, title: string): ResourceConfig => ({
    path: "/admin/documents",
    title,
    perm: "payments",
    extraQuery: type ? { type } : undefined,
    defaultSort: "-issuedAt",
    columns: [
      { key: "number", label: f("number"), sub: "series" },
      { key: "type", label: f("type"), type: "badge", group: "DocumentType" },
      { key: "issuedAt", label: f("issuedAt"), type: "datetime", sort: true },
      { key: "counterpartyName", label: f("counterparty"), sub: "counterpartyVoen" },
      { key: "orderNumber", label: f("order"), mobile: false },
      { key: "total", label: f("total"), type: "money" },
      { key: "fiscalNumber", label: f("fiscalNumber"), mobile: false },
      { key: "syncStatus", label: f("syncStatus"), type: "enum", group: "SyncStatus", mobile: false },
      { key: "status", label: f("status"), type: "enum", group: "DocumentStatus" },
    ],
    filters: [
      ...(type ? [] : [{ key: "type", label: f("type"), enumGroup: "DocumentType" }]),
      { key: "status", label: f("status"), enumGroup: "DocumentStatus" },
      { key: "syncStatus", label: f("syncStatus"), enumGroup: "SyncStatus" },
    ],
    opUrl: (r, code) => `/admin/documents/${r.id}/${code}`,
  });

  const configs: Record<ResourceKey, () => ResourceConfig> = {
    ticketCategories: () => ({
      path: "/admin/ticket-categories", title: n("ticketCategories"), subtitle: t("adm.tickets.catSubtitle"), perm: "tickets", remove: true, defaultSort: "order",
      columns: [
        { key: "name", label: f("name"), sub: "code" },
        { key: "queue", label: f("queue"), type: "badge", group: "TicketQueue" },
        { key: "defaultPriority", label: f("defaultPriority"), type: "badge", group: "TicketPriority", mobile: false },
        { key: "firstResponseMinutes", label: f("firstResponse"), mobile: false, render: (r) => minutes(r.firstResponseMinutes) },
        { key: "resolutionMinutes", label: f("resolution"), mobile: false, render: (r) => minutes(r.resolutionMinutes) },
        { key: "openTickets", label: f("openTickets"), type: "number" },
        { key: "customerVisible", label: f("customerVisible"), type: "bool", mobile: false },
        { key: "active", label: f("active"), type: "bool" },
      ],
      filters: [{ key: "queue", label: f("queue"), enumGroup: "TicketQueue" }],
      fields: [
        { name: "code", label: f("code"), required: true, createOnly: true },
        { name: "queue", label: f("queue"), type: "select", enumGroup: "TicketQueue", required: true },
        { name: "nameI18n", label: f("name"), type: "i18n", required: true },
        { name: "descriptionI18n", label: f("description"), type: "i18nText" },
        { name: "defaultPriority", label: f("defaultPriority"), type: "select", enumGroup: "TicketPriority", required: true },
        { name: "order", label: f("order"), type: "number" },
        { name: "sla", label: f("sla"), type: "json", hint: t("adm.tickets.slaHint") },
        { name: "customerVisible", label: f("customerVisible"), type: "bool" },
        { name: "active", label: f("active"), type: "bool" },
      ],
      initial: { active: true, customerVisible: true, defaultPriority: "NORMAL", queue: "GENERAL" },
    }),
    cannedResponses: () => ({
      path: "/admin/canned-responses", title: n("cannedResponses"), subtitle: t("adm.tickets.cannedSubtitle"), perm: "tickets", remove: true, defaultSort: "-usageCount",
      columns: [
        { key: "shortcut", label: f("shortcut"), render: (r) => <code>{r.shortcut}</code> },
        { key: "title", label: f("title"), type: "i18n" },
        { key: "categoryName", label: f("category"), type: "i18n", mobile: false },
        { key: "usageCount", label: f("usageCount"), type: "number", sort: true },
        { key: "active", label: f("active"), type: "bool" },
      ],
      filters: [{ key: "categoryId", label: f("category"), lookup: "ticketCategories" }],
      fields: [
        { name: "shortcut", label: f("shortcut"), required: true, hint: "/salam" },
        { name: "categoryId", label: f("category"), type: "select", lookup: "ticketCategories" },
        { name: "titleI18n", label: f("title"), type: "i18n", required: true },
        { name: "bodyI18n", label: f("body"), type: "i18nText", required: true, span: true },
        { name: "active", label: f("active"), type: "bool" },
      ],
      initial: { active: true },
    }),
    services: () => ({
      path: "/admin/services", title: n("services"), perm: "catalog", remove: true,
      columns: [
        { key: "name", label: f("name"), sub: "categoryName" },
        { key: "serviceType", label: f("serviceType"), type: "badge", group: "ServiceType" },
        { key: "executionForms", label: f("executionForms"), type: "list", group: "ExecutionForm", mobile: false },
        { key: "priceModel", label: f("priceModel"), render: (r) => <span>{enumLabel("PriceModel", r.priceModel)}{r.price ? <small className="block">{money(r.price)}</small> : null}</span> },
        { key: "templates", label: f("templates"), mobile: false, render: (r) => r.templates.map((x: any) => <Link key={x.id} to={`/workflow-templates/${x.id}`} className="block text-brand text-sm">{enumLabel("ExecutionForm", x.form)}: {text(x.name)}</Link>) },
        { key: "completedCount", label: f("completed"), type: "number", sort: true, mobile: false },
        { key: "active", label: f("active"), type: "bool" },
      ],
      filters: [{ key: "serviceType", label: f("serviceType"), enumGroup: "ServiceType" }, { key: "categoryId", label: f("category"), lookup: "equipmentCategories" }],
      fields: [
        { name: "nameI18n", label: f("name"), type: "i18n", required: true },
        { name: "slug", label: f("slug"), required: true, createOnly: true },
        { name: "categoryId", label: f("category"), type: "select", lookup: "equipmentCategories", required: true },
        { name: "serviceType", label: f("serviceType"), type: "select", enumGroup: "ServiceType", required: true },
        { name: "priceModel", label: f("priceModel"), type: "select", enumGroup: "PriceModel", required: true },
        { name: "priceCents", label: f("price"), type: "cents" },
        { name: "executionForms", label: f("executionForms"), type: "multi", enumGroup: "ExecutionForm" },
        { name: "specializationIds", label: f("specializations"), type: "multi", lookup: "specializations" },
        { name: "durationMinutes", label: f("durationMinutes"), type: "number" },
        { name: "warrantyMonths", label: f("warrantyMonths"), type: "number" },
        { name: "shortDescriptionI18n", label: f("shortDescription"), type: "i18n" },
        { name: "active", label: f("active"), type: "bool" },
      ],
    }),
    feeRules: () => ({
      path: "/admin/fee-rules", title: n("feeRules"), subtitle: t("adm.hints.feeRules"), perm: "fee_rules", remove: true,
      columns: [
        { key: "name", label: f("name"), sub: "categoryName" },
        { key: "type", label: f("type"), type: "badge", group: "FeeType" },
        { key: "trigger", label: f("trigger"), type: "badge", group: "FeeTrigger" },
        { key: "executionForm", label: f("executionForm"), type: "badge", group: "ExecutionForm", mobile: false },
        { key: "amount", label: f("amount"), render: (r) => (r.amountType === "PERCENT" ? `${r.amount}%` : money({ amount: r.amount, currency: "AZN" })) },
        { key: "excludedPlans", label: f("excludedPlans"), type: "list", mobile: false },
        { key: "active", label: f("active"), type: "bool" },
      ],
      filters: [{ key: "type", label: f("type"), enumGroup: "FeeType" }, { key: "trigger", label: f("trigger"), enumGroup: "FeeTrigger" }],
      fields: [
        { name: "nameI18n", label: f("name"), type: "i18n", required: true },
        { name: "type", label: f("type"), type: "select", enumGroup: "FeeType", required: true },
        { name: "trigger", label: f("trigger"), type: "select", enumGroup: "FeeTrigger", required: true },
        { name: "categoryId", label: f("category"), type: "select", lookup: "equipmentCategories" },
        { name: "executionForm", label: f("executionForm"), type: "select", enumGroup: "ExecutionForm" },
        { name: "zone", label: f("zone"), type: "select", enumGroup: "Zone" },
        { name: "amountType", label: f("amountType"), type: "select", options: [{ value: "FIXED", label: t("adm.f.fixed") }, { value: "PERCENT", label: "%" }], required: true },
        { name: "amount", label: f("amount"), required: true },
        { name: "onEstimateApproved", label: f("onEstimateApproved"), type: "select", options: ["WAIVE", "INCLUDE", "KEEP"].map((v) => ({ value: v, label: t(`adm.f.onApproved.${v}`) })) },
        { name: "excludedPlans", label: f("excludedPlans"), type: "multi", options: ["CUSTOMER_BASIC", "CUSTOMER_PRO", "CUSTOMER_PREMIUM"].map((v) => ({ value: v, label: v.replace("CUSTOMER_", "") })) },
        { name: "active", label: f("active"), type: "bool" },
      ],
    }),
    reasonCodes: () => ({
      path: "/admin/reason-codes", title: n("reasonCodes"), perm: "reason_codes", remove: true, defaultSort: "category",
      columns: [{ key: "code", label: f("code") }, { key: "category", label: f("category"), type: "badge", group: "ReasonCategory" }, { key: "label", label: f("label") }, { key: "order", label: f("order"), type: "number", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      filters: [{ key: "category", label: f("category"), enumGroup: "ReasonCategory" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "category", label: f("category"), type: "select", enumGroup: "ReasonCategory", required: true }, { name: "labelI18n", label: f("label"), type: "i18n", required: true }, { name: "order", label: f("order"), type: "number" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    b2bAccounts: () => ({
      path: "/admin/b2b-accounts", title: n("b2bAccounts"), perm: "b2b_accounts", defaultSort: "-createdAt",
      columns: [
        { key: "legalName", label: f("legalName"), sub: "voen" },
        { key: "segment", label: f("segment"), type: "badge", group: "Segment" },
        { key: "creditLimit", label: f("creditLimit"), type: "money", mobile: false },
        { key: "currentDebt", label: f("debt"), type: "money" },
        { key: "paymentTerms", label: f("paymentTerms"), type: "badge", group: "PaymentTerms", mobile: false },
        { key: "accountManager", label: f("manager"), mobile: false },
        { key: "status", label: f("status"), render: (r) => <span className={`badge badge-${r.status === "ACTIVE" ? "success" : r.status === "PENDING_REVIEW" ? "warning" : "danger"}`}>{t(`adm.b2bStatus.${r.status}`)}</span> },
      ],
      filters: [{ key: "segment", label: f("segment"), values: ["CORPORATE", "PARTNER", "WHOLESALE"], enumGroup: "Segment" }, { key: "status", label: f("status"), options: ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED"].map((s) => ({ value: s, label: t(`adm.b2bStatus.${s}`) })) }],
      opUrl: (r, code) => `/admin/b2b-accounts/${r.id}/${code}`,
      fields: [
        { name: "legalName", label: f("legalName"), required: true },
        { name: "voen", label: f("voen"), required: true },
        { name: "segment", label: f("segment"), type: "select", enumValues: ["CORPORATE", "PARTNER", "WHOLESALE"], enumGroup: "Segment", createOnly: true },
        { name: "priceType", label: f("priceType"), type: "select", enumGroup: "PriceType" },
        { name: "discountPercent", label: f("discountPercent"), type: "number" },
        { name: "paymentTerms", label: f("paymentTerms"), type: "select", enumGroup: "PaymentTerms" },
        { name: "deferredDays", label: f("deferredDays"), type: "number" },
        { name: "creditLimitCents", label: f("creditLimit"), type: "cents" },
        { name: "minOrderCents", label: f("minOrder"), type: "cents" },
        { name: "addressLimit", label: f("addressLimit"), type: "number" },
        { name: "userLimit", label: f("userLimit"), type: "number" },
        { name: "partnerTypeId", label: f("partnerType"), type: "select", lookup: "partnerTypes" },
        { name: "commissionEnabled", label: f("commissionEnabled"), type: "bool" },
        { name: "eInvoiceRequired", label: f("eInvoiceRequired"), type: "bool" },
        { name: "contactName", label: f("contactName") },
        { name: "contactPhone", label: f("phone"), type: "tel" },
        { name: "contactEmail", label: f("email"), type: "email" },
        { name: "legalAddress", label: f("legalAddress"), span: true },
      ],
      details: (r) => (
        <>
          <KeyValue cols={2} items={[[f("legalName"), r.legalName], [f("voen"), r.voen], [f("legalAddress"), r.legalAddress], [f("bank"), r.bankDetails ? `${r.bankDetails.bank} · ${r.bankDetails.iban}` : null], [f("contract"), r.contract?.number], [f("priceType"), enumLabel("PriceType", r.priceType)], [f("creditLimit"), money(r.creditLimit)], [f("debt"), money(r.currentDebt)], [f("addressLimit"), `${r.addressCount} / ${r.addressLimit ?? "∞"}`], [f("userLimit"), `${r.userCount} / ${r.userLimit ?? "∞"}`], [f("partnerType"), r.partnerTypeName], [f("orders"), r.orders]]} />
          <h3 className="mt-4 mb-2">{n("users")}</h3>
          <ul className="kit-list">{r.users.map((u: any) => <li key={u.id}><span className="grow">{u.fullName}<small className="block text-muted">{u.email}</small></span><span className="badge">{enumLabel("CompanyUserRole", u.companyRole)}</span><EnumBadge group="UserStatus" code={u.status} /></li>)}</ul>
        </>
      ),
    }),
    partnerTypes: () => ({
      path: "/admin/partner-types", title: n("partnerTypes"), perm: "b2b_accounts", remove: true,
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name") }, { key: "commissionModel", label: f("commissionModel"), type: "badge", group: "CommissionModel" }, { key: "commissionBase", label: f("commissionBase"), type: "badge", group: "CommissionBase", mobile: false }, { key: "defaultRate", label: f("defaultRate"), type: "percent" }, { key: "capabilities", label: f("capabilities"), mobile: false, render: (r) => Object.entries(r.capabilities).filter(([, v]) => v === true).map(([k]) => t(`adm.f.cap.${k}`)).join(", ") }, { key: "partnerCount", label: f("partners"), type: "number" }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "commissionModel", label: f("commissionModel"), type: "select", enumGroup: "CommissionModel" }, { name: "commissionBase", label: f("commissionBase"), type: "select", enumGroup: "CommissionBase" }, { name: "defaultRate", label: f("defaultRate") }, { name: "capabilities", label: f("capabilities"), type: "json", hint: t("adm.hints.capabilities") }, { name: "serviceRates", label: f("serviceRates"), type: "json" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    categories: () => ({
      path: "/admin/categories", title: n("categories"), perm: "catalog", remove: true, defaultSort: "order",
      columns: [{ key: "name", label: f("name"), render: (r) => <span style={{ paddingLeft: r.depth * 18 }}>{r.depth ? "↳ " : ""}{r.name}<small className="block">/{r.path.join("/")}</small></span> }, { key: "attributeCodes", label: f("attributes"), type: "list", mobile: false }, { key: "productCount", label: f("products"), type: "number" }, { key: "costingMethod", label: f("costingMethod"), type: "badge", group: "CostingMethod", mobile: false }, { key: "order", label: f("order"), type: "number", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "slug", label: f("slug"), required: true }, { name: "parentId", label: f("parent"), type: "select", lookup: "categories" }, { name: "attributeCodes", label: f("attributes"), type: "multi", lookup: "attributes" }, { name: "order", label: f("order"), type: "number" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    brands: () => ({
      path: "/admin/brands", title: n("brands"), perm: "catalog", remove: true, defaultSort: "name",
      columns: [{ key: "name", label: f("name"), sub: "slug" }, { key: "country", label: f("country") }, { key: "seriesCount", label: n("series"), type: "number" }, { key: "modelCount", label: n("models"), type: "number" }, { key: "productCount", label: f("products"), type: "number" }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "name", label: f("name"), required: true }, { name: "slug", label: f("slug"), required: true }, { name: "country", label: f("country") }, { name: "active", label: f("active"), type: "bool" }],
    }),
    series: () => ({
      path: "/admin/series", title: n("series"), perm: "catalog", remove: true,
      columns: [{ key: "name", label: f("name") }, { key: "brandName", label: f("brand") }],
      filters: [{ key: "brandId", label: f("brand"), lookup: "brands" }],
      fields: [{ name: "name", label: f("name"), required: true }, { name: "brandId", label: f("brand"), type: "select", lookup: "brands", required: true }],
    }),
    models: () => ({
      path: "/admin/models", title: n("models"), perm: "catalog", remove: true,
      columns: [{ key: "fullName", label: f("name"), sub: "code" }, { key: "seriesName", label: n("series"), mobile: false }, { key: "categoryName", label: f("category") }, { key: "compatiblePartCount", label: f("compatibleParts"), type: "number" }, { key: "deviceCount", label: f("devices"), type: "number", mobile: false }],
      filters: [{ key: "brandId", label: f("brand"), lookup: "brands" }, { key: "categoryId", label: f("category"), lookup: "equipmentCategories" }],
      fields: [{ name: "name", label: f("name"), required: true }, { name: "code", label: f("code"), required: true }, { name: "brandId", label: f("brand"), type: "select", lookup: "brands", required: true }, { name: "seriesId", label: n("series"), type: "select", lookup: "series" }, { name: "categoryId", label: f("category"), type: "select", lookup: "equipmentCategories", required: true }],
    }),
    attributes: () => ({
      path: "/admin/attributes", title: n("attributes"), perm: "catalog", remove: true, defaultSort: "code",
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name"), sub: "group" }, { key: "type", label: f("type"), type: "badge", group: "AttributeType" }, { key: "unit", label: f("unit"), mobile: false }, { key: "filterable", label: f("filterable"), type: "bool", mobile: false }, { key: "variantDefining", label: f("variantDefining"), type: "bool", mobile: false }, { key: "categoryNames", label: n("categories"), type: "list", mobile: false }, { key: "usage", label: f("products"), type: "number" }],
      filters: [{ key: "type", label: f("type"), enumGroup: "AttributeType" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "type", label: f("type"), type: "select", enumGroup: "AttributeType", required: true }, { name: "unit", label: f("unit") }, { name: "groupI18n", label: f("group"), type: "i18n" }, { name: "filterDisplay", label: f("filterDisplay"), type: "select", enumGroup: "FilterDisplay" }, { name: "required", label: f("required"), type: "bool" }, { name: "filterable", label: f("filterable"), type: "bool" }, { name: "comparable", label: f("comparable"), type: "bool" }, { name: "variantDefining", label: f("variantDefining"), type: "bool" }, { name: "options", label: f("options"), type: "json", hint: t("adm.hints.options") }],
    }),
    units: () => ({
      path: "/admin/units", title: n("units"), perm: "catalog", remove: true,
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name") }, { key: "short", label: f("short") }, { key: "precision", label: f("precision"), type: "number" }, { key: "system", label: f("system"), type: "bool" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "short", label: f("short"), required: true }, { name: "precision", label: f("precision"), type: "number" }],
    }),
    unitConversions: () => ({
      path: "/admin/unit-conversions", title: t("adm.pages.unitConversions"), perm: "catalog", create: false, edit: false,
      columns: [{ key: "productName", label: f("product") }, { key: "baseUnit", label: f("baseUnit") }, { key: "unit", label: f("unit") }, { key: "factor", label: f("factor") }, { key: "packagePrice", label: f("packagePrice"), type: "money" }, { key: "unitPrice", label: f("unitPrice"), type: "money" }, { key: "savingPercent", label: f("saving"), type: "percent" }],
    }),
    priceLists: () => ({
      path: "/admin/price-lists", title: n("priceLists"), perm: "price_rules", create: false,
      columns: [{ key: "name", label: f("name"), sub: "description" }, { key: "priceType", label: f("priceType"), type: "badge", group: "PriceType" }, { key: "vatIncluded", label: f("vatIncluded"), type: "bool" }, { key: "itemCount", label: f("items"), type: "number" }, { key: "updatedAt", label: f("updatedAt"), type: "date", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "nameI18n", label: f("name"), type: "i18n" }, { name: "descriptionI18n", label: f("description"), type: "i18n" }, { name: "vatIncluded", label: f("vatIncluded"), type: "bool" }, { name: "active", label: f("active"), type: "bool" }],
      details: (r) => <ul className="kit-list">{r.sample.map((s: any) => <li key={s.productId}><span className="grow">{s.name}<small className="block text-muted">{s.sku}</small></span><strong>{money(s.price)}</strong></li>)}</ul>,
    }),
    promotions: () => ({
      path: "/admin/promotions", title: n("promotions"), subtitle: t("adm.hints.promotions"), perm: "price_rules", remove: true, defaultSort: "priority",
      columns: [{ key: "code", label: f("code"), sub: "promoCode" }, { key: "name", label: f("name"), sub: "categoryNames" }, { key: "value", label: f("value"), render: (r) => (r.kind === "PERCENT" ? `${r.value}%` : money({ amount: String(r.value), currency: "AZN" })) }, { key: "stacking", label: f("stacking"), type: "badge", group: "Stacking" }, { key: "priority", label: f("priority"), type: "number", sort: true }, { key: "endsAt", label: f("period"), render: (r) => `${dateTime(r.startsAt)} — ${r.endsAt ? dateTime(r.endsAt) : "∞"}`, mobile: false }, { key: "usageCount", label: f("usage"), type: "number", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      filters: [{ key: "stacking", label: f("stacking"), enumGroup: "Stacking" }, { key: "appliesTo", label: f("appliesTo"), enumGroup: "AppliesTo" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "kind", label: f("kind"), type: "select", enumGroup: "PromotionKind", required: true }, { name: "value", label: f("value"), type: "number", required: true }, { name: "stacking", label: f("stacking"), type: "select", enumGroup: "Stacking", required: true }, { name: "combinableWith", label: f("combinableWith"), type: "multi", lookup: "promotions" }, { name: "priority", label: f("priority"), type: "number", required: true }, { name: "base", label: f("base"), type: "select", enumGroup: "DiscountBase" }, { name: "appliesTo", label: f("appliesTo"), type: "select", enumGroup: "AppliesTo" }, { name: "maxDiscountCents", label: f("maxDiscount"), type: "cents" }, { name: "categoryIds", label: n("categories"), type: "multi", lookup: "categories" }, { name: "segments", label: f("segments"), type: "multi", enumGroup: "Segment" }, { name: "promoCode", label: f("promoCode") }, { name: "startsAt", label: f("startsAt"), type: "datetime" }, { name: "endsAt", label: f("endsAt"), type: "datetime" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    warehouses: () => ({
      path: "/admin/warehouses", title: n("warehouses"), perm: "inventory", remove: true, defaultSort: "code",
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name"), sub: "groupName" }, { key: "type", label: f("type"), type: "badge", group: "WarehouseType" }, { key: "branchName", label: f("branch"), mobile: false }, { key: "responsibleName", label: f("responsible"), mobile: false }, { key: "skuCount", label: f("skus"), type: "number" }, { key: "stockValue", label: f("stockValue"), type: "money" }, { key: "active", label: f("active"), type: "bool" }],
      filters: [{ key: "type", label: f("type"), enumGroup: "WarehouseType" }, { key: "branchId", label: f("branch"), lookup: "branches" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "type", label: f("type"), type: "select", enumGroup: "WarehouseType", required: true }, { name: "branchId", label: f("branch"), type: "select", lookup: "branches", required: true }, { name: "responsibleName", label: f("responsible"), required: true }, { name: "active", label: f("active"), type: "bool" }],
    }),
    warehouseGroups: () => ({
      path: "/admin/warehouse-groups", title: n("warehouseGroups"), perm: "inventory", remove: true,
      columns: [{ key: "name", label: f("name") }, { key: "warehouseNames", label: n("warehouses"), type: "list" }, { key: "costingMethod", label: f("costingMethod"), type: "badge", group: "CostingMethod" }],
      fields: [{ name: "nameI18n", label: f("name"), type: "i18n", required: true }],
    }),
    suppliers: () => ({
      path: "/admin/suppliers", title: n("suppliers"), perm: "purchases", remove: true,
      columns: [{ key: "name", label: f("name"), sub: "voen" }, { key: "contactName", label: f("contactName"), sub: "phone" }, { key: "paymentTerms", label: f("paymentTerms"), mobile: false }, { key: "debt", label: f("debt"), type: "money" }, { key: "purchaseCount", label: n("purchases"), type: "number" }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "name", label: f("name"), required: true }, { name: "voen", label: f("voen"), required: true }, { name: "contactName", label: f("contactName"), required: true }, { name: "phone", label: f("phone"), type: "tel", required: true }, { name: "email", label: f("email"), type: "email" }, { name: "paymentTerms", label: f("paymentTerms") }, { name: "active", label: f("active"), type: "bool" }],
    }),
    taxSettings: () => ({
      path: "/admin/tax-settings", title: n("taxSettings"), perm: "finance_reports", remove: true,
      columns: [{ key: "name", label: f("name") }, { key: "rate", label: f("rate"), type: "percent" }, { key: "appliesTo", label: f("appliesTo") }, { key: "exempt", label: f("exempt"), type: "bool" }, { key: "b2cIncluded", label: f("b2cIncluded"), type: "bool", mobile: false }, { key: "b2bSeparate", label: f("b2bSeparate"), type: "bool", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "name", label: f("name"), required: true }, { name: "rate", label: f("rate"), required: true }, { name: "appliesTo", label: f("appliesTo"), span: true }, { name: "exempt", label: f("exempt"), type: "bool" }, { name: "b2cIncluded", label: f("b2cIncluded"), type: "bool" }, { name: "b2bSeparate", label: f("b2bSeparate"), type: "bool" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    notificationTemplates: () => ({
      path: "/admin/notification-templates", title: n("notificationTemplates"), subtitle: t("adm.hints.templates"), perm: "notification_templates", remove: true, defaultSort: "event",
      columns: [{ key: "event", label: f("event") }, { key: "channel", label: f("channel"), type: "badge", group: "NotificationChannel" }, { key: "recipient", label: f("recipient"), type: "badge", group: "Recipient" }, { key: "subject", label: f("subject"), sub: "body" }, { key: "mandatory", label: f("mandatory"), type: "bool", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      filters: [{ key: "channel", label: f("channel"), enumGroup: "NotificationChannel" }],
      fields: [{ name: "event", label: f("event"), required: true, createOnly: true }, { name: "channel", label: f("channel"), type: "select", enumGroup: "NotificationChannel", required: true }, { name: "recipient", label: f("recipient"), type: "select", enumGroup: "Recipient" }, { name: "subjectI18n", label: f("subject"), type: "i18n" }, { name: "bodyI18n", label: f("body"), type: "i18n", required: true, hint: t("adm.hints.variables") }, { name: "active", label: f("active"), type: "bool" }],
      details: (r) => <><KeyValue items={[[f("variables"), r.variables.map((v: string) => `{${v}}`).join(" ")], [f("updatedAt"), dateTime(r.updatedAt)]]} /><div className="kit-note mt-3"><strong>{text(r.subjectI18n)}</strong><p>{text(r.bodyI18n).replace(/\{(\w+)\}/g, (_m: string, k: string) => t(`adm.sample.${k}`))}</p></div></>,
    }),
    pages: () => ({
      path: "/admin/content/pages", title: n("contentPages"), perm: "content", remove: true,
      columns: [{ key: "slug", label: f("slug") }, { key: "title", label: f("title") }, { key: "status", label: f("status"), type: "enum", group: "ContentStatus" }, { key: "updatedAt", label: f("updatedAt"), type: "datetime" }],
      fields: [{ name: "slug", label: f("slug"), required: true, createOnly: true }, { name: "titleI18n", label: f("title"), type: "i18n", required: true }, { name: "bodyI18n", label: f("body"), type: "i18n" }, { name: "status", label: f("status"), type: "select", enumGroup: "ContentStatus" }],
    }),
    faq: () => ({
      path: "/admin/content/faq", title: n("contentFaq"), perm: "content", remove: true, defaultSort: "order",
      columns: [{ key: "question", label: f("question"), sub: "answer" }, { key: "category", label: f("category") }, { key: "order", label: f("order"), type: "number" }, { key: "status", label: f("status"), type: "enum", group: "ContentStatus" }],
      fields: [{ name: "questionI18n", label: f("question"), type: "i18n", required: true }, { name: "answerI18n", label: f("answer"), type: "i18n", required: true }, { name: "category", label: f("category"), required: true }, { name: "order", label: f("order"), type: "number" }, { name: "status", label: f("status"), type: "select", enumGroup: "ContentStatus" }],
    }),
    banners: () => ({
      path: "/admin/content/banners", title: n("contentBanners"), perm: "content", remove: true,
      columns: [{ key: "title", label: f("title"), sub: "subtitle" }, { key: "placement", label: f("placement"), type: "badge", group: "Placement" }, { key: "ctaHref", label: f("ctaHref"), mobile: false }, { key: "activeTo", label: f("period"), render: (r) => `${dateTime(r.activeFrom)} — ${r.activeTo ? dateTime(r.activeTo) : "∞"}`, mobile: false }, { key: "status", label: f("status"), type: "enum", group: "ContentStatus" }],
      fields: [{ name: "titleI18n", label: f("title"), type: "i18n", required: true }, { name: "subtitleI18n", label: f("subtitle"), type: "i18n" }, { name: "ctaLabelI18n", label: f("ctaLabel"), type: "i18n" }, { name: "ctaHref", label: f("ctaHref"), required: true }, { name: "placement", label: f("placement"), type: "select", enumGroup: "Placement", required: true }, { name: "tone", label: f("tone"), type: "select", options: ["primary", "accent"].map((v) => ({ value: v, label: v })) }, { name: "activeFrom", label: f("startsAt"), type: "datetime" }, { name: "activeTo", label: f("endsAt"), type: "datetime" }, { name: "status", label: f("status"), type: "select", enumGroup: "ContentStatus" }],
    }),
    branches: () => ({
      path: "/admin/branches", title: n("branches"), perm: "branches", remove: true,
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name"), sub: "address" }, { key: "phone", label: f("phone"), mobile: false }, { key: "managerName", label: f("manager"), mobile: false }, { key: "warehouseCount", label: n("warehouses"), type: "number" }, { key: "employeeCount", label: n("employees"), type: "number" }, { key: "openOrders", label: f("openOrders"), type: "number" }, { key: "hasServiceCenter", label: f("serviceCenter"), type: "bool", mobile: false }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "city", label: f("city"), required: true }, { name: "address", label: f("address"), required: true }, { name: "phone", label: f("phone"), type: "tel", required: true }, { name: "email", label: f("email"), type: "email" }, { name: "managerName", label: f("manager") }, { name: "hasServiceCenter", label: f("serviceCenter"), type: "bool" }, { name: "active", label: f("active"), type: "bool" }],
    }),
    zones: () => ({
      path: "/admin/service-zones", title: n("serviceZones"), perm: "branches", remove: true,
      columns: [{ key: "name", label: f("name") }, { key: "city", label: f("city") }, { key: "branchName", label: f("branch") }, { key: "technicianCount", label: n("technicians"), type: "number" }, { key: "polygon", label: f("polygon"), render: (r) => t("adm.f.points", { count: r.polygon.length }), mobile: false }, { key: "outOfCity", label: f("outOfCity"), type: "bool" }, { key: "active", label: f("active"), type: "bool" }],
      fields: [{ name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "branchId", label: f("branch"), type: "select", lookup: "branches", required: true }, { name: "city", label: f("city"), required: true }, { name: "outOfCity", label: f("outOfCity"), type: "bool" }, { name: "polygon", label: f("polygon"), type: "json", hint: t("adm.hints.polygon") }, { name: "active", label: f("active"), type: "bool" }],
    }),
    kpiTargets: () => ({
      path: "/admin/kpi-targets", title: n("kpiTargets"), perm: "kpi_targets", defaultSort: "code",
      columns: [{ key: "code", label: f("code") }, { key: "name", label: f("name"), sub: "measurement" }, { key: "target", label: f("target"), render: (r) => `${r.comparator === "LTE" ? "≤" : "≥"} ${r.target} ${r.unit}` }, { key: "current", label: f("current"), render: (r) => { const ok = r.comparator === "LTE" ? Number(r.current) <= Number(r.target) : Number(r.current) >= Number(r.target); return <span className={`badge badge-${ok ? "success" : "danger"}`}>{r.current} {r.unit}</span>; } }],
      fields: [{ name: "code", label: f("code"), required: true, createOnly: true }, { name: "nameI18n", label: f("name"), type: "i18n", required: true }, { name: "measurement", label: f("measurement"), span: true }, { name: "target", label: f("target"), required: true }, { name: "unit", label: f("unit") }, { name: "comparator", label: f("comparator"), type: "select", enumGroup: "Comparator" }],
    }),
    subscriptions: () => ({
      path: "/admin/subscriptions", title: n("subscriptions"), perm: "subscription_plans", create: false, edit: false, defaultSort: "-startedAt",
      columns: [{ key: "subscriberName", label: f("subscriber"), render: (r) => <span>{r.subscriberName}<small className="block">{enumLabel("PlanGroup", r.subscriberType)}</small></span> }, { key: "planName", label: f("plan"), sub: "pendingPlanCode" }, { key: "period", label: f("period"), type: "badge", group: "BillingPeriod" }, { key: "price", label: f("price"), type: "money" }, { key: "currentPeriodEnd", label: f("periodEnd"), type: "date", sort: true }, { key: "autoRenew", label: f("autoRenew"), type: "bool", mobile: false }, { key: "status", label: f("status"), render: (r) => <span><EnumBadge group="SubscriptionStatus" code={r.status} />{r.graceUntil && <small className="block text-danger">{t("adm.f.graceUntil", { date: dateTime(r.graceUntil) })}</small>}</span> }],
      filters: [{ key: "status", label: f("status"), enumGroup: "SubscriptionStatus" }, { key: "subscriberType", label: f("group"), values: ["CUSTOMER", "TECHNICIAN"], enumGroup: "PlanGroup" }],
    }),
    payments: () => ({
      path: "/admin/payments", title: n("payments"), perm: "payments", create: false, edit: false, defaultSort: "-createdAt",
      columns: [{ key: "number", label: f("number"), sub: "provider" }, { key: "createdAt", label: f("date"), type: "datetime", sort: true }, { key: "payerName", label: f("payer") }, { key: "orderNumber", label: f("order"), render: (r) => <span>{r.orderNumber}<small className="block">{enumLabel("OrderKind", r.orderType)}</small></span> }, { key: "method", label: f("method"), type: "badge", group: "PaymentMethod", mobile: false }, { key: "amount", label: f("amount"), render: (r) => <span>{money(r.amount)}{Number(r.refundedAmount.amount) > 0 && <small className="block text-danger">−{money(r.refundedAmount)}</small>}</span> }, { key: "fiscalNumber", label: f("fiscalNumber"), mobile: false }, { key: "status", label: f("status"), render: (r) => <span><EnumBadge group="PaymentStatus" code={r.status} />{r.failureReason && <small className="block text-danger">{r.failureReason}</small>}</span> }],
      filters: [{ key: "status", label: f("status"), enumGroup: "PaymentStatus" }, { key: "method", label: f("method"), enumGroup: "PaymentMethod" }, { key: "orderType", label: f("orderType"), enumGroup: "OrderKind" }],
      opUrl: (r, code) => `/admin/payments/${r.id}/${code}`,
      opBody: (r, code, extra) => ({ reason: extra.note || extra.reasonCode, amount: code === "refund" ? r.amount.amount : undefined }),
    }),
    invoices: () => docs("INVOICE", n("invoices")),
    fiscalReceipts: () => ({ ...docs("RECEIPT", n("fiscalReceipts")) }),
    reservations: () => ({
      path: "/admin/reservations", title: n("reservations"), perm: "inventory", create: false, edit: false, defaultSort: "expiresAt",
      columns: [{ key: "number", label: f("number") }, { key: "productName", label: f("product"), sub: "sku" }, { key: "warehouseName", label: f("warehouse") }, { key: "quantity", label: f("quantity"), render: (r) => `${r.quantity.value} ${r.quantity.unit}` }, { key: "source", label: f("source"), render: (r) => <span>{r.sourceNumber}<small className="block">{enumLabel("ReservationSource", r.source)}</small></span> }, { key: "reservedFor", label: f("reservedFor"), mobile: false }, { key: "expiresAt", label: f("expiresAt"), type: "datetime", sort: true }, { key: "status", label: f("status"), type: "enum", group: "ReservationStatus" }],
      filters: [{ key: "status", label: f("status"), enumGroup: "ReservationStatus" }, { key: "source", label: f("source"), enumGroup: "ReservationSource" }],
      opUrl: (r, code) => `/admin/reservations/${r.id}/${code}`,
    }),
    commissions: () => ({
      path: "/admin/partner-commissions", title: n("partnerCommissions"), perm: "partner_commissions", create: false, edit: false, defaultSort: "-createdAt",
      columns: [{ key: "partnerName", label: f("partner") }, { key: "orderNumber", label: f("order"), render: (r) => <span>{r.orderNumber}<small className="block">{enumLabel("OrderKind", r.orderType)}</small></span> }, { key: "base", label: f("base"), type: "money" }, { key: "rate", label: f("rate"), render: (r) => (r.model === "PERCENT" ? `${r.rate}%` : money({ amount: r.rate, currency: "AZN" })) }, { key: "amount", label: f("amount"), type: "money" }, { key: "createdAt", label: f("date"), type: "date" }, { key: "status", label: f("status"), type: "enum", group: "CommissionStatus" }],
      filters: [{ key: "status", label: f("status"), enumGroup: "CommissionStatus" }],
      opUrl: (r, code) => `/admin/partner-commissions/${r.id}/${code}`,
    }),
    reviews: () => ({
      path: "/admin/reviews", title: n("reviews"), subtitle: t("adm.hints.reviews"), perm: "reviews", create: false, edit: false, defaultSort: "-createdAt",
      columns: [{ key: "authorName", label: f("author"), sub: "orderNumber" }, { key: "targetName", label: f("target"), render: (r) => <span>{text(r.targetName)}<small className="block">{enumLabel("ReviewTarget", r.target)}</small></span> }, { key: "rating", label: f("rating"), render: (r) => <Stars value={r.rating} />, sort: true }, { key: "comment", label: f("comment"), render: (r) => <span>{r.comment}{r.reply && <small className="block text-brand">↳ {r.reply}</small>}{r.reported && <span className="badge badge-danger ml-1">{t("adm.f.reported")}</span>}</span> }, { key: "createdAt", label: f("date"), type: "date", mobile: false }, { key: "status", label: f("status"), type: "enum", group: "ReviewStatus" }],
      filters: [{ key: "status", label: f("status"), enumGroup: "ReviewStatus" }, { key: "target", label: f("target"), enumGroup: "ReviewTarget" }, { key: "rating", label: f("rating"), values: ["1", "2", "3", "4", "5"] }],
      opUrl: (r, code) => `/admin/reviews/${r.id}/${code}`,
      opBody: (_r, code, extra) => ({ reply: code === "reply" ? extra.note : undefined, note: extra.note }),
    }),
    estimates: () => ({
      path: "/admin/estimates", title: n("estimates"), perm: "service_orders", create: false, edit: false, defaultSort: "-createdAt",
      rowTo: (r) => `/service-orders/${r.orderId}`,
      columns: [{ key: "number", label: f("number"), render: (r) => <span><strong>{r.number}</strong> <small>v{r.version}</small></span> }, { key: "orderNumber", label: f("order") }, { key: "customerName", label: f("customer"), sub: "serviceName" }, { key: "total", label: f("total"), type: "money" }, { key: "createdBy", label: f("createdBy"), mobile: false }, { key: "validUntil", label: f("validUntil"), type: "datetime", mobile: false }, { key: "decisionChannel", label: f("decisionChannel"), type: "badge", group: "DecisionChannel", mobile: false }, { key: "status", label: f("status"), render: (r) => <span><EnumBadge group="EstimateStatus" code={r.status} />{r.expired && <small className="block text-danger">{t("adm.f.expired")}</small>}</span> }],
      filters: [{ key: "status", label: f("status"), enumGroup: "EstimateStatus" }],
    }),
    auditLogs: () => ({
      path: "/admin/audit-logs", title: n("auditLogs"), subtitle: t("adm.hints.audit"), perm: "audit_logs", create: false, edit: false, defaultSort: "-at", pageSize: 30,
      columns: [{ key: "at", label: f("date"), type: "datetime", sort: true }, { key: "actorName", label: f("actor"), render: (r) => <span>{r.actorName}<small className="block">{enumLabel("Role", r.actorRole)} · {r.ip}</small></span> }, { key: "action", label: f("action"), render: (r) => <span className="badge">{r.action}</span> }, { key: "resource", label: f("resource"), render: (r) => <span>{enumLabel("Resource", r.resource)}<small className="block">{r.resourceLabel}</small></span> }, { key: "changes", label: f("changes"), render: (r) => <span className="kit-diff">{r.changes.map((c: any, i: number) => <span key={i} className="block text-sm">{c.field}: <del>{c.from ?? "∅"}</del> → <ins>{c.to ?? "∅"}</ins></span>)}{r.reason && <small className="block">{r.reason}</small>}</span> }],
      filters: [{ key: "resource", label: f("resource"), enumGroup: "Resource" }, { key: "actorRole", label: f("role"), enumGroup: "Role" }],
    }),
    customers: () => ({
      path: "/admin/customers", title: n("customers"), perm: "customers", edit: false, defaultSort: "-createdAt",
      rowTo: (r) => `/customers/${r.id}`,
      columns: [{ key: "fullName", label: f("fullName"), sub: "phone" }, { key: "email", label: f("email"), mobile: false }, { key: "segment", label: f("segment"), type: "badge", group: "Segment" }, { key: "planCode", label: f("plan"), render: (r) => <span className="badge badge-info">{r.planCode.replace("CUSTOMER_", "")}</span> }, { key: "devicesCount", label: f("devices"), type: "number", mobile: false }, { key: "ordersCount", label: f("orders"), type: "number", sort: true }, { key: "totalSpent", label: f("spent"), type: "money", sort: true }, { key: "lastOrderAt", label: f("lastOrder"), type: "date", mobile: false }, { key: "status", label: f("status"), type: "enum", group: "UserStatus" }],
      filters: [{ key: "segment", label: f("segment"), enumGroup: "Segment" }, { key: "planCode", label: f("plan"), values: ["CUSTOMER_BASIC", "CUSTOMER_PRO", "CUSTOMER_PREMIUM"] }],
      fields: [{ name: "firstName", label: t("fields.firstName"), required: true }, { name: "lastName", label: t("fields.lastName"), required: true }, { name: "phone", label: f("phone"), type: "tel", required: true }, { name: "email", label: f("email"), type: "email" }],
    }),
    couriers: () => ({
      path: "/admin/couriers", title: n("couriers"), perm: "users", create: false, edit: false,
      columns: [{ key: "fullName", label: f("fullName"), sub: "phone" }, { key: "branchName", label: f("branch") }, { key: "openTasks", label: f("openTasks"), type: "number" }, { key: "deliveredToday", label: f("deliveredToday"), type: "number" }, { key: "cash", label: f("cash"), type: "money" }, { key: "lastLoginAt", label: f("lastLogin"), type: "datetime", mobile: false }, { key: "status", label: f("status"), type: "enum", group: "UserStatus" }],
    }),
    employees: () => ({
      path: "/admin/employees", title: n("employees"), perm: "users", create: false, edit: false,
      rowTo: () => "/users",
      columns: [{ key: "fullName", label: f("fullName"), sub: "email" }, { key: "roleLabels", label: f("roles"), type: "list" }, { key: "branchName", label: f("branch") }, { key: "twoFactorEnabled", label: "2FA", type: "bool" }, { key: "lastLoginAt", label: f("lastLogin"), type: "datetime", mobile: false }, { key: "status", label: f("status"), type: "enum", group: "UserStatus" }],
      filters: [{ key: "roles", label: f("role"), values: ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN"], enumGroup: "Role" }, { key: "branchId", label: f("branch"), lookup: "branches" }],
    }),
    returns: () => ({
      path: "/admin/returns", title: n("returns"), perm: "sales_orders", create: false, edit: false, defaultSort: "-createdAt",
      columns: [{ key: "number", label: f("number"), sub: "salesOrderNumber" }, { key: "customerName", label: f("customer") }, { key: "lines", label: f("items"), render: (r) => r.lines.map((l: any, i: number) => <small key={i} className="block">{text(l.name)} × {l.quantity.value}</small>) }, { key: "reason", label: f("reason"), mobile: false }, { key: "inspectionResult", label: f("inspection"), type: "badge", group: "InspectionResult", mobile: false }, { key: "refundAmount", label: f("refund"), type: "money" }, { key: "status", label: f("status"), type: "enum", group: "ReturnStatus" }],
      filters: [{ key: "status", label: f("status"), enumGroup: "ReturnStatus" }],
      opUrl: (r) => `/admin/returns/${r.id}/actions`,
      opBody: (_r, code, extra) => ({ action: code, note: extra.note || extra.reasonCode, inspectionResult: code === "inspect" ? "RESELLABLE" : undefined, refundMethod: code === "refund" ? "ORIGINAL" : undefined }),
    }),
    salesOrders: () => ({
      path: "/admin/sales-orders", title: n("salesOrders"), perm: "sales_orders", create: false, edit: false, defaultSort: "-createdAt",
      rowTo: (r) => `/sales-orders/${r.id}`,
      columns: [{ key: "number", label: f("number"), sub: "channel" }, { key: "createdAt", label: f("date"), type: "datetime", sort: true }, { key: "customerName", label: f("customer"), sub: "companyName" }, { key: "itemCount", label: f("items"), type: "number", mobile: false }, { key: "deliveryMethod", label: f("delivery"), type: "badge", group: "DeliveryMethod", mobile: false }, { key: "branchName", label: f("branch"), mobile: false }, { key: "total", label: f("total"), type: "money", sort: true }, { key: "paymentStatus", label: f("payment"), type: "enum", group: "PaymentStatus" }, { key: "status", label: f("status"), type: "enum", group: "SalesOrderStatus" }],
      filters: [{ key: "status", label: f("status"), enumGroup: "SalesOrderStatus" }, { key: "paymentStatus", label: f("payment"), enumGroup: "PaymentStatus" }, { key: "deliveryMethod", label: f("delivery"), enumGroup: "DeliveryMethod" }],
    }),
    stockMovements: () => ({
      path: "/admin/stock-movements", title: n("stockMovements"), subtitle: t("adm.hints.movements"), perm: "inventory", create: false, edit: false, defaultSort: "-at", pageSize: 30,
      columns: [{ key: "number", label: f("number"), sub: "relatedDocument" }, { key: "at", label: f("date"), type: "datetime", sort: true }, { key: "type", label: f("type"), type: "badge", group: "MovementType" }, { key: "productName", label: f("product"), sub: "sku" }, { key: "warehouseName", label: f("warehouse") }, { key: "quantity", label: f("quantity"), render: (r) => <strong className={r.direction === "OUT" ? "text-danger" : "text-success"}>{r.direction === "OUT" ? "−" : "+"}{r.quantity.value} {r.quantity.unit}</strong> }, { key: "unitCost", label: f("unitCost"), type: "money", mobile: false }, { key: "actorName", label: f("actor"), sub: "reason", mobile: false }],
      filters: [{ key: "type", label: f("type"), enumGroup: "MovementType" }, { key: "warehouseId", label: f("warehouse"), lookup: "warehouses" }, { key: "direction", label: f("direction"), options: [{ value: "IN", label: t("adm.f.in") }, { value: "OUT", label: t("adm.f.out") }] }],
    }),
  };
  return configs[key]();
}

export function Resource({ name }: { name: ResourceKey }) {
  const config = useResourceConfig(name);
  return <ResourcePage config={config} />;
}
