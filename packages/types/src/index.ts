import type { z } from "zod";
import type * as S from "@sp/schemas";

/** API müqaviləsindən (packages/schemas) törəyən paylaşılan tiplər. */

type I<T extends z.ZodTypeAny> = z.infer<T>;

export type Locale = I<typeof S.Locale>;
export type Role = I<typeof S.Role>;
export type PermissionScope = I<typeof S.PermissionScope>;
export type EmploymentType = I<typeof S.EmploymentType>;
export type CustomerSegment = I<typeof S.CustomerSegment>;
export type PriceType = I<typeof S.PriceType>;
export type ServiceTypeCode = I<typeof S.ServiceTypeCode>;
export type PriceModel = I<typeof S.PriceModel>;
export type ExecutionForm = I<typeof S.ExecutionForm>;
export type ServiceOrderStatus = I<typeof S.ServiceOrderStatus>;
export type StageStatus = I<typeof S.StageStatus>;
export type StageType = I<typeof S.StageType>;
export type ExecutorKind = I<typeof S.ExecutorKind>;
export type EstimateStatus = I<typeof S.EstimateStatus>;
export type EstimateLineType = I<typeof S.EstimateLineType>;
export type LogisticsStatus = I<typeof S.LogisticsStatus>;
export type SalesOrderStatus = I<typeof S.SalesOrderStatus>;
export type PaymentStatus = I<typeof S.PaymentStatus>;
export type PaymentMethod = I<typeof S.PaymentMethod>;
export type DocumentType = I<typeof S.DocumentType>;
export type SubscriptionStatus = I<typeof S.SubscriptionStatus>;
export type WarehouseType = I<typeof S.WarehouseType>;
export type MovementType = I<typeof S.MovementType>;
export type TransferStatus = I<typeof S.TransferStatus>;
export type DeliveryMethod = I<typeof S.DeliveryMethod>;
export type BillingPeriod = I<typeof S.BillingPeriod>;

export type Money = I<typeof S.Money>;
export type Quantity = I<typeof S.Quantity>;
export type LocalizedText = I<typeof S.LocalizedText>;
export type GeoPoint = I<typeof S.GeoPoint>;
export type PageMeta = I<typeof S.PageMeta>;
export type Paginated<T> = { items: T[]; meta: PageMeta };
export type ApiErrorBody = I<typeof S.ApiError>;
export type AvailableAction = I<typeof S.AvailableAction>;
export type Attachment = I<typeof S.Attachment>;
export type HistoryEntry = I<typeof S.HistoryEntry>;
export type Address = I<typeof S.Address>;
export type AddressInput = I<typeof S.AddressInput>;

export type LoginEmailRequest = I<typeof S.LoginEmailRequest>;
export type OtpRequest = I<typeof S.OtpRequest>;
export type OtpVerifyRequest = I<typeof S.OtpVerifyRequest>;
export type RegisterCustomerRequest = I<typeof S.RegisterCustomerRequest>;
export type TechnicianApplicationRequest = I<typeof S.TechnicianApplicationRequest>;
export type B2BApplicationRequest = I<typeof S.B2BApplicationRequest>;
export type Entitlements = I<typeof S.Entitlements>;
export type SessionUser = I<typeof S.SessionUser>;
export type Session = I<typeof S.Session>;
export type LoginResult = I<typeof S.LoginResult>;

export type Branding = I<typeof S.Branding>;
export type Branch = I<typeof S.Branch>;
export type ServiceZone = I<typeof S.ServiceZone>;
export type User = I<typeof S.User>;
export type RoleDefinition = I<typeof S.RoleDefinition>;
export type AuditLog = I<typeof S.AuditLog>;
export type Notification = I<typeof S.Notification>;
export type NotificationPreferences = I<typeof S.NotificationPreferences>;
export type NotificationTemplate = I<typeof S.NotificationTemplate>;
export type ContentPage = I<typeof S.ContentPage>;
export type FaqItem = I<typeof S.FaqItem>;
export type Banner = I<typeof S.Banner>;
export type Integration = I<typeof S.Integration>;
export type KpiTarget = I<typeof S.KpiTarget>;
export type ReasonCode = I<typeof S.ReasonCode>;
export type OrgSettings = I<typeof S.OrgSettings>;
export type DashboardWidget = I<typeof S.DashboardWidget>;

export type Plan = I<typeof S.Plan>;
export type Subscription = I<typeof S.Subscription>;
export type StaffLicense = I<typeof S.StaffLicense>;

