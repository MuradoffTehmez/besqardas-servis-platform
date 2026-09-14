"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Copy, MapPin, Plus, Trash2, Truck, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, put, qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, Check, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stars, Stat, Tabs, TextArea, TextField, Toggle, errorText } from "../kit/base";
import { ActionBar, Dialog, ResourceTable, type ApiAction } from "../kit/actions";
import { EstimateView, StageTimeline } from "../kit/domain";
import { BarsChart, DonutChart, MapView, PhoneField } from "../kit/media";
import { DocumentsList, HistoryList, Progress, useRefresh } from "../pages/common";
import { AssignDialog, OrderActions } from "../pages/workflow";
import { I18nInput, enumKeys, useLookups } from "./crud";

/**
 * Servis əməliyyatları (PRD §61): dashboard, servis sifarişləri, dispetçer lövhəsi, cədvəl, logistika, zəmanət iddiaları,
 * workflow şablonlarının redaktoru.
 */

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export function AdminDashboardPage() {
  const { t, text, enumLabel, dateTime } = useI18n();
  const q = useApi<any>("/admin/dashboard", { refetchInterval: 60_000 });
  return (
    <QueryView query={q} rows={8}>
      {(d) => (
        <>
          <PageHeader title={t("acc.dash.hello", { name: d.user.name.split(" ")[0] })} subtitle={`${text(d.user.role)} · ${text(d.user.branchName) || "—"}`} actions={<Link to="/service-orders/new" className="btn primary"><Plus size={16} /> {t("adm.orders.create")}</Link>} />
          <Grid cols={4}>
            {d.widgets.map((w: any) => (
              <Stat key={w.code} label={text(w.title)} value={w.value} tone={w.tone} to={w.href ?? undefined} hint={w.delta ? <span className={w.trend === "up" ? "text-success" : w.trend === "down" ? "text-danger" : ""}>{w.trend === "up" ? "▲" : w.trend === "down" ? "▼" : ""} {w.delta}</span> : undefined} />
            ))}
          </Grid>
          <Grid cols={2}>
            <Card title={t("adm.dash.ordersByDay")}><BarsChart data={d.ordersByDay} xKey="date" bars={[{ key: "created", label: t("adm.dash.created") }, { key: "completed", label: t("adm.dash.completed") }]} /></Card>
            <Card title={t("adm.dash.byStatus")}><DonutChart data={d.ordersByStatus.filter((s: any) => s.count).map((s: any) => ({ name: enumLabel("OrderStatus", s.status), value: s.count }))} /></Card>
          </Grid>
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("adm.dash.sla")} actions={<Link to="/service-orders?slaBreached=true" className="btn ghost btn-sm">{t("common.viewAll")}</Link>}>
                {d.slaBreaches.length ? <OrderMiniList items={d.slaBreaches} /> : <EmptyState title={t("adm.dash.noSla")} />}
              </Card>
              <Card title={t("adm.dash.new")} actions={<Link to="/service-orders?status=NEW" className="btn ghost btn-sm">{t("common.viewAll")}</Link>}>
                {d.newOrders.length ? <OrderMiniList items={d.newOrders} /> : <EmptyState />}
              </Card>
            </div>
            <div className="kit-stack">
              {d.technicianLoad.length > 0 && (
                <Card title={t("adm.dash.load")} actions={<Link to="/dispatch" className="btn ghost btn-sm">{t("adm.nav.dispatch")}</Link>}>
                  <ul className="kit-list">
                    {d.technicianLoad.map((x: any) => (
                      <li key={x.id}>
                        <Link to={`/technicians/${x.id}`} className="grow"><strong>{x.name}</strong><small className="block text-muted">{enumLabel("EmploymentType", x.employmentType)}</small></Link>
                        <Stars value={x.rating} />
                        <span className={cn("badge", x.active >= 4 ? "badge-danger" : x.active >= 2 ? "badge-warning" : "badge-success")}>{t("adm.dash.active", { count: x.active })}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {d.lowStock.length > 0 && (
                <Card title={t("adm.dash.lowStock")} actions={<Link to="/inventory?belowMin=true" className="btn ghost btn-sm">{t("common.viewAll")}</Link>}>
                  <ul className="kit-list">{d.lowStock.map((s: any) => <li key={s.id}><span className="grow">{text(s.product)}<small className="block text-muted">{text(s.warehouse)}</small></span><span className="badge badge-danger">{s.available} / {s.min}</span></li>)}</ul>
                </Card>
              )}
              <p className="text-sm text-muted">{t("adm.dash.updated", { at: dateTime(new Date().toISOString()) })}</p>
            </div>
          </div>
        </>
      )}
    </QueryView>
  );
}

function OrderMiniList({ items }: { items: any[] }) {
  const { text, dateTime } = useI18n();
  return (
    <ul className="kit-list">
      {items.map((o) => (
        <li key={o.id}>
          <Link to={`/service-orders/${o.id}`} className="grow">
            <strong>{o.number} · {text(o.serviceName)}</strong>
            <small className="block text-muted">{[o.customerName, o.currentStageName, o.scheduledAt && dateTime(o.scheduledAt)].filter(Boolean).join(" · ")}</small>
          </Link>
          {o.slaBreached && <span className="badge badge-danger">SLA</span>}
          <EnumBadge group="OrderStatus" code={o.status} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Servis sifarişləri                                                   */
/* ------------------------------------------------------------------ */

export function AdminServiceOrdersPage() {
  const { t, text, enumLabel, dateTime, money } = useI18n();
  const { can } = useSession();
  return (
    <>
      <PageHeader title={t("adm.nav.serviceOrders")} actions={can("service_orders:create") || can("service_orders:edit") ? <Link to="/service-orders/new" className="btn primary"><Plus size={16} /> {t("adm.orders.create")}</Link> : null} />
      <ResourceTable
        path="/service-orders"
        pageSize={25}
        defaultSort="-createdAt"
        rowTo={(o: any) => `/service-orders/${o.id}`}
        filters={[
          { key: "status", label: t("common.status"), options: enumKeys("OrderStatus").map((s) => ({ value: s, label: enumLabel("OrderStatus", s) })) },
          { key: "executionForm", label: t("adm.f.executionForm"), options: enumKeys("ExecutionForm").map((s) => ({ value: s, label: enumLabel("ExecutionForm", s) })) },
          { key: "type", label: t("adm.f.type"), options: enumKeys("OrderType").map((s) => ({ value: s, label: enumLabel("OrderType", s) })) },
          { key: "slaBreached", label: "SLA", options: [{ value: "true", label: t("adm.orders.slaBreached") }] },
          { key: "urgent", label: t("acc.orders.urgent"), options: [{ value: "true", label: t("acc.orders.urgent") }] },
        ]}
        columns={[
          { key: "number", header: t("adm.f.number"), sortKey: "number", render: (o: any) => <span><strong>{o.number}</strong>{o.urgent && <span className="badge badge-danger ml-1">!</span>}<small className="block">{enumLabel("OrderSource", o.source)}</small></span> },
          { key: "createdAt", header: t("adm.f.createdAt"), sortKey: "createdAt", hideOnMobile: true, render: (o: any) => dateTime(o.createdAt) },
          { key: "customerName", header: t("adm.f.customer"), render: (o: any) => <span>{o.companyName ?? o.customerName}<small className="block">{o.customerPhone}</small></span> },
          { key: "serviceName", header: t("adm.f.service"), render: (o: any) => <span>{text(o.serviceName)}<small className="block">{enumLabel("ExecutionForm", o.executionForm)} · {o.branchName}</small></span> },
          { key: "technicianName", header: t("adm.f.technician"), hideOnMobile: true, render: (o: any) => o.technicianName ?? <span className="text-warning">{t("acc.orders.notAssigned")}</span> },
          { key: "scheduledAt", header: t("adm.f.scheduledAt"), sortKey: "scheduledAt", render: (o: any) => (o.scheduledAt ? dateTime(o.scheduledAt) : "—") },
          { key: "stage", header: t("tech.jobs.stage"), hideOnMobile: true, render: (o: any) => <span>{o.currentStageName}<small className="block"><EnumBadge group="StageStatus" code={o.currentStageStatus} />{o.slaBreached && <span className="badge badge-danger ml-1">SLA</span>}</small></span> },
          { key: "total", header: t("adm.f.total"), className: "num", hideOnMobile: true, render: (o: any) => (o.total ? money(o.total) : "—") },
          { key: "status", header: t("common.status"), render: (o: any) => <EnumBadge group="OrderStatus" code={o.status} /> },
        ]}
      />
    </>
  );
}

export function CreateServiceOrderPage() {
  const { t, text, enumLabel } = useI18n();
  const { navigate } = useRouter();
  const lookups = useLookups();
  const [v, setV] = useState({ customerId: "", serviceId: "", executionForm: "ON_SITE", addressId: "", deviceId: "", description: "", contactChannel: "CALL", urgent: false, scheduledAt: "", note: "" });
  const customer = useApi<any>(v.customerId ? `/admin/customers/${v.customerId}` : null);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const service = lookups.data?.services?.find((s: any) => s.id === v.serviceId);
  useEffect(() => { if (service && !service.executionForms.includes(v.executionForm)) setV((x) => ({ ...x, executionForm: service.executionForms[0] })); }, [v.serviceId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const a = customer.data?.addresses; if (a?.length) setV((x) => ({ ...x, addressId: a.find((y: any) => y.isDefault)?.id ?? a[0].id, deviceId: "" })); }, [customer.data]);
  const submit = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const r = await post("/service-orders", { ...v, addressId: v.executionForm === "CARRY_IN" ? null : v.addressId, deviceId: v.deviceId || null, scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : undefined, slotStart: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null, source: "OPERATOR" });
      toast.success(t("adm.orders.created", { number: r.number }));
      navigate(`/service-orders/${r.id}`);
    } catch (e: any) {
      setError(e);
      if (e?.fieldErrors) setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader back="/service-orders" title={t("adm.orders.create")} subtitle={t("adm.orders.createHint")} />
      <div className="kit-split">
        <Card>
          <FormError error={error} />
          <div className="flex gap-2 items-end">
            <SelectField className="flex-1" label={t("adm.f.customer")} required value={v.customerId} onValue={(x) => setV({ ...v, customerId: x })} placeholder={t("common.choose")} options={(lookups.data?.customers ?? []).map((c: any) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))} error={errors.customerId} />
            <button type="button" className="btn outline mb-4" onClick={() => setNewCustomer(true)}><UserPlus size={15} /> {t("adm.orders.newCustomer")}</button>
          </div>
          <div className="kit-form-grid">
            <SelectField label={t("adm.f.service")} required value={v.serviceId} onValue={(x) => setV({ ...v, serviceId: x })} placeholder={t("common.choose")} options={(lookups.data?.services ?? []).map((s: any) => ({ value: s.id, label: text(s.name) }))} error={errors.serviceId} />
            <SelectField label={t("adm.f.executionForm")} value={v.executionForm} onValue={(x) => setV({ ...v, executionForm: x })} options={(service?.executionForms ?? enumKeys("ExecutionForm")).map((f: string) => ({ value: f, label: enumLabel("ExecutionForm", f) }))} error={errors.executionForm} />
            {v.executionForm !== "CARRY_IN" && <SelectField label={t("adm.f.address")} required value={v.addressId} onValue={(x) => setV({ ...v, addressId: x })} placeholder={t("common.choose")} options={(customer.data?.addresses ?? []).map((a: any) => ({ value: a.id, label: `${a.label} — ${a.street}` }))} error={errors.addressId} />}
            <SelectField label={t("acc.orders.device")} value={v.deviceId} onValue={(x) => setV({ ...v, deviceId: x })} placeholder={t("adm.orders.noDevice")} options={(customer.data?.devices ?? []).map((d: any) => ({ value: d.id, label: `${d.modelName}${d.serialNumber ? ` · ${d.serialNumber}` : ""}` }))} />
            <SelectField label={t("acc.orders.contact")} value={v.contactChannel} onValue={(x) => setV({ ...v, contactChannel: x })} options={enumKeys("ContactChannel").map((c) => ({ value: c, label: enumLabel("ContactChannel", c) }))} />
            <TextField label={t("adm.f.scheduledAt")} type="datetime-local" value={v.scheduledAt} onValue={(x) => setV({ ...v, scheduledAt: x })} error={errors.scheduledAt ?? errors.slotStart} />
          </div>
          <TextArea label={t("acc.orders.problem")} required value={v.description} onValue={(x) => setV({ ...v, description: x })} error={errors.description} rows={3} />
          <TextArea label={t("common.note")} value={v.note} onValue={(x) => setV({ ...v, note: x })} rows={2} />
          <Toggle label={t("acc.orders.urgent")} checked={v.urgent} onValue={(x) => setV({ ...v, urgent: x })} />
          <div className="flex justify-end mt-4"><button type="button" className="btn primary" disabled={busy || !v.customerId || !v.serviceId} onClick={submit}>{t("adm.orders.create")}</button></div>
        </Card>
        <Card title={t("adm.orders.customerCard")}>
          {!v.customerId ? <EmptyState title={t("adm.orders.pickCustomer")} /> : customer.isLoading ? <Loading /> : customer.data && (
            <>
              <KeyValue cols={1} items={[[t("adm.f.fullName"), customer.data.fullName], [t("adm.f.phone"), customer.data.phone], [t("adm.f.plan"), customer.data.plan ? text(customer.data.plan.name) : "Basic"], [t("adm.f.orders"), customer.data.serviceOrders.length]]} />
              {customer.data.serviceOrders.slice(0, 4).map((o: any) => <p key={o.id} className="text-sm mt-2"><Link to={`/service-orders/${o.id}`} className="text-brand">{o.number}</Link> · {text(o.serviceName)} · <EnumBadge group="OrderStatus" code={o.status} /></p>)}
            </>
          )}
        </Card>
      </div>
      {newCustomer && <QuickCustomerDialog onClose={() => setNewCustomer(false)} onCreated={(id) => setV((x) => ({ ...x, customerId: id }))} />}
    </>
  );
}

function QuickCustomerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} title={t("adm.orders.newCustomer")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { try { const r = await post("/admin/customers", { ...v, email: v.email || undefined }); await refresh(); onCreated(r.id); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <TextField label={t("fields.firstName")} value={v.firstName} onValue={(x) => setV({ ...v, firstName: x })} />
        <TextField label={t("fields.lastName")} value={v.lastName} onValue={(x) => setV({ ...v, lastName: x })} />
        <PhoneField label={t("fields.phone")} value={v.phone} onValue={(x) => setV({ ...v, phone: x })} />
        <TextField label={t("fields.email")} type="email" value={v.email} onValue={(x) => setV({ ...v, email: x })} />
      </div>
      <p className="text-sm text-muted">{t("adm.orders.addressLater")}</p>
    </Dialog>
  );
}

export function AdminServiceOrderDetailPage({ id }: { id: string }) {
  const { t, text, enumLabel, dateTime, money } = useI18n();
  const q = useApi<any>(`/service-orders/${id}`, { refetchInterval: 20_000 });
  const logistics = useApi<any[]>(`/service-orders/${id}/logistics`);
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "workflow";
  return (
    <QueryView query={q} rows={10}>
      {(o) => (
        <>
          <PageHeader
            back="/service-orders"
            title={`${o.number} · ${text(o.serviceName)}`}
            badge={<EnumBadge group="OrderStatus" code={o.status} />}
            subtitle={<span className="order-head"><span>{enumLabel("OrderType", o.type)}</span><span>{enumLabel("ExecutionForm", o.executionForm)}</span><span>{o.branchName}</span><span>{o.templateName} v{o.templateVersion}</span>{o.scheduledAt && <span>{dateTime(o.scheduledAt)}</span>}{o.urgent && <span className="badge badge-danger">{t("acc.orders.urgent")}</span>}{o.slaBreached && <span className="badge badge-danger">SLA</span>}</span>}
          />
          <Card className="mb-6" title={t("adm.orders.actions")} subtitle={t("adm.orders.actionsHint")}>
            <Progress value={o.progress} />
            <div className="mt-4"><OrderActions order={o} /></div>
            {o.needsReschedule && <p className="kit-note warning text-sm mt-3">{t("adm.orders.needsReschedule")}</p>}
          </Card>
          <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "workflow", label: t("adm.orders.workflow") }, { id: "estimate", label: t("acc.estimate.title"), badge: o.estimate ? `v${o.estimate.version}` : null }, { id: "finance", label: t("acc.orders.payment") }, { id: "logistics", label: t("acc.orders.logistics"), badge: logistics.data?.length || null }, { id: "history", label: t("acc.orders.history"), badge: o.history.length }, { id: "documents", label: t("acc.orders.documents"), badge: o.documents.length || null }]} />
          <div className="kit-split">
            <div className="kit-stack">
              {tab === "workflow" && <Card title={t("tech.job.stages")}><StageTimeline stages={o.stages} mode="full" renderExtra={(s) => (s.photos.length || s.checklist.length || s.signed ? <small className="text-muted">{[s.photos.length && t("acc.devices.photos", { count: s.photos.length }), s.checklist.length && `${s.checklist.filter((c) => c.done).length}/${s.checklist.length} ✓`, s.signed && t("media.signed")].filter(Boolean).join(" · ")}</small> : null)} /></Card>}
              {tab === "estimate" && <Card>{o.estimate ? <EstimateView estimate={o.estimate} /> : <EmptyState title={t("tech.job.noEstimate")} />}</Card>}
              {tab === "finance" && (
                <Card>
                  <KeyValue cols={3} items={[[t("acc.orders.paymentStatus"), <EnumBadge key="p" group="PaymentStatus" code={o.paymentStatus} />], [t("acc.orders.paid"), money(o.paidAmount)], [t("acc.orders.due"), money(o.dueAmount)]]} />
                  {o.fees.length > 0 && <ul className="kit-list mt-3">{o.fees.map((f: any, i: number) => <li key={i}><span className="grow">{text(f.label)}<small className="block text-muted">{enumLabel("FeeType", f.type)}</small></span><span className={cn(f.waived && "text-muted")}>{f.waived ? t("acc.orders.waived") : money(f.amount)}</span></li>)}</ul>}
                  {o.payments.length ? <ul className="kit-list mt-3">{o.payments.map((p: any) => <li key={p.id}><span className="grow">{p.number}<small className="block text-muted">{enumLabel("PaymentMethod", p.method)} · {dateTime(p.createdAt)}</small></span><strong>{money(p.amount)}</strong><EnumBadge group="PaymentStatus" code={p.status} /></li>)}</ul> : <EmptyState title={t("adm.orders.noPayments")} />}
                  {o.materials.length > 0 && <><h3 className="mt-4 mb-2">{t("acc.orders.materials")}</h3><ul className="kit-list">{o.materials.map((m: any) => <li key={m.id}><span className="grow">{text(m.name)}<small className="block text-muted">{m.sku}</small></span><span>{m.quantity} {m.unit}</span>{m.ownMaterial && <span className="badge badge-info">{t("estimate.ownMaterial")}</span>}</li>)}</ul></>}
                </Card>
              )}
              {tab === "logistics" && <Card>{logistics.data?.length ? <ul className="kit-list">{logistics.data.map((l) => <li key={l.id}><Link to={`/logistics?task=${l.id}`} className="grow"><strong>{l.number}</strong><small className="block text-muted">{enumLabel("LogisticsType", l.type)} · {l.windowStart ? dateTime(l.windowStart) : ""} · {l.assigneeName ?? t("acc.orders.notAssigned")}</small></Link><EnumBadge group="LogisticsStatus" code={l.status} /></li>)}</ul> : <EmptyState />}</Card>}
              {tab === "history" && <Card><HistoryList items={o.history} /></Card>}
              {tab === "documents" && <Card><DocumentsList docs={o.documents} /></Card>}
            </div>
            <div className="kit-stack">
              <Card title={t("adm.f.customer")}>
                <KeyValue cols={1} items={[[t("adm.f.fullName"), o.customerId ? <Link key="c" to={`/customers/${o.customerId}`} className="text-brand">{o.customerName}</Link> : o.customerName], [t("adm.f.phone"), o.customerPhone], [t("adm.f.company"), o.companyName], [t("adm.f.plan"), o.customerPlan], [t("acc.orders.contact"), enumLabel("ContactChannel", o.contactChannel)], [t("tech.job.endCustomer"), o.endCustomer ? `${o.endCustomer.name} · ${o.endCustomer.phone}` : null], [t("adm.f.address"), o.address ? [o.address.city, o.address.street, o.address.apartment].filter(Boolean).join(", ") : null]]} />
                {o.address?.location && <MapView height={160} zoom={14} points={[{ id: "a", lat: o.address.location.lat, lng: o.address.location.lng }]} className="mt-3" />}
              </Card>
              <Card title={t("acc.orders.details")}>
                <KeyValue cols={1} items={[[t("acc.orders.device"), o.device ? `${o.device.modelName}${o.device.serialNumber ? ` · ${o.device.serialNumber}` : ""}` : null], [t("acc.orders.problem"), o.problem ? `${text(o.problem.label) ?? ""} ${o.problem.description ?? ""}` : null], [t("adm.f.technician"), o.technicianName ? <Link key="t" to={`/technicians/${o.technicianId}`} className="text-brand">{o.technicianName}</Link> : o.preferredTechnicianName ? t("acc.orders.preferred", { name: o.preferredTechnicianName }) : null], [t("adm.f.assignmentMethod"), enumLabel("AssignmentMethod", o.assignmentMethod)], [t("adm.f.operator"), o.operatorName], [t("adm.f.source"), enumLabel("OrderSource", o.source)], [t("adm.f.createdAt"), dateTime(o.createdAt)], [t("acc.orders.warranty"), o.warrantyNumber], [t("adm.f.related"), o.relatedOrderNumber ?? o.salesOrderNumber], [t("adm.f.oldPart"), o.oldPartDisposition ? enumLabel("OldPart", o.oldPartDisposition) : null]]} />
                {o.note && <p className="kit-note text-sm mt-3">{o.note}</p>}
                {o.cancelReason && <p className="kit-note danger text-sm mt-3">{o.cancelReason}</p>}
              </Card>
            </div>
          </div>
        </>
      )}
    </QueryView>
  );
}

/* ------------------------------------------------------------------ */
/* Dispetçer lövhəsi (§15.3, §16)                                      */
/* ------------------------------------------------------------------ */

const DAY_START = 8;
const DAY_HOURS = 12;

function hourOf(iso: string) {
  const d = new Date(new Date(iso).getTime() + 4 * 3600_000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

export function DispatchPage() {
  const { t, text, enumLabel, dateTime, date, time } = useI18n();
  const [offset, setOffset] = useState(0);
  const [branch, setBranch] = useState("");
  const [assign, setAssign] = useState<any | null>(null);
  const lookups = useLookups();
  const q = useApi<any>(`/admin/dispatch${qs({ dayOffset: offset, branchId: branch })}`, { refetchInterval: 30_000 });
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const [view, setView] = useState<"timeline" | "map">("timeline");
  return (
    <>
      <PageHeader
        title={t("adm.nav.dispatch")}
        subtitle={q.data ? date(`${q.data.date}T08:00:00Z`) : undefined}
        actions={
          <>
            <SelectField className="kit-filter" value={branch} onValue={setBranch} placeholder={t("adm.f.allBranches")} options={(lookups.data?.branches ?? []).map((b: any) => ({ value: b.id, label: text(b.name) }))} />
            <div className="kit-segment"><button type="button" onClick={() => setOffset((o) => o - 1)}>←</button><button type="button" className={cn(offset === 0 && "active")} onClick={() => setOffset(0)}>{t("courier.today")}</button><button type="button" onClick={() => setOffset((o) => o + 1)}>→</button></div>
            <div className="kit-segment"><button type="button" className={cn(view === "timeline" && "active")} onClick={() => setView("timeline")}>{t("adm.dispatch.timeline")}</button><button type="button" className={cn(view === "map" && "active")} onClick={() => setView("map")}>{t("map.label")}</button></div>
          </>
        }
      />
      <QueryView query={q} rows={10} isEmpty={() => false}>
        {(d) => (
          <>
            {d.alerts.length > 0 && (
              <div className="kit-note warning mb-4">
                <strong className="flex items-center gap-2"><AlertTriangle size={16} /> {t("adm.dispatch.alerts", { count: d.alerts.length })}</strong>
                <ul>{d.alerts.map((a: any) => <li key={a.id}><Link to={`/service-orders/${a.orderId}`}>{text(a.message)}</Link></li>)}</ul>
              </div>
            )}
            <div className="kit-split">
              <Card flush title={view === "timeline" ? t("adm.dispatch.technicians", { count: d.technicians.length }) : t("map.label")}>
                {view === "map" ? (
                  <MapView height={520} zoom={11} points={[...d.technicians.filter((x: any) => x.location).map((x: any) => ({ id: x.id, lat: x.location.lat, lng: x.location.lng, label: x.fullName.split(" ")[0], tone: "brand" as const })), ...d.unassigned.filter((o: any) => o.location).map((o: any) => ({ id: o.id, lat: o.location.lat, lng: o.location.lng, label: o.number, tone: "danger" as const, onClick: () => setAssign(o) }))]} />
                ) : (
                  <div className="table-wrap">
                    <table className="dispatch-grid">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 190 }}>{t("adm.f.technician")}</th>
                          <th style={{ minWidth: 720 }}>
                            <div className="dispatch-hours">{Array.from({ length: DAY_HOURS }, (_, i) => <span key={i}>{String(DAY_START + i).padStart(2, "0")}</span>)}</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.technicians.map((tech: any) => (
                          <tr key={tech.id}>
                            <td>
                              <Link to={`/technicians/${tech.id}`}><strong>{tech.fullName}</strong></Link>
                              <small className="block">{enumLabel("EmploymentType", tech.employmentType)} · ★ {tech.rating} · {t("adm.dash.active", { count: tech.workload })}</small>
                            </td>
                            <td>
                              <div className="dispatch-track">
                                {tech.events.map((ev: any) => {
                                  const start = Math.max(0, hourOf(ev.start) - DAY_START);
                                  const len = Math.max(0.5, hourOf(ev.end) - hourOf(ev.start));
                                  return (
                                    <button key={ev.id} type="button" className={cn("dispatch-ev", ev.slaBreached && "sla", ev.conflict && "conflict", ["COMPLETED", "CLOSED"].includes(ev.status) && "done")} style={{ left: `${(start / DAY_HOURS) * 100}%`, width: `${(len / DAY_HOURS) * 100}%` }} title={`${time(ev.start)}–${time(ev.end)} ${ev.orderNumber} ${text(ev.title)}`} onClick={() => navigate(`/service-orders/${ev.orderId}`)}>
                                      {ev.orderNumber} · {text(ev.title)}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <div className="kit-stack">
                <Card title={t("adm.dispatch.unassigned", { count: d.unassigned.length })}>
                  {d.unassigned.length ? (
                    <ul className="kit-list">
                      {d.unassigned.map((o: any) => (
                        <li key={o.id}>
                          <Link to={`/service-orders/${o.id}`} className="grow">
                            <strong>{o.number} · {text(o.serviceName)}</strong>
                            <small className="block text-muted">{o.addressShort} · {o.scheduledAt ? dateTime(o.scheduledAt) : t("adm.dispatch.noTime")}</small>
                            <small className="block">{o.currentStageName}{o.slaBreached && <span className="badge badge-danger ml-1">SLA</span>}</small>
                          </Link>
                          <button type="button" className="btn primary btn-sm" onClick={() => setAssign(o)}>{t("actions.assign")}</button>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title={t("adm.dispatch.allAssigned")} />}
                </Card>
                <Card title={t("adm.dispatch.pending")}>
                  {d.pendingOffers.length ? <ul className="kit-list">{d.pendingOffers.map((o: any) => <li key={o.id}><Link to={`/service-orders/${o.id}`} className="grow"><strong>{o.number}</strong><small className="block text-muted">{t("adm.dispatch.offeredTo", { name: o.offeredTo })}</small></Link><EnumBadge group="StageStatus" code={o.currentStageStatus} /></li>)}</ul> : <EmptyState />}
                </Card>
              </div>
            </div>
          </>
        )}
      </QueryView>
      {assign && <AssignDialog order={{ ...assign, stages: [] }} action={{ code: "assign", stageId: assign.stageId }} onClose={() => setAssign(null)} onSubmit={async (extra) => { await post(`/service-orders/${assign.id}/actions`, { action: "assign", stageId: assign.stageId, ...extra }); await refresh(); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Həftəlik cədvəl                                                      */
/* ------------------------------------------------------------------ */

export function AdminSchedulePage() {
  const { t, text, locale, time } = useI18n();
  const [offset, setOffset] = useState(0);
  const q = useApi<any>("/service-orders?pageSize=500");
  const days = useMemo(() => {
    const d = new Date(Date.now() + 4 * 3600_000);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
    return Array.from({ length: 7 }, (_, i) => new Date(d.getTime() + i * 86400_000).toISOString().slice(0, 10));
  }, [offset]);
  const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 4 * 3600_000).toISOString().slice(0, 10);
  const rows = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const o of q.data?.items ?? []) {
      if (!o.scheduledAt || !days.includes(dayOf(o.scheduledAt)) || ["CANCELLED", "REJECTED"].includes(o.status)) continue;
      const key = o.technicianName ?? t("acc.orders.notAssigned");
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [q.data, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmt = (d: string) => new Intl.DateTimeFormat(locale === "az" ? "az-Latn-AZ" : locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return (
    <>
      <PageHeader title={t("adm.nav.schedule")} subtitle={t("adm.schedule.subtitle")} actions={<div className="kit-segment"><button type="button" onClick={() => setOffset((o) => o - 1)}>←</button><button type="button" className={cn(offset === 0 && "active")} onClick={() => setOffset(0)}>{t("tech.schedule.thisWeek")}</button><button type="button" onClick={() => setOffset((o) => o + 1)}>→</button></div>} />
      {q.isLoading ? <Loading rows={8} /> : !rows.length ? <EmptyState title={t("adm.schedule.empty")} /> : (
        <div className="table-wrap kit-card">
          <table>
            <thead><tr><th>{t("adm.f.technician")}</th>{days.map((d) => <th key={d}>{fmt(d)}</th>)}</tr></thead>
            <tbody>
              {rows.map(([name, orders]) => (
                <tr key={name}>
                  <td><strong>{name}</strong><small className="block">{orders.length}</small></td>
                  {days.map((d) => (
                    <td key={d} style={{ verticalAlign: "top", minWidth: 130 }}>
                      {orders.filter((o) => dayOf(o.scheduledAt) === d).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).map((o) => (
                        <Link key={o.id} to={`/service-orders/${o.id}`} className={cn("kit-cal-ev", o.slaBreached && "warn", !o.technicianName && "block")}>{time(o.scheduledAt)} {o.number}<small className="block">{text(o.serviceName)}</small></Link>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Logistika (§21)                                                      */
/* ------------------------------------------------------------------ */

export function LogisticsPage() {
  const { t, enumLabel, dateTime, text } = useI18n();
  const { query, setQuery } = useRouter();
  const selected = query.get("task");
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.logistics")} actions={<button type="button" className="btn primary" onClick={() => setCreating(true)}><Truck size={16} /> {t("adm.logistics.create")}</button>} />
      <ResourceTable
        path="/admin/logistics"
        defaultSort="-windowStart"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("LogisticsStatus").map((s) => ({ value: s, label: enumLabel("LogisticsStatus", s) })) }, { key: "type", label: t("adm.f.type"), options: enumKeys("LogisticsType").map((s) => ({ value: s, label: enumLabel("LogisticsType", s) })) }]}
        rowTo={(r: any) => `/logistics?task=${r.id}`}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{enumLabel("LogisticsType", r.type)}</small></span> },
          { key: "windowStart", header: t("courier.window"), sortKey: "windowStart", render: (r: any) => dateTime(r.windowStart) },
          { key: "route", header: t("adm.logistics.route"), render: (r: any) => <span>{text(r.from.label)} → {text(r.to.label)}<small className="block">{r.to.address}</small></span> },
          { key: "cargo", header: t("courier.cargo"), hideOnMobile: true, render: (r: any) => r.cargo.map((c: any) => text(c.name)).join(", ") },
          { key: "relatedOrderNumber", header: t("courier.order"), hideOnMobile: true, render: (r: any) => r.relatedOrderNumber ?? "—" },
          { key: "assigneeName", header: t("adm.logistics.assignee"), render: (r: any) => r.assigneeName ?? <span className="text-warning">{t("acc.orders.notAssigned")}</span> },
          { key: "status", header: t("common.status"), render: (r: any) => <span><EnumBadge group="LogisticsStatus" code={r.status} />{r.failReason && <small className="block text-danger">{r.failReason}</small>}</span> },
        ]}
      />
      {selected && <LogisticsTaskDialog id={selected} onClose={() => setQuery({ task: null })} />}
      {creating && <CreateTaskDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function LogisticsTaskDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, text, enumLabel, dateTime, money } = useI18n();
  const q = useApi<any>(`/admin/logistics/${id}`);
  const couriers = useApi<any[]>("/admin/couriers-available");
  const refresh = useRefresh();
  const [assignee, setAssignee] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={q.data ? `${q.data.number} · ${enumLabel("LogisticsType", q.data.type)}` : t("common.loading")}>
      <QueryView query={q}>
        {(task) => (
          <>
            <FormError error={error} />
            <div className="flex justify-between gap-2 flex-wrap mb-3"><EnumBadge group="LogisticsStatus" code={task.status} />{task.relatedOrderNumber && (task.relatedOrderKind === "SERVICE" ? <Link to={`/service-orders/${task.relatedOrderId}`} className="text-brand">{task.relatedOrderNumber}</Link> : <Link to={`/sales-orders/${task.relatedOrderId}`} className="text-brand">{task.relatedOrderNumber}</Link>)}</div>
            {task.from.location && task.to.location && <MapView height={200} points={[{ id: "a", ...task.from.location, label: "A", tone: "muted" }, { id: "b", ...task.to.location, label: "B" }]} />}
            <KeyValue cols={2} items={[[t("courier.from"), `${text(task.from.label)} — ${task.from.address}`], [t("courier.to"), `${text(task.to.label)} — ${task.to.address}`], [t("courier.window"), `${dateTime(task.windowStart)} — ${dateTime(task.windowEnd)}`], [t("adm.logistics.assignee"), task.assigneeName], [t("adm.f.contact"), task.contact ? `${task.contact.name} · ${task.contact.phone}` : null], [t("courier.collect", { amount: "" }), task.collectCash ? money(task.collectCash) : null], [t("common.note"), task.note], [t("adm.logistics.proof"), `${t("acc.devices.photos", { count: task.photos })}${task.signed ? ` · ${t("media.signed")}` : ""}`]]} />
            <h3 className="mt-4 mb-2">{t("courier.cargo")}</h3>
            <ul className="kit-list">{task.cargo.map((c: any, i: number) => <li key={i}><span className="grow">{text(c.name)}<small className="block text-muted">{enumLabel("CargoKind", c.kind)}</small></span><strong>{c.quantity}</strong></li>)}</ul>
            {["PLANNED", "ASSIGNED", "FAILED"].includes(task.status) && (
              <div className="kit-card mt-4"><div className="kit-card-body">
                <div className="kit-form-grid">
                  <SelectField label={t("wf.courier.who")} value={assignee} onValue={setAssignee} placeholder={t("common.choose")} options={(couriers.data ?? []).map((c) => ({ value: c.id, label: `${c.fullName} · ${t("wf.courier.tasks", { count: c.openTasks })}` }))} />
                  <TextField label={t("wf.courier.window")} type="datetime-local" value={when} onValue={setWhen} />
                </div>
                <button type="button" className="btn primary btn-sm" disabled={!assignee} onClick={async () => { setError(null); try { await post(`/admin/logistics/${id}/assign`, { assigneeId: assignee, windowStart: when ? new Date(when).toISOString() : undefined }); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); } }}>{task.status === "FAILED" ? t("actions.replan") : t("actions.assign")}</button>
              </div></div>
            )}
            <div className="mt-4">
              <ActionBar size="sm" actions={task.availableActions.filter((a: ApiAction) => !["assign", "replan"].includes(a.code))} run={async (a, extra) => { await post(`/admin/logistics/${id}/status`, { action: a.code, reasonCode: extra.reasonCode, note: extra.note }); await refresh(); }} />
            </div>
            <h3 className="mt-4 mb-2">{t("acc.orders.history")}</h3>
            <ul className="kit-list">{task.history.map((h: any, i: number) => <li key={i}><span className="grow">{enumLabel("LogisticsStatus", h.status)}<small className="block text-muted">{dateTime(h.at)} · {h.actor}{h.note ? ` · ${h.note}` : ""}</small></span></li>)}</ul>
          </>
        )}
      </QueryView>
    </Dialog>
  );
}

function CreateTaskDialog({ onClose }: { onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ type: "DELIVERY", fromAddress: "", toAddress: "", windowStart: "", cargo: "", note: "", contactName: "", contactPhone: "" });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.logistics.create")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/admin/logistics", { ...v, windowStart: v.windowStart ? new Date(v.windowStart).toISOString() : "" }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <SelectField label={t("adm.f.type")} value={v.type} onValue={(x) => setV({ ...v, type: x })} options={["PICKUP", "DELIVERY", "TRANSFER"].map((x) => ({ value: x, label: enumLabel("LogisticsType", x) }))} />
        <TextField label={t("courier.window")} type="datetime-local" value={v.windowStart} onValue={(x) => setV({ ...v, windowStart: x })} />
        <TextField label={t("courier.from")} value={v.fromAddress} onValue={(x) => setV({ ...v, fromAddress: x })} />
        <TextField label={t("courier.to")} value={v.toAddress} onValue={(x) => setV({ ...v, toAddress: x })} />
        <TextField label={t("adm.f.contactName")} value={v.contactName} onValue={(x) => setV({ ...v, contactName: x })} />
        <PhoneField label={t("adm.f.phone")} value={v.contactPhone} onValue={(x) => setV({ ...v, contactPhone: x })} />
      </div>
      <TextField label={t("courier.cargo")} value={v.cargo} onValue={(x) => setV({ ...v, cargo: x })} />
      <TextArea label={t("common.note")} value={v.note} onValue={(x) => setV({ ...v, note: x })} rows={2} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Zəmanət iddiaları (§23.4)                                            */
/* ------------------------------------------------------------------ */

export function WarrantyClaimsAdminPage() {
  const { t, date, enumLabel } = useI18n();
  const [decide, setDecide] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("adm.nav.warrantyClaims")} subtitle={t("adm.claims.subtitle")} />
      <ResourceTable
        path="/admin/warranty-claims"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("ClaimStatus").map((s) => ({ value: s, label: enumLabel("ClaimStatus", s) })) }]}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{date(r.createdAt)}</small></span> },
          { key: "customerName", header: t("adm.f.customer") },
          { key: "deviceName", header: t("acc.orders.device"), render: (r: any) => <span>{r.deviceName}<small className="block">{r.warrantyNumber} · {enumLabel("WarrantyType", r.warranty.type)} · {date(r.warranty.endsAt)}</small></span> },
          { key: "description", header: t("acc.orders.problem"), render: (r: any) => <span>{r.description}{r.decisionNote && <small className="block">{r.decisionNote}</small>}</span> },
          { key: "originalOrderNumber", header: t("adm.claims.original"), hideOnMobile: true },
          { key: "serviceOrderNumber", header: t("adm.claims.newOrder"), render: (r: any) => (r.serviceOrderId ? <Link to={`/service-orders/${r.serviceOrderId}`} className="text-brand">{r.serviceOrderNumber}</Link> : "—") },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="ClaimStatus" code={r.status} /> },
          { key: "_a", header: "", render: (r: any) => (["SUBMITTED", "UNDER_REVIEW"].includes(r.status) ? <button type="button" className="btn primary btn-sm" onClick={() => setDecide(r)}>{t("adm.claims.decide")}</button> : null) },
        ]}
      />
      {decide && <ClaimDecision claim={decide} onClose={() => setDecide(null)} />}
    </>
  );
}

function ClaimDecision({ claim, onClose }: { claim: any; onClose: () => void }) {
  const { t, date } = useI18n();
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<unknown>(null);
  const go = async (approve: boolean) => {
    setError(null);
    try {
      const r = await post(`/admin/warranty-claims/${claim.id}/decide`, { approve, note: note || undefined });
      await refresh();
      toast.success(approve ? t("adm.claims.approved") : t("adm.claims.rejected"));
      onClose();
      if (approve && r.claim?.serviceOrderId) navigate(`/service-orders/${r.claim.serviceOrderId}`);
    } catch (e) { setError(e); }
  };
  return (
    <Dialog open onClose={onClose} title={t("adm.claims.decideTitle", { number: claim.number })} footer={<><button type="button" className="btn outline danger-outline" onClick={() => go(false)}>{t("adm.claims.reject")}</button><button type="button" className="btn primary" onClick={() => go(true)}>{t("adm.claims.approve")}</button></>}>
      <FormError error={error} />
      <KeyValue cols={2} items={[[t("adm.f.customer"), claim.customerName], [t("acc.orders.device"), claim.deviceName], [t("acc.warranty.period"), `${date(claim.warranty.startsAt)} — ${date(claim.warranty.endsAt)}`], [t("adm.claims.coverage"), claim.warranty.coverage], [t("adm.claims.original"), claim.originalOrderNumber]]} />
      <p className="kit-note mt-3">{claim.description}</p>
      <TextArea label={t("adm.claims.note")} value={note} onValue={setNote} rows={3} hint={t("adm.claims.noteHint")} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow şablonları (§17)                                            */
/* ------------------------------------------------------------------ */

export function WorkflowTemplatesPage() {
  const { t, text, enumLabel, date } = useI18n();
  const q = useApi<any>("/admin/workflow-templates");
  return (
    <>
      <PageHeader title={t("adm.nav.workflowTemplates")} subtitle={t("adm.wf.subtitle")} />
      <QueryView query={q}>
        {(d) => (
          <Grid cols={2}>
            {d.items.map((tpl: any) => (
              <Link key={tpl.id} to={`/workflow-templates/${tpl.id}`} className="kit-card clickable">
                <div className="kit-card-body">
                  <div className="flex justify-between gap-2 flex-wrap"><strong>{text(tpl.name)}</strong><EnumBadge group="TemplateStatus" code={tpl.status} /></div>
                  <small className="text-muted">{tpl.code} · v{tpl.version} · {enumLabel("ExecutionForm", tpl.executionForm)} · {date(tpl.updatedAt)}</small>
                  <div className="wf-chain mt-3">{tpl.stages.map((s: any) => <span key={s.id} className={cn("wf-chip", !s.mandatory && "optional", s.parallelWithPrevious && "parallel")} title={enumLabel("Executor", s.executor)}>{text(s.name)}</span>)}</div>
                  <p className="text-sm mt-3">{tpl.serviceNames.map(text).join(", ") || "—"} · {t("adm.wf.activeOrders", { count: tpl.activeOrders })}</p>
                </div>
              </Link>
            ))}
          </Grid>
        )}
      </QueryView>
    </>
  );
}

const STAGE_TYPES = () => enumKeys("StageType");

export function WorkflowTemplateEditorPage({ id }: { id: string }) {
  const { t, text, enumLabel, dateTime } = useI18n();
  const q = useApi<any>(`/admin/workflow-templates/${id}`);
  const refresh = useRefresh();
  const [stages, setStages] = useState<any[] | null>(null);
  const [name, setName] = useState<any>(null);
  const [validation, setValidation] = useState<any | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (q.data) { setStages(q.data.stages.map((s: any) => ({ ...s }))); setName(q.data.nameI18n); setValidation(q.data.validation); } }, [q.data]);
  if (q.isLoading || !stages) return <Loading rows={10} />;
  if (q.error) return <FormError error={q.error} />;
  const tpl = q.data;
  const edit = tpl.canEdit;
  const update = (i: number, patch: any) => setStages((s) => s!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) => setStages((s) => { const a = [...s!]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const body = () => ({ nameI18n: name, stages: stages.map((s, i) => ({ ...s, order: i + 1, name: s.nameI18n, customerName: s.customerNameI18n })) });
  const validate = async () => { const r = await post(`/admin/workflow-templates/${id}/validate`, body()); setValidation(r); if (r.valid) toast.success(t("adm.wf.valid")); };
  const save = async (activate: boolean) => {
    setBusy(true);
    setError(null);
    try { const r = await put(`/admin/workflow-templates/${id}`, { ...body(), activate }); setValidation(r.validation); await refresh(); toast.success(t("adm.wf.saved", { version: r.version })); } catch (e) { setError(e); } finally { setBusy(false); }
  };
  const stageErrors = (sid: string) => validation?.errors?.filter((e: any) => e.stageId === sid) ?? [];
  return (
    <>
      <PageHeader
        back="/workflow-templates"
        title={text(tpl.name)}
        badge={<EnumBadge group="TemplateStatus" code={tpl.status} />}
        subtitle={`${tpl.code} · v${tpl.version} · ${enumLabel("ExecutionForm", tpl.executionForm)} · ${t("adm.wf.activeOrders", { count: tpl.activeOrders })}`}
        actions={edit && <><button type="button" className="btn outline" onClick={validate}>{t("adm.wf.validate")}</button><button type="button" className="btn outline" disabled={busy} onClick={() => save(false)}>{t("adm.wf.saveDraft")}</button><button type="button" className="btn primary" disabled={busy} onClick={() => save(true)}>{t("adm.wf.saveActivate")}</button></>}
      />
      <FormError error={error} />
      {tpl.activeOrders > 0 && <p className="kit-note info mb-4">{t("adm.wf.versionHint", { count: tpl.activeOrders })}</p>}
      {validation && !validation.valid && <div className="kit-note danger mb-4"><strong>{t("adm.wf.errors")}</strong><ul>{validation.errors.map((e: any, i: number) => <li key={i}>{text(e.message)}</li>)}</ul></div>}
      <div className="kit-split">
        <div className="stage-editor">
          <Card><I18nInput label={t("adm.f.name")} value={name} onChange={setName} /></Card>
          {stages.map((s, i) => {
            const errs = stageErrors(s.id);
            const expanded = open === s.id || errs.length > 0;
            return (
              <div key={s.id || i} className={cn("stage", errs.length && "border-danger")}>
                <div className="stage-head">
                  <span className="badge">{i + 1}</span>
                  <strong className="flex-1">{text(s.nameI18n) || t("adm.wf.unnamed")}</strong>
                  {s.parallelWithPrevious && <span className="badge badge-info">{t("adm.wf.parallel")}</span>}
                  {!s.mandatory && <span className="badge">{t("workflow.optional")}</span>}
                  <span className="badge">{enumLabel("StageType", s.type)}</span>
                  <span className="badge badge-warning">{enumLabel("Executor", s.executor)}</span>
                  {edit && (
                    <>
                      <button type="button" className="icon-button" aria-label={t("adm.wf.up")} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                      <button type="button" className="icon-button" aria-label={t("adm.wf.down")} disabled={i === stages.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                      <button type="button" className="icon-button" aria-label={t("adm.wf.duplicate")} onClick={() => setStages((x) => [...x!.slice(0, i + 1), { ...s, id: "", nameI18n: { ...s.nameI18n } }, ...x!.slice(i + 1)])}><Copy size={14} /></button>
                      <button type="button" className="icon-button" aria-label={t("common.delete")} onClick={() => setStages((x) => x!.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
                    </>
                  )}
                  <button type="button" className="btn ghost btn-sm" onClick={() => setOpen(expanded && open === s.id ? null : s.id)}>{expanded ? t("common.close") : t("common.edit")}</button>
                </div>
                {errs.map((e: any, k: number) => <p key={k} className="kit-field-error">{text(e.message)}</p>)}
                {expanded && (
                  <fieldset disabled={!edit} className="kit-form-grid">
                    <I18nInput className="span-2" label={t("adm.wf.stageName")} value={s.nameI18n} onChange={(v) => update(i, { nameI18n: v })} />
                    <I18nInput className="span-2" label={t("adm.wf.customerName")} value={s.customerNameI18n} onChange={(v) => update(i, { customerNameI18n: v })} />
                    <SelectField label={t("adm.f.type")} value={s.type} onValue={(v) => update(i, { type: v })} options={STAGE_TYPES().map((x) => ({ value: x, label: enumLabel("StageType", x) }))} />
                    <SelectField label={t("adm.wf.executor")} value={s.executor} onValue={(v) => update(i, { executor: v })} options={enumKeys("Executor").map((x) => ({ value: x, label: enumLabel("Executor", x) }))} />
                    <SelectField label={t("adm.f.specialization")} value={s.executorSpecializationId ?? ""} onValue={(v) => update(i, { executorSpecializationId: v || null })} placeholder="—" options={tpl.specializations.map((x: any) => ({ value: x.id, label: text(x.name) }))} />
                    <TextField label={t("adm.wf.sla")} type="number" value={String(s.slaMinutes ?? "")} onValue={(v) => update(i, { slaMinutes: v ? Number(v) : null })} />
                    <div className="span-2 flex gap-4 flex-wrap">
                      <Toggle label={t("adm.wf.mandatory")} checked={s.mandatory} onValue={(v) => update(i, { mandatory: v })} />
                      <Toggle label={t("adm.wf.parallel")} checked={s.parallelWithPrevious} onValue={(v) => update(i, { parallelWithPrevious: v })} />
                    </div>
                    <fieldset className="kit-field span-2">
                      <legend className="form-label mb-2">{t("adm.wf.startConditions")}</legend>
                      <div className="flex gap-3 flex-wrap">{enumKeys("StartCondition").map((c) => <Check key={c} label={enumLabel("StartCondition", c)} checked={s.startConditions.includes(c)} onValue={(v) => update(i, { startConditions: v ? [...s.startConditions, c] : s.startConditions.filter((x: string) => x !== c) })} />)}</div>
                    </fieldset>
                    <fieldset className="kit-field span-2">
                      <legend className="form-label mb-2">{t("adm.wf.requirements")}</legend>
                      <div className="flex gap-3 flex-wrap">{enumKeys("Requirement").map((c) => <Check key={c} label={enumLabel("Requirement", c)} checked={s.completionRequirements.includes(c)} onValue={(v) => update(i, { completionRequirements: v ? [...s.completionRequirements, c] : s.completionRequirements.filter((x: string) => x !== c) })} />)}</div>
                    </fieldset>
                    <TextArea className="span-2" label={t("adm.wf.checklist")} rows={3} hint={t("adm.wf.checklistHint")} value={(s.checklist ?? []).join("\n")} onValue={(v) => update(i, { checklist: v.split("\n").filter((x) => x.trim()) })} />
                    <fieldset className="kit-field span-2">
                      <legend className="form-label mb-2">{t("adm.wf.notify")}</legend>
                      <div className="flex gap-3 flex-wrap">{["CUSTOMER", "TECHNICIAN", "OPERATOR", "MANAGER"].map((c) => <Check key={c} label={enumLabel("Recipient", c)} checked={(s.notifyOnComplete ?? []).includes(c)} onValue={(v) => update(i, { notifyOnComplete: v ? [...(s.notifyOnComplete ?? []), c] : s.notifyOnComplete.filter((x: string) => x !== c) })} />)}</div>
                    </fieldset>
                  </fieldset>
                )}
              </div>
            );
          })}
          {edit && <button type="button" className="btn outline" onClick={() => { const nid = `new-${Date.now()}`; setStages((x) => [...x!, { id: "", _key: nid, order: x!.length + 1, nameI18n: { az: "", ru: "", en: "" }, customerNameI18n: { az: "", ru: "", en: "" }, type: "EXECUTION", executor: "TECHNICIAN", executorSpecializationId: null, mandatory: true, startConditions: ["PREVIOUS_COMPLETED"], completionRequirements: [], checklist: [], slaMinutes: null, parallelWithPrevious: false, notifyOnStart: [], notifyOnComplete: [] }]); }}><Plus size={15} /> {t("adm.wf.addStage")}</button>}
        </div>
        <div className="kit-stack">
          <Card title={t("adm.wf.preview")}>
            <ol className="kit-timeline">
              {stages.map((s, i) => (
                <li key={i} className="kit-tl-item">
                  <span className="kit-tl-dot" aria-hidden>{s.type === "EXECUTION" ? <Wrench size={12} /> : s.type === "LOGISTICS" ? <Truck size={12} /> : s.type === "ARRIVAL" ? <MapPin size={12} /> : i + 1}</span>
                  <div className="kit-tl-body"><strong>{text(s.customerNameI18n) || text(s.nameI18n)}</strong><small className="text-muted">{t("adm.wf.customerView")}</small></div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title={t("adm.wf.services")}>{tpl.serviceNames.length ? tpl.serviceNames.map((s: any, i: number) => <span key={i} className="chip mr-1 mb-1">{text(s)}</span>) : <EmptyState />}</Card>
          <Card title={t("adm.wf.versions")}>
            <ul className="kit-list">{[...tpl.versions].reverse().map((v: any) => <li key={v.version}><span className="grow">v{v.version}<small className="block text-muted">{v.createdBy} · {dateTime(v.createdAt)}</small></span><EnumBadge group="TemplateStatus" code={v.status} /></li>)}</ul>
            {edit && tpl.status !== "ARCHIVED" && <button type="button" className="btn ghost btn-sm text-danger mt-2" onClick={async () => { try { await post(`/admin/workflow-templates/${id}/archive`); await refresh(); } catch (e) { toast.error(errorText(e, t("adm.wf.inUse"))); } }}>{t("adm.wf.archive")}</button>}
          </Card>
        </div>
      </div>
    </>
  );
}
