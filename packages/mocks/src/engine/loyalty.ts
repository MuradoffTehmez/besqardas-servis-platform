import type { LocalizedText } from "@sp/types";
import { db } from "../db/state";
import type { LoyaltyAccountRec, LoyaltyTierCode, LoyaltyTxnRec, PaymentRec, ReferralRec } from "../db/types";
import type { UserRec } from "../data/people";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { idFor, newId } from "../lib/rng";
import { nowIso } from "../lib/time";
import { fullName, userById, type Ctx } from "./context";
import { audit, monthsFrom, notify } from "./effects";

/**
 * Loyallıq mühərriki: xal toplama (səviyyə əmsalı ilə), FIFO xərcləmə, müddət bitməsi,
 * keşbek pul kisəsi, səviyyə (tier) hesabı və referral proqramı.
 * Bütün hesablamalar burada aparılır — frontend yalnız nəticəni göstərir (PRD §64).
 */

const YEAR_MS = 365 * 86400_000;
const TIER_ORDER: LoyaltyTierCode[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

const ms = (iso: string) => new Date(iso).getTime();

export function program() {
  return db.loyaltyProgram;
}

/** Müştərinin dəvət kodu — deterministik və insan oxuya bilən. */
function referralCodeFor(user: UserRec) {
  const base = `${user.firstName}${user.lastName}`.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "BQS";
  return `${base}${idFor(`referral:${user.id}`).replace(/\D/g, "").slice(0, 4)}`;
}

/** Loyallıq yalnız fərdi müştərilər (və usta-müştəri) üçündür; B2B hesabları müqavilə qiymətləri ilə işləyir. */
export function loyaltyEligible(user: UserRec | null | undefined): boolean {
  return !!user && user.roles.includes("CUSTOMER") && !user.companyId;
}

export function ensureAccount(userId: string): LoyaltyAccountRec | null {
  const user = userById(userId);
  if (!loyaltyEligible(user)) return null;
  const existing = db.loyaltyAccounts.find((a) => a.userId === userId);
  if (existing) return existing;
  const account: LoyaltyAccountRec = {
    userId,
    points: 0,
    walletCents: 0,
    lifetimePoints: 0,
    tier: "BRONZE",
    tierSince: nowIso(),
    referralCode: referralCodeFor(user!),
    referredBy: null,
    createdAt: nowIso(),
  };
  db.loyaltyAccounts.push(account);
  return account;
}

export function accountOf(userId: string) {
  return db.loyaltyAccounts.find((a) => a.userId === userId) ?? null;
}

export function txnsOf(userId: string) {
  return db.loyaltyTxns.filter((t) => t.userId === userId);
}

function push(account: LoyaltyAccountRec, input: Omit<LoyaltyTxnRec, "id" | "userId" | "balanceAfter" | "remaining" | "createdAt"> & { remaining?: number; createdAt?: string }): LoyaltyTxnRec {
  const txn: LoyaltyTxnRec = {
    id: newId("ltx"),
    userId: account.userId,
    remaining: input.remaining ?? (input.points > 0 ? input.points : 0),
    balanceAfter: account.points,
    createdAt: input.createdAt ?? nowIso(),
    ...input,
  };
  db.loyaltyTxns.unshift(txn);
  return txn;
}

/** Son 12 ayda toplanan xal — səviyyə bu pəncərə ilə hesablanır. */
export function windowPoints(userId: string): number {
  const from = ms(nowIso()) - YEAR_MS;
  return txnsOf(userId)
    .filter((t) => t.points > 0 && t.type !== "ADJUST" && ms(t.createdAt) >= from)
    .reduce((s, t) => s + t.points, 0);
}

export function tierRule(tier: LoyaltyTierCode) {
  return program().tiers.find((t) => t.tier === tier) ?? program().tiers[0]!;
}

export function tierFor(points: number): LoyaltyTierCode {
  const reached = [...program().tiers].sort((a, b) => a.thresholdPoints - b.thresholdPoints).filter((t) => points >= t.thresholdPoints);
  return reached.length ? reached[reached.length - 1]!.tier : "BRONZE";
}

/** Səviyyəni yenidən hesablayır; yüksəlmə olduqda müştəriyə bildiriş gedir. */
export function refreshTier(account: LoyaltyAccountRec) {
  const next = tierFor(windowPoints(account.userId));
  if (next === account.tier) return;
  const up = TIER_ORDER.indexOf(next) > TIER_ORDER.indexOf(account.tier);
  account.tier = next;
  account.tierSince = nowIso();
  if (up) {
    const rule = tierRule(next);
    notify(
      account.userId,
      "LOYALTY_TIER_UP",
      "notif.loyaltyTierUp",
      L(
        `Səviyyəniz yüksəldi: ${next}. Artıq ${rule.multiplier}x xal və ${rule.cashbackPercent}% keşbek qazanırsınız.`,
        `Ваш уровень повышен: ${next}. Теперь ${rule.multiplier}x баллов и ${rule.cashbackPercent}% кэшбэка.`,
        `You reached ${next}. You now earn ${rule.multiplier}x points and ${rule.cashbackPercent}% cashback.`,
      ),
      "/account/loyalty",
    );
  }
}

/** Müddəti bitmiş xalları silir — hər sorğudan əvvəl çağırılır (real backend-də planlı iş). */
export function expirePoints() {
  const now = ms(nowIso());
  for (const account of db.loyaltyAccounts) {
    const stale = txnsOf(account.userId).filter((t) => t.remaining > 0 && t.expiresAt && ms(t.expiresAt) <= now);
    for (const t of stale) {
      const lost = t.remaining;
      t.remaining = 0;
      account.points = Math.max(0, account.points - lost);
      push(account, { type: "EXPIRE", points: -lost, amountCents: null, label: L("Xalların müddəti bitdi", "Срок баллов истёк", "Points expired"), orderId: null, orderNumber: null, expiresAt: null, createdAt: t.expiresAt!, remaining: 0 });
      db.loyaltyTxns[0]!.balanceAfter = account.points;
    }
    if (stale.length) refreshTier(account);
  }
}

/* ------------------------------------------------------------------ */
/* Toplama                                                              */
/* ------------------------------------------------------------------ */

export function grantPoints(account: LoyaltyAccountRec, points: number, type: LoyaltyTxnRec["type"], label: LocalizedText, order?: { id: string | null; number: string | null }) {
  if (points <= 0) return null;
  account.points += points;
  account.lifetimePoints += points;
  const txn = push(account, { type, points, amountCents: null, label, orderId: order?.id ?? null, orderNumber: order?.number ?? null, expiresAt: monthsFrom(nowIso(), program().expiryMonths) });
  txn.balanceAfter = account.points;
  refreshTier(account);
  return txn;
}

/** Ödəniş uğurlu olduqda xal və keşbek yazılır (§A2). */
export function earnForPayment(payment: PaymentRec) {
  const p = program();
  if (!p.active) return;
  const account = ensureAccount(payment.payerId);
  if (!account || payment.amountCents <= 0) return;
  if (db.loyaltyTxns.some((t) => t.type === "EARN_ORDER" && t.orderId === payment.id)) return;
  const rule = tierRule(account.tier);
  const perAzn = payment.orderType === "SERVICE" ? p.pointsPerAznService : p.pointsPerAznProduct;
  const points = Math.floor((payment.amountCents / 100) * perAzn * rule.multiplier);
  const label = L(`${payment.orderNumber} sifarişinə görə xal`, `Баллы за заказ ${payment.orderNumber}`, `Points for order ${payment.orderNumber}`);
  grantPoints(account, points, "EARN_ORDER", label, { id: payment.id, number: payment.orderNumber });
  // Keşbek pul kisəsinə yazılır və növbəti sifarişdə istifadə oluna bilər
  const cashback = Math.round((payment.amountCents * rule.cashbackPercent) / 100);
  if (cashback > 0) {
    account.walletCents += cashback;
    const txn = push(account, {
      type: "CASHBACK_EARN",
      points: 0,
      amountCents: cashback,
      label: L(`${payment.orderNumber} üzrə keşbek`, `Кэшбэк по ${payment.orderNumber}`, `Cashback for ${payment.orderNumber}`),
      orderId: payment.id,
      orderNumber: payment.orderNumber,
      expiresAt: null,
      remaining: 0,
    });
    txn.balanceAfter = account.points;
  }
  qualifyReferral(account, payment);
}

export function earnReviewBonus(userId: string, orderNumber: string | null) {
  const p = program();
  const account = p.active ? ensureAccount(userId) : null;
  if (!account || !p.reviewBonusPoints) return;
  grantPoints(account, p.reviewBonusPoints, "EARN_REVIEW", L("Rəy üçün bonus", "Бонус за отзыв", "Bonus for a review"), { id: null, number: orderNumber });
}

/** Qeydiyyat bonusu və dəvət kodunun bağlanması. */
export function onCustomerRegistered(user: UserRec, referralCode?: string | null) {
  const p = program();
  if (!p.active) return;
  const account = ensureAccount(user.id);
  if (!account) return;
  if (p.signupBonusPoints) grantPoints(account, p.signupBonusPoints, "EARN_SIGNUP", L("Qeydiyyat bonusu", "Бонус за регистрацию", "Sign-up bonus"));
  const code = referralCode?.trim().toUpperCase();
  if (!code) return;
  const inviter = db.loyaltyAccounts.find((a) => a.referralCode === code && a.userId !== user.id);
  if (!inviter) return;
  account.referredBy = inviter.userId;
  const referral: ReferralRec = {
    id: newId("ref"),
    code,
    inviterId: inviter.userId,
    inviteeId: user.id,
    inviteeName: fullName(user),
    status: "REGISTERED",
    orderId: null,
    orderNumber: null,
    rewardPoints: 0,
    createdAt: nowIso(),
    qualifiedAt: null,
  };
  db.referrals.unshift(referral);
  notify(inviter.userId, "LOYALTY_REFERRAL", "notif.loyaltyReferral", L(`${fullName(user)} dəvətinizlə qeydiyyatdan keçdi`, `${fullName(user)} зарегистрировался по вашему приглашению`, `${fullName(user)} signed up with your invite`), "/account/loyalty");
}

/** Dəvət olunanın ilk uğurlu sifarişi hər iki tərəfə bonus qazandırır. */
function qualifyReferral(account: LoyaltyAccountRec, payment: PaymentRec) {
  const p = program();
  const referral = db.referrals.find((r) => r.inviteeId === account.userId && r.status === "REGISTERED");
  if (!referral || payment.amountCents < p.referralQualifyCents) return;
  const inviter = accountOf(referral.inviterId);
  referral.status = "REWARDED";
  referral.qualifiedAt = nowIso();
  referral.orderId = payment.orderId;
  referral.orderNumber = payment.orderNumber;
  referral.rewardPoints = p.referrerBonusPoints;
  grantPoints(account, p.refereeBonusPoints, "EARN_REFERRAL", L("Dəvət bonusu", "Бонус по приглашению", "Referral bonus"), { id: payment.orderId, number: payment.orderNumber });
  if (inviter) {
    grantPoints(inviter, p.referrerBonusPoints, "EARN_REFERRAL", L(`${referral.inviteeName} üçün dəvət bonusu`, `Бонус за приглашение: ${referral.inviteeName}`, `Referral bonus for ${referral.inviteeName}`), { id: payment.orderId, number: payment.orderNumber });
    notify(inviter.userId, "LOYALTY_REFERRAL", "notif.loyaltyReferral", L(`${referral.inviteeName} ilk sifarişini tamamladı — ${p.referrerBonusPoints} xal qazandınız`, `${referral.inviteeName} оформил первый заказ — вам ${p.referrerBonusPoints} баллов`, `${referral.inviteeName} placed their first order — you earned ${p.referrerBonusPoints} points`), "/account/loyalty");
  }
}

/* ------------------------------------------------------------------ */
/* Xərcləmə                                                             */
/* ------------------------------------------------------------------ */

/** Sifarişdə xalla ödəniləcək maksimum məbləğ və xal sayı. */
export function redeemLimits(userId: string, orderTotalCents: number) {
  const p = program();
  const account = accountOf(userId);
  const points = account?.points ?? 0;
  const maxByShare = Math.floor((orderTotalCents * p.maxRedeemSharePercent) / 100);
  const maxPointsByShare = Math.floor(maxByShare / p.pointValueCents);
  const maxRedeemPoints = Math.max(0, Math.min(points, maxPointsByShare));
  return { points, maxRedeemPoints, maxRedeemCents: maxRedeemPoints * p.pointValueCents, minRedeemPoints: p.minRedeemPoints, pointValueCents: p.pointValueCents };
}

/** Xalları FIFO qaydası ilə silir (ən tez müddəti bitənlər əvvəl). */
export function redeem(userId: string, points: number, order: { id: string | null; number: string | null }): number {
  const account = accountOf(userId);
  if (!account || points <= 0) return 0;
  let left = points;
  const earns = txnsOf(userId)
    .filter((t) => t.remaining > 0)
    .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? "") || a.createdAt.localeCompare(b.createdAt));
  for (const t of earns) {
    if (left <= 0) break;
    const take = Math.min(t.remaining, left);
    t.remaining -= take;
    left -= take;
  }
  const used = points - left;
  account.points = Math.max(0, account.points - used);
  const cents = used * program().pointValueCents;
  const txn = push(account, { type: "REDEEM", points: -used, amountCents: cents, label: L(`${order.number ?? ""} sifarişində xal endirimi`, `Списание баллов по ${order.number ?? ""}`, `Points redeemed on ${order.number ?? ""}`), orderId: order.id, orderNumber: order.number, expiresAt: null, remaining: 0 });
  txn.balanceAfter = account.points;
  return cents;
}

