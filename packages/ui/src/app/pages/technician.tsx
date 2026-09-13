"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Boxes, CalendarDays, ClipboardList, Crown, FileBadge, LayoutDashboard, MapPin, MessageSquare, Navigation, Phone, Settings, Star, Trash2, Users, Wallet, Wrench, Plus, BadgeCheck, Clock, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { del, patch, post, put, qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { PanelShell, type NavGroup } from "../core/shells";
import type { RouteDef } from "../core/router";
import { Card, Check, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SearchBox, SelectField, Stars, Stat, Tabs, TextArea, TextField, Toggle, errorText } from "../kit/base";
import { ConfirmDialog, Dialog, ResourceTable } from "../kit/actions";
import { EstimateView, StageTimeline } from "../kit/domain";
import { BarsChart, DonutChart, FileDrop, LinesChart, MapView, QuantityInput, type PickedFile } from "../kit/media";
import { DocumentsList, HistoryList, Progress, PromptDialog, UsageBar, pct, useOrderAction, useRefresh } from "./common";
import { OrderActions } from "./workflow";
import { SubscriptionPage } from "./account";

/* ------------------------------------------------------------------ */
/* Shell və route-lar (PRD §60.4)                                       */
/* ------------------------------------------------------------------ */

export function TechnicianShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { user } = useSession();
  const dash = useApi<any>("/technician/dashboard", { staleTime: 30_000 });
  const staff = user?.employmentType === "STAFF";
  const nav: NavGroup[] = [
    {
      items: [
        { to: "/technician/dashboard", label: t("tech.nav.dashboard"), icon: LayoutDashboard },
        { to: "/technician/jobs", label: t("tech.nav.jobs"), icon: ClipboardList, badge: dash.data?.offers || null },
        { to: "/technician/schedule", label: t("tech.nav.schedule"), icon: CalendarDays },
        { to: "/technician/customers", label: t("tech.nav.customers"), icon: Users },
      ],
    },
    {
      label: t("tech.nav.work"),
      items: [
        { to: "/technician/inventory", label: staff ? t("tech.nav.inventory") : t("tech.nav.materials"), icon: Boxes },
        { to: "/technician/reservations", label: t("tech.nav.reservations"), icon: Clock },
        { to: "/technician/specializations", label: t("tech.nav.specializations"), icon: BadgeCheck },
        { to: "/technician/earnings", label: t("tech.nav.earnings"), icon: Wallet },
        { to: "/technician/statistics", label: t("tech.nav.statistics"), icon: BarChart3 },
      ],
    },
    {
      label: t("tech.nav.profile"),
      items: [
        { to: "/technician/reviews", label: t("tech.nav.reviews"), icon: Star },
        { to: "/technician/documents", label: t("tech.nav.documents"), icon: FileBadge },
        { to: "/technician/subscription", label: staff ? t("tech.nav.license") : t("tech.nav.subscription"), icon: Crown },
        { to: "/technician/settings", label: t("tech.nav.settings"), icon: Settings },
      ],
    },
  ];
  return <PanelShell nav={nav} title={t("tech.title")}>{children}</PanelShell>;
}

const TECH = ["TECHNICIAN"];
const r = (pattern: string, render: RouteDef["render"], titleKey: string): RouteDef => ({ pattern, render, shell: "technician", roles: TECH, titleKey });

export const technicianRoutes: RouteDef[] = [
  r("/technician", () => <TechDashboardPage />, "tech.nav.dashboard"),
  r("/technician/dashboard", () => <TechDashboardPage />, "tech.nav.dashboard"),
  r("/technician/jobs", () => <JobsPage />, "tech.nav.jobs"),
  r("/technician/jobs/:id", (p) => <JobDetailPage id={p.id!} />, "tech.nav.jobs"),
  r("/technician/schedule", () => <SchedulePage />, "tech.nav.schedule"),
  r("/technician/specializations", () => <SpecializationsPage />, "tech.nav.specializations"),
  r("/technician/inventory", () => <InventoryPage />, "tech.nav.inventory"),
  r("/technician/reservations", () => <ReservationsPage />, "tech.nav.reservations"),
  r("/technician/customers", () => <CustomersPage />, "tech.nav.customers"),
  r("/technician/earnings", () => <EarningsPage />, "tech.nav.earnings"),
  r("/technician/subscription", () => <SubscriptionPage />, "tech.nav.subscription"),
  r("/technician/reviews", () => <TechReviewsPage />, "tech.nav.reviews"),
  r("/technician/documents", () => <TechDocumentsPage />, "tech.nav.documents"),
  r("/technician/statistics", () => <StatisticsPage />, "tech.nav.statistics"),
  r("/technician/settings", () => <TechSettingsPage />, "tech.nav.settings"),
];

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

function JobRow({ o }: { o: any }) {
  const { t, dateTime, text, money } = useI18n();
  return (
    <li>
      <Link to={`/technician/jobs/${o.id}`} className="grow">
        <strong>{o.number} · {text(o.serviceName)}</strong>
        <small className="block text-muted">{[o.scheduledAt && dateTime(o.scheduledAt), o.customerName, o.addressShort].filter(Boolean).join(" · ")}</small>
        <small className="block">{o.currentStageName} · <EnumBadge group="StageStatus" code={o.currentStageStatus} /></small>
      </Link>
      <span className="flex gap-2 items-center">
        {o.urgent && <span className="badge badge-danger">{t("acc.orders.urgent")}</span>}
        {o.total && <strong>{money(o.total)}</strong>}
      </span>
    </li>
  );
}

