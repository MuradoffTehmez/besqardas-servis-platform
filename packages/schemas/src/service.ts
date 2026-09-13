import { z } from "zod";
import { Address, Attachment, AvailableAction, GeoPoint, HistoryEntry, Id, IsoDateTime, LocalizedText, Money, Quantity } from "./common";
import {
  AssignmentMethod,
  ContactChannel,
  EmploymentType,
  EstimateLineType,
  EstimateStatus,
  ExecutionForm,
  ExecutorKind,
  ExperienceLevel,
  FeeTrigger,
  FeeType,
  LicenseStatus,
  OrderSource,
  PartnershipStatus,
  PriceModel,
  ServiceOrderStatus,
  ServiceOrderType,
  ServiceTypeCode,
  StageStatus,
  StageType,
  TechnicianStatus,
  TemplateStatus,
  VerificationStatus,
  DeviceLocation,
} from "./enums";

/** PRD §10–20: services, specializations, technicians, service orders, workflow, estimates, fees */

export const EquipmentCategory = z.object({
  id: Id,
  code: z.string(),
  slug: z.string(),
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  icon: z.string(),
  serviceTypes: z.array(ServiceTypeCode),
  skills: z.array(z.object({ id: Id, name: z.string() })),
  order: z.number(),
  active: z.boolean(),
});

export const Specialization = z.object({
  id: Id,
  categoryId: Id,
  categoryName: z.string(),
  serviceType: ServiceTypeCode,
  name: z.string(),
  requiresCertificate: z.boolean(),
});

