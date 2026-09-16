import * as S from "@sp/schemas";
import { db } from "../db/state";
import type { LoyaltyTierCode } from "../db/types";
import { fullName, userById } from "../engine/context";
import { audit } from "../engine/effects";
import { accountDto, accountOf, adjust, ensureAccount, expirePoints, loyaltyEligible, program, programDto, referralDto, txnDto, txnsOf, windowPoints } from "../engine/loyalty";
import { apiError } from "../lib/errors";
import { list, parse, requireAuth, requirePerm, route, validationError } from "../lib/http";
import { money } from "../lib/money";

/** Loyallıq API: müştəri kabineti (xal, keşbek, referral) və admin idarəetməsi. */

const TIERS: LoyaltyTierCode[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

function memberDto(a: (typeof db.loyaltyAccounts)[number]) {
  const user = userById(a.userId);
  const last = txnsOf(a.userId)[0];
  return {
    userId: a.userId,
    name: fullName(user),
    phone: user?.phone ?? null,
    tier: a.tier,
    points: a.points,
    lifetimePoints: a.lifetimePoints,
    walletBalance: money(a.walletCents),
    windowPoints: windowPoints(a.userId),
    referrals: db.referrals.filter((r) => r.inviterId === a.userId).length,
    lastActivityAt: last?.createdAt ?? null,
  };
}

function stats() {
  const p = program();
  const issued = db.loyaltyTxns.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0);
  const redeemed = db.loyaltyTxns.filter((t) => t.type === "REDEEM").reduce((s, t) => s + Math.abs(t.points), 0);
  const expired = db.loyaltyTxns.filter((t) => t.type === "EXPIRE").reduce((s, t) => s + Math.abs(t.points), 0);
  const outstanding = db.loyaltyAccounts.reduce((s, a) => s + a.points, 0);
  const refs = db.referrals;
  const registered = refs.filter((r) => r.status !== "INVITED").length;
  return {
    members: db.loyaltyAccounts.length,
    activeMembers: db.loyaltyAccounts.filter((a) => a.points > 0 || a.walletCents > 0).length,
    byTier: TIERS.map((tier) => ({ tier, members: db.loyaltyAccounts.filter((a) => a.tier === tier).length, points: db.loyaltyAccounts.filter((a) => a.tier === tier).reduce((s, a) => s + a.points, 0) })),
    pointsIssued: issued,
    pointsRedeemed: redeemed,
    pointsExpired: expired,
    outstandingPoints: outstanding,
    liability: money(outstanding * p.pointValueCents),
    walletOutstanding: money(db.loyaltyAccounts.reduce((s, a) => s + a.walletCents, 0)),
    cashbackPaid: money(db.loyaltyTxns.filter((t) => t.type === "CASHBACK_EARN").reduce((s, t) => s + (t.amountCents ?? 0), 0)),
    redemptionRate: issued ? Math.round((redeemed / issued) * 1000) / 10 : 0,
    referrals: {
      invited: refs.length,
      registered,
      qualified: refs.filter((r) => ["QUALIFIED", "REWARDED"].includes(r.status)).length,
      rewarded: refs.filter((r) => r.status === "REWARDED").length,
      conversion: refs.length ? Math.round((refs.filter((r) => r.status === "REWARDED").length / refs.length) * 1000) / 10 : 0,
    },
  };
}