export type Category = I<typeof S.Category>;
export type CategoryNode = S.CategoryNode;
export type Attribute = I<typeof S.Attribute>;
export type Brand = I<typeof S.Brand>;
export type DeviceModel = I<typeof S.DeviceModel>;
export type Price = I<typeof S.Price>;
export type AppliedDiscount = I<typeof S.AppliedDiscount>;
export type Variant = I<typeof S.Variant>;
export type ProductSummary = I<typeof S.ProductSummary>;
export type Product = I<typeof S.Product>;
export type Facet = I<typeof S.Facet>;
export type ProductListResponse = I<typeof S.ProductListResponse>;
export type SearchResponse = I<typeof S.SearchResponse>;
export type CompatibilityRecord = I<typeof S.CompatibilityRecord>;
export type Unit = I<typeof S.Unit>;
export type PriceListEntry = I<typeof S.PriceListEntry>;
export type Promotion = I<typeof S.Promotion>;

export type EquipmentCategory = I<typeof S.EquipmentCategory>;
export type Specialization = I<typeof S.Specialization>;
export type Service = I<typeof S.Service>;
export type TechnicianSummary = I<typeof S.TechnicianSummary>;
export type Technician = I<typeof S.Technician>;
export type TechnicianDocument = I<typeof S.TechnicianDocument>;
export type Partnership = I<typeof S.Partnership>;
export type TechnicianLicense = I<typeof S.TechnicianLicense>;
export type Slot = I<typeof S.Slot>;
export type SlotDay = I<typeof S.SlotDay>;
export type StageTemplate = I<typeof S.StageTemplate>;
export type WorkflowTemplate = I<typeof S.WorkflowTemplate>;
export type TemplateValidation = I<typeof S.TemplateValidation>;
export type EstimateLine = I<typeof S.EstimateLine>;
export type Estimate = I<typeof S.Estimate>;
export type EstimateLineInput = I<typeof S.EstimateLineInput>;
export type EstimateDecisionRequest = I<typeof S.EstimateDecisionRequest>;
export type Stage = I<typeof S.Stage>;
export type ServiceOrderSummary = I<typeof S.ServiceOrderSummary>;
export type ServiceOrder = I<typeof S.ServiceOrder>;
export type MaterialConsumption = I<typeof S.MaterialConsumption>;
export type CreateServiceOrderRequest = I<typeof S.CreateServiceOrderRequest>;
export type ServiceOrderActionRequest = I<typeof S.ServiceOrderActionRequest>;
export type FeeRule = I<typeof S.FeeRule>;
export type WarrantyClaim = I<typeof S.WarrantyClaim>;

export type CartItem = I<typeof S.CartItem>;
export type Cart = I<typeof S.Cart>;
export type AddToCartRequest = I<typeof S.AddToCartRequest>;
export type CheckoutOptions = I<typeof S.CheckoutOptions>;
export type CheckoutRequest = I<typeof S.CheckoutRequest>;
export type CheckoutResult = I<typeof S.CheckoutResult>;
export type SalesOrderSummary = I<typeof S.SalesOrderSummary>;
export type SalesOrder = I<typeof S.SalesOrder>;
export type ReturnRequest = I<typeof S.ReturnRequest>;
export type CreateReturnRequest = I<typeof S.CreateReturnRequest>;
export type Quote = I<typeof S.Quote>;
export type QuickOrderValidation = I<typeof S.QuickOrderValidation>;

export type Warehouse = I<typeof S.Warehouse>;
export type WarehouseGroup = I<typeof S.WarehouseGroup>;
export type StockLevel = I<typeof S.StockLevel>;
export type StockMovement = I<typeof S.StockMovement>;
export type Reservation = I<typeof S.Reservation>;
export type CreateReservationRequest = I<typeof S.CreateReservationRequest>;
export type Transfer = I<typeof S.Transfer>;
export type CreateTransferRequest = I<typeof S.CreateTransferRequest>;
export type Supplier = I<typeof S.Supplier>;
export type Purchase = I<typeof S.Purchase>;
export type StockCount = I<typeof S.StockCount>;
export type CostingRule = I<typeof S.CostingRule>;
export type UnitConversionRow = I<typeof S.UnitConversionRow>;

export type Payment = I<typeof S.Payment>;
export type InitiatePaymentRequest = I<typeof S.InitiatePaymentRequest>;
export type DocumentRecord = I<typeof S.DocumentRecord>;
export type CashDesk = I<typeof S.CashDesk>;
export type CashOperation = I<typeof S.CashOperation>;
export type SettlementLine = I<typeof S.SettlementLine>;
export type Settlement = I<typeof S.Settlement>;
export type Earnings = I<typeof S.Earnings>;
export type PartnerCommission = I<typeof S.PartnerCommission>;
export type TaxSetting = I<typeof S.TaxSetting>;
export type FinanceSummary = I<typeof S.FinanceSummary>;

