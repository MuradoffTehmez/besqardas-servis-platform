"use client";
import React, { useState } from "react";
import { AlertTriangle, BadgePercent, Building2, ChevronRight, ClipboardList, CreditCard, FileSignature, FileText, Gauge, Megaphone, Package, Percent, Plus, ShieldCheck, ShoppingBag, Timer, Trash2, Upload, Wallet, Wrench, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { patch, post, put, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { formatMonth } from "@sp/i18n";
import { Card, EmptyState, EnumBadge, FormError, Grid, KeyValue, PageHeader, QueryView, SelectField, Stat, TextArea, TextField, errorText } from "../kit/base";
import { ConfirmDialog, Dialog, ResourceTable } from "../kit/actions";
import { BarsChart, DonutChart, MapView } from "../kit/media";
import { PhoneField } from "../kit/media";
import { AvatarUploader } from "../kit/upload";
import { DocumentsPage, ServiceOrdersPage } from "./account";
import { DocumentDialog, UsageBar, useRefresh } from "./common";

/**
 * B2B kabinetləri (PRD §44–45, §60.5): korporativ müştəri, partner və topdan alıcı. Qiymət, limit və borc API-dən gəlir.
 */

export type Segment = "corporate" | "partner" | "wholesale";

export function segmentOf(role: string): Segment {
  return role === "PARTNER" ? "partner" : role === "WHOLESALE_CUSTOMER" ? "wholesale" : "corporate";
}


/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export function B2BDashboardPage() {
  const { t, money, date, enumLabel, num, locale } = useI18n();
  const { role } = useSession();
  const seg = segmentOf(role);
  const q = useApi<any>("/b2b/dashboard");
  return (
    <QueryView query={q} rows={8}>
      {(d) => {
        const used = Number(d.currentDebt.amount);
        const limit = Number(d.creditLimit.amount);
        const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const orderLink = (o: any) => (o.kind === "SERVICE" ? (seg !== "wholesale" ? `/${seg}/services/${o.id}` : null) : seg !== "corporate" ? `/${seg}/orders/${o.id}` : null);
        const cta = seg === "corporate"
          ? <Link to="/services" className="btn primary"><Wrench size={16} /> {t("book")}</Link>
          : seg === "wholesale" ? <Link to="/wholesale/quick-order" className="btn primary"><Zap size={16} /> {t("b2b.nav.quickOrder")}</Link>
          : <Link to="/partner/catalog" className="btn primary"><ShoppingBag size={16} /> {t("b2b.nav.catalog")}</Link>;
        return (
          <div className="bz-dash">
            <header className="bz-hero">
              <div className="bz-hero-main">
                <span className="bz-seg"><Building2 size={14} aria-hidden /> {enumLabel("Segment", d.segment)}</span>
                <h1>{d.companyName}</h1>
                <div className="bz-hero-meta">
                  <span className="bz-manager"><span className="bz-manager-avatar">{d.accountManager?.[0]}</span><span><small>{t("b2b.dash.manager")}</small>{d.accountManager}</span></span>
                  <span className="bz-chip"><BadgePercent size={14} aria-hidden /> {t("b2b.dash.priceListLabel")}: {enumLabel("PriceType", d.priceList)}</span>
                  <span className="bz-chip"><Timer size={14} aria-hidden /> {d.paymentTerms === "DEFERRED" ? t("b2b.dash.deferred", { days: d.deferredDays }) : enumLabel("PaymentTerms", d.paymentTerms)}</span>
                </div>
              </div>
              <div className="bz-hero-actions">{cta}<Link to={`/${seg}/documents`} className="btn outline"><FileText size={16} /> {t("b2b.nav.documents")}</Link></div>
            </header>

            {Number(d.overdue.amount) > 0 && <div className="tp-alert danger"><AlertTriangle size={18} aria-hidden /><span className="grow">{t("b2b.dash.overdue", { amount: money(d.overdue) })}</span><Link to={`/${seg}/balance`} className="btn btn-sm outline">{t("b2b.dash.viewBalance")}</Link></div>}
            {d.pendingApprovals > 0 && <div className="tp-alert warning"><ShieldCheck size={18} aria-hidden /><span className="grow">{t("b2b.dash.approvals", { count: d.pendingApprovals })}</span>{seg !== "wholesale" && <Link to={`/${seg}/services`} className="btn btn-sm outline">{t("b2b.dash.viewApprovals")}</Link>}</div>}

            <div className="tp-kpis">
              <Link to={`/${seg}/balance`} className="tp-kpi tone-green">
                <span className="tp-kpi-icon"><CreditCard size={20} /></span>
                <span className="tp-kpi-label">{t("b2b.dash.credit")}</span>
                <strong className="tp-kpi-value">{money(d.availableCredit)}</strong>
                <span className="tp-kpi-hint">{t("b2b.dash.ofLimit", { limit: money(d.creditLimit) })}</span>
              </Link>
              <div className={cn("tp-kpi", pct > 80 ? "tone-red" : "tone-amber")}>
                <span className="tp-kpi-icon"><Wallet size={20} /></span>
                <span className="tp-kpi-label">{t("b2b.dash.debt")}</span>
                <strong className="tp-kpi-value">{money(d.currentDebt)}</strong>
                <span className={cn("tp-meter", pct > 80 && "is-full")}><i style={{ width: `${pct}%` }} /></span>
              </div>
              {seg === "partner" ? (
                <Link to="/partner/commissions" className="tp-kpi tone-violet"><span className="tp-kpi-icon"><Percent size={20} /></span><span className="tp-kpi-label">{t("b2b.dash.commission")}</span><strong className="tp-kpi-value">{money(d.commissionBalance)}</strong><span className="tp-kpi-hint">&nbsp;</span></Link>
              ) : (
                <Link to={seg === "corporate" ? "/corporate/services" : "/wholesale/quotes"} className="tp-kpi tone-blue"><span className="tp-kpi-icon"><Wrench size={20} /></span><span className="tp-kpi-label">{t("b2b.dash.openServices")}</span><strong className="tp-kpi-value">{num(d.openServices)}</strong><span className="tp-kpi-hint">&nbsp;</span></Link>
              )}
              <Link to={seg !== "corporate" ? `/${seg}/orders` : "/corporate/documents"} className="tp-kpi tone-teal"><span className="tp-kpi-icon"><Package size={20} /></span><span className="tp-kpi-label">{t("b2b.dash.openOrders")}</span><strong className="tp-kpi-value">{num(d.openOrders)}</strong><span className="tp-kpi-hint">&nbsp;</span></Link>
            </div>

            <div className="tp-grid">
              <div className="tp-main">
                <section className="tp-section">
                  <div className="tp-section-head"><h2>{t("b2b.dash.spend")}</h2></div>
                  <BarsChart data={d.spendByMonth.map((x: any) => { const m = formatMonth(`${x.month}-15T12:00:00Z`, locale).split(" ")[0] ?? x.month; return { ...x, month: m.charAt(0).toLocaleUpperCase(locale) + m.slice(1) }; })} xKey="month" bars={[{ key: "amount", label: t("common.total") }]} />
                </section>
                <section className="tp-section">
                  <div className="tp-section-head"><h2>{t("b2b.dash.recent")}</h2>{seg !== "corporate" ? <Link to={`/${seg}/orders`} className="tp-link">{t("common.viewAll")} <ChevronRight size={15} aria-hidden /></Link> : <Link to="/corporate/services" className="tp-link">{t("common.viewAll")} <ChevronRight size={15} aria-hidden /></Link>}</div>
                  {d.recentOrders.length ? (
                    <ul className="bz-orders">
                      {d.recentOrders.map((o: any) => {
                        const href = orderLink(o);
                        const inner = (
                          <>
                            <span className={cn("bz-order-icon", o.kind === "SERVICE" ? "tone-blue" : "tone-violet")}>{o.kind === "SERVICE" ? <Wrench size={18} /> : <Package size={18} />}</span>
                            <span className="bz-order-copy"><strong>{o.number}</strong><small>{enumLabel("OrderKind", o.kind)} · {date(o.createdAt)}</small></span>
                            {o.total ? <strong className="bz-order-sum">{money(o.total)}</strong> : <span className="bz-order-sum">—</span>}
                            <EnumBadge group={o.kind === "SERVICE" ? "OrderStatus" : "SalesOrderStatus"} code={o.status} />
                            {href && <ChevronRight size={16} className="bz-chev" aria-hidden />}
                          </>
                        );
                        return <li key={o.id}>{href ? <Link to={href} className="bz-order">{inner}</Link> : <div className="bz-order">{inner}</div>}</li>;
                      })}
                    </ul>
                  ) : <EmptyState />}
                </section>
              </div>
              <aside className="tp-side">
                <section className="tp-section">
                  <div className="tp-section-head"><h2>{t("b2b.dash.limit")}</h2></div>
                  <div className="bz-limit">
                    <div className="bz-ring" style={{ ["--p" as string]: `${pct}` }} role="img" aria-label={`${pct}%`}><span><strong>{pct}%</strong><small>{t("b2b.dash.used")}</small></span></div>
                    <dl>
                      <div><dt>{t("b2b.dash.debt")}</dt><dd>{money(d.currentDebt)}</dd></div>
                      <div><dt>{t("b2b.dash.available")}</dt><dd className="ok">{money(d.availableCredit)}</dd></div>
                      <div><dt>{t("b2b.dash.limit")}</dt><dd>{money(d.creditLimit)}</dd></div>
                    </dl>
                  </div>
                  {d.addressUsage && <UsageBar label={t("b2b.dash.sites")} used={d.addressUsage.used} limit={d.addressUsage.limit} />}
                  {Number(d.minOrder.amount) > 0 && <p className="text-sm text-muted">{t("b2b.dash.minOrder", { amount: money(d.minOrder) })}</p>}
                </section>
                {d.sla && (
                  <section className="tp-section">
                    <div className="tp-section-head"><h2>{t("b2b.dash.sla")}</h2></div>
                    <div className="bz-sla">
                      <div className="tone-green"><Gauge size={18} aria-hidden /><strong>{num(d.sla.compliance, 1)}%</strong><small>{t("b2b.dash.compliance")}</small></div>
                      <div className="tone-blue"><Timer size={18} aria-hidden /><strong>{d.sla.avgReactionMinutes}</strong><small>{t("b2b.dash.reaction")}</small></div>
                      <div className={d.sla.breaches ? "tone-red" : "tone-green"}><AlertTriangle size={18} aria-hidden /><strong>{d.sla.breaches}</strong><small>{t("b2b.dash.breaches")}</small></div>
                    </div>
                  </section>
                )}
                {d.contract && (
                  <section className="tp-section">
                    <div className="tp-section-head"><h2>{t("b2b.nav.contracts")}</h2><Link to={`/${seg}/contracts`} className="tp-link">{t("common.view")}</Link></div>
                    <div className="bz-contract">
                      <span className="bz-contract-icon"><FileSignature size={22} aria-hidden /></span>
                      <div><strong>{d.contract.number}</strong><small>{date(d.contract.startsAt)} — {date(d.contract.endsAt)}</small></div>
                    </div>
                    <p className="bz-file"><FileText size={15} aria-hidden /> {d.contract.fileName}</p>
                  </section>
                )}
                {d.campaigns.length > 0 && (
                  <section className="tp-section">
                    <div className="tp-section-head"><h2>{t("b2b.dash.campaigns")}</h2></div>
                    <ul className="bz-campaigns">
                      {d.campaigns.map((c: any) => (
                        <li key={c.id}>
                          <span className="bz-campaign-icon"><Megaphone size={16} aria-hidden /></span>
                          <div><strong>{c.title}</strong><p>{c.description}</p><small><Timer size={12} aria-hidden /> {t("b2b.dash.until", { date: date(c.endsAt) })}</small></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </aside>
            </div>
          </div>
        );
      }}
    </QueryView>
  );
}

/* ------------------------------------------------------------------ */
/* Korporativ: obyektlər, cihazlar, servislər, qrafik, müqavilə, hesabat */
/* ------------------------------------------------------------------ */

export function SitesPage() {
  const { t, date } = useI18n();
  const q = useApi<any>("/b2b/sites");
  const [adding, setAdding] = useState(false);
  const [increase, setIncrease] = useState(false);
  const full = q.data && q.data.limit !== null && q.data.used >= q.data.limit;
  return (
    <>
      <PageHeader title={t("b2b.nav.sites")} subtitle={q.data ? t("b2b.sites.usage", { used: q.data.used, limit: q.data.limit ?? "∞" }) : undefined} actions={<><button type="button" className="btn outline" onClick={() => setIncrease(true)}>{t("b2b.sites.requestLimit")}</button><button type="button" className="btn primary" disabled={!!full} onClick={() => setAdding(true)}><Plus size={16} /> {t("b2b.sites.add")}</button></>} />
      {full && <div className="kit-note warning mb-4">{t("b2b.sites.full")}</div>}
      <QueryView query={q}>
        {(d) => (
          <>
            <Card flush className="mb-6"><MapView height={280} points={d.items.filter((s: any) => s.address.location).map((s: any) => ({ id: s.id, lat: s.address.location.lat, lng: s.address.location.lng, label: s.name }))} /></Card>
            <Grid cols={2}>
              {d.items.map((s: any) => (
                <Card key={s.id} title={s.name} subtitle={`${s.address.city}, ${s.address.street}`}>
                  <KeyValue cols={2} items={[[t("b2b.nav.devices"), s.deviceCount], [t("b2b.dash.openServices"), s.openOrders], [t("b2b.sites.next"), s.nextServiceAt ? date(s.nextServiceAt) : null], [t("b2b.dash.compliance"), `${s.slaCompliance}%`], [t("b2b.sites.manager"), s.managerName]]} />
                </Card>
              ))}
            </Grid>
          </>
        )}
      </QueryView>
      {adding && <SiteDialog onClose={() => setAdding(false)} />}
      {increase && <LimitDialog current={q.data?.limit ?? 0} onClose={() => setIncrease(false)} />}
    </>
  );
}

function SiteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ label: "", city: "Bakı", street: "", building: "" });
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("b2b.sites.add")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/b2b/sites", { ...v, isDefault: false, location: loc ?? undefined }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <TextField label={t("b2b.sites.name")} required value={v.label} onValue={(x) => setV({ ...v, label: x })} />
        <TextField label={t("fields.city")} value={v.city} onValue={(x) => setV({ ...v, city: x })} />
        <TextField label={t("fields.street")} required value={v.street} onValue={(x) => setV({ ...v, street: x })} />
        <TextField label={t("fields.building")} value={v.building} onValue={(x) => setV({ ...v, building: x })} />
      </div>
      <MapView height={220} center={loc ?? undefined} points={loc ? [{ id: "p", ...loc }] : []} onPick={setLoc} />
    </Dialog>
  );
}

function LimitDialog({ current, onClose }: { current: number; onClose: () => void }) {
  const { t } = useI18n();
  const [requested, setRequested] = useState(String(current + 5));
  const [comment, setComment] = useState("");
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="sm" title={t("b2b.sites.requestLimit")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { try { await post("/b2b/limit-increase", { requested: Number(requested), comment }); toast.success(t("b2b.sites.requestSent")); onClose(); } catch (e) { setError(e); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <TextField label={t("b2b.sites.newLimit")} type="number" value={requested} onValue={setRequested} />
      <TextArea label={t("common.comment")} value={comment} onValue={setComment} rows={2} />
    </Dialog>
  );
}

export function B2BDevicesPage() {
  const { t, date, enumLabel } = useI18n();
  const sites = useApi<any>("/b2b/sites");
  return (
    <>
      <PageHeader title={t("b2b.nav.devices")} />
      <ResourceTable
        path="/b2b/devices"
        pageSize={50}
        filters={[{ key: "siteId", label: t("b2b.nav.sites"), options: (sites.data?.items ?? []).map((s: any) => ({ value: s.id, label: s.name })) }]}
        columns={[
          { key: "nickname", header: t("acc.devices.nickname"), render: (d: any) => <span><strong>{d.nickname ?? d.modelName}</strong><small className="block">{d.modelName}</small></span> },
          { key: "siteName", header: t("b2b.sites.name") },
          { key: "serialNumber", header: t("acc.devices.serial"), hideOnMobile: true },
          { key: "nextServiceAt", header: t("acc.devices.nextService"), render: (d: any) => <span className={cn(d.nextServiceAt && new Date(d.nextServiceAt) < new Date() && "text-danger")}>{date(d.nextServiceAt)}</span>, sortKey: "nextServiceAt" },
          { key: "warrantyStatus", header: t("acc.devices.warranty"), render: (d: any) => <EnumBadge group="WarrantyStatus" code={d.warrantyStatus} />, hideOnMobile: true },
          { key: "openOrders", header: t("b2b.dash.openServices"), className: "num" },
          { key: "location", header: t("acc.devices.location"), render: (d: any) => enumLabel("DeviceLocation", d.location), hideOnMobile: true },
        ]}
      />
    </>
  );
}

export function B2BServicesPage({ base }: { base: string }) {
  const { t } = useI18n();
  const { role } = useSession();
  return <ServiceOrdersPage base={base} title={t("b2b.nav.services")} intro={role === "CORPORATE_CUSTOMER" ? <ApprovalQueue base={base} /> : null} />;
}

/** Şirkətdaxili təsdiq növbəsi (§45): sahib və təsdiqləyici əməkdaşların sifarişlərini təsdiqləyir və ya rədd edir. */
function ApprovalQueue({ base }: { base: string }) {
  const { t, text, dateTime } = useI18n();
  const { user } = useSession();
  const refresh = useRefresh();
  const q = useApi<any>("/service-orders?pageSize=200");
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const approver = ["OWNER", "APPROVER"].includes(user?.companyRole ?? "");
  const pending = (q.data?.items ?? []).filter((o: any) => o.approvalPending);
  if (!approver || !pending.length) return null;
  const decide = async (o: any, approved: boolean, comment?: string) => {
    setBusy(o.id);
    try {
      await post(`/b2b/services/${o.id}/approve`, { approved, comment });
      await refresh();
      toast.success(t(approved ? "b2b.services.approved" : "b2b.services.rejected", { number: o.number }));
      setRejecting(null);
      setReason("");
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card title={t("b2b.services.pendingTitle", { count: pending.length })} subtitle={t("b2b.services.approverHint")} className="mb-4 approval-queue">
      <ul className="kit-list">
        {pending.map((o: any) => (
          <li key={o.id} className="approval-row">
            <div className="grow">
              <Link to={`${base}/${o.id}`} className="font-semibold text-brand">{o.number} · {text(o.serviceName)}</Link>
              <div className="order-head text-sm">{o.addressShort && <span>{o.addressShort}</span>}{o.scheduledAt && <span>{dateTime(o.scheduledAt)}</span>}{o.customerName && <span>{o.customerName}</span>}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn primary btn-sm" disabled={busy === o.id} onClick={() => decide(o, true)}>{t("b2b.services.approve")}</button>
              <button type="button" className="btn outline danger-outline btn-sm" disabled={busy === o.id} onClick={() => setRejecting(o)}>{t("b2b.services.reject")}</button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={rejecting ? `${t("b2b.services.reject")} · ${rejecting.number}` : ""}
        footer={<><button type="button" className="btn outline" onClick={() => setRejecting(null)}>{t("common.cancel")}</button><button type="button" className="btn danger" disabled={!reason.trim() || busy === rejecting?.id} onClick={() => decide(rejecting, false, reason.trim())}>{t("b2b.services.reject")}</button></>}
      >
        <TextArea label={t("b2b.services.rejectReason")} required rows={3} value={reason} onValue={setReason} />
      </Dialog>
    </Card>
  );
}

export function SchedulePlanPage() {
  const { t, date, text } = useI18n();
  const refresh = useRefresh();
  const { navigate } = useRouter();
  return (
    <>
      <PageHeader title={t("b2b.nav.schedule")} subtitle={t("b2b.schedule.subtitle")} />
      <ResourceTable
        path="/b2b/schedule"
        pageSize={50}
        searchable={false}
        filters={[{ key: "status", label: t("common.status"), options: ["PLANNED", "ORDER_CREATED", "DONE", "MISSED"].map((s) => ({ value: s, label: t(`b2b.schedule.status.${s}`) })) }]}
        columns={[
          { key: "plannedAt", header: t("b2b.schedule.planned"), render: (v: any) => date(v.plannedAt), sortKey: "plannedAt" },
          { key: "siteName", header: t("b2b.sites.name") },
          { key: "deviceName", header: t("acc.orders.device") },
          { key: "serviceName", header: t("tech.jobs.service"), render: (v: any) => text(v.serviceName), hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (v: any) => <span className={cn("badge", v.status === "DONE" ? "badge-success" : v.status === "PLANNED" ? "badge-info" : "badge-warning")}>{t(`b2b.schedule.status.${v.status}`)}</span> },
          { key: "order", header: "", render: (v: any) => (v.orderId ? <Link to={`/corporate/services/${v.orderId}`} className="text-brand">{v.orderNumber}</Link> : v.status === "PLANNED" ? <button type="button" className="btn outline btn-sm" onClick={async () => { try { const r = await post(`/b2b/schedule/${v.id}/create-order`); await refresh(); toast.success(t("b2b.schedule.created", { number: r.orderNumber })); navigate(`/corporate/services/${r.orderId}`); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{t("b2b.schedule.createOrder")}</button> : null) },
        ]}
      />
    </>
  );
}

export function ContractsPage() {
  const { t, date } = useI18n();
  const q = useApi<any[]>("/b2b/contracts");
  return (
    <>
      <PageHeader title={t("b2b.nav.contracts")} />
      <QueryView query={q}>
        {(list) => (
          <div className="kit-stack">
            {list.map((c) => (
              <Card key={c.id} title={`${c.number} · ${c.title}`} actions={<EnumBadge group="ContractStatus" code={c.status} />}>
                <KeyValue cols={3} items={[[t("b2b.contracts.period"), `${date(c.startsAt)} — ${date(c.endsAt)}`], [t("b2b.contracts.reaction"), t("b2b.contracts.hours", { count: c.sla.reactionHours })], [t("b2b.contracts.urgent"), t("b2b.contracts.hours", { count: c.sla.urgentArrivalHours })], [t("b2b.dash.compliance"), `${c.sla.compliance}%`], [t("b2b.contracts.coverage"), t("b2b.contracts.coverageText", { sites: c.coveredSites, devices: c.coveredDevices })], [t("b2b.contracts.visits"), c.periodicVisitsPerYear]]} />
                <p className="text-sm mt-3 flex items-center gap-2"><FileText size={14} /> {c.fileName}</p>
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </>
  );
}

export function ReportsPage() {
  const { t, money } = useI18n();
  const q = useApi<any>("/b2b/reports");
  return (
    <>
      <PageHeader title={t("b2b.nav.reports")} actions={<button type="button" className="btn outline" onClick={() => window.print()}>{t("docs.print")}</button>} />
      <QueryView query={q} rows={8}>
        {(d) => (
          <>
            <Grid cols={4}>
              <Stat label={t("b2b.reports.orders")} value={d.totals.orders} />
              <Stat label={t("b2b.reports.spend")} value={money(d.totals.spend)} tone="warning" />
              <Stat label={t("b2b.dash.compliance")} value={`${d.sla.compliance}%`} tone="success" />
              <Stat label={t("b2b.dash.breaches")} value={d.sla.breaches} tone="danger" hint={t("b2b.reports.reactionAvg", { count: d.sla.reactionAvgMinutes })} />
            </Grid>
            <Grid cols={2}>
              <Card title={t("b2b.reports.bySite")}><BarsChart data={d.bySite} xKey="site" bars={[{ key: "spend", label: t("b2b.reports.spend") }, { key: "orders", label: t("b2b.reports.orders") }]} /></Card>
              <Card title={t("b2b.reports.byCategory")}><DonutChart data={d.byCategory.map((c: any) => ({ name: c.category, value: c.orders }))} /></Card>
            </Grid>
            <Card title={t("b2b.reports.topDevices")} flush>
              <div className="table-wrap"><table><thead><tr><th>{t("acc.orders.device")}</th><th className="num">{t("b2b.reports.orders")}</th><th className="num">{t("b2b.reports.spend")}</th></tr></thead><tbody>{d.topDevices.map((x: any) => <tr key={x.device}><td>{x.device}</td><td className="num">{x.orders}</td><td className="num">{money({ amount: String(x.spend), currency: "AZN" })}</td></tr>)}</tbody></table></div>
            </Card>
          </>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ümumi: sənədlər, balans, istifadəçilər                              */
/* ------------------------------------------------------------------ */

export function B2BDocumentsPage() {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [doc, setDoc] = useState<string | null>(null);
  return (
    <>
      <div className="flex justify-end mb-2"><button type="button" className="btn outline" onClick={async () => { const r = await post("/b2b/reconciliation-act"); await refresh(); toast.success(t("b2b.docs.actCreated", { number: r.number })); setDoc(r.documentId); }}>{t("b2b.docs.reconciliation")}</button></div>
      <DocumentsPage title={t("b2b.nav.documents")} />
      {doc && <DocumentDialog id={doc} onClose={() => setDoc(null)} />}
    </>
  );
}

export function BalancePage() {
  const { t, money, date, text } = useI18n();
  const q = useApi<any>("/b2b/balance");
  return (
    <>
      <PageHeader title={t("b2b.nav.balance")} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) => (
          <>
            <Grid cols={4}>
              <Stat label={t("b2b.dash.credit")} value={money(d.availableCredit)} tone="success" />
              <Stat label={t("b2b.dash.limit")} value={money(d.creditLimit)} />
              <Stat label={t("b2b.dash.debt")} value={money(d.currentDebt)} tone="warning" />
              <Stat label={t("b2b.balance.overdue")} value={money(d.overdue)} tone="danger" />
            </Grid>
            <Card title={t("b2b.balance.entries")} flush>
              {!d.entries.length ? <EmptyState /> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("common.date")}</th><th>{t("b2b.balance.document")}</th><th>{t("b2b.balance.description")}</th><th className="num">{t("b2b.balance.debit")}</th><th className="num">{t("b2b.balance.credit")}</th><th>{t("b2b.balance.due")}</th><th className="num">{t("b2b.balance.balance")}</th></tr></thead>
                    <tbody>
                      {d.entries.map((e: any) => (
                        <tr key={e.id}>
                          <td>{date(e.date)}</td>
                          <td><strong>{e.document}</strong></td>
                          <td>{text(e.description)}</td>
                          <td className="num">{Number(e.debit.amount) ? money(e.debit) : "—"}</td>
                          <td className="num text-success">{Number(e.credit.amount) ? money(e.credit) : "—"}</td>
                          <td className={cn(e.dueAt && new Date(e.dueAt) < new Date() && "text-danger")}>{e.dueAt ? date(e.dueAt) : "—"}</td>
                          <td className="num"><strong>{money(e.balance)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Şirkət profili                                                       */
/* ------------------------------------------------------------------ */

export function CompanyProfilePage() {
  const { t, date, money, enumLabel } = useI18n();
  const q = useApi<any>("/b2b/company");
  const refresh = useRefresh();
  const { refresh: refreshSession } = useSession();
  const [v, setV] = useState<any | null>(null);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (q.data) setV({ actualAddress: q.data.actualAddress, contactName: q.data.contactName, contactPhone: q.data.contactPhone, contactEmail: q.data.contactEmail, website: q.data.website ?? "", bank: q.data.bankDetails.bank, iban: q.data.bankDetails.iban, swift: q.data.bankDetails.swift });
  }, [q.data]);
  const fe = error?.fieldErrors ?? {};
  return (
    <QueryView query={q} rows={8}>
      {(c) => !v ? null : (
        <>
          <PageHeader title={t("b2b.company.title")} subtitle={t("b2b.company.subtitle")} />
          <section className="profile-hero">
            <AvatarUploader square src={c.logoUrl} name={c.legalName} size={104} disabled={!c.canEditLogo} title={t("b2b.company.logo")} onUpload={async (dataUrl) => { await put("/b2b/company/logo", { dataUrl }); await refresh(); await refreshSession(); toast.success(t("common.saved")); }} onRemove={async () => { await put("/b2b/company/logo", { dataUrl: null }); await refresh(); }} />
            <div className="profile-hero-main">
              <h2>{c.legalName}</h2>
              <div className="profile-tags">
                <span className="badge badge-info">{enumLabel("Segment", c.segment)}</span>
                <EnumBadge group="B2BStatus" code={c.status} />
                {c.planName && <span className="badge">{typeof c.planName === "string" ? c.planName : c.planName.az}</span>}
              </div>
              <p className="text-sm text-muted">VÖEN {c.voen} · {t("b2b.company.since", { date: date(c.createdAt) })} · {t("b2b.company.manager", { name: c.accountManager })}</p>
            </div>
            <div className="profile-links">
              <Stat label={t("b2b.nav.users")} value={c.userLimit ? `${c.userCount} / ${c.userLimit}` : c.userCount} />
              <Stat label={t("b2b.company.addresses")} value={c.addressLimit ? `${c.addressCount} / ${c.addressLimit}` : c.addressCount} />
            </div>
          </section>
          {!c.canEdit && <div className="kit-note mb-4">{t("b2b.company.readOnly")}</div>}
          <FormError error={error && !Object.keys(fe).length ? error : null} />
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("b2b.company.contacts")}>
                <div className="kit-form-grid">
                  <TextField label={t("b2b.company.contactName")} value={v.contactName} disabled={!c.canEdit} onValue={(x) => setV({ ...v, contactName: x })} />
                  <PhoneField label={t("fields.phone")} value={v.contactPhone} disabled={!c.canEdit} onValue={(x) => setV({ ...v, contactPhone: x })} error={fe.contactPhone} />
                  <TextField label={t("fields.email")} type="email" value={v.contactEmail} disabled={!c.canEdit} onValue={(x) => setV({ ...v, contactEmail: x })} error={fe.contactEmail} />
                  <TextField label={t("b2b.company.website")} value={v.website} disabled={!c.canEdit} onValue={(x) => setV({ ...v, website: x })} error={fe.website} placeholder="https://" />
                </div>
                <TextArea label={t("b2b.company.actualAddress")} rows={2} value={v.actualAddress} disabled={!c.canEdit} onValue={(x) => setV({ ...v, actualAddress: x })} />
              </Card>
              <Card title={t("b2b.company.bank")}>
                <div className="kit-form-grid">
                  <TextField label={t("b2b.company.bankName")} value={v.bank} disabled={!c.canEdit} onValue={(x) => setV({ ...v, bank: x })} />
                  <TextField label="SWIFT" value={v.swift} disabled={!c.canEdit} onValue={(x) => setV({ ...v, swift: x.toUpperCase() })} />
                  <TextField className="span-2" label="IBAN" value={v.iban} disabled={!c.canEdit} onValue={(x) => setV({ ...v, iban: x.toUpperCase() })} error={fe["bankDetails.iban"]} hint="AZ21 NABZ 0000 0000 1370 1000 1944" />
                </div>
              </Card>
              {c.canEdit && (
                <div>
                  <button type="button" className="btn primary" disabled={busy} onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await patch("/b2b/company", { actualAddress: v.actualAddress, contactName: v.contactName, contactPhone: v.contactPhone, contactEmail: v.contactEmail, website: v.website, bankDetails: { bank: v.bank, iban: v.iban, swift: v.swift } });
                      await refresh();
                      toast.success(t("common.saved"));
                    } catch (e) { setError(e); } finally { setBusy(false); }
                  }}>{t("common.save")}</button>
                </div>
              )}
            </div>
            <div className="kit-stack">
              <Card title={t("b2b.company.legal")} subtitle={t("b2b.company.legalHint")}>
                <KeyValue cols={1} items={[
                  [t("b2b.company.legalName"), c.legalName],
                  ["VÖEN", c.voen],
                  [t("b2b.company.legalAddress"), c.legalAddress],
                  [t("b2b.company.contract"), c.contract ? `${c.contract.number} · ${date(c.contract.startsAt)} – ${date(c.contract.endsAt)}` : "—"],
                  [t("b2b.company.paymentTerms"), c.paymentTerms === "DEFERRED" ? t("b2b.company.deferred", { days: c.deferredDays }) : t("b2b.company.prepaid")],
                  [t("b2b.company.creditLimit"), money(c.creditLimit)],
                  [t("b2b.company.discount"), `${c.discountPercent}%`],
                  [t("b2b.company.eInvoice"), c.eInvoiceRequired ? t("common.yes") : t("common.no")],
                ]} />
              </Card>
            </div>
          </div>
        </>
      )}
    </QueryView>
  );
}

const COMPANY_ROLES = ["ORDERER", "APPROVER", "ACCOUNTANT", "SITE_MANAGER"];

export function CompanyUsersPage() {
  const { t, relative, enumLabel, money } = useI18n();
  const { user } = useSession();
  const q = useApi<any>("/b2b/users");
  const refresh = useRefresh();
  const [adding, setAdding] = useState(false);
  const owner = user?.companyRole === "OWNER";
  return (
    <>
      <PageHeader title={t("b2b.nav.users")} subtitle={q.data ? t("b2b.users.limit", { count: q.data.items.length, limit: q.data.limit ?? "∞" }) : undefined} actions={owner && <button type="button" className="btn primary" disabled={!!q.data && q.data.limit !== null && q.data.items.length >= q.data.limit} onClick={() => setAdding(true)}><Plus size={16} /> {t("b2b.users.invite")}</button>} />
      {!owner && <p className="kit-note info mb-4">{t("b2b.users.ownerOnly")}</p>}
      <QueryView query={q}>
        {(d) => (
          <Card flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("fields.fullName")}</th><th>{t("b2b.users.role")}</th><th>{t("b2b.users.sites")}</th><th>{t("b2b.users.approvalLimit")}</th><th>{t("b2b.users.lastLogin")}</th><th>{t("common.status")}</th></tr></thead>
                <tbody>
                  {d.items.map((u: any) => (
                    <tr key={u.id}>
                      <td><strong>{u.fullName}</strong><small className="block">{u.email} · {u.phone}</small></td>
                      <td>{owner && u.role !== "OWNER" ? <select className="form-input" value={u.role} aria-label={t("b2b.users.role")} onChange={async (e) => { await patch(`/b2b/users/${u.id}`, { role: e.target.value }); await refresh(); }}>{COMPANY_ROLES.map((r) => <option key={r} value={r}>{enumLabel("CompanyUserRole", r)}</option>)}</select> : enumLabel("CompanyUserRole", u.role)}</td>
                      <td>{u.siteNames.join(", ") || t("b2b.users.allSites")}</td>
                      <td>{u.approvalLimit ? money(u.approvalLimit) : t("plans.unlimited")}</td>
                      <td>{u.lastLoginAt ? relative(u.lastLoginAt) : "—"}</td>
                      <td>{owner && u.role !== "OWNER" ? <button type="button" className={cn("badge", u.status === "ACTIVE" ? "badge-success" : "badge-danger")} onClick={async () => { await patch(`/b2b/users/${u.id}`, { status: u.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" }); await refresh(); }}>{enumLabel("UserStatus", u.status)}</button> : <EnumBadge group="UserStatus" code={u.status} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </QueryView>
      {adding && <InviteDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "ORDERER" });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} title={t("b2b.users.invite")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/b2b/users", v); await refresh(); toast.success(t("b2b.users.invited")); onClose(); } catch (e) { setError(e); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <TextField label={t("fields.firstName")} value={v.firstName} onValue={(x) => setV({ ...v, firstName: x })} />
        <TextField label={t("fields.lastName")} value={v.lastName} onValue={(x) => setV({ ...v, lastName: x })} />
        <TextField label={t("fields.email")} type="email" value={v.email} onValue={(x) => setV({ ...v, email: x })} />
        <PhoneField label={t("fields.phone")} value={v.phone} onValue={(x) => setV({ ...v, phone: x })} />
      </div>
      <SelectField label={t("b2b.users.role")} value={v.role} onValue={(x) => setV({ ...v, role: x })} options={COMPANY_ROLES.map((r) => ({ value: r, label: enumLabel("CompanyUserRole", r) }))} hint={t(`b2b.users.roleHint.${v.role}`)} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Partner: komissiyalar                                                */
/* ------------------------------------------------------------------ */

export function CommissionsPage() {
  const { t, money, date, enumLabel } = useI18n();
  const q = useApi<any>("/b2b/commissions?pageSize=50");
  return (
    <>
      <PageHeader title={t("b2b.nav.commissions")} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) => (
          <>
            {!d.enabled && <div className="kit-note warning mb-4">{t("b2b.comm.disabled")}</div>}
            <Grid cols={3}>
              <Stat label={t("b2b.comm.pending")} value={money(d.totals.pending)} tone="warning" />
              <Stat label={t("b2b.comm.approved")} value={money(d.totals.approved)} tone="info" />
              <Stat label={t("b2b.comm.paid")} value={money(d.totals.paid)} tone="success" />
            </Grid>
            <Card title={t("b2b.comm.terms")} className="mb-6">
              <KeyValue cols={3} items={[[t("b2b.comm.model"), d.model ? enumLabel("CommissionModel", d.model) : null], [t("b2b.comm.base"), d.base ? enumLabel("CommissionBase", d.base) : null], [t("b2b.comm.default"), d.defaultRate ? `${d.defaultRate}%` : null]]} />
              {d.rates.length > 0 && <ul className="kit-list mt-2">{d.rates.map((r: any, i: number) => <li key={i}><span className="grow">{r.serviceTypeLabel}</span><strong>{r.model === "PERCENT" ? `${r.value}%` : money({ amount: r.value, currency: "AZN" })}</strong></li>)}</ul>}
            </Card>
            <Card title={t("b2b.comm.list")} flush>
              {!d.items.length ? <EmptyState /> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("courier.order")}</th><th>{t("common.date")}</th><th className="num">{t("b2b.comm.baseAmount")}</th><th className="num">{t("b2b.comm.rate")}</th><th className="num">{t("b2b.comm.amount")}</th><th>{t("common.status")}</th></tr></thead>
                    <tbody>{d.items.map((c: any) => <tr key={c.id}><td><strong>{c.orderNumber}</strong><small className="block">{enumLabel("OrderKind", c.orderType)}</small></td><td>{date(c.createdAt)}{c.paidAt && <small className="block">{t("b2b.comm.paidAt", { date: date(c.paidAt) })}</small>}</td><td className="num">{money(c.base)}</td><td className="num">{c.model === "PERCENT" ? `${c.rate}%` : money({ amount: c.rate, currency: "AZN" })}</td><td className="num"><strong>{money(c.amount)}</strong></td><td><EnumBadge group="CommissionStatus" code={c.status} /></td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Topdan: sürətli sifariş və kommersiya təklifləri (§45.3)             */
/* ------------------------------------------------------------------ */

export function QuickOrderPage() {
  const { t, money, text, qty } = useI18n();
  const { navigate } = useRouter();
  const refresh = useRefresh();
  const [rows, setRows] = useState<{ sku: string; quantity: string }[]>([{ sku: "", quantity: "1" }, { sku: "", quantity: "1" }, { sku: "", quantity: "1" }]);
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const validate = async (lines = rows) => {
    setBusy(true);
    try { setResult(await post("/b2b/quick-order/validate", { lines })); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } finally { setBusy(false); }
  };
  const importPaste = () => {
    const parsed = paste.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((p) => p[0]).map(([sku, quantity]) => ({ sku: sku!, quantity: quantity || "1" }));
    if (parsed.length) { setRows(parsed); setPaste(""); void validate(parsed); }
  };
  return (
    <>
      <PageHeader title={t("b2b.nav.quickOrder")} subtitle={t("b2b.quick.subtitle")} />
      <div className="kit-split">
        <Card title={t("b2b.quick.lines")}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>{t("common.quantity")}</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><input className="form-input" value={r.sku} placeholder="BS-C7-24" aria-label="SKU" onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} /></td>
                    <td style={{ width: 120 }}><input className="form-input" inputMode="decimal" value={r.quantity} aria-label={t("common.quantity")} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /></td>
                    <td><button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            <button type="button" className="btn outline btn-sm" onClick={() => setRows([...rows, { sku: "", quantity: "1" }])}><Plus size={14} /> {t("b2b.quick.addRow")}</button>
            <button type="button" className="btn primary btn-sm" disabled={busy} onClick={() => validate()}>{t("b2b.quick.check")}</button>
          </div>
        </Card>
        <Card title={t("b2b.quick.import")}>
          <TextArea label={t("b2b.quick.pasteLabel")} value={paste} onValue={setPaste} rows={6} hint={t("b2b.quick.pasteHint")} />
          <button type="button" className="btn outline btn-sm" disabled={!paste.trim()} onClick={importPaste}><Upload size={14} /> {t("b2b.quick.importBtn")}</button>
        </Card>
      </div>
      {result && (
        <Card title={t("b2b.quick.result")} className="mt-6" flush>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>{t("docs.item")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("estimate.unitPrice")}</th><th className="num">{t("common.total")}</th><th /></tr></thead>
              <tbody>
                {result.lines.map((l: any, i: number) => (
                  <tr key={i} className={cn(l.error && "declined")}>
                    <td><strong>{l.sku}</strong></td>
                    <td>{l.name ? text(l.name) : "—"}</td>
                    <td className="num">{qty(l.quantity)}</td>
                    <td className="num">{l.unitPrice ? money(l.unitPrice) : "—"}</td>
                    <td className="num">{l.total ? money(l.total) : "—"}</td>
                    <td>{l.error ? <span className="badge badge-danger">{text(l.error)}</span> : <span className="badge badge-success">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="kit-card-body flex justify-between items-center gap-3 flex-wrap">
            <span>{t("common.total")}: <strong className="text-xl">{money(result.total)}</strong>{!result.meetsMinimum && <span className="text-danger text-sm"> · {t("b2b.dash.minOrder", { amount: money(result.minOrderAmount) })}</span>}</span>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn outline" onClick={async () => { try { await post("/b2b/quotes", { lines: rows.filter((r) => r.sku.trim()) }); await refresh(); toast.success(t("b2b.quotes.requested")); navigate("/wholesale/quotes"); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{t("b2b.quotes.request")}</button>
              <button type="button" className="btn primary" disabled={!result.meetsMinimum || result.lines.some((l: any) => l.error)} onClick={async () => { await post("/b2b/quick-order/add-to-cart", { lines: result.lines.filter((l: any) => l.variantId).map((l: any) => ({ variantId: l.variantId, quantity: l.quantity.value })) }); await refresh(); toast.success(t("cart.added")); navigate("/cart"); }}>{t("b2b.quick.toCart")}</button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

export function QuotesPage() {
  const { t, money, date, text, qty } = useI18n();
  const q = useApi<any>("/b2b/quotes?pageSize=50");
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const [confirm, setConfirm] = useState<{ quote: any; decision: "accept" | "reject" } | null>(null);
  return (
    <>
      <PageHeader title={t("b2b.nav.quotes")} actions={<Link to="/wholesale/quick-order" className="btn primary"><Plus size={16} /> {t("b2b.quotes.request")}</Link>} />
      <QueryView query={q} empty={<EmptyState icon={ClipboardList} title={t("b2b.quotes.empty")} />}>
        {(d) => (
          <div className="kit-stack">
            {d.items.map((x: any) => (
              <Card key={x.id} title={x.number} subtitle={`${date(x.requestedAt)} · ${x.managerName}`} actions={<EnumBadge group="QuoteStatus" code={x.status} />}>
                <div className="table-wrap"><table><thead><tr><th>SKU</th><th>{t("docs.item")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("estimate.unitPrice")}</th><th className="num">{t("common.total")}</th></tr></thead><tbody>{x.lines.map((l: any, i: number) => <tr key={i}><td>{l.sku}</td><td>{text(l.name)}</td><td className="num">{qty(l.quantity)}</td><td className="num">{l.unitPrice ? money(l.unitPrice) : t("b2b.quotes.awaiting")}</td><td className="num">{l.total ? money(l.total) : "—"}</td></tr>)}</tbody></table></div>
                <div className="flex justify-between items-center gap-2 flex-wrap mt-3">
                  <span>{x.note && <small className="text-muted">{x.note} · </small>}{x.validUntil && <small>{t("estimate.validUntil", { date: date(x.validUntil) })}</small>}</span>
                  <span className="flex gap-2 items-center">
                    {x.total && <strong className="text-lg">{money(x.total)}</strong>}
                    {x.availableActions.map((a: any) => <button key={a.code} type="button" className={cn("btn btn-sm", a.code === "accept" ? "primary" : "outline danger-outline")} onClick={() => setConfirm({ quote: x, decision: a.code })}>{t(`b2b.quotes.${a.code}`)}</button>)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryView>
      {confirm && <ConfirmDialog open danger={confirm.decision === "reject"} title={t(`b2b.quotes.${confirm.decision}`)} text={confirm.decision === "accept" ? t("b2b.quotes.acceptText") : t("actions.confirmText")} onClose={() => setConfirm(null)} onConfirm={async () => { await post(`/b2b/quotes/${confirm.quote.id}/${confirm.decision}`); await refresh(); setConfirm(null); if (confirm.decision === "accept") navigate("/cart"); }} />}
    </>
  );
}