export const loyaltyHandlers = [
  /* ---------------- Müştəri kabineti ---------------- */
  route.get("/account/loyalty", ({ ctx }) => {
    const u = requireAuth(ctx);
    if (!loyaltyEligible(u)) throw apiError(403, "NOT_ELIGIBLE", "error.forbidden");
    expirePoints();
    ensureAccount(u.id);
    return {
      program: programDto(),
      account: accountDto(u.id),
      transactions: txnsOf(u.id).slice(0, 50).map(txnDto),
      referrals: db.referrals.filter((r) => r.inviterId === u.id).map(referralDto),
    };
  }),

  /* ---------------- Admin ---------------- */
  route.get("/admin/loyalty", ({ ctx }) => {
    requirePerm(ctx, "loyalty:view");
    expirePoints();
    return { program: programDto(), stats: stats() };
  }),

  route.put("/admin/loyalty", async ({ ctx, body }) => {
    requirePerm(ctx, "loyalty:edit");
    const data = await body<Record<string, unknown>>();
    const p = program();
    const errors: Record<string, string[]> = {};
    const num = (key: string, min: number, max: number) => {
      if (data[key] === undefined) return undefined;
      const v = Number(data[key]);
      if (!Number.isFinite(v) || v < min || v > max) errors[key] = ["validation.invalid"];
      return v;
    };
    const fields = {
      pointsPerAznService: num("pointsPerAznService", 0, 100),
      pointsPerAznProduct: num("pointsPerAznProduct", 0, 100),
      pointValueCents: num("pointValueCents", 1, 1000),
      minRedeemPoints: num("minRedeemPoints", 0, 100000),
      maxRedeemSharePercent: num("maxRedeemSharePercent", 1, 100),
      expiryMonths: num("expiryMonths", 1, 120),
      signupBonusPoints: num("signupBonusPoints", 0, 100000),
      reviewBonusPoints: num("reviewBonusPoints", 0, 100000),
      referrerBonusPoints: num("referrerBonusPoints", 0, 100000),
      refereeBonusPoints: num("refereeBonusPoints", 0, 100000),
      referralQualifyCents: num("referralQualifyCents", 0, 100000000),
    };
    let nextTiers: typeof p.tiers | undefined;
    if (Array.isArray(data.tiers)) {
      const tiers = data.tiers as { tier: LoyaltyTierCode; thresholdPoints: number; multiplier: number; cashbackPercent: number; extraDiscountPercent: number }[];
      if (tiers.some((t) => !TIERS.includes(t.tier) || Number(t.thresholdPoints) < 0 || Number(t.multiplier) < 1 || Number(t.cashbackPercent) < 0 || Number(t.cashbackPercent) > 20)) errors.tiers = ["validation.invalid"];
      else {
        nextTiers = TIERS.map((code) => {
          const incoming = tiers.find((t) => t.tier === code);
          const current = p.tiers.find((t) => t.tier === code)!;
          return incoming ? { ...current, thresholdPoints: Math.round(Number(incoming.thresholdPoints)), multiplier: Number(incoming.multiplier), cashbackPercent: Number(incoming.cashbackPercent), extraDiscountPercent: Number(incoming.extraDiscountPercent) } : current;
        });
      }
    }
    if (Object.keys(errors).length) throw validationError(errors);
    const changes: { field: string; from: string | null; to: string | null }[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const before = (p as unknown as Record<string, number>)[key];
      if (before === value) continue;
      changes.push({ field: key, from: String(before), to: String(value) });
      (p as unknown as Record<string, number>)[key] = value;
    }
    if (typeof data.active === "boolean" && data.active !== p.active) {
      changes.push({ field: "active", from: String(p.active), to: String(data.active) });
      p.active = data.active;
    }
    if (nextTiers) {
      changes.push({ field: "tiers", from: JSON.stringify(p.tiers), to: JSON.stringify(nextTiers) });
      p.tiers = nextTiers;
    }
    if (changes.length) audit(ctx, "edit", "loyalty", "program", "Loyallıq proqramı", changes);
    return { program: programDto(), stats: stats() };
  }),

  route.get("/admin/loyalty/members", ({ ctx, url }) => {
    requirePerm(ctx, "loyalty:view");
    expirePoints();
    const rows = db.loyaltyAccounts.map(memberDto);
    return list(url, rows, { defaultSort: "-points", search: (m) => `${m.name} ${m.phone ?? ""}`, dateField: "lastActivityAt", defaultPageSize: 25 });
  }),

  route.get("/admin/loyalty/transactions", ({ ctx, url }) => {
    requirePerm(ctx, "loyalty:view");
    expirePoints();
    const userId = url.searchParams.get("userId");
    const rows = db.loyaltyTxns
      .filter((t) => !userId || t.userId === userId)
      .map((t) => ({ ...txnDto(t), userId: t.userId, customerName: fullName(userById(t.userId)) }));
    return list(url, rows, { defaultSort: "-createdAt", search: (t) => `${t.customerName} ${t.orderNumber ?? ""}`, defaultPageSize: 25 });
  }),

  route.get("/admin/loyalty/referrals", ({ ctx, url }) => {
    requirePerm(ctx, "loyalty:view");
    const rows = db.referrals.map((r) => ({ ...referralDto(r), code: r.code }));
    return list(url, rows, { defaultSort: "-createdAt", search: (r) => `${r.inviteeName} ${r.inviterName} ${r.code}`, defaultPageSize: 25 });
  }),

  route.post("/admin/loyalty/adjust", async ({ ctx, body }) => {
    requirePerm(ctx, "loyalty:edit");
    const data = parse(S.LoyaltyAdjustRequest, await body());
    const user = userById(data.userId);
    if (!loyaltyEligible(user)) throw validationError({ userId: ["validation.invalid"] });
    const account = accountOf(data.userId) ?? ensureAccount(data.userId);
    if (data.points < 0 && account && account.points < -data.points) throw validationError({ points: ["validation.insufficientPoints"] });
    adjust(ctx, data.userId, data.points, data.reason);
    return { account: accountDto(data.userId), transactions: txnsOf(data.userId).slice(0, 20).map(txnDto) };
  }),
];
