import { z } from "zod";
import { Address, AvailableAction, GeoPoint, Id, IsoDateTime, Money } from "./common";
import { B2BAccountStatus, CommissionBase, CommissionModel, CompanyUserRole, CustomerSegment, LogisticsStatus, LogisticsTaskType, PaymentTerms } from "./enums";

/** B2B (PRD §44–45), logistika (§21) */

export const B2BAccount = z.object({
  id: Id,
  legalName: z.string(),
  voen: z.string(),
  segment: CustomerSegment,
  status: B2BAccountStatus,
  legalAddress: z.string(),
  actualAddress: z.string(),
  bankDetails: z.object({ bank: z.string(), iban: z.string(), swift: z.string() }),
  contract: z.object({ number: z.string(), startsAt: IsoDateTime, endsAt: IsoDateTime, fileName: z.string() }).nullable(),
  accountManager: z.string(),
  priceListName: z.string(),
  discountPercent: z.string(),
  paymentTerms: PaymentTerms,
  deferredDays: z.number(),
  creditLimit: Money,
  currentDebt: Money,
  addressLimit: z.number().nullable(),
  addressCount: z.number(),
  userLimit: z.number().nullable(),
  userCount: z.number(),
  planName: z.string().nullable(),
  partnerTypeId: z.string().nullable(),
  partnerTypeName: z.string().nullable(),
  commissionEnabled: z.boolean(),
  eInvoiceRequired: z.boolean(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  createdAt: IsoDateTime,
  availableActions: z.array(AvailableAction),
});

export const PartnerType = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  capabilities: z.object({
    partnerPricing: z.boolean(),
    ordersForEndCustomer: z.boolean(),
    notifyEndCustomer: z.boolean(),
    invoiceRecipient: z.enum(["PARTNER", "END_CUSTOMER"]),
    commission: z.boolean(),
  }),
  commissionModel: CommissionModel.nullable(),
  commissionBase: CommissionBase,
  defaultRate: z.string().nullable(),
  serviceRates: z.array(z.object({ serviceTypeLabel: z.string(), model: z.enum(["PERCENT", "FIXED"]), value: z.string() })),
  partnerCount: z.number(),
  active: z.boolean(),
});

export const CompanyUser = z.object({
  id: Id,
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: CompanyUserRole,
  siteIds: z.array(z.string()),
  siteNames: z.array(z.string()),
  approvalLimit: Money.nullable(),
  status: z.enum(["ACTIVE", "INVITED", "DISABLED"]),
  lastLoginAt: IsoDateTime.nullable(),
});

export const CorporateSite = z.object({
  id: Id,
  name: z.string(),
  address: Address,
  managerName: z.string().nullable(),
  deviceCount: z.number(),
  openOrders: z.number(),
  nextServiceAt: IsoDateTime.nullable(),
  slaCompliance: z.number(),
});

export const B2BDashboard = z.object({
  segment: CustomerSegment,
  companyName: z.string(),
  creditLimit: Money,
  currentDebt: Money,
  availableCredit: Money,
  overdue: Money,
  commissionBalance: Money.nullable(),
  openOrders: z.number(),
  openServices: z.number(),
  pendingApprovals: z.number(),
  addressUsage: z.object({ used: z.number(), limit: z.number().nullable() }).nullable(),
  sla: z.object({ compliance: z.number(), avgReactionMinutes: z.number(), breaches: z.number() }).nullable(),
  campaigns: z.array(z.object({ id: Id, title: z.string(), description: z.string(), endsAt: IsoDateTime })),
  recentOrders: z.array(z.object({ id: Id, number: z.string(), kind: z.enum(["SALES", "SERVICE"]), status: z.string(), total: Money.nullable(), createdAt: IsoDateTime })),
  spendByMonth: z.array(z.object({ month: z.string(), amount: z.number() })),
});

export const BalanceStatement = z.object({
  creditLimit: Money,
  currentDebt: Money,
  availableCredit: Money,
  overdue: Money,
  entries: z.array(z.object({ id: Id, date: IsoDateTime, document: z.string(), description: z.string(), debit: Money, credit: Money, balance: Money, dueAt: IsoDateTime.nullable() })),
});

export const ServiceContract = z.object({
  id: Id,
  number: z.string(),
  title: z.string(),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  status: z.enum(["ACTIVE", "EXPIRED", "DRAFT"]),
  sla: z.object({ reactionHours: z.number(), urgentArrivalHours: z.number(), compliance: z.number() }),
  coveredSites: z.number(),
  coveredDevices: z.number(),
  periodicVisitsPerYear: z.number(),
  fileName: z.string(),
});

export const PeriodicVisit = z.object({
  id: Id,
  siteName: z.string(),
  deviceName: z.string(),
  serviceName: z.string(),
  plannedAt: IsoDateTime,
  status: z.enum(["PLANNED", "ORDER_CREATED", "DONE", "MISSED"]),
  orderNumber: z.string().nullable(),
});

export const LogisticsTask = z.object({
  id: Id,
  number: z.string(),
  type: LogisticsTaskType,
  status: LogisticsStatus,
  from: z.object({ label: z.string(), address: z.string(), location: GeoPoint.nullable() }),
  to: z.object({ label: z.string(), address: z.string(), location: GeoPoint.nullable() }),
  windowStart: IsoDateTime,
  windowEnd: IsoDateTime,
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeKind: z.enum(["COURIER", "TECHNICIAN", "WAREHOUSE_EMPLOYEE"]).nullable(),
  cargo: z.array(z.object({ kind: z.enum(["DEVICE", "PRODUCT", "MATERIAL"]), name: z.string(), quantity: z.string(), note: z.string().nullable() })),
  relatedOrderNumber: z.string().nullable(),
  relatedOrderKind: z.enum(["SERVICE", "SALES", "TRANSFER"]).nullable(),
  contact: z.object({ name: z.string(), phone: z.string() }).nullable(),
  contactHidden: z.boolean(),
  note: z.string().nullable(),
  collectCash: Money.nullable(),
  photos: z.number(),
  signed: z.boolean(),
  failReason: z.string().nullable(),
  history: z.array(z.object({ at: IsoDateTime, status: LogisticsStatus, actor: z.string(), note: z.string().nullable() })),
  availableActions: z.array(AvailableAction),
  branchName: z.string(),
});
