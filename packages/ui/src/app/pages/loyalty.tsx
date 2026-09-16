"use client";
import React, { useState } from "react";
import { Award, Copy, Gift, Sparkles, Star, Ticket, TrendingUp, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Card, EmptyState, EnumBadge, Grid, PageHeader, QueryView, Stat } from "../kit/base";
import { Progress } from "./common";

/**
 * Loyallıq kabineti (§A2): xal balansı, səviyyə, keşbek pul kisəsi, xal hərəkətləri və dəvət proqramı.
 * Bütün dəyərlər backend-dən gəlir — ekran yalnız göstərir.
 */

const TIER_TONE: Record<string, string> = { BRONZE: "default", SILVER: "info", GOLD: "warning", PLATINUM: "success" };

export function LoyaltyPage() {
  const { t, money, num, date, text, enumLabel } = useI18n();
  const q = useApi<any>("/account/loyalty");
  return (
    <QueryView query={q} rows={8}>
      {(d) => {
        const a = d.account;
        const p = d.program;
        const progress = a.pointsToNextTier === null ? 100 : Math.min(100, Math.round((a.windowPoints / (a.windowPoints + a.pointsToNextTier)) * 100));
        return (
          <>
            <PageHeader title={t("loyalty.title")} subtitle={t("loyalty.subtitle")} badge={<span className={cn("badge", `badge-${TIER_TONE[a.tier] ?? "default"}`)}><Award size={12} aria-hidden /> {enumLabel("LoyaltyTier", a.tier)}</span>} />
            {!p.active && <div className="kit-note warning mb-4">{t("loyalty.inactive")}</div>}
            {a.expiringPoints > 0 && <div className="kit-note warning mb-4"><Ticket size={16} aria-hidden /> {t("loyalty.expiring", { points: num(a.expiringPoints), date: date(a.expiringAt) })}</div>}

            <Grid cols={3} className="mb-4">
              <Stat label={t("loyalty.points")} value={num(a.points)} hint={t("loyalty.pointsValue", { value: money(a.pointsValue) })} icon={Star} />
              <Stat label={t("loyalty.wallet")} value={money(a.walletBalance)} hint={t("loyalty.walletHint")} icon={Wallet} />
              <Stat label={t("loyalty.lifetime")} value={num(a.lifetimePoints)} hint={t("loyalty.tierSince", { date: date(a.tierSince) })} icon={TrendingUp} />
            </Grid>

            <div className="kit-split">
              <div className="kit-stack">
                <Card title={t("loyalty.tier")} actions={<EnumBadge group="LoyaltyTier" code={a.tier} tone={TIER_TONE[a.tier]} />}>
                  <p className="text-sm text-muted">{a.pointsToNextTier === null ? t("loyalty.topTier") : t("loyalty.nextTier", { tier: enumLabel("LoyaltyTier", a.nextTier), points: num(a.pointsToNextTier) })}</p>
                  <Progress value={progress} />
                  <p className="kit-field-hint">{t("loyalty.windowHint", { points: num(a.windowPoints) })}</p>
                  <h3 className="tk-subhead">{t("loyalty.perks")}</h3>
                  <ul className="kit-list">
                    {a.perks.map((perk: unknown, i: number) => (
                      <li key={i}><Sparkles size={14} className="text-brand" aria-hidden /> <span className="grow">{text(perk)}</span></li>
                    ))}
                  </ul>
                </Card>

                <Card title={t("loyalty.history")}>
                  {d.transactions.length === 0 ? (
                    <EmptyState title={t("loyalty.historyEmpty")} />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("common.date")}</th>
                            <th>{t("adm.loyalty.col.type")}</th>
                            <th className="num">{t("loyalty.points")}</th>
                            <th className="num hide-mobile">{t("adm.loyalty.col.balance")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.transactions.map((x: any) => (
                            <tr key={x.id}>
                              <td>{date(x.createdAt)}<small className="block text-muted">{text(x.label)}</small></td>
                              <td><EnumBadge group="LoyaltyTxnType" code={x.type} tone={x.type === "EXPIRE" ? "danger" : x.points > 0 ? "success" : "default"} /></td>
                              <td className="num">
                                {x.points !== 0 ? <strong className={x.points > 0 ? "text-success" : undefined}>{x.points > 0 ? "+" : ""}{num(x.points)}</strong> : null}
                                {x.amount && <small className="block">{x.type === "CASHBACK_SPEND" ? "−" : x.type === "CASHBACK_EARN" ? "+" : ""}{money(x.amount)}</small>}
                              </td>
                              <td className="num hide-mobile">{num(x.balanceAfter)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              <div className="kit-stack">
                <ReferralCard account={a} program={p} referrals={d.referrals} />
                <Card title={t("loyalty.earnTitle")}>
                  <ul className="kit-list">
                    <li><Star size={14} className="text-brand" aria-hidden /> <span className="grow">{t("loyalty.earnService", { points: p.pointsPerAznService })}</span></li>
                    <li><Star size={14} className="text-brand" aria-hidden /> <span className="grow">{t("loyalty.earnProduct", { points: p.pointsPerAznProduct })}</span></li>
                    <li><Star size={14} className="text-brand" aria-hidden /> <span className="grow">{t("loyalty.earnReview", { points: p.reviewBonusPoints })}</span></li>
                    <li><Star size={14} className="text-brand" aria-hidden /> <span className="grow">{t("loyalty.earnReferral", { points: p.referrerBonusPoints })}</span></li>
                  </ul>
                  <h3 className="tk-subhead">{t("loyalty.spendTitle")}</h3>
                  <p className="text-sm">{t("loyalty.spendHint", { share: p.maxRedeemSharePercent, min: num(p.minRedeemPoints) })}</p>
                  <p className="text-sm text-muted">{t("loyalty.expiryHint", { months: p.expiryMonths })}</p>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </QueryView>
  );
}

function ReferralCard({ account, program, referrals }: { account: any; program: any; referrals: any[] }) {
  const { t, num, date } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.referralLink);
      setCopied(true);
      toast.success(t("loyalty.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("errors.generic"));
    }
  };
  return (
    <Card title={<span className="flex items-center gap-2"><Gift size={16} aria-hidden /> {t("loyalty.referralTitle")}</span>}>
      <p className="text-sm text-muted">{t("loyalty.referralText", { inviter: num(program.referrerBonusPoints), invitee: num(program.refereeBonusPoints) })}</p>
      <div className="lyl-code">
        <span className="form-label">{t("loyalty.code")}</span>
        <strong>{account.referralCode}</strong>
      </div>
      <button type="button" className="btn outline w-full mt-2" onClick={copy}><Copy size={16} aria-hidden /> {copied ? t("loyalty.copied") : t("loyalty.copy")}</button>
      <Grid cols={3} className="mt-3">
        <Stat label={t("loyalty.invited")} value={num(account.referrals.invited)} icon={Users} />
        <Stat label={t("loyalty.qualified")} value={num(account.referrals.qualified)} icon={Award} />
        <Stat label={t("loyalty.earnedFromReferrals")} value={num(account.referrals.earnedPoints)} icon={Star} />
      </Grid>
      <h3 className="tk-subhead">{t("loyalty.referralList")}</h3>
      {referrals.length === 0 ? (
        <p className="text-sm text-muted">{t("loyalty.referralEmpty")}</p>
      ) : (
        <ul className="kit-list">
          {referrals.map((r) => (
            <li key={r.id}>
              <span className="grow">{r.inviteeName}<small className="block text-muted">{date(r.createdAt)}{r.rewardPoints ? ` · +${num(r.rewardPoints)}` : ""}</small></span>
              <EnumBadge group="ReferralStatus" code={r.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