export const Service = z.object({
  id: Id,
  slug: z.string(),
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  shortDescription: z.string(),
  description: z.string(),
  categoryId: Id,
  categoryName: z.string(),
  categorySlug: z.string(),
  serviceType: ServiceTypeCode,
  executionForms: z.array(ExecutionForm),
  priceModel: PriceModel,
  price: Money.nullable(),
  requiredSpecializationIds: z.array(z.string()),
  workflowTemplateIds: z.record(z.string(), z.string()),
  estimatedDurationMinutes: z.number(),
  workWarrantyMonths: z.number(),
  imageTone: z.string(),
  icon: z.string(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  seoTitle: z.string(),
  seoDescription: z.string(),
  assignmentMethod: AssignmentMethod,
  slotMinutes: z.number(),
  travelBufferMinutes: z.number(),
  problems: z.array(z.object({ code: z.string(), label: z.string() })),
  rating: z.number(),
  completedCount: z.number(),
  active: z.boolean(),
});

export const TechnicianSummary = z.object({
  id: Id,
  fullName: z.string(),
  avatarTone: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  completedJobs: z.number(),
  specializations: z.array(z.string()),
  employmentType: EmploymentType,
  promoted: z.boolean(),
  nextAvailableAt: IsoDateTime.nullable(),
  city: z.string(),
  experienceYears: z.number(),
  verified: z.boolean(),
});

export const TechnicianDocument = z.object({
  id: Id,
  kind: z.enum(["ID_CARD", "CERTIFICATE", "DIPLOMA", "CRIMINAL_RECORD", "OTHER"]),
  name: z.string(),
  status: VerificationStatus,
  expiresAt: IsoDateTime.nullable(),
  uploadedAt: IsoDateTime,
  note: z.string().nullable(),
});

export const TechnicianSpecialization = z.object({
  id: Id,
  specializationId: Id,
  name: z.string(),
  categoryName: z.string(),
  serviceType: ServiceTypeCode,
  level: ExperienceLevel,
  active: z.boolean(),
  status: z.enum(["ACTIVE", "PENDING_APPROVAL", "INACTIVE_CERT_EXPIRED"]),
  certificateExpiresAt: IsoDateTime.nullable(),
});

export const Technician = TechnicianSummary.extend({
  bio: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: TechnicianStatus,
  branchId: z.string().nullable(),
  branchName: z.string().nullable(),
  zoneNames: z.array(z.string()),
  skills: z.array(z.string()),
  specializationDetails: z.array(TechnicianSpecialization),
  languages: z.array(z.string()),
  planCode: z.string().nullable(),
  licenseStatus: LicenseStatus.nullable(),
  documents: z.array(TechnicianDocument),
  workingHours: z.array(z.object({ day: z.number(), from: z.string(), to: z.string(), off: z.boolean() })),
  workload: z.number(),
  warrantyClaimRate: z.number(),
  onTimeRate: z.number(),
  location: GeoPoint,
  joinedAt: IsoDateTime,
  reviews: z.array(
    z.object({ id: Id, authorName: z.string(), rating: z.number(), comment: z.string(), createdAt: IsoDateTime, reply: z.string().nullable() }),
  ),
});

export const Partnership = z.object({
  id: Id,
  technicianId: Id,
  technicianName: z.string(),
  companyName: z.string(),
  status: PartnershipStatus,
  initiatedBy: z.enum(["TECHNICIAN", "COMPANY"]),
  zones: z.array(z.string()),
  priceListName: z.string(),
  jobsCount: z.number(),
  createdAt: IsoDateTime,
});

export const TechnicianLicense = z.object({
  id: Id,
  technicianId: Id,
  technicianName: z.string(),
  branchName: z.string(),
  status: LicenseStatus,
  issuedAt: IsoDateTime,
  issuedBy: z.string(),
});

export const Slot = z.object({
  start: IsoDateTime,
  end: IsoDateTime,
  available: z.boolean(),
  technicianIds: z.array(z.string()),
  urgent: z.boolean().optional(),
});

export const SlotDay = z.object({ date: z.string(), slots: z.array(Slot) });

/* ---------------- Workflow templates (§17) ---------------- */

export const StageTemplate = z.object({
  id: Id,
  order: z.number(),
  name: LocalizedText,
  customerName: LocalizedText.nullable(),
  type: StageType,
  executor: ExecutorKind,
  executorSpecializationId: z.string().nullable(),
  mandatory: z.boolean(),
  startConditions: z.array(z.enum(["ESTIMATE_APPROVED", "ADVANCE_PAID", "MATERIAL_RESERVED", "PREVIOUS_COMPLETED"])),
  completionRequirements: z.array(z.enum(["PHOTO", "CHECKLIST", "SIGNATURE", "NOTE"])),
  checklist: z.array(z.string()).default([]),
  slaMinutes: z.number().nullable(),
  parallelWithPrevious: z.boolean(),
  notifyOnStart: z.array(z.string()),
  notifyOnComplete: z.array(z.string()),
});

export const WorkflowTemplate = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  serviceIds: z.array(z.string()),
  serviceNames: z.array(z.string()),
  executionForm: ExecutionForm,
  version: z.number(),
  status: TemplateStatus,
  stages: z.array(StageTemplate),
  activeOrders: z.number(),
  versions: z.array(z.object({ version: z.number(), status: TemplateStatus, createdAt: IsoDateTime, createdBy: z.string() })),
  updatedAt: IsoDateTime,
});

export const TemplateValidation = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({ code: z.string(), message: z.string(), stageId: z.string().nullable() })),
});

/* ---------------- Estimate (§19) ---------------- */

export const EstimateLine = z.object({
  id: Id,
  type: EstimateLineType,
  name: z.string(),
  productId: z.string().nullable(),
  sku: z.string().nullable(),
  quantity: Quantity,
  unitPrice: Money,
  total: Money,
  optional: z.boolean(),
  declined: z.boolean(),
  warrantyMonths: z.number().nullable(),
  ownMaterial: z.boolean(),
  vatRate: z.string(),
});

export const Estimate = z.object({
  id: Id,
  number: z.string(),
  orderId: Id,
  version: z.number(),
  status: EstimateStatus,
  lines: z.array(EstimateLine),
  subtotal: Money,
  discountTotal: Money,
  vatTotal: Money,
  total: Money,
  appliedDiscounts: z.array(z.object({ code: z.string(), label: z.string(), amount: Money })),
  validUntil: IsoDateTime,
  createdAt: IsoDateTime,
  createdBy: z.string(),
  decidedAt: IsoDateTime.nullable(),
  decisionChannel: z.enum(["CABINET", "SMS_LINK", "SIGNATURE", "PHONE"]).nullable(),
  rejectReason: z.string().nullable(),
  previousVersions: z.array(z.object({ version: z.number(), total: Money, status: EstimateStatus, createdAt: IsoDateTime })),
  applicableFees: z.array(z.object({ type: FeeType, label: z.string(), amount: Money, trigger: FeeTrigger })),
  availableActions: z.array(AvailableAction),
});