/** Pul kisəsindən (keşbek) ödəniş. */
export function spendWallet(userId: string, cents: number, order: { id: string | null; number: string | null }): number {
  const account = accountOf(userId);
  if (!account || cents <= 0) return 0;
  const used = Math.min(account.walletCents, cents);
  if (used <= 0) return 0;
  account.walletCents -= used;
  const txn = push(account, { type: "CASHBACK_SPEND", points: 0, amountCents: -used, label: L(`${order.number ?? ""} sifarişində keşbek istifadəsi`, `Использование кэшбэка по ${order.number ?? ""}`, `Cashback used on ${order.number ?? ""}`), orderId: order.id, orderNumber: order.number, expiresAt: null, remaining: 0 });
  txn.balanceAfter = account.points;
  return used;
}

/** Operator/menecer tərəfindən əl ilə düzəliş. */
export function adjust(ctx: Ctx, userId: string, points: number, reason: string) {
  const account = ensureAccount(userId);
  if (!account) return null;
  const label = L(`Əl ilə düzəliş: ${reason}`, `Ручная корректировка: ${reason}`, `Manual adjustment: ${reason}`);
  if (points > 0) {
    grantPoints(account, points, "ADJUST", label);
  } else {
    const removed = Math.min(account.points, -points);
    let left = removed;
    for (const t of txnsOf(userId).filter((x) => x.remaining > 0).sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""))) {
      if (left <= 0) break;
      const take = Math.min(t.remaining, left);
      t.remaining -= take;
      left -= take;
    }
    account.points -= removed;
    const txn = push(account, { type: "ADJUST", points: -removed, amountCents: null, label, orderId: null, orderNumber: null, expiresAt: null, remaining: 0 });
    txn.balanceAfter = account.points;
    refreshTier(account);
  }
  audit(ctx, "adjust", "loyalty", userId, fullName(userById(userId)), [{ field: "points", from: null, to: String(points) }], reason);
  return account;
}

