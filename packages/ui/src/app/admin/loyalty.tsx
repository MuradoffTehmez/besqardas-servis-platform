"use client";
import React, { useEffect, useState } from "react";
import { Award, Coins, Gift, Percent, Star, Wallet } from "lucide-react";
import { toast } from "sonner";
import { post, put, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, EnumBadge, FormError, Grid, PageHeader, QueryView, SelectField, Stat, Tabs, TextArea, TextField, Toggle, errorText, useFormState } from "../kit/base";
import { Dialog, ResourceTable } from "../kit/actions";
import { useRefresh } from "../pages/common";
import { useLookups } from "./crud";

/**
 * Loyallıq proqramının idarəetməsi (§A2): icmal, üzvlər, xal defteri, dəvətlər və parametrlər.
 * Xal hesabı və limitlər backend-dədir; ekran yalnız konfiqurasiyanı göndərir.
 */

const TABS = ["overview", "members", "transactions", "referrals", "settings"] as const;
const TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;
const TIER_TONE: Record<string, string> = { BRONZE: "default", SILVER: "info", GOLD: "warning", PLATINUM: "success" };

export function LoyaltyAdminPage() {
  const { t, num, money, date, enumLabel, text } = useI18n();
  const { can } = useSession();
  const { query, setQuery } = useRouter();
  const q = useApi<any>("/admin/loyalty");
  const [adjusting, setAdjusting] = useState(false);
  const tab = (query.get("tab") as (typeof TABS)[number]) || "overview";
  return (
    <>
      <PageHeader
        title={t("adm.nav.loyalty")}
        subtitle={t("adm.loyalty.subtitle")}
        actions={can("loyalty:edit") ? <button type="button" className="btn primary" onClick={() => setAdjusting(true)}><Coins size={16} /> {t("adm.loyalty.adjust")}</button> : undefined}
      />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v, page: 1 })} tabs={TABS.map((x) => ({ id: x, label: t(`adm.loyalty.tabs.${x}`) }))} />
      <QueryView query={q} rows={6}>
        {(d) => (
          <>
            {tab === "overview" && <Overview stats={d.stats} program={d.program} />}
            {tab === "members" && (
              <ResourceTable
                path="/admin/loyalty/members"
                defaultSort="-points"
                columns={[
                  { key: "name", header: t("adm.loyalty.col.member"), render: (r: any) => <span>{r.name}<small className="block text-muted">{r.phone ?? "—"}</small></span> },
                  { key: "tier", header: t("adm.loyalty.col.tier"), render: (r: any) => <EnumBadge group="LoyaltyTier" code={r.tier} tone={TIER_TONE[r.tier]} /> },
                  { key: "points", header: t("adm.loyalty.col.points"), sortKey: "points", className: "num", render: (r: any) => num(r.points) },
                  { key: "lifetimePoints", header: t("adm.loyalty.col.lifetime"), sortKey: "lifetimePoints", className: "num", hideOnMobile: true, render: (r: any) => num(r.lifetimePoints) },
                  { key: "walletBalance", header: t("adm.loyalty.col.wallet"), className: "num", render: (r: any) => money(r.walletBalance) },
                  { key: "referrals", header: t("adm.loyalty.col.referrals"), className: "num", hideOnMobile: true },
                  { key: "lastActivityAt", header: t("adm.loyalty.col.lastActivity"), sortKey: "lastActivityAt", hideOnMobile: true, render: (r: any) => (r.lastActivityAt ? date(r.lastActivityAt) : "—") },
                ]}
              />
            )}
            {tab === "transactions" && (
              <ResourceTable
                path="/admin/loyalty/transactions"
                defaultSort="-createdAt"
                filters={[{ key: "type", label: t("adm.loyalty.col.type"), options: ["EARN_ORDER", "EARN_REVIEW", "EARN_SIGNUP", "EARN_REFERRAL", "REDEEM", "EXPIRE", "ADJUST", "CASHBACK_EARN", "CASHBACK_SPEND"].map((c) => ({ value: c, label: enumLabel("LoyaltyTxnType", c) })) }]}
                columns={[
                  { key: "createdAt", header: t("adm.loyalty.col.date"), sortKey: "createdAt", render: (r: any) => date(r.createdAt) },
                  { key: "customerName", header: t("adm.loyalty.col.customer") },
                  { key: "type", header: t("adm.loyalty.col.type"), render: (r: any) => <EnumBadge group="LoyaltyTxnType" code={r.type} tone={r.type === "EXPIRE" ? "danger" : r.points > 0 ? "success" : "default"} /> },
                  { key: "label", header: t("common.description"), hideOnMobile: true, render: (r: any) => text(r.label) },
                  { key: "points", header: t("adm.loyalty.col.points"), className: "num", render: (r: any) => (r.points ? `${r.points > 0 ? "+" : ""}${num(r.points)}` : "—") },
                  { key: "amount", header: t("adm.loyalty.col.amount"), className: "num", hideOnMobile: true, render: (r: any) => (r.amount ? money(r.amount) : "—") },
                  { key: "balanceAfter", header: t("adm.loyalty.col.balance"), className: "num", hideOnMobile: true, render: (r: any) => num(r.balanceAfter) },
                  { key: "orderNumber", header: t("adm.loyalty.col.order"), hideOnMobile: true, render: (r: any) => r.orderNumber ?? "—" },
                ]}
              />
            )}
            {tab === "referrals" && (
              <ResourceTable
                path="/admin/loyalty/referrals"
                defaultSort="-createdAt"
                filters={[{ key: "status", label: t("adm.loyalty.col.status"), options: ["INVITED", "REGISTERED", "QUALIFIED", "REWARDED", "EXPIRED"].map((c) => ({ value: c, label: enumLabel("ReferralStatus", c) })) }]}
                columns={[
                  { key: "createdAt", header: t("adm.loyalty.col.date"), sortKey: "createdAt", render: (r: any) => date(r.createdAt) },
                  { key: "inviterName", header: t("adm.loyalty.col.inviter") },
                  { key: "inviteeName", header: t("adm.loyalty.col.invitee") },
                  { key: "code", header: t("adm.loyalty.col.code"), hideOnMobile: true, render: (r: any) => <code>{r.code}</code> },
                  { key: "status", header: t("adm.loyalty.col.status"), render: (r: any) => <EnumBadge group="ReferralStatus" code={r.status} /> },
                  { key: "rewardPoints", header: t("adm.loyalty.col.reward"), className: "num", render: (r: any) => (r.rewardPoints ? num(r.rewardPoints) : "—") },
                  { key: "orderNumber", header: t("adm.loyalty.col.order"), hideOnMobile: true, render: (r: any) => r.orderNumber ?? "—" },
                ]}
              />
            )}
            {tab === "settings" && <ProgramSettings program={d.program} canEdit={can("loyalty:edit")} />}
          </>
        )}
      </QueryView>
      {adjusting && <AdjustDialog onClose={() => setAdjusting(false)} />}
    </>
  );
}