export const EstimateLineInput = z.object({
  type: EstimateLineType,
  productId: z.string().nullable().optional(),
  name: z.string().min(1),
  quantity: z.string().regex(/^\d+(\.\d+)?$/),
  unit: z.string(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  optional: z.boolean().default(false),
  ownMaterial: z.boolean().default(false),
});

export const EstimateDecisionRequest = z.object({
  decision: z.enum(["APPROVE", "PARTIAL", "REJECT", "QUESTION"]),
  declinedLineIds: z.array(z.string()).default([]),
  reasonCode: z.string().optional(),
  comment: z.string().optional(),
  channel: z.enum(["CABINET", "SMS_LINK", "SIGNATURE", "PHONE"]).default("CABINET"),
});

/* ---------------- Service order (§13, §18) ---------------- */

export const Stage = z.object({
  id: Id,
  templateStageId: Id,
  order: z.number(),
  name: z.string(),
  customerName: z.string().nullable(),
  type: StageType,
  executor: ExecutorKind,
  status: StageStatus,
  mandatory: z.boolean(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  specializationName: z.string().nullable(),
  startedAt: IsoDateTime.nullable(),
  completedAt: IsoDateTime.nullable(),
  dueAt: IsoDateTime.nullable(),
  slaBreached: z.boolean(),
  completionRequirements: z.array(z.string()),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })),
  photos: z.array(Attachment),
  note: z.string().nullable(),
  signed: z.boolean(),
  failReason: z.string().nullable(),
});

export const ServiceOrderDevice = z.object({
  deviceId: z.string().nullable(),
  categoryName: z.string(),
  brandName: z.string(),
  modelName: z.string(),
  serialNumber: z.string().nullable(),
  location: DeviceLocation.nullable(),
  qrCode: z.string().nullable(),
});

export const ServiceOrderSummary = z.object({
  id: Id,
  number: z.string(),
  type: ServiceOrderType,
  status: ServiceOrderStatus,
  serviceName: z.string(),
  serviceSlug: z.string(),
  categoryName: z.string(),
  executionForm: ExecutionForm,
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  technicianName: z.string().nullable(),
  technicianId: z.string().nullable(),
  currentStageName: z.string().nullable(),
  currentStageStatus: StageStatus.nullable(),
  scheduledAt: IsoDateTime.nullable(),
  urgent: z.boolean(),
  total: Money.nullable(),
  branchName: z.string(),
  source: OrderSource,
  slaBreached: z.boolean(),
  createdAt: IsoDateTime,
  companyName: z.string().nullable(),
  addressShort: z.string().nullable(),
  progress: z.number(),
});

export const MaterialConsumption = z.object({
  id: Id,
  productId: Id,
  name: z.string(),
  sku: z.string(),
  quantity: Quantity,
  warehouseName: z.string(),
  ownMaterial: z.boolean(),
  cost: Money.nullable(),
  at: IsoDateTime,
});

export const ServiceOrder = ServiceOrderSummary.extend({
  serviceId: Id,
  templateId: Id,
  templateName: z.string(),
  templateVersion: z.number(),
  customerId: Id,
  customerEmail: z.string().nullable(),
  customerPlan: z.string().nullable(),
  device: ServiceOrderDevice,
  problem: z.object({ code: z.string().nullable(), label: z.string().nullable(), description: z.string() }),
  attachments: z.array(Attachment),
  address: Address.nullable(),
  contactChannel: ContactChannel,
  note: z.string().nullable(),
  stages: z.array(Stage),
  estimate: Estimate.nullable(),
  materials: z.array(MaterialConsumption),
  history: z.array(HistoryEntry),
  payments: z.array(z.object({ id: Id, number: z.string(), method: z.string(), status: z.string(), amount: Money, createdAt: IsoDateTime })),
  documents: z.array(z.object({ id: Id, number: z.string(), type: z.string(), status: z.string(), createdAt: IsoDateTime })),
  paymentStatus: z.string(),
  paidAmount: Money,
  dueAmount: Money,
  warrantyId: z.string().nullable(),
  relatedOrderNumber: z.string().nullable(),
  salesOrderNumber: z.string().nullable(),
  operatorName: z.string().nullable(),
  assignmentMethod: AssignmentMethod,
  logisticsTaskIds: z.array(z.string()),
  endCustomer: z.object({ name: z.string(), phone: z.string(), address: z.string() }).nullable(),
  cancellationTerms: z.string(),
  availableActions: z.array(AvailableAction),
  technicianPhoneVisible: z.boolean(),
  technicianPhone: z.string().nullable(),
  oldPartDisposition: z.enum(["RETURN_TO_CUSTOMER", "DISPOSE", "WARRANTY_RETURN"]).nullable(),
});

