import { z } from "zod";
import { Id, IsoDateTime, LocalizedText, Money } from "./common";

/**
 * Loyallıq: xal toplama və xərcləmə, keşbek pul kisəsi, səviyyələr (tier) və referral proqramı.
 * Xallar FIFO qaydası ilə xərclənir və müddəti bitəndə silinir; bütün hesablama backend-dədir.
 */

export const LoyaltyTier = z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]);
export const ReferralStatus = z.enum(["INVITED", "REGISTERED", "QUALIFIED", "REWARDED", "EXPIRED"]);
export const LoyaltyTxnType = z.enum([
  "EARN_ORDER",
  "EARN_REVIEW",
  "EARN_SIGNUP",
  "EARN_REFERRAL",
  "REDEEM",
  "EXPIRE",
  "ADJUST",
  "CASHBACK_EARN",
  "CASHBACK_SPEND",
]);

/** Səviyyə qaydası: son 12 ayda toplanan xala görə təyin olunur. */
export const LoyaltyTierRule = z.object({
  tier: LoyaltyTier,
  thresholdPoints: z.number().int().min(0),
  /** Xal toplama əmsalı (1.25 = 25% çox xal). */
  multiplier: z.number(),
  cashbackPercent: z.number(),
  extraDiscountPercent: z.number(),
  perks: z.array(LocalizedText),
});

export const LoyaltyProgram = z.object({
  active: z.boolean(),
  /** 1 AZN xərcə görə verilən xal (servis və məhsul ayrı). */
  pointsPerAznService: z.number(),
  pointsPerAznProduct: z.number(),
  /** 1 xalın qəpiklə dəyəri. */
  pointValueCents: z.number().int().positive(),
  minRedeemPoints: z.number().int().min(0),
  /** Sifarişin maksimum neçə faizi xalla ödənilə bilər. */
  maxRedeemSharePercent: z.number().min(1).max(100),
  expiryMonths: z.number().int().positive(),
  signupBonusPoints: z.number().int().min(0),
  reviewBonusPoints: z.number().int().min(0),
  referrerBonusPoints: z.number().int().min(0),
  refereeBonusPoints: z.number().int().min(0),
  /** Dəvət olunanın ilk sifarişi bu məbləğdən yuxarı olmalıdır. */
  referralQualifyAmount: Money,
  tiers: z.array(LoyaltyTierRule),
});

export const LoyaltyTransaction = z.object({
  id: Id,
  type: LoyaltyTxnType,
  points: z.number().int(),
  amount: Money.nullable(),
  balanceAfter: z.number().int(),
  label: LocalizedText,
  orderNumber: z.string().nullable(),
  expiresAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});

export const ReferralEntry = z.object({
  id: Id,
  status: ReferralStatus,
  inviteeName: z.string(),
  inviterName: z.string(),
  rewardPoints: z.number().int(),
  orderNumber: z.string().nullable(),
  createdAt: IsoDateTime,
  qualifiedAt: IsoDateTime.nullable(),
});

export const LoyaltyAccount = z.object({
  userId: Id,
  points: z.number().int(),
  /** Xalların pul ekvivalenti. */
  pointsValue: Money,
  lifetimePoints: z.number().int(),
  tier: LoyaltyTier,
  tierSince: IsoDateTime,
  nextTier: LoyaltyTier.nullable(),
  pointsToNextTier: z.number().int().nullable(),
  /** Son 12 ayda toplanan xal — səviyyə bununla hesablanır. */
  windowPoints: z.number().int(),
  multiplier: z.number(),
  cashbackPercent: z.number(),
  extraDiscountPercent: z.number(),
  perks: z.array(LocalizedText),
  walletBalance: Money,
  expiringPoints: z.number().int(),
  expiringAt: IsoDateTime.nullable(),
  referralCode: z.string(),
  referralLink: z.string(),
  referrals: z.object({ invited: z.number(), qualified: z.number(), earnedPoints: z.number() }),
});

export const LoyaltyOverview = z.object({
  program: LoyaltyProgram,
  account: LoyaltyAccount,
  transactions: z.array(LoyaltyTransaction),
  referrals: z.array(ReferralEntry),
});

/** Checkout-da xal və pul kisəsinin tətbiqi. */
export const LoyaltyCheckout = z.object({
  available: z.boolean(),
  points: z.number().int(),
  pointValue: Money,
  minRedeemPoints: z.number().int(),
  maxRedeemPoints: z.number().int(),
  maxRedeemAmount: Money,
  walletBalance: Money,
  maxWalletAmount: Money,
  earnPoints: z.number().int(),
  cashbackAmount: Money,
});

export const LoyaltyAdjustRequest = z.object({
  userId: Id,
  points: z.number().int().refine((v) => v !== 0, { message: "validation.positive" }),
  reason: z.string().trim().min(3, "validation.required").max(200, "validation.tooLong"),
});

export const LoyaltyMember = z.object({
  userId: Id,
  name: z.string(),
  phone: z.string().nullable(),
  tier: LoyaltyTier,
  points: z.number().int(),
  lifetimePoints: z.number().int(),
  walletBalance: Money,
  referrals: z.number(),
  lastActivityAt: IsoDateTime.nullable(),
});

export const LoyaltyStats = z.object({
  members: z.number(),
  activeMembers: z.number(),
  byTier: z.array(z.object({ tier: LoyaltyTier, members: z.number(), points: z.number() })),
  pointsIssued: z.number(),
  pointsRedeemed: z.number(),
  pointsExpired: z.number(),
  outstandingPoints: z.number(),
  /** Xal öhdəliyi — qalıq xalların pul dəyəri. */
  liability: Money,
  walletOutstanding: Money,
  cashbackPaid: Money,
  redemptionRate: z.number(),
  referrals: z.object({ invited: z.number(), registered: z.number(), qualified: z.number(), rewarded: z.number(), conversion: z.number() }),
});
