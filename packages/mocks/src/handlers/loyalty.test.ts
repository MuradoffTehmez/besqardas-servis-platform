import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";
import { db } from "../db/state";

/** Loyallıq testləri: xal toplama, FIFO xərcləmə, keşbek, səviyyə, referral və admin idarəetməsi. */

type Res = { status: number; data: any; cookie?: string };

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Res> {
  const response = await getResponse(handlers, new Request(`http://localhost/api${path}`, { method, headers: { "Content-Type": "application/json", "x-mock-delay": "0", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  if (!response) throw new Error(`Handler yoxdur: ${method} ${path}`);
  const text = await response.text();
  const sid = (response.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("sid="));
  return { status: response.status, data: text ? JSON.parse(text) : null, cookie: sid?.split(";")[0] };
}

async function login(email: string) {
  const r = await call("POST", "/auth/login", { email, password: "Demo1234!" });
  if (r.data.status === "TWO_FACTOR_REQUIRED") await call("POST", "/auth/2fa", { challengeId: r.data.challengeId, code: "123456" }, r.cookie);
  return r.cookie!;
}

/** Səbətə məhsul əlavə edib checkout edir. */
async function buy(cookie: string, opts: { redeemPoints?: number; useWallet?: boolean; paymentMethod?: string } = {}) {
  const product = (await call("GET", "/products/lg-dualcool-inverter", undefined, cookie)).data;
  const add = await call("POST", "/cart/items", { variantId: product.variants[0].id, quantity: "1", unit: "pcs", withInstallation: false }, cookie);
  expect(add.status, JSON.stringify(add.data)).toBe(200);
  const query = new URLSearchParams({
    deliveryMethod: "PICKUP",
    paymentMethod: opts.paymentMethod ?? "CARD_ONLINE",
    redeemPoints: String(opts.redeemPoints ?? 0),
    useWallet: String(opts.useWallet ?? false),
  });
  const options = (await call("GET", `/checkout/options?${query}`, undefined, cookie)).data;
  const address = options.addresses[0];
  const r = await call(
    "POST",
    "/checkout",
    { deliveryMethod: "PICKUP", pickupBranchId: options.pickupBranches[0].id, addressId: address?.id ?? null, paymentMethod: opts.paymentMethod ?? "CARD_ONLINE", idempotencyKey: `test-${Math.random()}`, redeemPoints: opts.redeemPoints, useWallet: opts.useWallet },
    cookie,
  );
  return { checkout: r, options };
}

describe("Loyallıq və referral", () => {
  beforeEach(() => reset());

  it("kabinet: xal, səviyyə, keşbek, müddəti bitmiş xallar və referrallar", async () => {
    const aysel = await login("aysel@demo.az");
    const r = await call("GET", "/account/loyalty", undefined, aysel);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    const { program, account, transactions, referrals } = r.data;
    expect(program.active).toBe(true);
    expect(account.points).toBeGreaterThan(0);
    expect(account.referralCode).toMatch(/^[A-ZƏÖÜÇŞĞİ]{2,3}\d{4}$/);
    expect(account.referralLink).toContain(account.referralCode);
    expect(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).toContain(account.tier);
    expect(Number(account.pointsValue.amount)).toBeCloseTo((account.points * program.pointValueCents) / 100, 2);
    expect(transactions.some((t: any) => t.type === "EARN_ORDER")).toBe(true);
    expect(transactions.some((t: any) => t.type === "EXPIRE")).toBe(true);
    expect(transactions.some((t: any) => t.type === "REDEEM")).toBe(true);
    expect(transactions.some((t: any) => t.type === "CASHBACK_EARN")).toBe(true);
    expect(referrals.some((x: any) => x.status === "REWARDED")).toBe(true);

    // Balans defterdəki son qeydin balansı ilə üst-üstə düşür
    expect(transactions[0].balanceAfter).toBe(account.points);
    // B2B hesabı loyallıqda iştirak etmir
    expect((await call("GET", "/account/loyalty", undefined, await login("corporate@demo.az"))).status).toBe(403);
  });

  it("checkout: xal endirimi və keşbek yekun məbləği azaldır, ödənişdən sonra yeni xal yazılır", async () => {
    const cookie = await login("aysel@demo.az");
    const before = (await call("GET", "/account/loyalty", undefined, cookie)).data.account;
    const plain = await buy(cookie);
    expect(plain.checkout.status, JSON.stringify(plain.checkout.data)).toBe(200);
    const plainOrder = (await call("GET", `/account/orders/${plain.checkout.data.salesOrderId}`, undefined, cookie)).data;

    // Eyni məhsul, amma xal + keşbeklə
    const withPoints = await buy(cookie, { redeemPoints: before.points >= 400 ? 400 : 0, useWallet: true });
    expect(withPoints.checkout.status, JSON.stringify(withPoints.checkout.data)).toBe(200);
    const discounted = (await call("GET", `/account/orders/${withPoints.checkout.data.salesOrderId}`, undefined, cookie)).data;
    expect(Number(discounted.total.amount)).toBeLessThan(Number(plainOrder.total.amount));
    expect(discounted.appliedDiscounts.some((d: any) => d.code === "LOYALTY_POINTS")).toBe(true);
    expect(discounted.appliedDiscounts.some((d: any) => d.code === "LOYALTY_WALLET")).toBe(true);
    expect(withPoints.options.loyalty.appliedRedeemPoints).toBe(400);
    expect(Number(withPoints.options.loyalty.walletApplied.amount)).toBeGreaterThan(0);
    expect(Number(withPoints.options.payableTotal.amount)).toBe(Number(discounted.total.amount));

    const afterRedeem = (await call("GET", "/account/loyalty", undefined, cookie)).data.account;
    expect(afterRedeem.points).toBe(before.points - 400);
    expect(Number(afterRedeem.walletBalance.amount)).toBe(0);

    // Ödəniş uğurla bitəndə xal və keşbek yazılır
    const paymentId = withPoints.checkout.data.paymentId;
    expect(paymentId).toBeTruthy();
    const paid = await call("POST", `/payments/${paymentId}/provider-callback`, { outcome: "success" }, cookie);
    expect(paid.data.status).toBe("PAID");
    const afterPaid = (await call("GET", "/account/loyalty", undefined, cookie)).data;
    expect(afterPaid.account.points).toBeGreaterThan(afterRedeem.points);
    expect(Number(afterPaid.account.walletBalance.amount)).toBeGreaterThan(0);
    expect(afterPaid.transactions[0].orderNumber).toBe(discounted.number);
  });

  it("checkout: limitdən çox xal rədd edilir", async () => {
    const cookie = await login("aysel@demo.az");
    const r = await buy(cookie, { redeemPoints: 999999 });
    expect(r.checkout.status).toBe(422);
    expect(r.checkout.data.fieldErrors.redeemPoints).toEqual(["validation.pointsRange"]);
  });

  it("referral: dəvət kodu ilə qeydiyyat və ilk sifarişdən sonra hər iki tərəfə bonus", async () => {
    const inviterCookie = await login("aysel@demo.az");
    const inviter = (await call("GET", "/account/loyalty", undefined, inviterCookie)).data.account;

    const reg = await call("POST", "/auth/register", { method: "EMAIL", firstName: "Yeni", lastName: "İstifadəçi", email: "yeni@demo.az", password: "Demo1234!", acceptTerms: true, locale: "az", referralCode: inviter.referralCode });
    expect(reg.status, JSON.stringify(reg.data)).toBe(200);
    const newCookie = reg.cookie!;
    const fresh = (await call("GET", "/account/loyalty", undefined, newCookie)).data;
    expect(fresh.account.points).toBe(200); // qeydiyyat bonusu
    const inviterAfterSignup = (await call("GET", "/account/loyalty", undefined, inviterCookie)).data;
    expect(inviterAfterSignup.referrals.some((x: any) => x.inviteeName === "Yeni İstifadəçi" && x.status === "REGISTERED")).toBe(true);

    // İlk sifariş qiymətləndirmə həddindən yuxarıdır → hər iki tərəf bonus alır
    const order = await buy(newCookie);
    await call("POST", `/payments/${order.checkout.data.paymentId}/provider-callback`, { outcome: "success" }, newCookie);
    const inviterFinal = (await call("GET", "/account/loyalty", undefined, inviterCookie)).data;
    expect(inviterFinal.account.points).toBe(inviterAfterSignup.account.points + 500);
    expect(inviterFinal.referrals.find((x: any) => x.inviteeName === "Yeni İstifadəçi").status).toBe("REWARDED");
    const inviteeFinal = (await call("GET", "/account/loyalty", undefined, newCookie)).data;
    expect(inviteeFinal.transactions.some((t: any) => t.type === "EARN_REFERRAL" && t.points === 300)).toBe(true);
  });

  it("referral: mövcud olmayan dəvət kodu hesab yaradılmadan rədd edilir", async () => {
    const reg = await call("POST", "/auth/register", { method: "EMAIL", firstName: "Yanlış", lastName: "Kod", email: "wrong-ref@demo.az", password: "Demo1234!", acceptTerms: true, locale: "az", referralCode: "YALNIS99" });
    expect(reg.status).toBe(422);
    expect(reg.data.fieldErrors.referralCode).toEqual(["validation.referralCode"]);
    expect(db.users.some((u) => u.email === "wrong-ref@demo.az")).toBe(false);
  });

  it("admin: statistika, üzvlər, əl ilə düzəliş və proqram parametrləri", async () => {
    const manager = await login("manager@demo.az");
    const overview = await call("GET", "/admin/loyalty", undefined, manager);
    expect(overview.status).toBe(200);
    expect(overview.data.stats.members).toBeGreaterThan(3);
    expect(Number(overview.data.stats.liability.amount)).toBeGreaterThan(0);
    expect(overview.data.stats.byTier).toHaveLength(4);

    const members = (await call("GET", "/admin/loyalty/members?pageSize=50", undefined, manager)).data;
    const target = members.items.find((m: any) => m.points > 0);
    expect(target).toBeTruthy();

    const bad = await call("POST", "/admin/loyalty/adjust", { userId: target.userId, points: -999999, reason: "Test" }, manager);
    expect(bad.status).toBe(422);
    const adjusted = await call("POST", "/admin/loyalty/adjust", { userId: target.userId, points: 250, reason: "Şikayətə görə kompensasiya" }, manager);
    expect(adjusted.status, JSON.stringify(adjusted.data)).toBe(200);
    expect(adjusted.data.account.points).toBe(target.points + 250);
    expect(adjusted.data.transactions[0].type).toBe("ADJUST");

    const silverBefore = overview.data.program.tiers.find((t: any) => t.tier === "SILVER").thresholdPoints;
    const invalid = await call("PUT", "/admin/loyalty", { maxRedeemSharePercent: 500, tiers: [{ tier: "SILVER", thresholdPoints: 9999, multiplier: 1.15, cashbackPercent: 2.5, extraDiscountPercent: 2 }] }, manager);
    expect(invalid.status).toBe(422);
    const afterInvalid = await call("GET", "/admin/loyalty", undefined, manager);
    expect(afterInvalid.data.program.tiers.find((t: any) => t.tier === "SILVER").thresholdPoints).toBe(silverBefore);
    const saved = await call("PUT", "/admin/loyalty", { pointsPerAznService: 3, maxRedeemSharePercent: 40, tiers: [{ tier: "SILVER", thresholdPoints: 2500, multiplier: 1.15, cashbackPercent: 2.5, extraDiscountPercent: 2 }] }, manager);
    expect(saved.status, JSON.stringify(saved.data)).toBe(200);
    expect(saved.data.program.pointsPerAznService).toBe(3);
    expect(saved.data.program.tiers.find((t: any) => t.tier === "SILVER").thresholdPoints).toBe(2500);

    // Operatorun yalnız baxış icazəsi var
    const operator = await login("operator@demo.az");
    expect((await call("GET", "/admin/loyalty", undefined, operator)).status).toBe(200);
    expect((await call("POST", "/admin/loyalty/adjust", { userId: target.userId, points: 10, reason: "İcazəsiz" }, operator)).status).toBe(403);
  });
});
