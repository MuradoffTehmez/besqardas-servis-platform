import type {
  Attachment,
  EstimateLineType,
  EstimateStatus,
  ExecutionForm,
  HistoryEntry,
  LocalizedText,
  LogisticsStatus,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  SalesOrderStatus,
  ServiceOrderStatus,
  StageStatus,
  SubscriptionStatus,
  TransferStatus,
  DocumentType,
  Role,
  BillingPeriod,
} from "@sp/types";

/** Mock backend-in daxili qeyd tipləri. API cavabları (DTO) bunlardan `dto/*` funksiyaları ilə qurulur. */

export type LText = LocalizedText;

export interface AddressSnapshot {
  id: string;
  label: string;
  city: string;
  street: string;
  building?: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  note?: string;
  location?: { lat: number; lng: number };
  isDefault: boolean;
  oneTime?: boolean;
}

export interface StageRec {
  id: string;
  templateStageId: string;
  order: number;
  name: LText;
  customerName: LText | null;
  type: string;
  executor: string;
  specializationId: string | null;
  mandatory: boolean;
  startConditions: string[];
  requirements: string[];
  checklist: { label: string; done: boolean }[];
  slaMinutes: number | null;
  parallel: boolean;
  status: StageStatus;
  assigneeId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  readyAt: string | null;
  photos: Attachment[];
  note: string | null;
  signed: boolean;
  failReason: string | null;
  logisticsTaskId: string | null;
}

export interface EstimateLineRec {
  id: string;
  type: EstimateLineType;
  name: LText;
  productId: string | null;
  variantId: string | null;
  sku: string | null;
  quantity: string;
  unit: string;
  unitCents: number;
  optional: boolean;
  declined: boolean;
  warrantyMonths: number | null;
  ownMaterial: boolean;
  vatRate: number;
}

export interface EstimateRec {
  id: string;
  number: string;
  version: number;
  status: EstimateStatus;
  lines: EstimateLineRec[];
  discountPercent: number;
  createdAt: string;
  createdBy: string;
  validUntil: string;
  decidedAt: string | null;
  decisionChannel: "CABINET" | "SMS_LINK" | "SIGNATURE" | "PHONE" | null;
  rejectReason: string | null;
}

export interface MaterialRec {
  id: string;
  productId: string;
  variantId: string;
  name: LText;
  sku: string;
  quantity: string;
  unit: string;
  warehouseId: string;
  ownMaterial: boolean;
  costCents: number | null;
  at: string;
}

export interface FeeRec {
  type: string;
  label: LText;
  cents: number;
  trigger: string;
  waived: boolean;
}

export interface ServiceOrderRec {
  id: string;
  number: string;
  type: "STANDARD" | "WARRANTY" | "PERIODIC";
  status: ServiceOrderStatus;
  prevStatus: ServiceOrderStatus | null;
  serviceId: string;
  templateId: string;
  templateVersion: number;
  executionForm: ExecutionForm;
  customerId: string;
  companyId: string | null;
  partnerCompanyId: string | null;
  endCustomer: { name: string; phone: string; address: string } | null;
  deviceId: string | null;
  device: { categoryId: string; brandId: string; modelId: string | null; modelName: string; serialNumber: string | null };
  deviceLocation: "AT_CUSTOMER" | "IN_TRANSIT" | "SERVICE_CENTER" | "DELIVERED" | null;
  problemCode: string | null;
  description: string;
  attachments: Attachment[];
  address: AddressSnapshot | null;
  contactChannel: "CALL" | "SMS" | "WHATSAPP" | "EMAIL";
  note: string | null;
  urgent: boolean;
  scheduledAt: string | null;
  technicianId: string | null;
  branchId: string;
  source: "WEB" | "OPERATOR" | "B2B" | "AUTO" | "WARRANTY" | "PRODUCT_PURCHASE";
  operatorId: string | null;
  assignmentMethod: "CUSTOMER_CHOICE" | "DISPATCHER" | "AUTO";
  stages: StageRec[];
  estimates: EstimateRec[];
  materials: MaterialRec[];
  history: HistoryEntry[];
  fees: FeeRec[];
  warrantyId: string | null;
  relatedOrderId: string | null;
  salesOrderId: string | null;
  needsReschedule: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  cancelReason: string | null;
  oldPartDisposition: "RETURN_TO_CUSTOMER" | "DISPOSE" | "WARRANTY_RETURN" | null;
  basePriceCents: number | null;
  siteId: string | null;
  approvalPending: boolean;
  preferredTechnicianId: string | null;
}

export interface PaymentRec {
  id: string;
  number: string;
  status: PaymentStatus;
  method: PaymentMethod;
  kind: "FULL" | "ADVANCE" | "PARTIAL";
  amountCents: number;
  refundedCents: number;
  payerId: string;
  payerName: string;
  orderType: "SERVICE" | "SALES" | "SUBSCRIPTION" | "B2B_INVOICE";
  orderId: string | null;
  orderNumber: string;
  provider: string | null;
  fiscalNumber: string | null;
  collectedById: string | null;
  createdAt: string;
  paidAt: string | null;
  failureReason: string | null;
  installmentMonths: number | null;
  idempotencyKey: string | null;
  meta?: Record<string, string>;
}

