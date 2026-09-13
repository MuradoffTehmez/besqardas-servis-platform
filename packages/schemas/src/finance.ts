import { z } from "zod";
import { AvailableAction, Id, IsoDateTime, Money } from "./common";
import {
  CashDeskType,
  CashShiftStatus,
  CommissionStatus,
  DocumentStatus,
  DocumentType,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  SettlementStatus,
  SyncStatus,
} from "./enums";

/** PRD §47–51 payments, documents, cash, settlements */

export const Payment = z.object({
  id: Id,
  number: z.string(),
  status: PaymentStatus,
  method: PaymentMethod,
  kind: PaymentKind,
  amount: Money,
  refundedAmount: Money,
  payerName: z.string(),
  orderType: z.enum(["SERVICE", "SALES", "SUBSCRIPTION", "B2B_INVOICE"]),
  orderNumber: z.string(),
  orderId: z.string().nullable(),
  provider: z.string().nullable(),
  fiscalNumber: z.string().nullable(),
  collectedBy: z.string().nullable(),
  createdAt: IsoDateTime,
  paidAt: IsoDateTime.nullable(),
  failureReason: z.string().nullable(),
  availableActions: z.array(AvailableAction),
});

export const InitiatePaymentRequest = z.object({
  orderType: z.enum(["SERVICE", "SALES", "SUBSCRIPTION", "B2B_INVOICE"]),
  orderId: z.string(),
  method: PaymentMethod,
  amount: z.string().optional(),
  installmentMonths: z.number().optional(),
  idempotencyKey: z.string(),
});

export const DocumentLine = z.object({ name: z.string(), quantity: z.string(), unit: z.string(), unitPrice: Money, vatRate: z.string(), vat: Money, total: Money });

export const DocumentRecord = z.object({
  id: Id,
  number: z.string(),
  series: z.string(),
  type: DocumentType,
  status: DocumentStatus,
  issuedAt: IsoDateTime,
  counterpartyName: z.string(),
  counterpartyVoen: z.string().nullable(),
  orderNumber: z.string().nullable(),
  total: Money,
  vatTotal: Money,
  locale: z.string(),
  lines: z.array(DocumentLine),
  issuer: z.object({ name: z.string(), voen: z.string(), address: z.string() }),
  qrCode: z.string().nullable(),
  fiscalNumber: z.string().nullable(),
  verifyUrl: z.string().nullable(),
  meta: z.record(z.string(), z.string()),
  correctionOf: z.string().nullable(),
  syncStatus: SyncStatus,
  availableActions: z.array(AvailableAction),
});

export const CashDesk = z.object({
  id: Id,
  name: z.string(),
  type: CashDeskType,
  holderName: z.string(),
  branchName: z.string(),
  balance: Money,
  limit: Money.nullable(),
  overLimit: z.boolean(),
  shiftStatus: CashShiftStatus.nullable(),
  shiftOpenedAt: IsoDateTime.nullable(),
  pendingHandover: Money,
});

export const CashOperation = z.object({
  id: Id,
  deskId: Id,
  kind: z.enum(["COLLECTION", "HANDOVER", "HANDOVER_CONFIRMED", "DISCREPANCY", "SHIFT_OPEN", "SHIFT_CLOSE"]),
  amount: Money,
  orderNumber: z.string().nullable(),
  fiscalNumber: z.string().nullable(),
  actorName: z.string(),
  at: IsoDateTime,
  status: z.enum(["PENDING", "CONFIRMED", "DISPUTED"]),
  note: z.string().nullable(),
});

export const SettlementLine = z.object({
  id: Id,
  orderNumber: z.string(),
  orderId: z.string(),
  companyName: z.string(),
  closedAt: IsoDateTime,
  laborAmount: Money,
  ownMaterialAmount: Money,
  deductions: z.array(z.object({ kind: z.enum(["CASH_COLLECTED", "MATERIAL_CREDIT", "TAX", "REFUND_ADJUSTMENT"]), label: z.string(), amount: Money })),
  payable: Money,
  status: SettlementStatus,
  period: z.string(),
  paidAt: IsoDateTime.nullable(),
  holdReason: z.string().nullable(),
});

export const Settlement = z.object({
  id: Id,
  technicianId: Id,
  technicianName: z.string(),
  period: z.string(),
  status: SettlementStatus,
  lineCount: z.number(),
  gross: Money,
  deductions: Money,
  payable: Money,
  approvedBy: z.string().nullable(),
  paidAt: IsoDateTime.nullable(),
  lines: z.array(SettlementLine),
  availableActions: z.array(AvailableAction),
});

export const Earnings = z.object({
  employmentType: z.enum(["STAFF", "INDEPENDENT"]),
  period: z.string(),
  jobsCount: z.number(),
  bonus: Money.nullable(),
  cashBalance: Money,
  cashLimit: Money,
  pending: Money,
  approved: Money,
  paid: Money,
  deductions: Money,
  lines: z.array(SettlementLine),
  chart: z.array(z.object({ label: z.string(), amount: z.number() })),
  cashOperations: z.array(CashOperation),
});

export const PartnerCommission = z.object({
  id: Id,
  partnerName: z.string(),
  orderNumber: z.string(),
  orderType: z.enum(["SERVICE", "SALES"]),
  base: Money,
  model: z.string(),
  rate: z.string(),
  amount: Money,
  status: CommissionStatus,
  createdAt: IsoDateTime,
  paidAt: IsoDateTime.nullable(),
  availableActions: z.array(AvailableAction),
});

export const TaxSetting = z.object({
  id: Id,
  name: z.string(),
  rate: z.string(),
  appliesTo: z.string(),
  exempt: z.boolean(),
  b2cIncluded: z.boolean(),
  b2bSeparate: z.boolean(),
  active: z.boolean(),
});

export const FinanceSummary = z.object({
  period: z.string(),
  revenue: Money,
  expenses: Money,
  profit: Money,
  serviceRevenue: Money,
  salesRevenue: Money,
  subscriptionRevenue: Money,
  refunds: Money,
  receivables: Money,
  payables: Money,
  cashOnHand: Money,
  bankBalance: Money,
  vatPayable: Money,
  revenueByMonth: z.array(z.object({ month: z.string(), service: z.number(), sales: z.number(), subscriptions: z.number() })),
  expensesByCategory: z.array(z.object({ name: z.string(), value: z.number() })),
  receivablesAging: z.array(z.object({ bucket: z.string(), amount: z.number() })),
});
