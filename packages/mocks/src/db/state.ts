import type { MockConfig } from "@sp/types";
import * as org from "../data/org";
import * as svc from "../data/services";
import * as cat from "../data/catalog";
import * as ppl from "../data/people";
import * as pl from "../data/plans";
import * as rbac from "../data/rbac";
import type {
  AuditRec,
  CartRec,
  CashDeskRec,
  CashOperationRec,
  CommissionRec,
  DocumentRec,
  LogisticsTaskRec,
  MovementRec,
  NotificationRec,
  OtpChallengeRec,
  PaymentRec,
  ReservationRec,
  ReviewRec,
  SalesOrderRec,
  ServiceOrderRec,
  SessionRec,
  SettlementLineRec,
  StockRec,
  SubscriptionRec,
  TransferRec,
  WarrantyRec,
  GoodsReceiptRec,
} from "./types";

/** In-memory verilənlər bazası. Hər `resetDb()` çağırışında seed-lərdən eyni vəziyyət qurulur. */

const clone = <T>(v: T): T => structuredClone(v);

function baseState() {
  return {
    branding: clone(org.branding),
    branches: clone(org.branches),
    zones: clone(org.zones),
    warehouses: clone(org.warehouses),
    warehouseGroups: clone(org.warehouseGroups),
    units: clone(org.units),
    taxSettings: clone(org.taxSettings),
    settings: clone(org.orgSettings),
    reasonCodes: clone(org.reasonCodes),
    kpiTargets: clone(org.kpiTargets),
    integrations: clone(org.integrations),
    contentPages: clone(org.contentPages),
    banners: clone(org.banners),

    equipmentCategories: clone(svc.equipmentCategories),
    specializations: clone(svc.specializations),
    services: clone(svc.services),
    templates: clone(svc.templates),

    productCategories: clone(cat.productCategories),
    attributes: clone(cat.attributes),
    brands: clone(cat.brands),
    series: clone(cat.series),
    models: clone(cat.models),
    products: clone(cat.products),

    users: clone(ppl.users),
    technicians: clone(ppl.technicians),
    addresses: clone(ppl.addresses),
    devices: clone(ppl.devices),
    familyMembers: clone(ppl.familyMembers),
    partnerTypes: clone(ppl.partnerTypes),
    b2bAccounts: clone(ppl.b2bAccounts),
    corporateContracts: clone(ppl.corporateContracts),
    campaigns: clone(ppl.campaigns),

    plans: clone(pl.plans),
    entitlementDefinitions: clone(pl.entitlementDefinitions),
    roles: clone(rbac.roleDefinitions),

    // dinamik kolleksiyalar (seed/* tərəfindən doldurulur)
    sessions: new Map<string, SessionRec>(),
    otpChallenges: new Map<string, OtpChallengeRec>(),
    carts: [] as CartRec[],
    serviceOrders: [] as ServiceOrderRec[],
    salesOrders: [] as SalesOrderRec[],
    payments: [] as PaymentRec[],
    documents: [] as DocumentRec[],
    warranties: [] as WarrantyRec[],
    warrantyClaims: [] as {
      id: string; number: string; warrantyId: string; customerId: string; description: string;
      status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CONVERTED"; serviceOrderId: string | null; decisionNote: string | null; createdAt: string;
    }[],
    returns: [] as {
      id: string; number: string; salesOrderId: string; customerId: string; status: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "INSPECTED" | "REFUNDED" | "CLOSED";
      lines: { lineId: string; quantity: string; reason: string }[]; reason: string; inspectionResult: "RESELLABLE" | "DAMAGED" | "RETURN_TO_SUPPLIER" | null;
      refundCents: number | null; refundMethod: "ORIGINAL" | "BALANCE" | null; createdAt: string; history: import("@sp/types").HistoryEntry[];
    }[],
    quotes: [] as {
      id: string; number: string; companyId: string; status: "REQUESTED" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
      lines: { variantId: string; quantity: number; unitCents: number | null }[]; validUntil: string | null; requestedAt: string; note: string | null;
    }[],
    stock: [] as StockRec[],
    movements: [] as MovementRec[],
    reservations: [] as ReservationRec[],
    transfers: [] as TransferRec[],
    suppliers: [] as {
      id: string; name: string; voen: string; contactName: string; phone: string; email: string; paymentTerms: string; productIds: string[]; debtCents: number; active: boolean;
    }[],
    purchases: [] as {
      id: string; number: string; supplierId: string; warehouseId: string; status: "DRAFT" | "SENT" | "CONFIRMED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";
      lines: { id: string; variantId: string; quantity: number; receivedQuantity: number; unitCostCents: number }[]; expectedAt: string | null; createdAt: string; invoiceNumber: string | null;
    }[],
    goodsReceipts: [] as GoodsReceiptRec[],
    stockCounts: [] as {
      id: string; number: string; scope: "FULL" | "ZONE" | "CATEGORY" | "MOBILE"; warehouseId: string; status: "DRAFT" | "IN_PROGRESS" | "PENDING_APPROVAL" | "APPROVED" | "CANCELLED";
      blockMovements: boolean; lines: { id: string; variantId: string; system: number; counted: number | null }[]; scheduledAt: string; createdBy: string;
    }[],
    costingRules: [] as { id: string; level: "PRODUCT" | "CATEGORY" | "WAREHOUSE_GROUP" | "COMPANY"; targetId: string | null; method: "WEIGHTED_AVERAGE" | "FIFO"; effectiveFrom: string; updatedBy: string }[],
    logisticsTasks: [] as LogisticsTaskRec[],
    subscriptions: [] as SubscriptionRec[],
    staffLicenses: [] as { id: string; technicianId: string; status: "ACTIVE" | "REVOKED"; issuedAt: string; issuedBy: string; revokedAt: string | null; capabilities: { materialReservation: boolean; statistics: boolean; customerHistory: boolean } }[],
    partnerships: [] as { id: string; technicianId: string; companyName: string; status: "PENDING" | "APPROVED" | "REJECTED" | "ENDED"; initiatedBy: "TECHNICIAN" | "COMPANY"; zones: string[]; priceListName: string; createdAt: string }[],
    settlementLines: [] as SettlementLineRec[],
    commissions: [] as CommissionRec[],
    cashDesks: [] as CashDeskRec[],
    cashOperations: [] as CashOperationRec[],
    reviews: [] as ReviewRec[],
    notifications: [] as NotificationRec[],
    notificationPrefs: new Map<string, import("@sp/types").NotificationPreferences>(),
    notificationTemplates: [] as import("@sp/types").NotificationTemplate[],
    auditLogs: [] as AuditRec[],
    faq: [] as { id: string; category: string; question: import("@sp/types").LocalizedText; answer: import("@sp/types").LocalizedText; order: number; status: "DRAFT" | "PUBLISHED" }[],
    feeRules: [] as import("./seedTypes").FeeRuleRec[],
    promotions: [] as import("./seedTypes").PromotionRec[],
    priceLists: [] as { id: string; priceType: "RETAIL" | "TECHNICIAN" | "PARTNER" | "WHOLESALE" | "CORPORATE"; name: import("@sp/types").LocalizedText; description: import("@sp/types").LocalizedText; vatIncluded: boolean; active: boolean; updatedAt: string }[],
    periodicVisits: [] as { id: string; companyId: string; siteId: string; deviceId: string; serviceId: string; plannedAt: string; status: "PLANNED" | "ORDER_CREATED" | "DONE" | "MISSED"; orderId: string | null }[],
    b2bApplications: [] as { id: string; payload: Record<string, unknown>; createdAt: string }[],
    technicianApplications: [] as { id: string; userId: string; createdAt: string }[],
    counters: {} as Record<string, number>,
    mockConfig: { delayMs: 250, errorRate: 0, forceError: null, emptyLists: false } as MockConfig,
  };
}

export type Db = ReturnType<typeof baseState>;

export const db = {} as Db;

let seeded = false;

export function nextNumber(prefix: string, start = 1000): string {
  const current = db.counters[prefix] ?? start;
  db.counters[prefix] = current + 1;
  return `${prefix}-${current + 1}`;
}

export function resetDb(seedFn: () => void) {
  const keepConfig = seeded ? db.mockConfig : undefined;
  for (const key of Object.keys(db)) delete (db as Record<string, unknown>)[key];
  Object.assign(db, baseState());
  if (keepConfig) db.mockConfig = keepConfig;
  seedFn();
  seeded = true;
}
