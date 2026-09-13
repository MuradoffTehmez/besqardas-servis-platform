import { z } from "zod";

/** Every enum used by the API contract. Values are stable codes; labels come from i18n (`status.*`, `enum.*`). */

export const LOCALES = ["az", "ru", "en"] as const;
export const Locale = z.enum(LOCALES);

export const ROLES = [
  "GUEST",
  "CUSTOMER",
  "CORPORATE_CUSTOMER",
  "PARTNER",
  "WHOLESALE_CUSTOMER",
  "TECHNICIAN",
  "OPERATOR",
  "DISPATCHER",
  "WAREHOUSE_EMPLOYEE",
  "COURIER",
  "SALES_EMPLOYEE",
  "ACCOUNTANT",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
export const Role = z.enum(ROLES);
export const INTERNAL_ROLES = [
  "OPERATOR",
  "DISPATCHER",
  "WAREHOUSE_EMPLOYEE",
  "SALES_EMPLOYEE",
  "ACCOUNTANT",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export const PermissionScope = z.enum(["OWN", "ASSIGNED", "BRANCH", "ORGANIZATION", "PLATFORM"]);
export const PermissionAction = z.enum(["view", "create", "edit", "delete", "approve", "assign", "export", "update_status"]);

export const EmploymentType = z.enum(["STAFF", "INDEPENDENT"]);
export const CustomerSegment = z.enum(["RETAIL", "PARTNER", "WHOLESALE", "CORPORATE"]);
export const PriceType = z.enum(["RETAIL", "TECHNICIAN", "PARTNER", "WHOLESALE", "CORPORATE"]);

export const ServiceTypeCode = z.enum(["INSTALLATION", "REMOVAL", "MEASUREMENT", "DIAGNOSTICS", "REPAIR", "PERIODIC"]);
export const PriceModel = z.enum(["FIXED", "STARTING_FROM", "ESTIMATE_BASED"]);
export const ExecutionForm = z.enum(["ON_SITE", "CARRY_IN", "PICKUP_DELIVERY"]);
export const AssignmentMethod = z.enum(["CUSTOMER_CHOICE", "DISPATCHER", "AUTO"]);
export const OrderSource = z.enum(["WEB", "OPERATOR", "B2B", "AUTO", "WARRANTY", "PRODUCT_PURCHASE"]);
export const ServiceOrderType = z.enum(["STANDARD", "WARRANTY", "PERIODIC"]);
export const ContactChannel = z.enum(["CALL", "SMS", "WHATSAPP", "EMAIL"]);

export const ServiceOrderStatus = z.enum([
  "DRAFT",
  "NEW",
  "CONFIRMED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "ON_HOLD",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
]);

export const StageStatus = z.enum([
  "PENDING",
  "READY",
  "ASSIGNED",
  "ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PART",
  "BLOCKED",
  "COMPLETED",
  "SKIPPED",
  "FAILED",
  "CANCELLED",
]);

export const StageType = z.enum([
  "CHECK",
  "ASSIGNMENT",
  "ARRIVAL",
  "MEASUREMENT",
  "MATERIAL_CALC",
  "DIAGNOSTICS",
  "ESTIMATE_APPROVAL",
  "WAIT_PART",
  "WAREHOUSE_PREP",
  "LOGISTICS",
  "INTAKE",
  "EXECUTION",
  "TEST",
  "READY_NOTICE",
  "FINAL_CHECK",
  "HANDOVER",
  "PAYMENT",
  "WARRANTY",
]);

export const ExecutorKind = z.enum([
  "OPERATOR",
  "DISPATCHER",
  "WAREHOUSE_EMPLOYEE",
  "SALES_EMPLOYEE",
  "MANAGER",
  "TECHNICIAN",
  "COURIER",
  "CUSTOMER",
  "SYSTEM",
]);

export const TemplateStatus = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const EstimateStatus = z.enum(["DRAFT", "SENT", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "EXPIRED"]);
export const EstimateLineType = z.enum(["MATERIAL", "LABOR", "EXTRA", "LOGISTICS", "FEE", "DISCOUNT"]);

export const FeeType = z.enum(["CALL_OUT", "DIAGNOSTICS", "AFTER_HOURS", "LOGISTICS", "LATE_CANCELLATION"]);
export const FeeTrigger = z.enum(["ALWAYS", "ON_ESTIMATE_REJECT", "ON_CANCEL_AFTER_DEPARTURE"]);
export const ReasonCategory = z.enum(["ON_HOLD", "CANCELLED", "REJECTED", "FAILED", "RESCHEDULE", "ESTIMATE_REJECT", "DECLINE_JOB", "FEE_WAIVE", "RETURN"]);

export const LogisticsTaskType = z.enum(["PICKUP", "DELIVERY", "TRANSFER"]);
export const LogisticsStatus = z.enum(["PLANNED", "ASSIGNED", "ON_THE_WAY", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"]);
export const DeviceLocation = z.enum(["AT_CUSTOMER", "IN_TRANSIT", "SERVICE_CENTER", "DELIVERED"]);

export const SalesOrderStatus = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
]);
export const DeliveryMethod = z.enum(["COURIER", "PICKUP", "WITH_INSTALLATION"]);
export const ReturnStatus = z.enum(["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "INSPECTED", "REFUNDED", "CLOSED"]);
export const QuoteStatus = z.enum(["REQUESTED", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]);

export const PaymentStatus = z.enum(["INITIATED", "PENDING", "PAID", "PARTIALLY_PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]);
export const PaymentMethod = z.enum(["CASH", "CARD_ONLINE", "CARD_POS", "BANK_TRANSFER", "INSTALLMENT", "BALANCE"]);
export const PaymentKind = z.enum(["FULL", "ADVANCE", "PARTIAL"]);

export const DocumentType = z.enum([
  "FISCAL_RECEIPT",
  "INVOICE",
  "E_INVOICE",
  "SERVICE_ACT",
  "WARRANTY",
  "RECONCILIATION_ACT",
  "INTAKE_ACT",
  "HANDOVER_ACT",
  "SETTLEMENT_ACT",
]);
export const DocumentStatus = z.enum(["DRAFT", "ISSUED", "CANCELLED", "CORRECTED"]);

export const WarrantyType = z.enum(["MANUFACTURER", "SALES", "WORK", "PART", "EXTENDED"]);
export const WarrantyStatus = z.enum(["ACTIVE", "EXPIRED", "VOID"]);
export const WarrantyClaimStatus = z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED"]);

export const SubscriptionStatus = z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "CANCELLED", "EXPIRED"]);
export const PlanGroup = z.enum(["CUSTOMER", "TECHNICIAN", "CORPORATE", "CUSTOM"]);
export const PlanVisibility = z.enum(["PUBLIC", "INVITE_ONLY", "ARCHIVED"]);
export const BillingPeriod = z.enum(["MONTH_1", "MONTH_3", "MONTH_6", "MONTH_12"]);

export const WarehouseType = z.enum(["CENTRAL", "BRANCH", "SERVICE_CENTER", "MOBILE", "TECHNICIAN", "TRANSIT", "QUARANTINE"]);
export const StockPurpose = z.enum(["SALES", "SERVICE"]);
export const MovementType = z.enum([
  "RECEIPT",
  "SALE_ISSUE",
  "SERVICE_CONSUMPTION",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RETURN",
  "WRITE_OFF",
  "PURPOSE_CHANGE",
  "ADJUSTMENT",
]);
export const ReservationSource = z.enum(["SERVICE_ORDER", "SALES_ORDER", "TECHNICIAN", "TRANSFER"]);
export const ReservationStatus = z.enum(["ACTIVE", "RELEASED", "CONSUMED", "EXPIRED"]);
export const TransferStatus = z.enum(["DRAFT", "APPROVED", "IN_TRANSIT", "RECEIVED", "PARTIALLY_RECEIVED", "DISCREPANCY", "CANCELLED"]);
export const PurchaseStatus = z.enum(["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"]);
export const StockCountStatus = z.enum(["DRAFT", "IN_PROGRESS", "PENDING_APPROVAL", "APPROVED", "CANCELLED"]);
export const CostingMethod = z.enum(["WEIGHTED_AVERAGE", "FIFO"]);
export const CostingLevel = z.enum(["PRODUCT", "CATEGORY", "WAREHOUSE_GROUP", "COMPANY"]);

export const SettlementStatus = z.enum(["PENDING", "APPROVED", "PAID", "ON_HOLD"]);
export const CommissionStatus = z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]);
export const CommissionModel = z.enum(["PERCENT", "FIXED", "BY_SERVICE_TYPE", "CONTRACT"]);
export const CommissionBase = z.enum(["NET_OF_VAT", "LABOR_ONLY", "WHOLE_ORDER"]);
export const DiscountStacking = z.enum(["STACKABLE", "EXCLUSIVE", "COMBINABLE_WITH_LIST"]);
export const DiscountBase = z.enum(["BASE_PRICE", "AFTER_PREVIOUS"]);

export const VerificationStatus = z.enum(["PENDING", "VERIFIED", "REJECTED", "EXPIRED"]);
export const TechnicianStatus = z.enum(["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "ACTIVE", "SUSPENDED"]);
export const ExperienceLevel = z.enum(["BEGINNER", "INTERMEDIATE", "EXPERT"]);
export const LicenseStatus = z.enum(["ACTIVE", "REVOKED"]);
export const PartnershipStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "ENDED"]);

export const B2BAccountStatus = z.enum(["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED"]);
export const CompanyUserRole = z.enum(["OWNER", "ORDERER", "APPROVER", "ACCOUNTANT", "SITE_MANAGER"]);
export const PaymentTerms = z.enum(["PREPAID", "DEFERRED"]);

export const ReviewStatus = z.enum(["PENDING", "PUBLISHED", "REJECTED"]);
export const ReviewTarget = z.enum(["SERVICE", "TECHNICIAN", "PRODUCT"]);
export const NotificationChannel = z.enum(["IN_APP", "PUSH", "EMAIL", "SMS", "WHATSAPP"]);
export const CashShiftStatus = z.enum(["OPEN", "CLOSED"]);
export const CashDeskType = z.enum(["BRANCH", "TECHNICIAN", "COURIER"]);
export const IntegrationArea = z.enum(["PAYMENT", "POS", "INSTALLMENT", "FISCAL", "E_INVOICE", "SMS", "MESSAGING", "EMAIL", "PUSH", "MAP", "STORAGE", "ACCOUNTING"]);
export const SyncStatus = z.enum(["NOT_SENT", "SENT", "FAILED", "ACKNOWLEDGED"]);
export const ProductType = z.enum(["PHYSICAL", "SPARE_PART", "CONSUMABLE", "BUNDLE"]);
export const AttributeType = z.enum(["TEXT", "NUMBER", "NUMBER_UNIT", "BOOLEAN", "SELECT", "MULTISELECT", "DATE"]);
export const FilterDisplay = z.enum(["CHECKBOX", "RANGE", "SLIDER"]);
export const ContentStatus = z.enum(["DRAFT", "PUBLISHED"]);