/* ------------------------------------------------------------------ */
/* DTO                                                                  */
/* ------------------------------------------------------------------ */

export function accountDto(userId: string) {
  const account = ensureAccount(userId);
  if (!account) return null;
  const p = program();
  const rule = tierRule(account.tier);
  const win = windowPoints(userId);
  const sorted = [...p.tiers].sort((a, b) => a.thresholdPoints - b.thresholdPoints);
  const next = sorted.find((t) => t.thresholdPoints > win) ?? null;
  const soon = txnsOf(userId).filter((t) => t.remaining > 0 && t.expiresAt && ms(t.expiresAt) - ms(nowIso()) < 60 * 86400_000);
  const refs = db.referrals.filter((r) => r.inviterId === userId);
  return {
    userId,
    points: account.points,
    pointsValue: money(account.points * p.pointValueCents),
    lifetimePoints: account.lifetimePoints,
    tier: account.tier,
    tierSince: account.tierSince,
    nextTier: next?.tier ?? null,
    pointsToNextTier: next ? next.thresholdPoints - win : null,
    windowPoints: win,
    multiplier: rule.multiplier,
    cashbackPercent: rule.cashbackPercent,
    extraDiscountPercent: rule.extraDiscountPercent,
    perks: rule.perks,
    walletBalance: money(account.walletCents),
    expiringPoints: soon.reduce((s, t) => s + t.remaining, 0),
    expiringAt: soon.sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""))[0]?.expiresAt ?? null,
    referralCode: account.referralCode,
    referralLink: `https://${db.branding.domain}/register?ref=${account.referralCode}`,
    referrals: { invited: refs.length, qualified: refs.filter((r) => r.status === "REWARDED").length, earnedPoints: refs.reduce((s, r) => s + r.rewardPoints, 0) },
  };
}

export function txnDto(t: LoyaltyTxnRec) {
  return {
    id: t.id,
    type: t.type,
    points: t.points,
    amount: t.amountCents === null ? null : money(Math.abs(t.amountCents)),
    balanceAfter: t.balanceAfter,
    label: t.label,
    orderNumber: t.orderNumber,
    expiresAt: t.expiresAt,
    createdAt: t.createdAt,
  };
}

export function referralDto(r: ReferralRec) {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    inviteeName: r.inviteeName,
    inviterName: fullName(userById(r.inviterId)),
    rewardPoints: r.rewardPoints,
    orderNumber: r.orderNumber,
    createdAt: r.createdAt,
    qualifiedAt: r.qualifiedAt,
  };
}

export function programDto() {
  const p = program();
  return { ...p, referralQualifyAmount: money(p.referralQualifyCents) };
}