export const CreateServiceOrderRequest = z.object({
  serviceId: z.string().min(1),
  executionForm: ExecutionForm,
  deviceId: z.string().nullable().optional(),
  newDevice: z
    .object({ categoryId: z.string(), brandId: z.string(), modelId: z.string().optional(), modelName: z.string().optional(), serialNumber: z.string().optional() })
    .nullable()
    .optional(),
  problemCode: z.string().nullable().optional(),
  description: z.string().min(5, { message: "validation.descriptionMin" }),
  attachments: z.array(z.object({ name: z.string(), mimeType: z.string(), size: z.number() })).default([]),
  addressId: z.string().nullable().optional(),
  oneTimeAddress: z.object({ city: z.string(), street: z.string(), building: z.string().optional(), apartment: z.string().optional() }).nullable().optional(),
  slotStart: z.string().nullable().optional(),
  technicianId: z.string().nullable().optional(),
  urgent: z.boolean().default(false),
  contactChannel: ContactChannel,
  note: z.string().optional(),
  // operator / partner fields
  customerId: z.string().optional(),
  endCustomer: z.object({ name: z.string(), phone: z.string(), address: z.string() }).optional(),
  source: OrderSource.optional(),
});

export const ServiceOrderActionRequest = z.object({
  action: z.string(),
  stageId: z.string().optional(),
  reasonCode: z.string().optional(),
  note: z.string().optional(),
  technicianId: z.string().optional(),
  scheduledAt: z.string().optional(),
  executionForm: ExecutionForm.optional(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
  photos: z.array(z.object({ name: z.string() })).optional(),
  signed: z.boolean().optional(),
  lines: z.array(EstimateLineInput).optional(),
  materials: z.array(z.object({ productId: z.string(), quantity: z.string(), unit: z.string(), ownMaterial: z.boolean() })).optional(),
  payment: z.object({ method: z.string(), amount: z.string() }).optional(),
});

/* ---------------- Fee rules (§20) ---------------- */

export const FeeRule = z.object({
  id: Id,
  name: z.string(),
  type: FeeType,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  serviceType: ServiceTypeCode.nullable(),
  executionForm: ExecutionForm.nullable(),
  timeCondition: z.object({ weekends: z.boolean(), from: z.string().nullable(), to: z.string().nullable() }).nullable(),
  zone: z.enum(["ANY", "IN_CITY", "OUT_OF_CITY"]),
  excludedPlans: z.array(z.string()),
  trigger: FeeTrigger,
  amountType: z.enum(["FIXED", "PERCENT"]),
  amount: z.string(),
  onEstimateApproved: z.enum(["INCLUDE", "WAIVE"]),
  validFrom: IsoDateTime,
  validTo: IsoDateTime.nullable(),
  active: z.boolean(),
});

export const WarrantyClaim = z.object({
  id: Id,
  number: z.string(),
  warrantyId: Id,
  warrantyNumber: z.string(),
  customerName: z.string(),
  deviceName: z.string(),
  description: z.string(),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED"]),
  serviceOrderNumber: z.string().nullable(),
  originalOrderNumber: z.string().nullable(),
  technicianName: z.string().nullable(),
  decisionNote: z.string().nullable(),
  createdAt: IsoDateTime,
});
