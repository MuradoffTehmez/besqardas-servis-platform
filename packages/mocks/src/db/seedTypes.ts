import type { LocalizedText } from "@sp/types";

export interface FeeRuleRec {
  id: string;
  name: LocalizedText;
  type: "CALL_OUT" | "DIAGNOSTICS" | "AFTER_HOURS" | "LOGISTICS" | "LATE_CANCELLATION";
  categoryId: string | null;
  serviceType: string | null;
  executionForm: "ON_SITE" | "CARRY_IN" | "PICKUP_DELIVERY" | null;
  timeCondition: { weekends: boolean; from: string | null; to: string | null } | null;
  zone: "ANY" | "IN_CITY" | "OUT_OF_CITY";
  excludedPlans: string[];
  trigger: "ALWAYS" | "ON_ESTIMATE_REJECT" | "ON_CANCEL_AFTER_DEPARTURE";
  amountType: "FIXED" | "PERCENT";
  amount: string;
  onEstimateApproved: "INCLUDE" | "WAIVE";
  validFrom: string;
  validTo: string | null;
  active: boolean;
}

export interface PromotionRec {
  id: string;
  code: string;
  name: LocalizedText;
  kind: "PERCENT" | "FIXED" | "PROMO_CODE" | "SUBSCRIPTION";
  value: number;
  stacking: "STACKABLE" | "EXCLUSIVE" | "COMBINABLE_WITH_LIST";
  combinableWith: string[];
  priority: number;
  base: "BASE_PRICE" | "AFTER_PREVIOUS";
  maxDiscountCents: number | null;
  categoryIds: string[];
  productIds: string[];
  segments: string[];
  planCodes: string[];
  appliesTo: "PRODUCTS" | "SERVICES" | "CART";
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  usageCount: number;
  promoCode: string | null;
}