function Overview({ stats: s, program }: { stats: any; program: any }) {
  const { t, num, money, enumLabel } = useI18n();
  return (
    <>
      <Grid cols={4} className="mb-4">
        <Stat label={t("adm.loyalty.stats.members")} value={num(s.members)} hint={t("adm.loyalty.stats.active", { count: s.activeMembers })} icon={Award} />
        <Stat label={t("adm.loyalty.stats.outstanding")} value={num(s.outstandingPoints)} hint={t("adm.loyalty.stats.liability", { value: money(s.liability) })} icon={Star} />
        <Stat label={t("adm.loyalty.stats.redemption")} value={`${s.redemptionRate}%`} hint={t("adm.loyalty.stats.issued", { issued: num(s.pointsIssued), redeemed: num(s.pointsRedeemed) })} icon={Percent} />
        <Stat label={t("adm.loyalty.stats.wallet")} value={money(s.walletOutstanding)} hint={t("adm.loyalty.stats.cashbackPaid", { value: money(s.cashbackPaid) })} icon={Wallet} />
      </Grid>
      <Grid cols={2}>
        <Card title={t("adm.loyalty.stats.byTier")}>
          <ul className="kit-list">
            {s.byTier.map((x: any) => {
              const rule = program.tiers.find((r: any) => r.tier === x.tier);
              return (
                <li key={x.tier}>
                  <span className="grow"><EnumBadge group="LoyaltyTier" code={x.tier} tone={TIER_TONE[x.tier]} /> {rule ? <small className="text-muted">{rule.multiplier}x · {rule.cashbackPercent}%</small> : null}</span>
                  <strong>{num(x.members)}</strong>
                  <span className="text-sm text-muted">{num(x.points)} {t("adm.loyalty.col.points").toLowerCase()}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted mt-2">{t("adm.loyalty.stats.expired")}: {num(s.pointsExpired)}</p>
        </Card>
        <Card title={<span className="flex items-center gap-2"><Gift size={16} aria-hidden /> {t("adm.loyalty.stats.referralFunnel")}</span>} subtitle={t("adm.loyalty.stats.conversion", { value: s.referrals.conversion })}>
          <ul className="kit-list">
            {(["invited", "registered", "qualified", "rewarded"] as const).map((k) => (
              <li key={k}>
                <span className="grow">{enumLabel("ReferralStatus", k === "invited" ? "INVITED" : k === "registered" ? "REGISTERED" : k === "qualified" ? "QUALIFIED" : "REWARDED")}</span>
                <strong>{num(s.referrals[k])}</strong>
              </li>
            ))}
          </ul>
        </Card>
      </Grid>
    </>
  );
}

function ProgramSettings({ program, canEdit }: { program: any; canEdit: boolean }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const form = useFormState<Record<string, any>>({ ...program, referralQualifyCents: program.referralQualifyCents, tiers: program.tiers });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => form.setValues({ ...program, tiers: program.tiers }), [program]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = form.values;
  const n = (key: string, label: string, hint?: string) => (
    <TextField key={key} label={label} type="number" value={String(v[key] ?? "")} onValue={(x) => form.set(key, Number(x))} error={form.errors[key]} hint={hint} disabled={!canEdit} />
  );
  const setTier = (tier: string, field: string, value: number) => form.set("tiers", v.tiers.map((x: any) => (x.tier === tier ? { ...x, [field]: value } : x)));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await put("/admin/loyalty", {
        active: v.active,
        pointsPerAznService: v.pointsPerAznService,
        pointsPerAznProduct: v.pointsPerAznProduct,
        pointValueCents: v.pointValueCents,
        minRedeemPoints: v.minRedeemPoints,
        maxRedeemSharePercent: v.maxRedeemSharePercent,
        expiryMonths: v.expiryMonths,
        signupBonusPoints: v.signupBonusPoints,
        reviewBonusPoints: v.reviewBonusPoints,
        referrerBonusPoints: v.referrerBonusPoints,
        refereeBonusPoints: v.refereeBonusPoints,
        referralQualifyCents: v.referralQualifyCents,
        tiers: v.tiers.map((x: any) => ({ tier: x.tier, thresholdPoints: x.thresholdPoints, multiplier: x.multiplier, cashbackPercent: x.cashbackPercent, extraDiscountPercent: x.extraDiscountPercent })),
      });
      await refresh();
      toast.success(t("adm.loyalty.settings.saved"));
    } catch (e) {
      setError(e);
      form.fromError(e);
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="kit-stack">
      <FormError error={error} />
      <Card title={t("adm.loyalty.settings.earn")}>
        <div className="kit-field mb-3"><Toggle label={t("adm.loyalty.settings.active")} checked={!!v.active} onValue={(x) => form.set("active", x)} disabled={!canEdit} /><p className="kit-field-hint">{t("adm.loyalty.settings.activeHint")}</p></div>
        <div className="kit-form-grid">
          {n("pointsPerAznService", t("adm.loyalty.settings.pointsPerAznService"))}
          {n("pointsPerAznProduct", t("adm.loyalty.settings.pointsPerAznProduct"))}
          {n("pointValueCents", t("adm.loyalty.settings.pointValueCents"))}
          {n("expiryMonths", t("adm.loyalty.settings.expiryMonths"))}
        </div>
      </Card>
      <Card title={t("adm.loyalty.settings.spend")}>
        <div className="kit-form-grid">
          {n("minRedeemPoints", t("adm.loyalty.settings.minRedeemPoints"))}
          {n("maxRedeemSharePercent", t("adm.loyalty.settings.maxRedeemSharePercent"))}
        </div>
      </Card>
      <Card title={t("adm.loyalty.settings.bonuses")}>
        <div className="kit-form-grid">
          {n("signupBonusPoints", t("adm.loyalty.settings.signupBonusPoints"))}
          {n("reviewBonusPoints", t("adm.loyalty.settings.reviewBonusPoints"))}
          {n("referrerBonusPoints", t("adm.loyalty.settings.referrerBonusPoints"))}
          {n("refereeBonusPoints", t("adm.loyalty.settings.refereeBonusPoints"))}
          {n("referralQualifyCents", t("adm.loyalty.settings.referralQualifyCents"))}
        </div>
      </Card>
      <Card title={t("adm.loyalty.settings.tiers")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("adm.loyalty.col.tier")}</th>
                <th className="num">{t("adm.loyalty.settings.threshold")}</th>
                <th className="num">{t("adm.loyalty.settings.multiplier")}</th>
                <th className="num">{t("adm.loyalty.settings.cashback")}</th>
                <th className="num">{t("adm.loyalty.settings.extraDiscount")}</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => {
                const row = (v.tiers ?? []).find((x: any) => x.tier === tier) ?? { thresholdPoints: 0, multiplier: 1, cashbackPercent: 0, extraDiscountPercent: 0 };
                return (
                  <tr key={tier}>
                    <td><EnumBadge group="LoyaltyTier" code={tier} tone={TIER_TONE[tier]} /></td>
                    {(["thresholdPoints", "multiplier", "cashbackPercent", "extraDiscountPercent"] as const).map((field) => (
                      <td key={field} className="num">
                        <input type="number" step={field === "multiplier" ? "0.05" : field === "cashbackPercent" ? "0.5" : "1"} className="form-input" aria-label={`${tier} ${field}`} value={String(row[field])} disabled={!canEdit} onChange={(e) => setTier(tier, field, Number(e.target.value))} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {form.errors.tiers && <p className="kit-field-error">{t("validation.invalid")}</p>}
      </Card>
      {canEdit && (
        <div className="flex justify-end">
          <button type="button" className="btn primary" disabled={busy} onClick={save}>{t("common.save")}</button>
        </div>
      )}
    </div>
  );
}

function AdjustDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const lookups = useLookups();
  const form = useFormState({ userId: "", points: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const v = form.values;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await post("/admin/loyalty/adjust", { userId: v.userId, points: Number(v.points), reason: v.reason });
      await refresh();
      toast.success(t("adm.loyalty.adjustDone", { points: r.account.points }));
      onClose();
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="sm" title={t("adm.loyalty.adjust")} subtitle={t("adm.loyalty.adjustHint")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !v.userId || !v.points || v.reason.trim().length < 3} onClick={submit}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("adm.loyalty.col.customer")} required value={v.userId} onValue={(x) => form.set("userId", x)} placeholder={t("common.choose")} error={form.errors.userId} options={(lookups.data?.customers ?? []).map((c: any) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))} />
      <TextField label={t("adm.loyalty.adjustPoints")} type="number" required value={v.points} onValue={(x) => form.set("points", x)} error={form.errors.points} />
      <TextArea label={t("adm.loyalty.adjustReason")} required rows={2} value={v.reason} onValue={(x) => form.set("reason", x)} error={form.errors.reason} />
    </Dialog>
  );
}
