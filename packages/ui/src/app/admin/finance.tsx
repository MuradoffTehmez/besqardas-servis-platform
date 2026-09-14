"use client";
import React, { useEffect, useState } from "react";
import { Banknote, Download, Plug, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { patch, post, put, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link } from "../core/router";
import { useSession } from "../core/session";
import { Card, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stat, Tabs, TextArea, TextField, Toggle, errorText } from "../kit/base";
import { ActionBar, Dialog, ReasonDialog, ResourceTable, type ApiAction } from "../kit/actions";
import { PlanComparison } from "../kit/domain";
import { BarsChart, DonutChart, LinesChart } from "../kit/media";
import { PromptDialog, useRefresh } from "../pages/common";
import { ProfilePage, SecurityPage } from "../pages/account";
import { I18nInput, enumKeys } from "./crud";

/** Abunə planları, maliyyə, kassa, usta hesablaşmaları, təşkilat ayarları, inteqrasiyalar və hesabatlar (PRD §41–51, §61). */

/* ------------------------------------------------------------------ */
/* Abunə planları (§41–43)                                              */
/* ------------------------------------------------------------------ */

export function SubscriptionPlansAdminPage() {
  const { t, text, money, enumLabel } = useI18n();
  const q = useApi<any>("/admin/subscription-plans");
  const [group, setGroup] = useState("CUSTOMER");
  const [edit, setEdit] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.subscriptionPlans")} subtitle={t("adm.plans.subtitle")} actions={<><Link to="/subscriptions" className="btn outline">{t("adm.nav.subscriptions")}</Link><button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("common.create")}</button></>} />
      <QueryView query={q}>
        {(d) => {
          const plans = d.plans.filter((p: any) => p.group === group);
          const defs = d.entitlementDefinitions.filter((x: any) => x.group === group);
          return (
            <>
              <Tabs value={group} onChange={setGroup} tabs={enumKeys("PlanGroup").map((g) => ({ id: g, label: enumLabel("PlanGroup", g), badge: d.plans.filter((p: any) => p.group === g).length }))} />
              <Grid cols={3}>
                {plans.map((p: any) => (
                  <Card key={p.id} title={text(p.name)} subtitle={`${p.code} · tier ${p.tier}`} actions={<EnumBadge group="PlanVisibility" code={p.visibility} />}>
                    <p className="text-sm">{text(p.description)}</p>
                    <ul className="kit-list mt-2">{p.prices.map((pr: any) => <li key={pr.period}><span className="grow">{enumLabel("BillingPeriod", pr.period)}</span><strong className={cn(!pr.enabled && "text-muted")}>{money(pr.price)}</strong></li>)}</ul>
                    <p className="text-sm text-muted mt-2">{t("adm.plans.subscribers", { count: p.subscriberCount })}{p.trialDays ? ` · ${t("plans.trial", { days: p.trialDays })}` : ""}</p>
                    <button type="button" className="btn outline btn-sm mt-3" onClick={() => setEdit(p)}>{t("common.edit")}</button>
                  </Card>
                ))}
              </Grid>
              {plans.length > 0 && <Card title={t("acc.sub.compare")}><PlanComparison plans={plans} definitions={defs} period="MONTH_1" /></Card>}
              {edit && <PlanEditDialog plan={edit} definitions={d.entitlementDefinitions.filter((x: any) => x.group === edit.group)} onClose={() => setEdit(null)} />}
            </>
          );
        }}
      </QueryView>
      {creating && <PlanCreateDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function PlanEditDialog({ plan, definitions, onClose }: { plan: any; definitions: any[]; onClose: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ nameI18n: plan.nameI18n, descriptionI18n: plan.descriptionI18n, visibility: plan.visibility, highlight: plan.highlight, trialDays: plan.trialDays ?? "", prices: plan.prices.map((p: any) => ({ ...p, price: { ...p.price } })), entitlements: { ...plan.entitlements } });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="xl" title={`${text(plan.name)} — ${t("common.edit")}`} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await patch(`/admin/subscription-plans/${plan.id}`, { ...v, trialDays: v.trialDays === "" ? null : Number(v.trialDays) }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <p className="kit-note info text-sm mb-3">{t("adm.plans.editHint")}</p>
      <I18nInput label={t("adm.f.name")} value={v.nameI18n} onChange={(x) => setV({ ...v, nameI18n: x })} />
      <I18nInput label={t("adm.f.description")} value={v.descriptionI18n} onChange={(x) => setV({ ...v, descriptionI18n: x })} />
      <div className="kit-form-grid">
        <SelectField label={t("adm.f.visibility")} value={v.visibility} onValue={(x) => setV({ ...v, visibility: x })} options={enumKeys("PlanVisibility").map((x) => ({ value: x, label: enumLabel("PlanVisibility", x) }))} />
        <TextField label={t("adm.plans.trialDays")} type="number" value={String(v.trialDays)} onValue={(x) => setV({ ...v, trialDays: x })} />
        <div className="kit-field"><Toggle label={t("plans.popular")} checked={v.highlight} onValue={(x) => setV({ ...v, highlight: x })} /></div>
      </div>
      <h3 className="mb-2">{t("adm.plans.prices")}</h3>
      <div className="kit-form-grid">
        {v.prices.map((p: any, i: number) => (
          <div key={p.period} className="kit-field">
            <label className="form-label">{enumLabel("BillingPeriod", p.period)}</label>
            <div className="flex gap-2 items-center"><input className="form-input" inputMode="decimal" value={p.price.amount} aria-label={enumLabel("BillingPeriod", p.period)} onChange={(e) => setV({ ...v, prices: v.prices.map((x: any, j: number) => (j === i ? { ...x, price: { ...x.price, amount: e.target.value.replace(",", ".") } } : x)) })} /><Toggle label="" checked={p.enabled} onValue={(c) => setV({ ...v, prices: v.prices.map((x: any, j: number) => (j === i ? { ...x, enabled: c } : x)) })} /></div>
          </div>
        ))}
      </div>
      <h3 className="mb-2 mt-3">{t("adm.plans.entitlements")}</h3>
      <div className="kit-form-grid">
        {definitions.map((d) => {
          const val = v.entitlements[d.code];
          const set = (x: unknown) => setV({ ...v, entitlements: { ...v.entitlements, [d.code]: x } });
          if (d.valueType === "BOOLEAN") return <div key={d.code} className="kit-field"><Toggle label={text(d.label)} checked={!!val} onValue={set} /></div>;
          return <TextField key={d.code} label={`${text(d.label)}${d.valueType === "PERCENT" ? " (%)" : ""}`} value={val === undefined ? "" : String(val)} hint={d.valueType === "NUMBER" ? t("adm.plans.unlimitedHint") : undefined} onValue={(x) => set(x === "UNLIMITED" ? x : x === "" ? undefined : Number(x))} />;
        })}
      </div>
    </Dialog>
  );
}

function PlanCreateDialog({ onClose }: { onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ code: "", group: "CUSTOMER", tier: "3", nameI18n: { az: "", ru: "", en: "" } });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} title={t("adm.plans.create")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { try { await post("/admin/subscription-plans", { ...v, tier: Number(v.tier) }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <TextField label={t("adm.f.code")} value={v.code} onValue={(x) => setV({ ...v, code: x })} />
        <SelectField label={t("adm.f.group")} value={v.group} onValue={(x) => setV({ ...v, group: x })} options={enumKeys("PlanGroup").map((x) => ({ value: x, label: enumLabel("PlanGroup", x) }))} />
        <TextField label="Tier" type="number" value={v.tier} onValue={(x) => setV({ ...v, tier: x })} />
      </div>
      <I18nInput label={t("adm.f.name")} value={v.nameI18n} onChange={(x) => setV({ ...v, nameI18n: x })} />
      <p className="text-sm text-muted">{t("adm.plans.createHint")}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Maliyyə (§47–51)                                                     */
/* ------------------------------------------------------------------ */

export function FinancePage() {
  const { t, money, text, dateTime, enumLabel } = useI18n();
  const q = useApi<any>("/admin/finance");
  return (
    <>
      <PageHeader title={t("adm.nav.finance")} subtitle={q.data ? t("adm.finance.period", { period: q.data.period }) : undefined} actions={<><Link to="/payments" className="btn outline">{t("adm.nav.payments")}</Link><Link to="/invoices" className="btn outline">{t("adm.nav.invoices")}</Link><Link to="/cash-desks" className="btn outline">{t("adm.nav.cashDesks")}</Link></>} />
      <QueryView query={q} rows={10}>
        {(d) => (
          <>
            <Grid cols={4}>
              <Stat label={t("adm.finance.revenue")} value={money(d.revenue)} tone="success" />
              <Stat label={t("adm.finance.expenses")} value={money(d.expenses)} tone="danger" />
              <Stat label={t("adm.finance.profit")} value={money(d.profit)} tone="info" />
              <Stat label={t("adm.finance.vat")} value={money(d.vatPayable)} tone="warning" />
            </Grid>
            <Grid cols={4}>
              <Stat label={t("adm.finance.service")} value={money(d.serviceRevenue)} />
              <Stat label={t("adm.finance.sales")} value={money(d.salesRevenue)} />
              <Stat label={t("adm.finance.subscriptions")} value={money(d.subscriptionRevenue)} />
              <Stat label={t("adm.finance.refunds")} value={money(d.refunds)} tone="danger" />
            </Grid>
            <Grid cols={2}>
              <Card title={t("adm.finance.byMonth")}><BarsChart stacked data={d.revenueByMonth} xKey="month" bars={[{ key: "service", label: t("adm.finance.service") }, { key: "sales", label: t("adm.finance.sales") }, { key: "subscriptions", label: t("adm.finance.subscriptions") }]} /></Card>
              <Card title={t("adm.finance.expenseStructure")}><DonutChart data={d.expensesByCategory.map((x: any) => ({ name: text(x.name), value: x.value }))} /></Card>
            </Grid>
            <Grid cols={2}>
              <Card title={t("adm.finance.balances")}>
                <KeyValue cols={2} items={[[t("adm.finance.receivables"), <Link key="r" to="/b2b-accounts" className="text-brand">{money(d.receivables)}</Link>], [t("adm.finance.payables"), <Link key="p" to="/suppliers" className="text-brand">{money(d.payables)}</Link>], [t("adm.finance.cash"), <Link key="c" to="/cash-desks" className="text-brand">{money(d.cashOnHand)}</Link>], [t("adm.finance.bank"), money(d.bankBalance)], [t("adm.finance.settlements"), <Link key="s" to="/technician-settlements" className="text-brand">{money(d.settlementsPending)}</Link>]]} />
              </Card>
              <Card title={t("adm.finance.aging")}><BarsChart data={d.receivablesAging} xKey="bucket" bars={[{ key: "amount", label: t("adm.finance.receivables") }]} height={200} /></Card>
            </Grid>
            <Card title={t("adm.finance.export")} subtitle={t("adm.finance.exportHint", { adapter: d.accountingExport.adapter })} actions={<button type="button" className="btn outline btn-sm" onClick={() => toast.success(t("adm.finance.exportQueued"))}><Download size={14} /> {t("adm.finance.exportNow")}</button>}>
              <KeyValue cols={3} items={[[t("adm.finance.lastExport"), dateTime(d.accountingExport.lastExportAt)], ...Object.entries(d.accountingExport.statuses).map(([k, n]) => [enumLabel("SyncStatus", k), String(n)] as [string, string])]} />
            </Card>
          </>
        )}
      </QueryView>
    </>
  );
}

export function CashDesksPage() {
  const { t, money, dateTime, enumLabel, text } = useI18n();
  const q = useApi<any[]>("/admin/cash-desks");
  const refresh = useRefresh();
  const [confirm, setConfirm] = useState<{ desk: any; op: any } | null>(null);
  const run = async (desk: any, op: string, body: Record<string, unknown> = {}) => { try { await post(`/admin/cash-desks/${desk.id}/${op}`, body); await refresh(); toast.success(t("common.saved")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } };
  return (
    <>
      <PageHeader title={t("adm.nav.cashDesks")} subtitle={t("adm.cash.subtitle")} />
      <QueryView query={q}>
        {(desks) => (
          <Grid cols={2}>
            {desks.map((d) => (
              <Card key={d.id} title={<span className="flex items-center gap-2"><Banknote size={16} /> {text(d.name)}</span>} subtitle={`${enumLabel("CashDeskType", d.type)} · ${d.holderName} · ${text(d.branchName)}`} actions={<EnumBadge group="ShiftStatus" code={d.shiftStatus} />}>
                <div className="flex items-baseline gap-2 flex-wrap"><strong className={cn("text-2xl", d.overLimit && "text-danger")}>{money(d.balance)}</strong>{d.limit && <small className="text-muted">/ {money(d.limit)}</small>}</div>
                {d.overLimit && <p className="kit-note danger text-sm mt-2">{t("adm.cash.overLimit")}</p>}
                {Number(d.pendingHandover.amount) > 0 && <p className="kit-note warning text-sm mt-2">{t("adm.cash.pending", { amount: money(d.pendingHandover) })}</p>}
                {d.operations?.length > 0 && (
                  <ul className="kit-list mt-2">
                    {d.operations.slice(0, 6).map((op: any) => (
                      <li key={op.id}>
                        <span className="grow">{enumLabel("CashOperation", op.kind)}<small className="block text-muted">{dateTime(op.at)} · {op.actorName}{op.orderNumber ? ` · ${op.orderNumber}` : ""}{op.note ? ` · ${op.note}` : ""}</small></span>
                        <strong>{money(op.amount)}</strong>
                        {op.kind === "HANDOVER" && op.status === "PENDING" ? <button type="button" className="btn primary btn-sm" onClick={() => setConfirm({ desk: d, op })}>{t("adm.cash.confirm")}</button> : <EnumBadge group="OpStatus" code={op.status} />}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 mt-3">
                  {d.shiftStatus === "OPEN" ? <button type="button" className="btn outline btn-sm" onClick={() => run(d, "close_shift")}>{t("actions.close_shift")}</button> : <button type="button" className="btn outline btn-sm" onClick={() => run(d, "open_shift")}>{t("actions.open_shift")}</button>}
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </QueryView>
      {confirm && <PromptDialog open multiline={false} title={t("adm.cash.confirmTitle", { name: confirm.desk.holderName })} label={t("adm.cash.counted", { amount: money(confirm.op.amount) })} initial={confirm.op.amount.amount} confirmLabel={t("common.confirm")} onClose={() => setConfirm(null)} onSubmit={async (v) => { await post(`/admin/cash-desks/${confirm.desk.id}/confirm_handover`, { operationId: confirm.op.id, countedAmount: v }); await refresh(); if (Number(v) !== Number(confirm.op.amount.amount)) toast.warning(t("adm.cash.discrepancy")); }} />}
    </>
  );
}

export function SettlementsPage() {
  const { t, money, date, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [hold, setHold] = useState<any | null>(null);
  const [open, setOpen] = useState<any | null>(null);
  const run = async (row: any, op: string, body: Record<string, unknown> = {}) => { await post(`/admin/technician-settlements/${encodeURIComponent(row.id)}/${op}`, body); await refresh(); };
  return (
    <>
      <PageHeader title={t("adm.nav.technicianSettlements")} subtitle={t("adm.settle.subtitle")} />
      <ResourceTable
        path="/admin/technician-settlements"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("SettlementStatus").map((s) => ({ value: s, label: enumLabel("SettlementStatus", s) })) }]}
        columns={[
          { key: "technicianName", header: t("adm.f.technician"), render: (r: any) => <Link to={`/technicians/${r.technicianId}`}><strong>{r.technicianName}</strong></Link> },
          { key: "period", header: t("adm.f.period"), sortKey: "period" },
          { key: "lineCount", header: t("adm.settle.jobs"), className: "num" },
          { key: "gross", header: t("adm.settle.gross"), className: "num", render: (r: any) => money(r.gross) },
          { key: "deductions", header: t("tech.earn.deductions"), className: "num", render: (r: any) => money(r.deductions) },
          { key: "payable", header: t("tech.earn.payable"), className: "num", render: (r: any) => <strong>{money(r.payable)}</strong> },
          { key: "status", header: t("common.status"), render: (r: any) => <span><EnumBadge group="SettlementStatus" code={r.status} />{r.paidAt && <small className="block">{date(r.paidAt)}</small>}</span> },
          { key: "_a", header: "", render: (r: any) => (
            <span className="flex gap-1 flex-wrap justify-end">
              <button type="button" className="btn ghost btn-sm" onClick={() => setOpen(r)}>{t("common.details")}</button>
              <ActionBar size="sm" actions={[...r.availableActions, ...(r.status !== "PAID" && r.status !== "ON_HOLD" ? [{ code: "hold_settlement", variant: "destructive" as const }] : []), ...(r.status === "ON_HOLD" ? [{ code: "release" }] : [])]} custom={{ hold_settlement: () => setHold(r) }} run={async (a: ApiAction) => run(r, a.code)} />
            </span>
          ) },
        ]}
      />
      {hold && <ReasonDialog open category="ON_HOLD" title={t("actions.hold_settlement")} onClose={() => setHold(null)} onSubmit={async (code, note) => { try { await run(hold, "hold", { reason: note || code }); setHold(null); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }} />}
      {open && (
        <Dialog open size="lg" title={`${open.technicianName} · ${open.period}`} onClose={() => setOpen(null)}>
          <div className="table-wrap"><table><thead><tr><th>{t("tech.res.job")}</th><th>{t("tech.earn.closedAt")}</th><th className="num">{t("tech.earn.labor")}</th><th className="num">{t("tech.earn.ownMaterial")}</th><th>{t("tech.earn.deductions")}</th><th className="num">{t("tech.earn.payable")}</th><th>{t("common.status")}</th></tr></thead><tbody>
            {open.lines.map((l: any) => <tr key={l.id}><td><Link to={`/service-orders/${l.orderId}`} className="text-brand">{l.orderNumber}</Link></td><td>{date(l.closedAt)}</td><td className="num">{money(l.laborAmount)}</td><td className="num">{money(l.ownMaterialAmount)}</td><td>{l.deductions.map((x: any) => `${enumLabel("DeductionKind", x.kind)}: ${(x.cents / 100).toFixed(2)}`).join("; ") || "—"}</td><td className="num"><strong>{money(l.payable)}</strong></td><td><EnumBadge group="SettlementStatus" code={l.status} />{l.holdReason && <small className="block text-danger">{l.holdReason}</small>}</td></tr>)}
          </tbody></table></div>
          <p className="text-sm text-muted mt-3">{t("adm.settle.hint")}</p>
        </Dialog>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Təşkilat ayarları                                                    */
/* ------------------------------------------------------------------ */

export function SettingsPage() {
  const { t, enumLabel } = useI18n();
  const { can } = useSession();
  const q = useApi<any>("/admin/settings");
  const refresh = useRefresh();
  const [v, setV] = useState<any | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (q.data) setV(structuredClone(q.data)); }, [q.data]);
  if (!v) return <Loading rows={8} />;
  const num = (k: string, label: string, hint?: string) => <TextField label={label} type="number" value={String(v[k])} hint={hint} onValue={(x) => setV({ ...v, [k]: Number(x) })} />;
  const moneyField = (k: string, label: string) => <TextField label={`${label} (AZN)`} inputMode="decimal" value={v[k].amount} onValue={(x) => setV({ ...v, [k]: { ...v[k], amount: x.replace(",", ".") } })} />;
  return (
    <>
      <PageHeader title={t("adm.nav.settings")} actions={<><Link to="/settings/branding" className="btn outline">{t("adm.nav.branding")}</Link>{can("settings:edit") && <button type="button" className="btn primary" onClick={async () => { setError(null); try { await put("/admin/settings", v); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); } }}>{t("common.save")}</button>}</>} />
      <FormError error={error} />
      <fieldset disabled={!can("settings:edit")}>
        <Grid cols={2}>
          <Card title={t("adm.settings.general")}>
            <div className="kit-form-grid">
              <TextField label={t("adm.settings.timezone")} value={v.timezone} onValue={(x) => setV({ ...v, timezone: x })} />
              <SelectField label={t("adm.settings.locale")} value={v.defaultLocale} onValue={(x) => setV({ ...v, defaultLocale: x })} options={[{ value: "az", label: "Azərbaycan" }, { value: "ru", label: "Русский" }, { value: "en", label: "English" }]} />
              {Object.entries(v.orderNumberPrefix).map(([k, p]: any) => <TextField key={k} label={t("adm.settings.prefix", { kind: t(`adm.settings.kind.${k}`) })} value={p} onValue={(x) => setV({ ...v, orderNumberPrefix: { ...v.orderNumberPrefix, [k]: x } })} />)}
            </div>
          </Card>
          <Card title={t("adm.settings.service")}>
            <div className="kit-form-grid">
              {num("offerResponseMinutes", t("adm.settings.offerResponse"))}
              {num("estimateValidityDays", t("adm.settings.estimateValidity"))}
              {num("estimateToleranceBps", t("adm.settings.tolerance"), t("adm.settings.toleranceHint"))}
              {num("reservationTtlHours", t("adm.settings.reservationTtl"))}
            </div>
          </Card>
          <Card title={t("adm.settings.money")}>
            <div className="kit-form-grid">
              <SelectField label={t("adm.settings.settlementPeriod")} value={v.settlementPeriod} onValue={(x) => setV({ ...v, settlementPeriod: x })} options={enumKeys("SettlementPeriod").map((x) => ({ value: x, label: enumLabel("SettlementPeriod", x) }))} />
              {moneyField("technicianCashLimit", t("adm.settings.cashLimit"))}
              <div className="kit-field span-2"><Toggle label={t("adm.settings.independentCash")} checked={v.independentCashAllowed} onValue={(x) => setV({ ...v, independentCashAllowed: x })} /></div>
            </div>
          </Card>
          <Card title={t("adm.settings.commerce")}>
            <div className="kit-form-grid">
              {moneyField("deliveryFlatRate", t("adm.settings.delivery"))}
              {moneyField("freeDeliveryThreshold", t("adm.settings.freeDelivery"))}
              {num("returnWindowDays", t("adm.settings.returnWindow"))}
              <TextField label={t("adm.settings.quietFrom")} type="time" value={v.quietHours.from} onValue={(x) => setV({ ...v, quietHours: { ...v.quietHours, from: x } })} />
              <TextField label={t("adm.settings.quietTo")} type="time" value={v.quietHours.to} onValue={(x) => setV({ ...v, quietHours: { ...v.quietHours, to: x } })} />
            </div>
          </Card>
        </Grid>
      </fieldset>
    </>
  );
}

export function BrandingPage() {
  const { t } = useI18n();
  const q = useApi<any>("/admin/branding");
  const refresh = useRefresh();
  const [v, setV] = useState<any | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (q.data) setV(structuredClone(q.data)); }, [q.data]);
  if (!v) return <Loading rows={8} />;
  const f = (group: string | null, key: string, label: string) => <TextField label={label} value={(group ? v[group][key] : v[key]) ?? ""} onValue={(x) => setV(group ? { ...v, [group]: { ...v[group], [key]: x } } : { ...v, [key]: x })} />;
  return (
    <>
      <PageHeader back="/settings" title={t("adm.nav.branding")} subtitle={t("adm.brand.subtitle")} actions={<button type="button" className="btn primary" onClick={async () => { setError(null); try { await put("/admin/branding", v); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); } }}>{t("common.save")}</button>} />
      <FormError error={error} />
      <div className="kit-split">
        <div className="kit-stack">
          <Card title={t("adm.brand.company")}><div className="kit-form-grid">{f(null, "companyName", t("adm.brand.companyName"))}{f(null, "legalName", t("adm.f.legalName"))}{f(null, "voen", t("adm.f.voen"))}{f(null, "logoText", t("adm.brand.logoText"))}{f(null, "domain", t("adm.brand.domain"))}{f(null, "adminDomain", t("adm.brand.adminDomain"))}</div></Card>
          <Card title={t("adm.brand.colors")}><div className="kit-form-grid">{Object.keys(v.colors).map((k) => <TextField key={k} label={t(`adm.brand.color.${k}`)} type="color" value={v.colors[k]} onValue={(x) => setV({ ...v, colors: { ...v.colors, [k]: x } })} />)}</div></Card>
          <Card title={t("adm.brand.contacts")}><div className="kit-form-grid">{Object.keys(v.contacts).map((k) => <React.Fragment key={k}>{f("contacts", k, t(`adm.brand.contact.${k}`))}</React.Fragment>)}{Object.keys(v.social).map((k) => <React.Fragment key={k}>{f("social", k, k)}</React.Fragment>)}</div></Card>
          <Card title={t("adm.brand.documents")}><TextArea label={t("adm.brand.footer")} value={v.documentFooter} onValue={(x) => setV({ ...v, documentFooter: x })} rows={2} /></Card>
        </div>
        <Card title={t("adm.products.preview")}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: v.colors.primary, color: "#fff", padding: 16, display: "flex", alignItems: "center", gap: 8 }}><span className="logo-icon" style={{ background: "#fff", color: v.colors.primary }}>bq</span><strong>{v.logoText}</strong></div>
            <div style={{ padding: 16 }}>
              <p>{v.companyName}</p>
              <button type="button" className="btn btn-sm mt-2" style={{ background: v.colors.accent, color: "#111" }}>{t("book")}</button>
              <p className="text-sm text-muted mt-3">{v.contacts.phone} · {v.contacts.email}</p>
              <hr className="my-4" />
              <small>{v.documentFooter}</small>
            </div>
          </div>
          <p className="text-sm text-muted mt-3">{t("adm.brand.previewHint")}</p>
        </Card>
      </div>
    </>
  );
}

export function IntegrationsPage() {
  const { t, enumLabel, relative, text } = useI18n();
  const q = useApi<any[]>("/admin/integrations");
  const refresh = useRefresh();
  const [key, setKey] = useState<any | null>(null);
  const upd = async (id: string, body: Record<string, unknown>) => { try { await patch(`/admin/integrations/${id}`, body); await refresh(); toast.success(t("common.saved")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } };
  return (
    <>
      <PageHeader title={t("adm.nav.integrations")} subtitle={t("adm.integr.subtitle")} />
      <QueryView query={q}>
        {(list) => (
          <Card flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("adm.integr.area")}</th><th>{t("adm.integr.provider")}</th><th>{t("adm.integr.mode")}</th><th>{t("adm.integr.key")}</th><th>{t("adm.integr.health")}</th><th>{t("adm.integr.primary")}</th><th>{t("adm.f.active")}</th><th /></tr></thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={i.id}>
                      <td>{enumLabel("IntegrationArea", i.area)}<small className="block">{i.interfaceName}</small></td>
                      <td><strong>{i.provider}</strong></td>
                      <td><select className="form-input" value={i.mode} aria-label={t("adm.integr.mode")} onChange={(e) => upd(i.id, { mode: e.target.value })}>{enumKeys("IntegrationMode").map((m) => <option key={m} value={m}>{enumLabel("IntegrationMode", m)}</option>)}</select></td>
                      <td><code>{i.maskedKey ?? "—"}</code><button type="button" className="btn ghost btn-sm" onClick={() => setKey(i)}>{t("adm.integr.setKey")}</button></td>
                      <td><EnumBadge group="Health" code={i.health} />{i.lastEventAt && <small className="block">{relative(i.lastEventAt)}</small>}</td>
                      <td><input type="radio" name={`primary-${i.area}`} checked={i.primary} aria-label={t("adm.integr.primary")} onChange={() => upd(i.id, { primary: true })} /></td>
                      <td><Toggle label="" checked={i.active} onValue={(v) => upd(i.id, { active: v })} /></td>
                      <td><button type="button" className="btn outline btn-sm" onClick={async () => { const r = await post(`/admin/integrations/${i.id}/test`); await refresh(); (r.ok ? toast.success : toast.error)(`${text(r.message)}${r.latencyMs ? ` · ${r.latencyMs} ms` : ""}`); }}><Plug size={14} /> {t("adm.integr.test")}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </QueryView>
      <p className="text-sm text-muted mt-3">{t("adm.integr.secretsHint")}</p>
      {key && <PromptDialog open multiline={false} title={`${key.provider} — ${t("adm.integr.setKey")}`} label={t("adm.integr.key")} confirmLabel={t("common.save")} onClose={() => setKey(null)} onSubmit={async (v) => { await patch(`/admin/integrations/${key.id}`, { apiKey: v }); await refresh(); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hesabatlar (§63)                                                     */
/* ------------------------------------------------------------------ */

export function ReportsPage() {
  const { t, text, enumLabel, money, num } = useI18n();
  const q = useApi<any>("/admin/reports");
  const [tab, setTab] = useState("kpi");
  return (
    <>
      <PageHeader title={t("adm.nav.reports")} subtitle={q.data ? t("adm.finance.period", { period: q.data.period }) : undefined} actions={<><Link to="/kpi-targets" className="btn outline">{t("adm.nav.kpiTargets")}</Link><button type="button" className="btn outline" onClick={() => window.print()}>{t("docs.print")}</button></>} />
      <QueryView query={q} rows={10}>
        {(d) => (
          <>
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "kpi", label: "KPI" }, { id: "orders", label: t("adm.nav.serviceOrders") }, { id: "revenue", label: t("adm.reports.revenue") }, { id: "technicians", label: t("adm.nav.technicians") }, { id: "products", label: t("adm.reports.products") }, { id: "subscriptions", label: t("adm.nav.subscriptions") }]} />
            {tab === "kpi" && (
              <Grid cols={3}>
                {d.kpis.map((k: any) => (
                  <div key={k.code} className={cn("kit-stat", k.ok ? "tone-success" : "tone-danger")}>
                    <div className="kit-stat-top"><span className="kit-stat-label">{text(k.name)}</span><span className={cn("badge", k.ok ? "badge-success" : "badge-danger")}>{k.ok ? "OK" : "!"}</span></div>
                    <strong className="kit-stat-value">{k.value} {k.unit}</strong>
                    <span className="kit-stat-hint">{t("adm.reports.target", { target: `${k.target} ${k.unit}` })}</span>
                  </div>
                ))}
              </Grid>
            )}
            {tab === "orders" && (
              <Grid cols={2}>
                <Card title={t("adm.dash.ordersByDay")}><LinesChart data={d.ordersByDay} xKey="date" lines={[{ key: "created", label: t("adm.dash.created") }, { key: "completed", label: t("adm.dash.completed") }]} /></Card>
                <Card title={t("adm.dash.byStatus")}><DonutChart data={d.ordersByStatus.filter((s: any) => s.count).map((s: any) => ({ name: enumLabel("OrderStatus", s.status), value: s.count }))} /></Card>
                <Card title={t("adm.reports.topServices")}><BarsChart data={d.topServices.map((s: any) => ({ name: text(s.name), count: s.count }))} xKey="name" bars={[{ key: "count", label: t("adm.f.orders") }]} /></Card>
                <Card title={t("adm.reports.estimateFunnel")}><BarsChart data={[{ stage: t("adm.reports.sent"), value: d.estimateFunnel.sent }, { stage: t("adm.reports.approved"), value: d.estimateFunnel.approved }, { stage: t("adm.reports.rejected"), value: d.estimateFunnel.rejected }]} xKey="stage" bars={[{ key: "value", label: t("acc.estimate.title") }]} /></Card>
              </Grid>
            )}
            {tab === "revenue" && <Card title={t("adm.reports.byBranch")}><BarsChart stacked data={d.revenueByBranch.map((b: any) => ({ ...b, branch: text(b.branch) }))} xKey="branch" bars={[{ key: "service", label: t("adm.finance.service") }, { key: "sales", label: t("adm.finance.sales") }]} height={320} /></Card>}
            {tab === "technicians" && (
              <Card flush><div className="table-wrap"><table><thead><tr><th>{t("adm.f.technician")}</th><th>{t("adm.f.employmentType")}</th><th className="num">{t("adm.f.orders")}</th><th className="num">{t("adm.f.rating")}</th><th className="num">{t("tech.stats.firstFix")}</th><th className="num">{t("tech.stats.warrantyRate")}</th></tr></thead><tbody>
                {d.technicianPerformance.map((x: any) => <tr key={x.name}><td>{x.name}</td><td>{enumLabel("EmploymentType", x.employmentType)}</td><td className="num">{x.jobs}</td><td className="num">{x.rating}</td><td className="num">{x.firstVisitFix}%</td><td className={cn("num", x.warrantyRate > 2 && "text-danger")}>{x.warrantyRate}%</td></tr>)}
              </tbody></table></div></Card>
            )}
            {tab === "products" && (
              <Card flush><div className="table-wrap"><table><thead><tr><th>{t("adm.f.product")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("adm.reports.revenue")}</th></tr></thead><tbody>
                {d.topProducts.map((p: any) => <tr key={text(p.name)}><td>{text(p.name)}</td><td className="num">{p.quantity}</td><td className="num">{money({ amount: String(p.revenue), currency: "AZN" })}</td></tr>)}
              </tbody></table></div></Card>
            )}
            {tab === "subscriptions" && (
              <Card flush><div className="table-wrap"><table><thead><tr><th>{t("adm.f.plan")}</th><th className="num">{t("adm.reports.active")}</th><th className="num">{t("adm.reports.churn")}</th></tr></thead><tbody>
                {d.subscriptions.map((s: any) => <tr key={text(s.plan)}><td>{text(s.plan)}</td><td className="num">{s.active}</td><td className="num">{num(s.churn, 1)}%</td></tr>)}
              </tbody></table></div></Card>
            )}
          </>
        )}
      </QueryView>
    </>
  );
}

export function AdminProfilePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("profile");
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "profile", label: t("acc.nav.profile") }, { id: "security", label: t("acc.nav.security") }]} />
      {tab === "profile" ? <ProfilePage /> : <SecurityPage />}
    </>
  );
}