function TechDashboardPage() {
  const { t, money } = useI18n();
  const { user } = useSession();
  const q = useApi<any>("/technician/dashboard");
  return (
    <>
      <PageHeader title={t("acc.dash.hello", { name: user?.firstName ?? "" })} subtitle={t("tech.dash.subtitle")} actions={<Link to="/technician/jobs?tab=offers" className="btn primary"><ClipboardList size={16} /> {t("tech.jobs.offers")}</Link>} />
      <QueryView query={q} rows={8}>
        {(d) => (
          <>
            {d.offers > 0 && <div className="kit-note info mb-4 flex justify-between items-center gap-2 flex-wrap"><span>{t("tech.dash.offersWaiting", { count: d.offers })}</span><Link to="/technician/jobs?tab=offers" className="btn primary btn-sm">{t("common.view")}</Link></div>}
            {d.subscriptionStatus && !["ACTIVE", "TRIAL"].includes(d.subscriptionStatus) && <div className="kit-note danger mb-4">{t("tech.dash.subInactive")} <Link to="/technician/subscription" className="text-brand">{t("acc.dash.managePlan")}</Link></div>}
            {d.documentsExpiring > 0 && <div className="kit-note warning mb-4">{t("tech.dash.docsExpiring", { count: d.documentsExpiring })}</div>}
            {d.reservationsExpiring > 0 && <div className="kit-note warning mb-4">{t("tech.dash.resExpiring", { count: d.reservationsExpiring })}</div>}
            <Grid cols={4}>
              <Stat label={t("tech.dash.active")} value={`${d.activeJobs} / ${d.activeLimit ?? "∞"}`} icon={Wrench} to="/technician/jobs" />
              <Stat label={t("tech.dash.monthly")} value={`${d.monthlyAccepted} / ${d.monthlyLimit ?? "∞"}`} icon={ClipboardList} tone="info" />
              <Stat label={t("tech.dash.rating")} value={<Stars value={d.rating} count={d.reviewCount} />} icon={Star} tone="warning" to="/technician/reviews" />
              <Stat label={d.employmentType === "STAFF" ? t("tech.dash.cash") : t("tech.dash.earnings")} value={d.employmentType === "STAFF" ? money(d.cashBalance) : money(d.earningsThisMonth)} hint={d.employmentType === "STAFF" ? t("tech.dash.cashLimit", { limit: money(d.cashLimit) }) : undefined} icon={Wallet} tone="success" to="/technician/earnings" />
            </Grid>
            <div className="kit-split">
              <div className="kit-stack">
                <Card title={t("tech.dash.today")} actions={<Link to="/technician/schedule" className="btn ghost btn-sm">{t("tech.nav.schedule")}</Link>}>
                  {d.todayJobs.length ? <ul className="kit-list">{d.todayJobs.map((o: any) => <JobRow key={o.id} o={o} />)}</ul> : <EmptyState title={t("tech.dash.noToday")} />}
                </Card>
                <Card title={t("tech.dash.next")}>
                  {d.nextJobs.length ? <ul className="kit-list">{d.nextJobs.map((o: any) => <JobRow key={o.id} o={o} />)}</ul> : <EmptyState />}
                </Card>
              </div>
              <div className="kit-stack">
                <Card title={d.employmentType === "STAFF" ? t("tech.nav.license") : t("tech.nav.subscription")}>
                  <KeyValue cols={1} items={[[t("tech.dash.type"), t(`wf.assign.${d.employmentType}`)], d.employmentType === "STAFF" ? [t("tech.dash.license"), d.licenseActive ? <span key="l" className="badge badge-success">{t("tech.dash.licenseActive")}</span> : <span key="l" className="badge badge-danger">{t("tech.dash.licenseRevoked")}</span>] : [t("tech.dash.plan"), d.planName]]} />
                  <UsageBar label={t("tech.dash.monthly")} used={d.monthlyAccepted} limit={d.monthlyLimit} />
                  <UsageBar label={t("tech.dash.active")} used={d.activeJobs} limit={d.activeLimit} />
                </Card>
                {d.companies?.length > 0 && (
                  <Card title={t("tech.dash.companies")}>
                    <ul className="kit-list">{d.companies.map((c: any) => <li key={c.name}><span className="grow">{c.name}</span><span className="badge">{t("tech.dash.jobs", { count: c.jobs })}</span></li>)}</ul>
                  </Card>
                )}
                <Card title={t("acc.dash.quick")}>
                  <div className="quick-grid">
                    <Link to="/technician/schedule"><CalendarDays size={18} />{t("tech.dash.blockTime")}</Link>
                    <Link to="/technician/reservations"><Boxes size={18} />{t("tech.res.new")}</Link>
                    <Link to="/technician/earnings"><Wallet size={18} />{t("tech.nav.earnings")}</Link>
                    <Link to="/technician/settings"><MapPin size={18} />{t("tech.settings.zones")}</Link>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* İşlər və təkliflər (§15, §18)                                        */
/* ------------------------------------------------------------------ */

function JobsPage() {
  const { t } = useI18n();
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "active";
  const offers = useApi<any[]>("/technician/offers", { refetchInterval: 30_000 });
  return (
    <>
      <PageHeader title={t("tech.nav.jobs")} />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v, page: null, q: null })} tabs={[{ id: "active", label: t("acc.orders.active") }, { id: "offers", label: t("tech.jobs.offers"), badge: offers.data?.length }, { id: "done", label: t("acc.orders.archive") }]} />
      {tab === "offers" ? <OffersList query={offers} /> : <JobsTable tab={tab} key={tab} />}
    </>
  );
}

function JobsTable({ tab }: { tab: string }) {
  const { t, dateTime, text, enumLabel, money } = useI18n();
  return (
    <ResourceTable
      path="/technician/jobs"
      extraQuery={{ tab }}
      rowTo={(o: any) => `/technician/jobs/${o.id}`}
      filters={[{ key: "executionForm", label: t("tech.jobs.form"), options: ["ON_SITE", "CARRY_IN", "PICKUP"].map((f) => ({ value: f, label: enumLabel("ExecutionForm", f) })) }]}
      columns={[
        { key: "number", header: t("fields.number"), render: (o: any) => <span><strong>{o.number}</strong>{o.urgent && <span className="badge badge-danger ml-1">!</span>}</span> },
        { key: "scheduledAt", header: t("tech.jobs.time"), render: (o: any) => dateTime(o.scheduledAt), sortKey: "scheduledAt" },
        { key: "serviceName", header: t("tech.jobs.service"), render: (o: any) => <span>{text(o.serviceName)}<small className="block">{enumLabel("ExecutionForm", o.executionForm)}</small></span> },
        { key: "customerName", header: t("tech.jobs.customer"), render: (o: any) => <span>{o.customerName}<small className="block">{o.addressShort}</small></span>, hideOnMobile: true },
        { key: "stage", header: t("tech.jobs.stage"), render: (o: any) => <span>{o.currentStageName}<small className="block"><EnumBadge group="StageStatus" code={o.currentStageStatus} /></small></span> },
        { key: "total", header: t("common.total"), render: (o: any) => (o.total ? money(o.total) : "—"), className: "num", hideOnMobile: true },
        { key: "status", header: t("common.status"), render: (o: any) => <EnumBadge group="OrderStatus" code={o.status} /> },
      ]}
    />
  );
}

function OffersList({ query }: { query: any }) {
  const { t, dateTime, money, enumLabel, relative, num } = useI18n();
  const refresh = useRefresh();
  const [decline, setDecline] = useState<any | null>(null);
  const accept = async (o: any) => {
    try {
      await post(`/service-orders/${o.orderId}/actions`, { action: "accept", stageId: o.stageId });
      await refresh();
      toast.success(t("tech.jobs.accepted", { number: o.orderNumber }));
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    }
  };
  return (
    <QueryView query={query} empty={<EmptyState icon={ClipboardList} title={t("tech.jobs.noOffers")} text={t("tech.jobs.noOffersText")} />}>
      {(list: any[]) => (
        <div className="kit-stack">
          {list.map((o) => (
            <Card key={o.id} title={`${o.orderNumber} · ${o.serviceName}`} subtitle={`${o.companyName} · ${o.categoryName}`} actions={<span className="flex gap-2">{o.urgent && <span className="badge badge-danger">{t("acc.orders.urgent")}</span>}{o.customerPreferred && <span className="badge badge-success">{t("tech.jobs.preferred")}</span>}</span>}>
              <KeyValue cols={3} items={[[t("tech.jobs.time"), dateTime(o.scheduledAt)], [t("acc.orders.address"), `${o.addressShort} · ${num(o.distanceKm, 1)} km`], [t("tech.jobs.form"), enumLabel("ExecutionForm", o.executionForm)], [t("acc.orders.problem"), o.problem], [t("tech.jobs.earning"), <strong key="e">{money(o.estimatedEarning)}</strong>], [t("tech.jobs.expires"), <span key="x" className="text-warning">{relative(o.expiresAt)}</span>]]} />
              <div className="flex gap-2 mt-4 flex-wrap">
                <button type="button" className="btn primary" onClick={() => accept(o)}>{t("actions.accept")}</button>
                <button type="button" className="btn outline danger-outline" onClick={() => setDecline(o)}>{t("actions.decline")}</button>
              </div>
            </Card>
          ))}
          {decline && <DeclineOffer offer={decline} onClose={() => setDecline(null)} />}
        </div>
      )}
    </QueryView>
  );
}

function DeclineOffer({ offer, onClose }: { offer: any; onClose: () => void }) {
  const { t, text } = useI18n();
  const refresh = useRefresh();
  const reasons = useApi<any[]>("/reason-codes?category=DECLINE_JOB");
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="sm" title={t("actions.decline")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!code} onClick={async () => { try { await post(`/service-orders/${offer.orderId}/actions`, { action: "decline", stageId: offer.stageId, reasonCode: code }); await refresh(); onClose(); } catch (e) { setError(e); } }}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("common.reason")} required value={code} onValue={setCode} placeholder={t("common.choose")} options={(reasons.data ?? []).map((x) => ({ value: x.code, label: text(x.label) }))} />
    </Dialog>
  );
}

