import { z } from "zod";
import { GeoPoint, Id, IsoDateTime, LocalizedText } from "./common";
import { ContentStatus, IntegrationArea, NotificationChannel, PermissionScope, Role } from "./enums";

/** Tenant və brend (PRD §56), filiallar (§57), istifadəçi və rollar (§8), bildirişlər (§58), məzmun, inteqrasiyalar, audit */

export const Branding = z.object({
  tenantId: Id,
  companyName: z.string(),
  legalName: z.string(),
  domain: z.string(),
  adminDomain: z.string(),
  logoText: z.string(),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  colors: z.object({ primary: z.string(), accent: z.string(), secondary: z.string() }),
  contacts: z.object({
    phone: z.string(),
    hotline: z.string(),
    email: z.string(),
    whatsapp: z.string(),
    address: z.string(),
  }),
  social: z.record(z.string(), z.string()).default({}),
  voen: z.string(),
  documentFooter: z.string(),
});

export const WorkingHours = z.array(
  z.object({ day: z.number().int().min(0).max(6), from: z.string(), to: z.string(), closed: z.boolean().default(false) }),
);

export const Branch = z.object({
  id: Id,
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  city: z.string(),
  address: z.string(),
  location: GeoPoint,
  phone: z.string(),
  email: z.string(),
  workingHours: WorkingHours,
  hasServiceCenter: z.boolean(),
  managerName: z.string(),
  warehouseIds: z.array(z.string()),
  zoneIds: z.array(z.string()),
  active: z.boolean(),
});

export const ServiceZone = z.object({
  id: Id,
  name: z.string(),
  branchId: z.string(),
  city: z.string(),
  polygon: z.array(GeoPoint),
  outOfCity: z.boolean(),
  active: z.boolean(),
});

export const User = z.object({
  id: Id,
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  roles: z.array(Role),
  branchId: z.string().nullable(),
  branchName: z.string().nullable(),
  status: z.enum(["ACTIVE", "INVITED", "BLOCKED"]),
  twoFactorEnabled: z.boolean(),
  lastLoginAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});

export const RolePermission = z.object({ code: z.string(), scope: PermissionScope });
export const RoleDefinition = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  description: z.string(),
  system: z.boolean(),
  internal: z.boolean(),
  permissions: z.array(RolePermission),
  userCount: z.number(),
});

export const AuditLog = z.object({
  id: Id,
  at: IsoDateTime,
  actorName: z.string(),
  actorRole: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  resourceLabel: z.string(),
  ip: z.string(),
  changes: z.array(z.object({ field: z.string(), from: z.string().nullable(), to: z.string().nullable() })),
  reason: z.string().optional(),
});

export const Notification = z.object({
  id: Id,
  event: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: IsoDateTime,
  channel: NotificationChannel,
});

export const NotificationPreferences = z.object({
  channels: z.record(z.string(), z.record(NotificationChannel, z.boolean())),
  marketingConsent: z.boolean(),
  quietHours: z.object({ enabled: z.boolean(), from: z.string(), to: z.string() }),
});

export const NotificationTemplate = z.object({
  id: Id,
  event: z.string(),
  channel: NotificationChannel,
  recipient: z.string(),
  subject: LocalizedText,
  body: LocalizedText,
  variables: z.array(z.string()),
  active: z.boolean(),
  mandatory: z.boolean(),
  updatedAt: IsoDateTime,
});

export const ContentPage = z.object({
  id: Id,
  slug: z.string(),
  title: LocalizedText,
  body: LocalizedText,
  seoTitle: LocalizedText.optional(),
  seoDescription: LocalizedText.optional(),
  status: ContentStatus,
  updatedAt: IsoDateTime,
});

export const FaqItem = z.object({
  id: Id,
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  questionI18n: LocalizedText.optional(),
  answerI18n: LocalizedText.optional(),
  order: z.number(),
  status: ContentStatus,
});

export const Banner = z.object({
  id: Id,
  placement: z.enum(["HOME_HERO", "HOME_STRIP", "SHOP_TOP"]),
  title: z.string(),
  subtitle: z.string(),
  titleI18n: LocalizedText.optional(),
  subtitleI18n: LocalizedText.optional(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  tone: z.enum(["primary", "accent", "dark"]),
  activeFrom: IsoDateTime,
  activeTo: IsoDateTime.nullable(),
  status: ContentStatus,
});

export const Integration = z.object({
  id: Id,
  area: IntegrationArea,
  interfaceName: z.string(),
  provider: z.string(),
  mode: z.enum(["SANDBOX", "LIVE"]),
  active: z.boolean(),
  primary: z.boolean(),
  configured: z.boolean(),
  maskedKey: z.string().nullable(),
  lastEventAt: IsoDateTime.nullable(),
  health: z.enum(["OK", "DEGRADED", "DOWN", "UNKNOWN"]),
});

export const KpiTarget = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  measurement: z.string(),
  target: z.string(),
  unit: z.string(),
  comparator: z.enum(["LTE", "GTE"]),
  current: z.string().nullable(),
  scope: z.object({ serviceType: z.string().nullable(), branchId: z.string().nullable(), segment: z.string().nullable() }),
});

export const ReasonCode = z.object({
  id: Id,
  code: z.string(),
  category: z.string(),
  label: z.string(),
  labelI18n: LocalizedText.optional(),
  active: z.boolean(),
});

export const OrgSettings = z.object({
  orderNumberPrefix: z.object({ service: z.string(), sales: z.string(), transfer: z.string(), purchase: z.string() }),
  timezone: z.string(),
  defaultLocale: z.string(),
  offerResponseMinutes: z.number(),
  estimateValidityDays: z.number(),
  estimateToleranceBps: z.number(),
  settlementPeriod: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  independentCashAllowed: z.boolean(),
  technicianCashLimit: z.object({ amount: z.string(), currency: z.string() }),
  deliveryFlatRate: z.object({ amount: z.string(), currency: z.string() }),
  freeDeliveryThreshold: z.object({ amount: z.string(), currency: z.string() }),
  reservationTtlHours: z.number(),
  returnWindowDays: z.number(),
  quietHours: z.object({ from: z.string(), to: z.string() }),
});

export const DashboardWidget = z.object({
  code: z.string(),
  title: z.string(),
  value: z.string(),
  delta: z.string().nullable(),
  trend: z.enum(["up", "down", "flat"]).nullable(),
  tone: z.enum(["default", "success", "warning", "danger"]),
  href: z.string().nullable(),
});