export type Device = I<typeof S.Device>;
export type DeviceDetail = I<typeof S.DeviceDetail>;
export type DeviceInput = I<typeof S.DeviceInput>;
export type Warranty = I<typeof S.Warranty>;
export type WarrantyVerification = I<typeof S.WarrantyVerification>;
export type Review = I<typeof S.Review>;
export type ReviewInput = I<typeof S.ReviewInput>;
export type PendingReview = I<typeof S.PendingReview>;
export type FamilyMember = I<typeof S.FamilyMember>;
export type CustomerDashboard = I<typeof S.CustomerDashboard>;
export type Customer = I<typeof S.Customer>;
export type ProfileUpdate = I<typeof S.ProfileUpdate>;

export type B2BAccount = I<typeof S.B2BAccount>;
export type PartnerType = I<typeof S.PartnerType>;
export type CompanyUser = I<typeof S.CompanyUser>;
export type CorporateSite = I<typeof S.CorporateSite>;
export type B2BDashboard = I<typeof S.B2BDashboard>;
export type BalanceStatement = I<typeof S.BalanceStatement>;
export type ServiceContract = I<typeof S.ServiceContract>;
export type PeriodicVisit = I<typeof S.PeriodicVisit>;
export type LogisticsTask = I<typeof S.LogisticsTask>;

export type TicketStatus = I<typeof S.TicketStatus>;
export type TicketPriority = I<typeof S.TicketPriority>;
export type TicketChannel = I<typeof S.TicketChannel>;
export type TicketQueue = I<typeof S.TicketQueue>;
export type TicketSlaState = I<typeof S.TicketSlaState>;
export type TicketRelatedType = I<typeof S.TicketRelatedType>;
export type TicketCategory = I<typeof S.TicketCategory>;
export type CannedResponse = I<typeof S.CannedResponse>;
export type TicketMessage = I<typeof S.TicketMessage>;
export type TicketSla = I<typeof S.TicketSla>;
export type TicketSummary = I<typeof S.TicketSummary>;
export type Ticket = I<typeof S.Ticket>;
export type CreateTicketRequest = I<typeof S.CreateTicketRequest>;
export type ContactTicketRequest = I<typeof S.ContactTicketRequest>;
export type AdminCreateTicketRequest = I<typeof S.AdminCreateTicketRequest>;
export type TicketReplyRequest = I<typeof S.TicketReplyRequest>;
export type TicketActionRequest = I<typeof S.TicketActionRequest>;
export type TicketStats = I<typeof S.TicketStats>;

/** Usta paneli cavabları */
export interface TechnicianDashboard {
  employmentType: EmploymentType;
  planName: string | null;
  licenseActive: boolean | null;
  offers: number;
  todayJobs: ServiceOrderSummary[];
  activeJobs: number;
  activeLimit: number | null;
  monthlyAccepted: number;
  monthlyLimit: number | null;
  rating: number;
  earningsThisMonth: Money;
  cashBalance: Money;
  cashLimit: Money;
  documentsExpiring: number;
  reservationsExpiring: number;
  companies: { name: string; jobs: number }[];
}

export interface JobOffer {
  id: string;
  orderId: string;
  orderNumber: string;
  serviceName: string;
  categoryName: string;
  executionForm: ExecutionForm;
  addressShort: string;
  distanceKm: number;
  scheduledAt: string | null;
  urgent: boolean;
  estimatedEarning: Money | null;
  expiresAt: string;
  companyName: string;
  problem: string;
}

export interface ScheduleEvent {
  id: string;
  kind: "JOB" | "BLOCKED" | "VACATION" | "OTHER_COMPANY";
  title: string;
  start: string;
  end: string;
  orderId: string | null;
  status: string | null;
  address: string | null;
}

export interface DispatchBoard {
  date: string;
  technicians: {
    id: string;
    fullName: string;
    employmentType: EmploymentType;
    specializations: string[];
    workload: number;
    rating: number;
    location: GeoPoint;
    zoneNames: string[];
    events: { id: string; orderId: string; orderNumber: string; title: string; start: string; end: string; status: string; slaBreached: boolean; conflict: boolean }[];
  }[];
  unassigned: ServiceOrderSummary[];
  alerts: { id: string; kind: "SLA" | "CONFLICT" | "OFFER_TIMEOUT"; message: string; orderId: string }[];
  branches: { id: string; name: string; location: GeoPoint }[];
}

export interface MockConfig {
  delayMs: number;
  errorRate: number;
  forceError: number | null;
  emptyLists: boolean;
}

export interface ReportSummary {
  kpis: { code: string; name: string; value: string; target: string; unit: string; ok: boolean }[];
  ordersByStatus: { status: string; count: number }[];
  ordersByDay: { date: string; created: number; completed: number }[];
  revenueByBranch: { branch: string; service: number; sales: number }[];
  technicianPerformance: { name: string; jobs: number; rating: number; firstVisitFix: number; warrantyRate: number }[];
  topServices: { name: string; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  subscriptions: { plan: string; active: number; churn: number }[];
}