function JobDetailPage({ id }: { id: string }) {
  const { t, dateTime, enumLabel, text, money, date } = useI18n();
  const q = useApi<any>(`/service-orders/${id}`, { refetchInterval: 20_000 });
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "work";
  return (
    <QueryView query={q} rows={10}>
      {(o) => {
        const current = o.stages.find((s: any) => !["COMPLETED", "SKIPPED", "CANCELLED", "PENDING"].includes(s.status));
        const loc = o.address?.location;
        return (
          <>
            <PageHeader back="/technician/jobs" title={`${o.number} · ${text(o.serviceName)}`} badge={<EnumBadge group="OrderStatus" code={o.status} />} subtitle={<span className="order-head"><span>{enumLabel("ExecutionForm", o.executionForm)}</span>{o.scheduledAt && <span>{dateTime(o.scheduledAt)}</span>}<span>{o.templateName} v{o.templateVersion}</span></span>} />
            <Card className="mb-6" title={current ? t("tech.job.current", { stage: current.name }) : t("tech.job.noCurrent")} subtitle={current ? <EnumBadge group="StageStatus" code={current.status} /> : undefined}>
              <Progress value={o.progress} />
              <div className="mt-4"><OrderActions order={o} /></div>
              {o.needsReschedule && <p className="kit-note warning text-sm mt-3">{t("acc.orders.needsReschedule")}</p>}
            </Card>
            <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "work", label: t("tech.job.work") }, { id: "customer", label: t("tech.jobs.customer") }, { id: "estimate", label: t("acc.estimate.title"), badge: o.estimate ? `v${o.estimate.version}` : null }, { id: "history", label: t("acc.orders.history") }, { id: "documents", label: t("acc.orders.documents"), badge: o.documents.length }]} />
            {tab === "work" && (
              <div className="kit-split">
                <Card title={t("tech.job.stages")}><StageTimeline stages={o.stages} mode="technician" activeId={current?.id} renderExtra={(s) => (s.photos.length || s.checklist.length ? <small className="text-muted">{[s.photos.length && t("acc.devices.photos", { count: s.photos.length }), s.checklist.length && `${s.checklist.filter((c) => c.done).length}/${s.checklist.length} ✓`, s.signed && t("media.signed")].filter(Boolean).join(" · ")}</small> : null)} /></Card>
                <div className="kit-stack">
                  <Card title={t("acc.orders.device")}>
                    <KeyValue cols={1} items={[[t("acc.devices.model"), o.device?.modelName], [t("acc.devices.serial"), o.device?.serialNumber], [t("acc.orders.problem"), o.problem ? `${text(o.problem.label) ?? ""} — ${o.problem.description ?? ""}` : null], [t("acc.devices.location"), o.deviceLocation ? enumLabel("DeviceLocation", o.deviceLocation) : null]]} />
                    {o.attachments?.length > 0 && <div className="photo-grid mt-3">{o.attachments.map((a: any) => <div key={a.id}>{a.name}</div>)}</div>}
                  </Card>
                  {o.materials?.length > 0 && (
                    <Card title={t("acc.orders.materials")}>
                      <ul className="kit-list">{o.materials.map((m: any) => <li key={m.id}><span className="grow">{text(m.name)}<small className="block text-muted">{m.sku}</small></span><span>{m.quantity} {m.unit}</span>{m.ownMaterial && <span className="badge badge-info">{t("estimate.ownMaterial")}</span>}</li>)}</ul>
                    </Card>
                  )}
                  <Card title={t("acc.orders.payment")}>
                    <KeyValue cols={1} items={[[t("acc.orders.paymentStatus"), <EnumBadge key="p" group="PaymentStatus" code={o.paymentStatus} />], [t("acc.orders.paid"), money(o.paidAmount)], [t("acc.orders.due"), <strong key="d">{money(o.dueAmount)}</strong>]]} />
                  </Card>
                </div>
              </div>
            )}
            {tab === "customer" && (
              <div className="kit-split">
                <Card title={o.companyName ?? o.customerName}>
                  <KeyValue cols={2} items={[[t("tech.jobs.customer"), o.customerName], [t("fields.phone"), o.customerPhone ? <a key="p" href={`tel:${o.customerPhone}`} className="text-brand flex items-center gap-1"><Phone size={14} />{o.customerPhone}</a> : null], [t("acc.orders.contact"), enumLabel("ContactChannel", o.contactChannel)], [t("acc.orders.address"), o.address ? [o.address.city, o.address.street, o.address.building && `${t("fields.building")} ${o.address.building}`, o.address.apartment && `${t("fields.apartment")} ${o.address.apartment}`, o.address.entrance && `${t("fields.entrance")} ${o.address.entrance}`, o.address.floor && `${t("fields.floor")} ${o.address.floor}`].filter(Boolean).join(", ") : "—"], [t("common.note"), o.note], [t("tech.job.plan"), o.customerPlan], [t("tech.job.endCustomer"), o.endCustomer ? `${o.endCustomer.name} · ${o.endCustomer.phone}` : null], [t("tech.job.site"), o.siteName]]} />
                  {loc && <a className="btn outline btn-sm mt-3" href={`https://www.openstreetmap.org/directions?to=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer"><Navigation size={14} /> {t("tech.job.route")}</a>}
                </Card>
                {loc && <Card title={t("map.label")} flush><MapView height={300} zoom={14} points={[{ id: "c", lat: loc.lat, lng: loc.lng, label: o.address.street }]} /></Card>}
              </div>
            )}
            {tab === "estimate" && <Card>{o.estimate ? <EstimateView estimate={o.estimate} /> : <EmptyState title={t("tech.job.noEstimate")} />}</Card>}
            {tab === "history" && <Card><HistoryList items={o.history} /></Card>}
            {tab === "documents" && <Card><DocumentsList docs={o.documents} /></Card>}
          </>
        );
      }}
    </QueryView>
  );
}

/* ------------------------------------------------------------------ */
/* Cədvəl (§16)                                                         */
/* ------------------------------------------------------------------ */

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i);

function bakuParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 4 * 3600_000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function SchedulePage() {
  const { t, locale, time } = useI18n();
  const [offset, setOffset] = useState(0);
  const start = useMemo(() => {
    const d = new Date(Date.now() + 4 * 3600_000);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
    return d;
  }, [offset]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400_000).toISOString().slice(0, 10));
  const from = new Date(start.getTime() - 4 * 3600_000).toISOString();
  const to = new Date(start.getTime() + 7 * 86400_000 - 4 * 3600_000).toISOString();
  const q = useApi<any>(`/technician/schedule${qs({ from, to })}`);
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const [blocking, setBlocking] = useState(false);
  const fmt = (d: string) => new Intl.DateTimeFormat(locale === "az" ? "az-Latn-AZ" : locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const events: any[] = q.data?.events ?? [];
  const wh: any[] = q.data?.workingHours ?? [];
  return (
    <>
      <PageHeader
        title={t("tech.nav.schedule")}
        subtitle={t("tech.schedule.subtitle")}
        actions={
          <>
            <div className="kit-segment"><button type="button" onClick={() => setOffset((o) => o - 1)}>←</button><button type="button" className={cn(offset === 0 && "active")} onClick={() => setOffset(0)}>{t("tech.schedule.thisWeek")}</button><button type="button" onClick={() => setOffset((o) => o + 1)}>→</button></div>
            <button type="button" className="btn primary" onClick={() => setBlocking(true)}><Lock size={15} /> {t("tech.dash.blockTime")}</button>
          </>
        }
      />
      {q.isLoading ? <Loading rows={8} /> : (
        <div className="table-wrap">
          <div className="kit-cal" role="grid" aria-label={t("tech.nav.schedule")}>
            <div className="head" />
            {days.map((d, i) => <div key={d} className={cn("head", (wh.find((w) => w.day === (i + 1) % 7)?.off) && "text-muted")}>{fmt(d)}</div>)}
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div className="hour">{String(h).padStart(2, "0")}:00</div>
                {days.map((d, i) => {
                  const work = wh.find((w) => w.day === (i + 1) % 7);
                  const off = work?.off || (work && (h < Number(work.from.slice(0, 2)) || h >= Number(work.to.slice(0, 2))));
                  const here = events.filter((e) => { const p = bakuParts(e.start); return p.day === d && p.hour === h; });
                  const covered = events.filter((e) => e.kind !== "JOB" && e.start <= `${d}T${String(h - 4).padStart(2, "0")}:00` && e.end > `${d}T${String(h - 4).padStart(2, "0")}:00`);
                  return (
                    <div key={d + h} style={off ? { background: "var(--surface-soft)" } : undefined}>
                      {here.map((e) => (
                        <button key={e.id} type="button" className={cn("ev", e.kind !== "JOB" && "block")} title={`${time(e.start)}–${time(e.end)} ${e.title}`} onClick={() => (e.kind === "JOB" ? navigate(`/technician/jobs/${e.orderId}`) : undefined)}>
                          {time(e.start)} {e.title}
                        </button>
                      ))}
                      {!here.length && covered.length > 0 && <span className="ev block">{covered[0].title}</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      <Card title={t("tech.schedule.blocks")} className="mt-6">
        {events.filter((e) => e.kind !== "JOB").length ? (
          <ul className="kit-list">
            {events.filter((e) => e.kind !== "JOB").map((b) => (
              <li key={b.id}><span className="grow"><strong>{b.title}</strong><small className="block text-muted">{new Date(b.start).toLocaleString()} — {new Date(b.end).toLocaleString()}</small></span><button type="button" className="icon-button" aria-label={t("common.delete")} onClick={async () => { await del(`/technician/schedule/blocks/${b.id}`); await refresh(); }}><Trash2 size={14} /></button></li>
            ))}
          </ul>
        ) : <EmptyState title={t("tech.schedule.noBlocks")} />}
      </Card>
      {blocking && <BlockDialog onClose={() => setBlocking(false)} />}
    </>
  );
}

function BlockDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [kind, setKind] = useState("BLOCKED");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="sm" title={t("tech.dash.blockTime")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!start || !end} onClick={async () => { setError(null); try { await post("/technician/schedule/blocks", { kind, start: new Date(start).toISOString(), end: new Date(end).toISOString(), title: title || undefined }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("tech.schedule.kind")} value={kind} onValue={setKind} options={[{ value: "BLOCKED", label: t("tech.schedule.blocked") }, { value: "VACATION", label: t("tech.schedule.vacation") }]} />
      <TextField label={t("tech.schedule.start")} type="datetime-local" value={start} onValue={setStart} />
      <TextField label={t("tech.schedule.end")} type="datetime-local" value={end} onValue={setEnd} />
      <TextField label={t("tech.schedule.title")} value={title} onValue={setTitle} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* İxtisaslar (§14)                                                     */
/* ------------------------------------------------------------------ */

function SpecializationsPage() {
  const { t, enumLabel, date } = useI18n();
  const q = useApi<any>("/technician/specializations");
  const refresh = useRefresh();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title={t("tech.nav.specializations")} subtitle={q.data ? t("tech.spec.limit", { count: q.data.items.length, limit: q.data.limit ?? "∞" }) : undefined} actions={<button type="button" className="btn primary" disabled={!!q.data && q.data.limit !== null && q.data.items.length >= q.data.limit} onClick={() => setAdding(true)}><Plus size={16} /> {t("tech.spec.add")}</button>} />
      <QueryView query={q}>
        {(d) => (
          <>
            <Card flush>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t("tech.spec.name")}</th><th>{t("tech.spec.level")}</th><th>{t("tech.spec.certificate")}</th><th>{t("common.status")}</th><th /></tr></thead>
                  <tbody>
                    {d.items.map((s: any) => (
                      <tr key={s.id}>
                        <td><strong>{s.name}</strong><small className="block">{s.categoryName} · {enumLabel("ServiceType", s.serviceType)}</small></td>
                        <td>{enumLabel("ExperienceLevel", s.level)}</td>
                        <td>{s.certificateExpiresAt ? date(s.certificateExpiresAt) : "—"}</td>
                        <td><EnumBadge group="SpecStatus" code={s.status} /></td>
                        <td><button type="button" className="icon-button" aria-label={t("common.delete")} onClick={async () => { try { await del(`/technician/specializations/${s.id}`); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title={t("tech.spec.skills")} className="mt-6">
              <div className="kit-chip-grid">{d.skills.map((s: any) => <span key={s.id} className={cn("chip", s.selected && "active")}>{s.name}</span>)}</div>
            </Card>
            {adding && <SpecDialog available={d.available} onClose={() => setAdding(false)} />}
          </>
        )}
      </QueryView>
    </>
  );
}

function SpecDialog({ available, onClose }: { available: any[]; onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [id, setId] = useState("");
  const [level, setLevel] = useState("INTERMEDIATE");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const spec = available.find((a) => a.id === id);
  return (
    <Dialog open onClose={onClose} title={t("tech.spec.add")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!id || (spec?.requiresCertificate && !files.length)} onClick={async () => { setError(null); try { await post("/technician/specializations", { specializationId: id, level, certificateName: files[0]?.name }); await refresh(); toast.success(t("tech.spec.sent")); onClose(); } catch (e) { setError(e); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("tech.spec.name")} value={id} onValue={setId} placeholder={t("common.choose")} options={available.map((a) => ({ value: a.id, label: a.name }))} />
      <SelectField label={t("tech.spec.level")} value={level} onValue={setLevel} options={["BEGINNER", "INTERMEDIATE", "EXPERT"].map((l) => ({ value: l, label: enumLabel("ExperienceLevel", l) }))} />
      {spec?.requiresCertificate && <><p className="kit-note warning text-sm mb-2">{t("tech.spec.needsCert")}</p><FileDrop files={files} onChange={setFiles} max={1} /></>}
      <p className="text-sm text-muted mt-2">{t("tech.spec.review")}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Anbar və rezervlər (§27, §39)                                        */
/* ------------------------------------------------------------------ */

function InventoryPage() {
  const { t, qty, money, dateTime, enumLabel, text } = useI18n();
  const [search, setSearch] = useState("");
  const q = useApi<any>(`/technician/inventory${qs({ q: search, pageSize: 50 })}`);
  return (
    <>
      <PageHeader title={q.data?.employmentType === "STAFF" ? t("tech.nav.inventory") : t("tech.nav.materials")} subtitle={q.data?.warehouse ? `${q.data.warehouse.name} · ${q.data.warehouse.code}` : t("tech.inv.independent")} actions={<SearchBox value={search} onChange={setSearch} />} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) =>
          d.employmentType === "STAFF" ? (
            <>
              <Card flush title={t("tech.inv.stock")}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("docs.item")}</th><th className="num">{t("tech.inv.physical")}</th><th className="num">{t("tech.inv.reserved")}</th><th className="num">{t("tech.inv.available")}</th><th className="num">{t("tech.inv.min")}</th></tr></thead>
                    <tbody>
                      {d.items.map((i: any) => (
                        <tr key={i.id}>
                          <td><strong>{text(i.productName)}</strong><small className="block">{i.sku} · {i.categoryName}</small></td>
                          <td className="num">{qty(i.physical)}</td>
                          <td className="num">{qty(i.reserved)}</td>
                          <td className="num"><strong className={cn(i.belowMin && "text-danger")}>{qty(i.available)}</strong></td>
                          <td className="num">{qty(i.minLevel)}{i.belowMin && <AlertTriangle size={12} className="text-danger ml-1" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              {d.movements?.length > 0 && (
                <Card title={t("tech.inv.movements")} className="mt-6">
                  <ul className="kit-list">{d.movements.map((m: any) => <li key={m.id}><span className="grow">{m.number} · {enumLabel("MovementType", m.type)}<small className="block text-muted">{dateTime(m.at)} · {m.relatedDocument ?? m.reason}</small></span><strong className={m.direction === "OUT" ? "text-danger" : "text-success"}>{m.direction === "OUT" ? "−" : "+"}{qty(m.quantity)}</strong></li>)}</ul>
                </Card>
              )}
            </>
          ) : (
            <>
              <p className="kit-note info mb-4">{t("tech.inv.purchaseHint")}</p>
              <div className="shop-grid">
                {d.purchasable.map((p: any) => (
                  <Card key={p.id} title={text(p.name)} subtitle={p.brandName}>
                    <p className="text-sm">{t("tech.inv.techPrice")}: <strong>{money(p.price.effectivePrice)}</strong></p>
                    {p.price.unitPrices?.length > 1 && <small className="text-muted">{p.price.unitPrices.map((u: any) => `${u.unit}: ${money(u.price)}`).join(" · ")}</small>}
                    <Link to={`/product/${p.slug}`} className="btn outline btn-sm mt-3">{t("common.details")}</Link>
                  </Card>
                ))}
              </div>
            </>
          )
        }
      </QueryView>
    </>
  );
}

function ReservationsPage() {
  const { t, qty, dateTime, enumLabel, text, relative } = useI18n();
  const q = useApi<any>("/technician/reservations?pageSize=50");
  const refresh = useRefresh();
  const [creating, setCreating] = useState(false);
  const locked = q.data && !q.data.limit;
  return (
    <>
      <PageHeader title={t("tech.nav.reservations")} subtitle={q.data ? t("tech.res.limit", { active: q.data.active, limit: q.data.limit ?? "∞" }) : undefined} actions={<button type="button" className="btn primary" disabled={!!locked || (q.data?.limit !== null && q.data?.active >= q.data?.limit)} onClick={() => setCreating(true)}><Plus size={16} /> {t("tech.res.new")}</button>} />
      {locked && <div className="kit-note warning mb-4">{t("tech.res.locked")} <Link to="/technician/subscription" className="text-brand">{t("acc.dash.upgrade")}</Link></div>}
      <QueryView query={q} empty={<EmptyState icon={Boxes} title={t("tech.res.empty")} />}>
        {(d) => (
          <Card flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("fields.number")}</th><th>{t("docs.item")}</th><th>{t("tech.res.warehouse")}</th><th className="num">{t("common.quantity")}</th><th>{t("tech.res.job")}</th><th>{t("tech.res.expires")}</th><th>{t("common.status")}</th><th /></tr></thead>
                <tbody>
                  {d.items.map((x: any) => (
                    <tr key={x.id}>
                      <td><strong>{x.number}</strong></td>
                      <td>{text(x.productName)}<small className="block">{x.sku}</small></td>
                      <td>{x.warehouseName}</td>
                      <td className="num">{qty(x.quantity)}</td>
                      <td>{x.sourceNumber}<small className="block">{enumLabel("ReservationSource", x.source)}</small></td>
                      <td className={cn(x.expiringSoon && "text-warning")}>{x.status === "ACTIVE" ? relative(x.expiresAt) : dateTime(x.expiresAt)}</td>
                      <td><EnumBadge group="ReservationStatus" code={x.status} /></td>
                      <td>{x.status === "ACTIVE" && <button type="button" className="btn outline btn-sm" onClick={async () => { await post(`/technician/reservations/${x.id}/release`); await refresh(); toast.success(t("tech.res.released")); }}>{t("actions.release")}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </QueryView>
      {creating && <ReservationDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function ReservationDialog({ onClose }: { onClose: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const refresh = useRefresh();
  const jobs = useApi<any>("/technician/jobs?pageSize=50");
  const warehouses = useApi<any[]>("/technician/warehouses");
  const [orderId, setOrderId] = useState("");
  const materials = useApi<any[]>(orderId ? `/technician/jobs/${orderId}/materials` : null);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [error, setError] = useState<unknown>(null);
  const product = materials.data?.find((m) => m.productId === productId);
  useEffect(() => { if (product) setUnit(product.baseUnit); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open onClose={onClose} title={t("tech.res.new")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!orderId || !productId || !warehouseId} onClick={async () => { setError(null); try { await post("/technician/reservations", { serviceOrderId: orderId, productId, warehouseId, quantity, unit }); await refresh(); toast.success(t("tech.res.created")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{t("tech.res.hint")}</p>
      <SelectField label={t("tech.res.job")} required value={orderId} onValue={setOrderId} placeholder={t("common.choose")} options={(jobs.data?.items ?? []).map((o: any) => ({ value: o.id, label: `${o.number} · ${text(o.serviceName)}` }))} />
      <SelectField label={t("docs.item")} required value={productId} onValue={setProductId} placeholder={t("common.choose")} disabled={!orderId} options={(materials.data ?? []).map((m) => ({ value: m.productId, label: `${text(m.name)}${m.compatible ? " ✓" : ""}` }))} />
      <SelectField label={t("tech.res.warehouse")} required value={warehouseId} onValue={setWarehouseId} placeholder={t("common.choose")} options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: `${w.name} (${enumLabel("WarehouseType", w.type)})` }))} />
      <p className="form-label mb-2">{t("common.quantity")}</p>
      <QuantityInput value={quantity} onValue={setQuantity} unit={unit} units={product?.units} onUnit={setUnit} min={0} step={unit === "pcs" ? 1 : 0.5} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Müştərilər, qazanc, rəylər, sənədlər, statistika, ayarlar            */
/* ------------------------------------------------------------------ */

function CustomersPage() {
  const { t, date } = useI18n();
  const q = useApi<any>("/technician/customers?pageSize=100");
  const refresh = useRefresh();
  const [note, setNote] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("tech.nav.customers")} subtitle={t("tech.customers.subtitle")} />
      {q.data && !q.data.crm && <p className="kit-note info mb-4">{t("tech.customers.crmHint")}</p>}
      <QueryView query={q} empty={<EmptyState icon={Users} />}>
        {(d) => (
          <Card flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("tech.jobs.customer")}</th><th>{t("fields.phone")}</th><th className="num">{t("tech.customers.orders")}</th><th>{t("tech.customers.last")}</th><th>{t("tech.customers.devices")}</th><th>{t("common.note")}</th></tr></thead>
                <tbody>
                  {d.items.map((c: any) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong><small className="block">{c.city}</small></td>
                      <td>{c.phone}</td>
                      <td className="num">{c.orders}</td>
                      <td>{date(c.lastOrderAt)}<small className="block">{c.lastService}</small></td>
                      <td>{c.devices.join(", ")}</td>
                      <td><button type="button" className="btn ghost btn-sm" onClick={() => setNote(c)}><MessageSquare size={14} /> {c.note ? c.note.slice(0, 24) : t("common.add")}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </QueryView>
      {note && <PromptDialog open title={t("tech.customers.note", { name: note.name })} label={t("common.note")} initial={note.note ?? ""} required={false} onClose={() => setNote(null)} onSubmit={async (v) => { await put(`/technician/customers/${note.id}/note`, { note: v }); await refresh(); }} />}
    </>
  );
}

function EarningsPage() {
  const { t, money, date, enumLabel } = useI18n();
  const q = useApi<any>("/technician/earnings");
  const [handover, setHandover] = useState(false);
  return (
    <>
      <PageHeader title={t("tech.nav.earnings")} subtitle={q.data ? t("tech.earn.period", { period: q.data.period, schedule: enumLabel("SettlementPeriod", q.data.settlementPeriod) }) : undefined} actions={q.data && Number(q.data.cashBalance.amount) > 0 && <button type="button" className="btn primary" onClick={() => setHandover(true)}>{t("tech.earn.handover")}</button>} />
      <QueryView query={q} rows={8}>
        {(d) => (
          <>
            {d.cashOverLimit && <div className="kit-note danger mb-4">{t("tech.earn.overLimit", { limit: money(d.cashLimit) })}</div>}
            <Grid cols={4}>
              {d.employmentType === "INDEPENDENT" ? (
                <>
                  <Stat label={t("tech.earn.pending")} value={money(d.pending)} tone="warning" />
                  <Stat label={t("tech.earn.approved")} value={money(d.approved)} tone="info" />
                  <Stat label={t("tech.earn.paid")} value={money(d.paid)} tone="success" />
                  <Stat label={t("tech.earn.onHold")} value={money(d.onHold)} tone="danger" />
                </>
              ) : (
                <>
                  <Stat label={t("tech.earn.jobs")} value={d.jobsCount} />
                  <Stat label={t("tech.earn.bonus")} value={money(d.bonus)} hint={d.bonusRule} tone="success" />
                  <Stat label={t("tech.dash.cash")} value={money(d.cashBalance)} hint={t("tech.dash.cashLimit", { limit: money(d.cashLimit) })} tone="warning" />
                  <Stat label={t("tech.earn.pendingHandover")} value={money(d.pendingHandover)} tone="info" />
                </>
              )}
            </Grid>
            <Card title={t("tech.earn.chart")} className="mb-6">
              <BarsChart data={d.chart} xKey="label" bars={[{ key: "amount", label: t("tech.earn.amount") }, { key: "jobs", label: t("tech.earn.jobs") }]} />
            </Card>
            {d.lines.length > 0 && (
              <Card title={t("tech.earn.lines")} flush>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("tech.res.job")}</th><th>{t("tech.earn.company")}</th><th>{t("tech.earn.closedAt")}</th><th className="num">{t("tech.earn.labor")}</th><th className="num">{t("tech.earn.ownMaterial")}</th><th>{t("tech.earn.deductions")}</th><th className="num">{t("tech.earn.payable")}</th><th>{t("common.status")}</th></tr></thead>
                    <tbody>
                      {d.lines.map((l: any) => (
                        <tr key={l.id}>
                          <td><strong>{l.orderNumber}</strong><small className="block">{l.period}</small></td>
                          <td>{l.companyName}</td>
                          <td>{date(l.closedAt)}</td>
                          <td className="num">{money(l.laborAmount)}</td>
                          <td className="num">{money(l.ownMaterialAmount)}</td>
                          <td>{l.deductions.map((x: any) => `${enumLabel("DeductionKind", x.kind)}: ${money(x.amount ?? { amount: (x.cents / 100).toFixed(2), currency: "AZN" })}`).join("; ") || "—"}</td>
                          <td className="num"><strong>{money(l.payable)}</strong></td>
                          <td><EnumBadge group="SettlementStatus" code={l.status} />{l.holdReason && <small className="block text-danger">{l.holdReason}</small>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {d.cashOperations.length > 0 && (
              <Card title={t("tech.earn.cashOps")} className="mt-6">
                <ul className="kit-list">{d.cashOperations.map((op: any) => <li key={op.id}><span className="grow">{enumLabel("CashOperation", op.kind)}<small className="block text-muted">{date(op.at)} · {op.note ?? op.orderNumber ?? ""}</small></span><strong>{money(op.amount)}</strong><EnumBadge group="OpStatus" code={op.status} /></li>)}</ul>
              </Card>
            )}
            {handover && <PromptDialog open multiline={false} title={t("tech.earn.handover")} label={t("wf.payment.amount")} initial={d.cashBalance.amount} confirmLabel={t("common.send")} onClose={() => setHandover(false)} onSubmit={async (v) => { await post("/technician/cash/handover", { amount: v }); toast.success(t("tech.earn.handoverSent")); }} />}
          </>
        )}
      </QueryView>
    </>
  );
}

function TechReviewsPage() {
  const { t, date } = useI18n();
  const q = useApi<any>("/technician/reviews?pageSize=50");
  const refresh = useRefresh();
  const [reply, setReply] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("tech.nav.reviews")} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) => (
          <div className="kit-split">
            <div className="kit-reviews">
              {!d.items.length && <EmptyState />}
              {d.items.map((r: any) => (
                <article key={r.id}>
                  <div className="flex justify-between gap-2 flex-wrap"><strong>{r.authorName} <small className="text-muted">· {r.orderNumber}</small></strong><Stars value={r.rating} /></div>
                  <p className="mt-2">{r.comment}</p>
                  <small className="text-muted">{Object.entries(r.criteria ?? {}).map(([k, v]) => `${t(`reviews.${k}`)}: ${v}`).join(" · ")} · {date(r.createdAt)}</small>
                  {r.reply ? <p className="kit-note text-sm mt-2"><strong>{t("acc.reviews.reply")}:</strong> {r.reply}</p> : r.availableActions?.some((a: any) => a.code === "reply") && <button type="button" className="btn outline btn-sm mt-2" onClick={() => setReply(r)}>{t("actions.reply")}</button>}
                </article>
              ))}
            </div>
            <Card title={t("tech.reviews.summary")}>
              <div className="text-center"><strong className="text-2xl">{d.rating.toFixed(1)}</strong><p className="text-muted">{t("tech.reviews.count", { count: d.count })}</p></div>
              {d.distribution.map((x: any) => <UsageBar key={x.stars} label={`${x.stars} ★`} used={x.count} limit={Math.max(1, d.items.length)} />)}
            </Card>
          </div>
        )}
      </QueryView>
      {reply && <PromptDialog open title={t("actions.reply")} label={t("acc.reviews.reply")} onClose={() => setReply(null)} onSubmit={async (v) => { await post(`/technician/reviews/${reply.id}/reply`, { reply: v }); await refresh(); }} />}
    </>
  );
}

function TechDocumentsPage() {
  const { t, date, enumLabel } = useI18n();
  const q = useApi<any>("/technician/documents");
  const refresh = useRefresh();
  const [kind, setKind] = useState("CERTIFICATE");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [expires, setExpires] = useState("");
  return (
    <>
      <PageHeader title={t("tech.nav.documents")} subtitle={q.data ? <span>{t("tech.docs.verification")}: <EnumBadge group="TechnicianStatus" code={q.data.status} /></span> : undefined} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) => (
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("tech.docs.uploaded")} flush>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("tech.docs.kind")}</th><th>{t("tech.docs.file")}</th><th>{t("tech.docs.expires")}</th><th>{t("common.status")}</th></tr></thead>
                    <tbody>{d.documents.map((x: any) => <tr key={x.id}><td>{enumLabel("DocKind", x.kind)}</td><td>{x.name}<small className="block">{date(x.uploadedAt)}</small></td><td>{x.expiresAt ? date(x.expiresAt) : "—"}</td><td><EnumBadge group="VerificationStatus" code={x.status} />{x.note && <small className="block text-danger">{x.note}</small>}</td></tr>)}</tbody>
                  </table>
                </div>
              </Card>
              {d.partnerships.length > 0 && (
                <Card title={t("tech.docs.partnerships")}>
                  <ul className="kit-list">{d.partnerships.map((p: any) => <li key={p.id}><span className="grow"><strong>{p.companyName}</strong><small className="block text-muted">{p.zones.join(", ")} · {p.priceListName}</small></span><EnumBadge group="PartnershipStatus" code={p.status} /></li>)}</ul>
                </Card>
              )}
              {d.license && (
                <Card title={t("tech.nav.license")}>
                  <KeyValue items={[[t("common.status"), <EnumBadge key="s" group="LicenseStatus" code={d.license.status} />], [t("tech.docs.issuedBy"), d.license.issuedBy], [t("tech.docs.issuedAt"), date(d.license.issuedAt)], [t("tech.docs.capabilities"), Object.entries(d.license.capabilities).filter(([, v]) => v).map(([k]) => t(`tech.docs.cap.${k}`)).join(", ")]]} />
                </Card>
              )}
            </div>
            <Card title={t("tech.docs.upload")}>
              <SelectField label={t("tech.docs.kind")} value={kind} onValue={setKind} options={["ID_CARD", "CERTIFICATE", "DIPLOMA", "CRIMINAL_RECORD", "OTHER"].map((k) => ({ value: k, label: enumLabel("DocKind", k) }))} />
              <FileDrop files={files} onChange={setFiles} max={1} />
              <TextField label={t("tech.docs.expires")} type="date" value={expires} onValue={setExpires} />
              <button type="button" className="btn primary" disabled={!files.length} onClick={async () => { try { await post("/technician/documents", { kind, name: files[0]!.name, size: files[0]!.size, mimeType: files[0]!.mimeType, expiresAt: expires || undefined }); setFiles([]); await refresh(); toast.success(t("tech.docs.sent")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{t("common.send")}</button>
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}

function StatisticsPage() {
  const { t, text } = useI18n();
  const q = useApi<any>("/technician/statistics");
  return (
    <>
      <PageHeader title={t("tech.nav.statistics")} />
      <QueryView query={q} rows={8}>
        {(d) => (
          <>
            <Grid cols={4}>
              <Stat label={t("tech.stats.completed")} value={d.basic.completedJobs} icon={Wrench} />
              <Stat label={t("tech.dash.rating")} value={d.basic.rating} icon={Star} tone="warning" />
              <Stat label={t("tech.stats.onTime")} value={`${d.basic.onTimeRate}%`} icon={Clock} tone="success" />
              <Stat label={t("tech.dash.active")} value={d.basic.activeJobs} icon={ClipboardList} tone="info" />
            </Grid>
            {!d.advanced ? (
              <EmptyState icon={Lock} title={t("tech.stats.locked")} action={<Link to="/technician/subscription" className="btn primary">{t("acc.dash.upgrade")}</Link>} />
            ) : (
              <>
                <Grid cols={4}>
                  <Stat label={t("tech.stats.firstFix")} value={`${d.detailed.firstVisitFix}%`} />
                  <Stat label={t("tech.stats.warrantyRate")} value={`${d.detailed.warrantyClaimRate}%`} tone="danger" />
                  <Stat label={t("tech.stats.avgMinutes")} value={d.detailed.avgJobMinutes} />
                  <Stat label={t("tech.stats.approvalRate")} value={`${d.detailed.estimateApprovalRate}%`} tone="success" />
                </Grid>
                <Grid cols={2}>
                  <Card title={t("tech.stats.revenue")}><LinesChart area data={d.detailed.revenueByMonth} xKey="month" lines={[{ key: "revenue", label: t("tech.earn.amount") }]} /></Card>
                  <Card title={t("tech.stats.byService")}><DonutChart data={d.detailed.byService.map((s: any) => ({ name: text(s.name), value: s.count }))} /></Card>
                </Grid>
              </>
            )}
          </>
        )}
      </QueryView>
    </>
  );
}

const DAYS = [1, 2, 3, 4, 5, 6, 0];

function TechSettingsPage() {
  const { t, text } = useI18n();
  const q = useApi<any>("/technician/settings");
  const { ent } = useSession();
  const refresh = useRefresh();
  const [state, setState] = useState<any | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (q.data) setState({ bio: text(q.data.profile.bio), workingHours: q.data.profile.workingHours, zoneIds: q.data.zones.filter((z: any) => z.selected).map((z: any) => z.id), languages: q.data.profile.languages, promoted: q.data.profile.promoted });
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.isLoading || !state) return <Loading rows={8} />;
  const d = q.data;
  const save = async (body: Record<string, unknown>) => {
    setError(null);
    try { await patch("/technician/settings", body); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); }
  };
  return (
    <>
      <PageHeader title={t("tech.nav.settings")} actions={<Link to={`/technicians/${d.profile.id}`} className="btn outline">{t("tech.settings.publicProfile")}</Link>} />
      <FormError error={error} />
      <Grid cols={2}>
        <Card title={t("tech.settings.profile")}>
          <TextArea label={t("tech.settings.bio")} value={state.bio} onValue={(v) => setState({ ...state, bio: v })} rows={5} />
          <p className="form-label mb-2">{t("tech.settings.languages")}</p>
          <div className="flex gap-3 mb-3">{["az", "ru", "en", "tr"].map((l) => <Check key={l} label={l.toUpperCase()} checked={state.languages.includes(l)} onValue={(v) => setState({ ...state, languages: v ? [...state.languages, l] : state.languages.filter((x: string) => x !== l) })} />)}</div>
          <Toggle label={t("tech.settings.promoted")} checked={state.promoted} disabled={!ent("promote")} onValue={(v) => setState({ ...state, promoted: v })} />
          {!ent("promote") && <small className="block text-muted">{t("tech.settings.promoteLocked")}</small>}
          <button type="button" className="btn primary mt-3" onClick={() => save({ bio: state.bio, languages: state.languages, ...(ent("promote") ? { promoted: state.promoted } : {}) })}>{t("common.save")}</button>
        </Card>
        <Card title={t("tech.settings.hours")}>
          {DAYS.map((day) => {
            const h = state.workingHours.find((x: any) => x.day === day) ?? { day, from: "09:00", to: "18:00", off: true };
            const set = (p: any) => setState({ ...state, workingHours: [...state.workingHours.filter((x: any) => x.day !== day), { ...h, ...p }] });
            return (
              <div key={day} className="flex items-center gap-2 mb-2 flex-wrap">
                <span style={{ width: 90 }}>{t(`days.${day}`)}</span>
                <Toggle label={h.off ? t("tech.settings.off") : t("tech.settings.on")} checked={!h.off} onValue={(v) => set({ off: !v })} />
                {!h.off && <><input className="form-input" style={{ width: 110 }} type="time" value={h.from} onChange={(e) => set({ from: e.target.value })} aria-label={t("acc.notif.from")} /><input className="form-input" style={{ width: 110 }} type="time" value={h.to} onChange={(e) => set({ to: e.target.value })} aria-label={t("acc.notif.to")} /></>}
              </div>
            );
          })}
          <button type="button" className="btn primary mt-2" onClick={() => save({ workingHours: state.workingHours })}>{t("common.save")}</button>
        </Card>
      </Grid>
      <Card title={t("tech.settings.zones")} subtitle={d.editableZones ? t("tech.settings.zoneLimit", { count: state.zoneIds.length, limit: d.zoneLimit ?? "∞" }) : t("tech.settings.zonesStaff")}>
        <div className="kit-split">
          <MapView height={320} zoom={11} polygons={d.zones.filter((z: any) => state.zoneIds.includes(z.id) && z.polygon?.length).map((z: any) => ({ id: z.id, points: z.polygon }))} />
          <div>
            {d.zones.map((z: any) => <Check key={z.id} label={`${z.name} (${z.city})`} disabled={!d.editableZones} checked={state.zoneIds.includes(z.id)} onValue={(v) => setState({ ...state, zoneIds: v ? [...state.zoneIds, z.id] : state.zoneIds.filter((x: string) => x !== z.id) })} />)}
            {d.editableZones && <button type="button" className="btn primary mt-3" onClick={() => save({ zoneIds: state.zoneIds })}>{t("common.save")}</button>}
          </div>
        </div>
      </Card>
      <Card title={t("tech.settings.services")} className="mt-6">
        <div className="kit-chip-grid">{d.services.map((s: any) => <span key={s.id} className="chip">{text(s.name)}</span>)}</div>
      </Card>
    </>
  );
}