export interface DocumentRec {
  id: string;
  number: string;
  series: string;
  type: DocumentType;
  status: "DRAFT" | "ISSUED" | "CANCELLED" | "CORRECTED";
  issuedAt: string;
  ownerId: string;
  counterpartyName: string;
  counterpartyVoen: string | null;
  orderType: "SERVICE" | "SALES" | "SUBSCRIPTION" | "B2B" | "SETTLEMENT" | null;
  orderId: string | null;
  orderNumber: string | null;
  lines: { name: LText; quantity: string; unit: string; unitCents: number; vatRate: number }[];
  vatIncluded: boolean;
  qrCode: string | null;
  fiscalNumber: string | null;
  correctionOf: string | null;
  syncStatus: "NOT_SENT" | "SENT" | "FAILED" | "ACKNOWLEDGED";
  meta: Record<string, string>;
  deviceId?: string | null;
}

export interface WarrantyRec {
  id: string;
  number: string;
  code: string;
  type: "MANUFACTURER" | "SALES" | "WORK" | "PART" | "EXTENDED";
  deviceId: string | null;
  deviceName: string;
  serialNumber: string | null;
  customerId: string;
  orderId: string | null;
  orderNumber: string | null;
  coverage: LText;
  startsAt: string;
  endsAt: string;
  void: boolean;
}

export interface SalesOrderLineRec {
  id: string;
  productId: string;
  variantId: string;
  name: LText;
  sku: string;
  quantity: string;
  unit: string;
  baseQuantity: string;
  unitCents: number;
  totalCents: number;
  returnedQuantity: string;
}

export interface SalesOrderRec {
  id: string;
  number: string;
  status: SalesOrderStatus;
  customerId: string;
  companyId: string | null;
  lines: SalesOrderLineRec[];
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  installationCents: number;
  vatCents: number;
  totalCents: number;
  vatIncluded: boolean;
  deliveryMethod: "COURIER" | "PICKUP" | "WITH_INSTALLATION";
  address: AddressSnapshot | null;
  pickupBranchId: string | null;
  paymentMethod: PaymentMethod;
  serviceOrderId: string | null;
  history: HistoryEntry[];
  channel: "WEB" | "BRANCH" | "B2B" | "OPERATOR";
  branchId: string;
  createdAt: string;
  idempotencyKey: string | null;
  appliedDiscounts: { code: string; label: LText; cents: number }[];
}

export interface CartItemRec {
  id: string;
  variantId: string;
  productId: string;
  quantity: string;
  unit: string;
  withInstallation: boolean;
  priceSnapshotCents: number;
}

export interface CartRec {
  id: string;
  ownerKey: string;
  items: CartItemRec[];
  promoCode: string | null;
  merged: boolean;
  updatedAt: string;
}

export interface StockRec {
  id: string;
  productId: string;
  variantId: string;
  warehouseId: string;
  purpose: "SALES" | "SERVICE";
  physical: number;
  reserved: number;
  damaged: number;
  inTransit: number;
  onOrder: number;
  minLevel: number;
  avgCostCents: number;
  zone: string | null;
}

export interface MovementRec {
  id: string;
  number: string;
  type: MovementType;
  at: string;
  warehouseId: string;
  productId: string;
  variantId: string;
  quantity: string;
  unit: string;
  baseQuantity: number;
  direction: "IN" | "OUT";
  unitCostCents: number;
  reason: string | null;
  actorName: string;
  relatedDocument: string | null;
  reversalOf: string | null;
}

export interface ReservationRec {
  id: string;
  number: string;
  source: "SERVICE_ORDER" | "SALES_ORDER" | "TECHNICIAN" | "TRANSFER";
  sourceId: string;
  sourceNumber: string;
  productId: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
  status: "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED";
  reservedForId: string;
  reservedForName: string;
  expiresAt: string;
  createdAt: string;
}

export interface TransferRec {
  id: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  lines: { id: string; productId: string; variantId: string; quantity: number; receivedQuantity: number | null }[];
  createdAt: string;
  createdBy: string;
  shippedAt: string | null;
  receivedAt: string | null;
  discrepancyNote: string | null;
  history: HistoryEntry[];
}

