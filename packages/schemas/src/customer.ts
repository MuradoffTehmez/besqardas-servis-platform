import { z } from "zod";
import { AvailableAction, Id, IsoDateTime, Money } from "./common";
import { DeviceLocation, ReviewStatus, ReviewTarget, WarrantyStatus, WarrantyType } from "./enums";

/** PRD §52–55 customer modules, §23 warranty */

export const Device = z.object({
  id: Id,
  addressId: z.string().nullable(),
  addressLabel: z.string(),
  categoryId: Id,
  categoryName: z.string(),
  brandId: Id,
  brandName: z.string(),
  modelId: z.string().nullable(),
  modelName: z.string(),
  nickname: z.string().nullable(),
  serialNumber: z.string().nullable(),
  purchasedAt: IsoDateTime.nullable(),
  installedAt: IsoDateTime.nullable(),
  nextServiceAt: IsoDateTime.nullable(),
  warrantyStatus: z.enum(["ACTIVE", "EXPIRING", "EXPIRED", "NONE"]),
  warrantyUntil: IsoDateTime.nullable(),
  qrCode: z.string(),
  source: z.enum(["PURCHASE", "MANUAL", "SERVICE"]),
  location: DeviceLocation,
  imageTone: z.string(),
  ownerName: z.string(),
  sharedWithFamily: z.boolean(),
});

export const DeviceDetail = Device.extend({
  warranties: z.array(z.object({ id: Id, number: z.string(), type: WarrantyType, status: WarrantyStatus, endsAt: IsoDateTime })),
  history: z.array(
    z.object({
      id: Id,
      date: IsoDateTime,
      orderId: Id,
      orderNumber: z.string(),
      title: z.string(),
      technicianName: z.string().nullable(),
      works: z.array(z.string()),
      materials: z.array(z.string()),
      documents: z.array(z.object({ id: Id, number: z.string(), type: z.string() })),
      photos: z.number(),
      warrantyUntil: IsoDateTime.nullable(),
    }),
  ),
  documents: z.array(z.object({ id: Id, number: z.string(), type: z.string(), issuedAt: IsoDateTime })),
  compatiblePartsCount: z.number(),
});

export const DeviceInput = z.object({
  addressId: z.string().min(1, { message: "validation.required" }),
  categoryId: z.string().min(1, { message: "validation.required" }),
  brandId: z.string().min(1, { message: "validation.required" }),
  modelId: z.string().optional(),
  modelName: z.string().optional(),
  nickname: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasedAt: z.string().optional(),
  installedAt: z.string().optional(),
});

export const Warranty = z.object({
  id: Id,
  number: z.string(),
  code: z.string(),
  type: WarrantyType,
  status: WarrantyStatus,
  deviceId: z.string().nullable(),
  deviceName: z.string(),
  serialNumber: z.string().nullable(),
  coverage: z.string(),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  orderNumber: z.string().nullable(),
  customerName: z.string(),
  canClaim: z.boolean(),
});

export const WarrantyVerification = z.object({
  valid: z.boolean(),
  code: z.string(),
  status: WarrantyStatus.nullable(),
  type: WarrantyType.nullable(),
  deviceName: z.string().nullable(),
  serialMasked: z.string().nullable(),
  coverage: z.string().nullable(),
  startsAt: IsoDateTime.nullable(),
  endsAt: IsoDateTime.nullable(),
  issuer: z.string().nullable(),
});

export const Review = z.object({
  id: Id,
  target: ReviewTarget,
  targetId: Id,
  targetName: z.string(),
  orderNumber: z.string().nullable(),
  authorName: z.string(),
  rating: z.number(),
  criteria: z.record(z.string(), z.number()),
  pros: z.string().nullable(),
  cons: z.string().nullable(),
  comment: z.string(),
  photos: z.number(),
  status: ReviewStatus,
  reply: z.string().nullable(),
  reported: z.boolean(),
  createdAt: IsoDateTime,
  availableActions: z.array(AvailableAction),
});

export const ReviewInput = z.object({
  target: ReviewTarget,
  targetId: z.string(),
  orderId: z.string().optional(),
  rating: z.number().int().min(1, { message: "validation.rating" }).max(5),
  criteria: z.record(z.string(), z.number()).default({}),
  pros: z.string().optional(),
  cons: z.string().optional(),
  comment: z.string().min(10, { message: "validation.commentMin" }),
});

export const PendingReview = z.object({
  target: ReviewTarget,
  targetId: Id,
  targetName: z.string(),
  orderId: Id,
  orderNumber: z.string(),
  completedAt: IsoDateTime,
});

export const FamilyMember = z.object({
  id: Id,
  name: z.string(),
  phone: z.string(),
  relation: z.string(),
  status: z.enum(["INVITED", "ACTIVE"]),
  sharedDeviceIds: z.array(z.string()),
  canCreateOrders: z.boolean(),
  invitedAt: IsoDateTime,
});

export const CustomerDashboard = z.object({
  activeOrders: z.array(
    z.object({ id: Id, number: z.string(), serviceName: z.string(), stageName: z.string().nullable(), status: z.string(), progress: z.number(), scheduledAt: IsoDateTime.nullable() }),
  ),
  pendingEstimates: z.array(z.object({ orderId: Id, orderNumber: z.string(), serviceName: z.string(), total: Money, validUntil: IsoDateTime })),
  upcoming: z.array(z.object({ id: Id, title: z.string(), date: IsoDateTime, kind: z.enum(["SERVICE", "REMINDER", "PERIODIC"]), href: z.string() })),
  expiringWarranties: z.array(z.object({ id: Id, deviceName: z.string(), endsAt: IsoDateTime })),
  subscription: z.object({ planName: z.string(), status: z.string(), renewsAt: IsoDateTime.nullable(), tier: z.number() }),
  stats: z.object({ devices: z.number(), completedOrders: z.number(), activeWarranties: z.number(), savedAmount: Money }),
});

export const Customer = z.object({
  id: Id,
  fullName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  segment: z.string(),
  planCode: z.string(),
  city: z.string(),
  devicesCount: z.number(),
  ordersCount: z.number(),
  totalSpent: Money,
  lastOrderAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "BLOCKED"]),
  consent: z.object({ personalData: z.boolean(), marketing: z.boolean() }),
});

export const ProfileUpdate = z.object({
  firstName: z.string().min(2, { message: "validation.required" }),
  lastName: z.string().min(2, { message: "validation.required" }),
  email: z.email({ message: "validation.email" }).nullable().optional(),
  phone: z.string().nullable().optional(),
  locale: z.enum(["az", "ru", "en"]),
  birthDate: z.string().optional(),
});
