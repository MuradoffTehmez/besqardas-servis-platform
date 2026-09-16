import { db } from "../db/state";
import type { LoyaltyProgramRec } from "../db/types";
import { uid } from "../data/people";
import { accountOf, ensureAccount, grantPoints, redeem, spendWallet } from "../engine/loyalty";
import { L } from "../lib/i18n";
import { newId } from "../lib/rng";
import { atTime, daysAgo } from "../lib/time";

/** Loyallıq proqramının konfiqurasiyası və demo tarixçəsi (xal, keşbek, referral). */

export function seedLoyaltyProgram() {
  const program: LoyaltyProgramRec = {
    active: true,
    pointsPerAznService: 2,
    pointsPerAznProduct: 1,
    pointValueCents: 5,
    minRedeemPoints: 200,
    maxRedeemSharePercent: 30,
    expiryMonths: 12,
    signupBonusPoints: 200,
    reviewBonusPoints: 50,
    referrerBonusPoints: 500,
    refereeBonusPoints: 300,
    referralQualifyCents: 5000,
    tiers: [
      { tier: "BRONZE", thresholdPoints: 0, multiplier: 1, cashbackPercent: 1, extraDiscountPercent: 0, perks: [L("Hər 1 ₼-a 1–2 xal", "1–2 балла за каждый 1 ₼", "1–2 points per 1 ₼"), L("1% keşbek", "1% кэшбэка", "1% cashback")] },
      { tier: "SILVER", thresholdPoints: 2000, multiplier: 1.1, cashbackPercent: 2, extraDiscountPercent: 2, perks: [L("10% çox xal", "На 10% больше баллов", "10% more points"), L("2% keşbek", "2% кэшбэка", "2% cashback"), L("Xidmətlərə 2% əlavə endirim", "Доп. скидка 2% на услуги", "Extra 2% off services")] },
      { tier: "GOLD", thresholdPoints: 6000, multiplier: 1.25, cashbackPercent: 3, extraDiscountPercent: 3, perks: [L("25% çox xal", "На 25% больше баллов", "25% more points"), L("3% keşbek", "3% кэшбэка", "3% cashback"), L("Növbədə prioritet dəstək", "Приоритетная поддержка", "Priority support queue")] },
      { tier: "PLATINUM", thresholdPoints: 15000, multiplier: 1.5, cashbackPercent: 5, extraDiscountPercent: 5, perks: [L("50% çox xal", "На 50% больше баллов", "50% more points"), L("5% keşbek", "5% кэшбэка", "5% cashback"), L("Pulsuz illik diaqnostika", "Бесплатная годовая диагностика", "Free annual diagnostics"), L("Fərdi menecer", "Персональный менеджер", "Dedicated manager")] },
    ],
  };
  db.loyaltyProgram = program;
}

/** Sifariş və ödənişlər seed olunduqdan sonra: hesablar, referral tarixçəsi, xərcləmə və müddət bitmiş xallar. */
export function seedLoyaltyExtras() {
  for (const user of db.users.filter((u) => u.roles.includes("CUSTOMER") && !u.companyId)) ensureAccount(user.id);

  // Keçən il toplanan və müddəti bitmiş xallar (kabinetdə "müddəti bitdi" sətri görünür)
  const aysel = accountOf(uid("aysel"));
  if (aysel) {
    atTime(daysAgo(400), () => grantPoints(aysel, 900, "EARN_ORDER", L("Keçən ilki sifarişlərə görə xal", "Баллы за прошлогодние заказы", "Points for last year's orders"), { id: null, number: "SV-0988" }));
    atTime(daysAgo(120), () => redeem(aysel.userId, 600, { id: null, number: "SO-5009" }));
    atTime(daysAgo(60), () => spendWallet(aysel.userId, 850, { id: null, number: "SO-5011" }));
  }

  // Referral: biri mükafatlandırılıb, biri qeydiyyatdan keçib, biri hələ dəvətdədir
  const invite = (inviterKey: string, inviteeKey: string | null, inviteeName: string, status: "INVITED" | "REGISTERED" | "REWARDED", daysBack: number, reward = 0, orderNumber: string | null = null) => {
    const inviter = accountOf(uid(inviterKey));
    if (!inviter) return;
    db.referrals.push({
      id: newId("ref"),
      code: inviter.referralCode,
      inviterId: inviter.userId,
      inviteeId: inviteeKey ? uid(inviteeKey) : null,
      inviteeName,
      status,
      orderId: null,
      orderNumber,
      rewardPoints: reward,
      createdAt: daysAgo(daysBack),
      qualifiedAt: status === "REWARDED" ? daysAgo(daysBack - 2) : null,
    });
    if (status === "REWARDED" && reward) {
      atTime(daysAgo(daysBack - 2), () => grantPoints(inviter, reward, "EARN_REFERRAL", L(`${inviteeName} üçün dəvət bonusu`, `Бонус за приглашение: ${inviteeName}`, `Referral bonus for ${inviteeName}`), { id: null, number: orderNumber }));
      const invitee = inviteeKey ? accountOf(uid(inviteeKey)) : null;
      if (invitee) atTime(daysAgo(daysBack - 2), () => grantPoints(invitee, db.loyaltyProgram.refereeBonusPoints, "EARN_REFERRAL", L("Dəvət bonusu", "Бонус по приглашению", "Referral bonus"), { id: null, number: orderNumber }));
      if (invitee) invitee.referredBy = inviter.userId;
    }
  };
  invite("aysel", "leyla", "Leyla Quliyeva", "REWARDED", 45, 500, "SV-1061");
  invite("aysel", "murad", "Murad Hüseynov", "REGISTERED", 12);
  invite("gunel", null, "+994 55 ••• 22 33", "INVITED", 6);
  invite("rashad", "orkhan-c", "Orxan Babayev", "REWARDED", 90, 500, "SO-5008");

  db.loyaltyTxns.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