export interface LogisticsTaskRec {
  id: string;
  number: string;
  type: "PICKUP" | "DELIVERY" | "TRANSFER";
  status: LogisticsStatus;
  from: { label: string; address: string; location: { lat: number; lng: number } | null };
  to: { label: string; address: string; location: { lat: number; lng: number } | null };
  windowStart: string;
  windowEnd: string;
  assigneeId: string | null;
  assigneeKind: "COURIER" | "TECHNICIAN" | "WAREHOUSE_EMPLOYEE" | null;
  cargo: { kind: "DEVICE" | "PRODUCT" | "MATERIAL"; name: string; quantity: string; note: string | null }[];
  relatedOrderId: string | null;
  relatedOrderNumber: string | null;
  relatedOrderKind: "SERVICE" | "SALES" | "TRANSFER" | null;
  stageId: string | null;
  contact: { name: string; phone: string } | null;
  note: string | null;
  collectCashCents: number | null;
  photos: number;
  signed: boolean;
  failReason: string | null;
  history: { at: string; status: LogisticsStatus; actor: string; note: string | null }[];
  branchId: string;
  createdAt: string;
}

export interface SubscriptionRec {
  id: string;
  subscriberId: string;
  subscriberType: "CUSTOMER" | "TECHNICIAN" | "CORPORATE";
  planId: string;
  status: SubscriptionStatus;
  period: BillingPeriod;
  priceCents: number;
  startedAt: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  pendingPlanId: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
}

export interface SessionRec {
  sid: string;
  userId: string;
  activeRole: Role;
  createdAt: string;
  pendingTwoFactor: boolean;
}

export interface OtpChallengeRec {
  id: string;
  userId: string | null;
  target: string;
  purpose: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface NotificationRec {
  id: string;
  userId: string;
  event: string;
  title: LText;
  body: LText;
  link: string | null;
  read: boolean;
  createdAt: string;
  channel: "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP";
}

export interface SettlementLineRec {
  id: string;
  technicianId: string;
  orderId: string;
  orderNumber: string;
  companyName: string;
  closedAt: string;
  laborCents: number;
  ownMaterialCents: number;
  deductions: { kind: "CASH_COLLECTED" | "MATERIAL_CREDIT" | "TAX" | "REFUND_ADJUSTMENT"; label: LText; cents: number }[];
  status: "PENDING" | "APPROVED" | "PAID" | "ON_HOLD";
  period: string;
  paidAt: string | null;
  holdReason: string | null;
  approvedBy: string | null;
}

export interface CommissionRec {
  id: string;
  partnerId: string;
  orderId: string;
  orderNumber: string;
  orderType: "SERVICE" | "SALES";
  baseCents: number;
  model: string;
  rate: string;
  amountCents: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  createdAt: string;
  paidAt: string | null;
}

export interface CashDeskRec {
  id: string;
  name: LText;
  type: "BRANCH" | "TECHNICIAN" | "COURIER";
  holderId: string | null;
  holderName: string;
  branchId: string;
  balanceCents: number;
  limitCents: number | null;
  shiftStatus: "OPEN" | "CLOSED" | null;
  shiftOpenedAt: string | null;
  pendingHandoverCents: number;
}

export interface CashOperationRec {
  id: string;
  deskId: string;
  kind: "COLLECTION" | "HANDOVER" | "HANDOVER_CONFIRMED" | "DISCREPANCY" | "SHIFT_OPEN" | "SHIFT_CLOSE";
  amountCents: number;
  orderNumber: string | null;
  fiscalNumber: string | null;
  actorName: string;
  at: string;
  status: "PENDING" | "CONFIRMED" | "DISPUTED";
  note: string | null;
}

export interface ReviewRec {
  id: string;
  target: "SERVICE" | "TECHNICIAN" | "PRODUCT";
  targetId: string;
  orderId: string | null;
  authorId: string;
  authorName: string;
  rating: number;
  criteria: Record<string, number>;
  pros: string | null;
  cons: string | null;
  comment: string;
  photos: number;
  status: "PENDING" | "PUBLISHED" | "REJECTED";
  reply: string | null;
  reported: boolean;
  createdAt: string;
}

export interface AuditRec {
  id: string;
  at: string;
  actorName: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceLabel: string;
  ip: string;
  changes: { field: string; from: string | null; to: string | null }[];
  reason?: string;
}

/** Mal qəbulu qaiməsi (PRD §37–38): təsdiqlənənə qədər qaralama, təsdiqdə RECEIPT hərəkətləri yaradılır. */
export interface GoodsReceiptRec {
  id: string;
  number: string;
  status: "DRAFT" | "POSTED" | "CANCELLED" | "REVERSED";
  warehouseId: string;
  supplierId: string | null;
  supplierName: string | null;
  purchaseId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  note: string | null;
  lines: {
    id: string;
    variantId: string;
    quantity: number;
    unit: string;
    unitCostCents: number;
    purpose: "SALES" | "SERVICE";
    zone: string | null;
    lot: string | null;
    expiryDate: string | null;
    serials: string[];
    movementId: string | null;
  }[];
  attachments: { id: string; name: string; mimeType: string; size: number; url: string }[];
  createdAt: string;
  createdBy: string;
  postedAt: string | null;
  postedBy: string | null;
  cancelReason: string | null;
}
