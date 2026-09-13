import { z } from "zod";
import { Id, IsoDateTime, LocalizedText, Money } from "./common";
import { BillingPeriod, PlanGroup, PlanVisibility, SubscriptionStatus } from "./enums";
import { Entitlements } from "./auth";

/** PRD §41–43 — dynamic plan system */

export const EntitlementDefinition = z.object({
  code: z.string(),
  valueType: z.enum(["BOOLEAN", "NUMBER", "PERCENT", "UNLIMITED_NUMBER"]),
  group: PlanGroup,
  label: z.string(),
});

export const PlanPrice = z.object({ period: BillingPeriod, price: Money, enabled: z.boolean() });

export const Plan = z.object({
  id: Id,
  code: z.string(),
  group: PlanGroup,
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  description: z.string(),
  tier: z.number(),
  prices: z.array(PlanPrice),
  trialDays: z.number().nullable(),
  visibility: PlanVisibility,
  entitlements: Entitlements,
  highlight: z.boolean(),
  subscriberCount: z.number(),
  updatedAt: IsoDateTime,
});

export const Subscription = z.object({
  id: Id,
  subscriberId: Id,
  subscriberName: z.string(),
  subscriberType: z.enum(["CUSTOMER", "TECHNICIAN", "CORPORATE"]),
  planId: Id,
  planCode: z.string(),
  planName: z.string(),
  status: SubscriptionStatus,
  period: BillingPeriod,
  price: Money,
  startedAt: IsoDateTime,
  currentPeriodEnd: IsoDateTime,
  autoRenew: z.boolean(),
  pendingPlanCode: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  graceUntil: IsoDateTime.nullable(),
  usage: z.array(z.object({ code: z.string(), used: z.number(), limit: z.number().nullable() })),
});

export const ChangePlanRequest = z.object({
  planId: Id,
  period: BillingPeriod,
});

export const StaffLicense = z.object({
  id: Id,
  technicianId: Id,
  technicianName: z.string(),
  branchName: z.string(),
  status: z.enum(["ACTIVE", "REVOKED"]),
  issuedAt: IsoDateTime,
  revokedAt: IsoDateTime.nullable(),
  issuedBy: z.string(),
  capabilities: z.object({ materialReservation: z.boolean(), statistics: z.boolean(), customerHistory: z.boolean() }),
});
