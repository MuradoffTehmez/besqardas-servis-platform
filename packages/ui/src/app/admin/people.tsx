"use client";
import React, { useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { patch, post, put, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Avatar, Card, Check, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stars, Stat, Tabs, TextArea, TextField, errorText } from "../kit/base";
import { ConfirmDialog, Dialog, ResourceTable } from "../kit/actions";
import { MapView, PhoneField } from "../kit/media";
import { useRefresh } from "../pages/common";
import { enumKeys, useLookups } from "./crud";

/** İstifadəçilər, ustalar, yoxlama, lisenziyalar, əməkdaşlıqlar, rollar (PRD §8, §14, §61). */

/* ------------------------------------------------------------------ */
/* Müştəri kartı (360°)                                                  */
/* ------------------------------------------------------------------ */

export function CustomerDetailPage({ id }: { id: string }) {
  const { t, text, date, money, enumLabel, dateTime } = useI18n();
  const q = useApi<any>(`/admin/customers/${id}`);
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "services";
  return (
    <QueryView query={q} rows={8}>
      {(c) => (
        <>
          <PageHeader back="/customers" title={<span className="flex items-center gap-3"><Avatar name={c.fullName} tone={c.avatarTone} size={44} />{c.fullName}</span>} badge={<EnumBadge group="UserStatus" code={c.status} />} subtitle={`${c.phone ?? ""} · ${c.email ?? ""}`} actions={<Link to="/service-orders/new" className="btn primary"><Plus size={16} /> {t("adm.orders.create")}</Link>} />
          <Grid cols={4}>
            <Stat label={t("adm.f.plan")} value={c.plan ? text(c.plan.name) : "Basic"} />
            <Stat label={t("adm.nav.serviceOrders")} value={c.serviceOrders.length} tone="info" />
            <Stat label={t("adm.nav.salesOrders")} value={c.salesOrders.length} />
            <Stat label={t("acc.dash.devices")} value={c.devices.length} tone="success" />
          </Grid>
          <div className="kit-split">
            <div>
              <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "services", label: t("adm.nav.serviceOrders") }, { id: "sales", label: t("adm.nav.salesOrders") }, { id: "devices", label: t("acc.nav.devices") }, { id: "payments", label: t("adm.nav.payments") }, { id: "warranties", label: t("acc.nav.warranties") }]} />
              <Card flush>
                {tab === "services" && (c.serviceOrders.length ? <ul className="kit-list px-4">{c.serviceOrders.map((o: any) => <li key={o.id}><Link to={`/service-orders/${o.id}`} className="grow"><strong>{o.number} · {text(o.serviceName)}</strong><small className="block text-muted">{dateTime(o.createdAt)} · {o.technicianName ?? "—"}</small></Link><EnumBadge group="OrderStatus" code={o.status} /></li>)}</ul> : <EmptyState />)}
                {tab === "sales" && (c.salesOrders.length ? <ul className="kit-list px-4">{c.salesOrders.map((o: any) => <li key={o.id}><Link to={`/sales-orders/${o.id}`} className="grow"><strong>{o.number}</strong><small className="block text-muted">{date(o.createdAt)}</small></Link><strong>{money(o.total)}</strong><EnumBadge group="SalesOrderStatus" code={o.status} /></li>)}</ul> : <EmptyState />)}
                {tab === "devices" && (c.devices.length ? <ul className="kit-list px-4">{c.devices.map((d: any) => <li key={d.id}><span className="grow"><strong>{d.modelName}</strong><small className="block text-muted">{d.serialNumber ?? "—"}</small></span><small>{t("acc.devices.nextService")}: {date(d.nextServiceAt)}</small></li>)}</ul> : <EmptyState />)}
                {tab === "payments" && (c.payments.length ? <ul className="kit-list px-4">{c.payments.map((p: any) => <li key={p.id}><span className="grow">{p.number}<small className="block text-muted">{enumLabel("PaymentMethod", p.method)} · {date(p.createdAt)}</small></span><strong>{money(p.amount)}</strong><EnumBadge group="PaymentStatus" code={p.status} /></li>)}</ul> : <EmptyState />)}
                {tab === "warranties" && (c.warranties.length ? <ul className="kit-list px-4">{c.warranties.map((w: any) => <li key={w.id}><span className="grow">{w.number} · {w.deviceName}<small className="block text-muted">{date(w.startsAt)} — {date(w.endsAt)}</small></span><EnumBadge group="WarrantyStatus" code={w.status} /></li>)}</ul> : <EmptyState />)}
              </Card>
            </div>
            <div className="kit-stack">
              <Card title={t("adm.people.profile")}>
                <KeyValue cols={1} items={[[t("adm.f.roles"), c.roleLabels?.join(", ")], [t("adm.f.createdAt"), date(c.createdAt)], [t("adm.f.lastLogin"), c.lastLoginAt ? dateTime(c.lastLoginAt) : null], ["2FA", c.twoFactorEnabled ? t("common.yes") : t("common.no")], [t("adm.people.consent"), `${t("acc.security.personalData").split("(")[0]} ✓ · ${t("adm.people.marketing")}: ${c.consent.marketing ? t("common.yes") : t("common.no")}`]]} />
              </Card>
              <Card title={t("acc.nav.addresses")}>
                {c.addresses.length ? <ul className="kit-list">{c.addresses.map((a: any) => <li key={a.id}><span className="grow"><strong>{a.label}</strong><small className="block text-muted">{a.city}, {a.street}</small></span>{a.isDefault && <span className="badge badge-success">{t("acc.addresses.default")}</span>}</li>)}</ul> : <EmptyState />}
                {c.addresses.some((a: any) => a.location) && <MapView height={180} points={c.addresses.filter((a: any) => a.location).map((a: any) => ({ id: a.id, lat: a.location.lat, lng: a.location.lng, label: a.label }))} className="mt-3" />}
              </Card>
            </div>
          </div>
        </>
      )}
    </QueryView>
  );
}

/* ------------------------------------------------------------------ */
/* Ustalar                                                              */
/* ------------------------------------------------------------------ */

export function TechniciansAdminPage() {
  const { t, enumLabel } = useI18n();
  return (
    <>
      <PageHeader title={t("adm.nav.technicians")} actions={<><Link to="/technicians/verification" className="btn outline">{t("adm.nav.verification")}</Link><Link to="/technicians/licenses" className="btn outline">{t("adm.nav.licenses")}</Link><Link to="/technicians/partnerships" className="btn outline">{t("adm.nav.partnerships")}</Link></>} />
      <ResourceTable
        path="/admin/technicians"
        rowTo={(r: any) => `/technicians/${r.id}`}
        defaultSort="-rating"
        filters={[{ key: "employmentType", label: t("adm.f.employmentType"), options: enumKeys("EmploymentType").map((s) => ({ value: s, label: enumLabel("EmploymentType", s) })) }, { key: "status", label: t("common.status"), options: enumKeys("TechnicianStatus").map((s) => ({ value: s, label: enumLabel("TechnicianStatus", s) })) }]}
        columns={[
          { key: "fullName", header: t("adm.f.fullName"), render: (r: any) => <span className="entity-row"><Avatar name={r.fullName} tone={r.avatarTone} size={32} /><span><strong>{r.fullName}</strong><small>{r.phone}</small></span></span> },
          { key: "employmentType", header: t("adm.f.employmentType"), render: (r: any) => <span>{enumLabel("EmploymentType", r.employmentType)}<small className="block">{r.branchName ?? r.planCode ?? ""}</small></span> },
          { key: "specializations", header: t("adm.f.specializations"), hideOnMobile: true, render: (r: any) => <small>{r.specializations.join(", ")}</small> },
          { key: "rating", header: t("adm.f.rating"), sortKey: "rating", render: (r: any) => <Stars value={r.rating} count={r.reviewCount} /> },
          { key: "completedJobs", header: t("adm.f.completed"), sortKey: "completedJobs", className: "num" },
          { key: "workload", header: t("adm.f.workload"), className: "num", hideOnMobile: true },
          { key: "pending", header: t("adm.people.pending"), hideOnMobile: true, render: (r: any) => (r.pendingDocuments || r.pendingSpecializations ? <span className="badge badge-warning">{r.pendingDocuments + r.pendingSpecializations}</span> : "—") },
          { key: "status", header: t("common.status"), render: (r: any) => <span><EnumBadge group="TechnicianStatus" code={r.status} />{r.subscriptionStatus && r.employmentType === "INDEPENDENT" && <small className="block"><EnumBadge group="SubscriptionStatus" code={r.subscriptionStatus} /></small>}</span> },
        ]}
      />
    </>
  );
}

export function TechnicianAdminDetailPage({ id }: { id: string }) {
  const { t, text, date, dateTime, enumLabel } = useI18n();
  const q = useApi<any>(`/admin/technicians/${id}`);
  const refresh = useRefresh();
  const [reject, setReject] = useState<{ target: string; targetId?: string } | null>(null);
  const verify = async (target: string, targetId: string | undefined, approve: boolean, note?: string) => {
    try { await post(`/admin/technicians/${id}/verify`, { target, targetId, approve, note }); await refresh(); toast.success(t("common.saved")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  return (
    <QueryView query={q} rows={10}>
      {(x) => (
        <>
          <PageHeader back="/technicians" title={<span className="flex items-center gap-3"><Avatar name={x.fullName} tone={x.avatarTone} size={44} />{x.fullName}</span>} badge={<EnumBadge group="TechnicianStatus" code={x.status} />} subtitle={`${enumLabel("EmploymentType", x.employmentType)} · ${x.city} · ${t("adm.people.experience", { years: x.experienceYears })}`} actions={<>{x.status === "PENDING_VERIFICATION" && <><button type="button" className="btn primary" onClick={() => verify("ACCOUNT", undefined, true)}>{t("adm.people.activate")}</button><button type="button" className="btn outline danger-outline" onClick={() => setReject({ target: "ACCOUNT" })}>{t("adm.claims.reject")}</button></>}</>} />
          <Grid cols={4}>
            <Stat label={t("adm.f.rating")} value={<Stars value={x.rating} count={x.reviewCount} />} />
            <Stat label={t("adm.f.completed")} value={x.completedJobs} tone="success" />
            <Stat label={t("tech.stats.onTime")} value={`${x.onTimeRate}%`} tone="info" />
            <Stat label={t("tech.stats.warrantyRate")} value={`${x.warrantyClaimRate}%`} tone="warning" />
          </Grid>
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("tech.nav.specializations")} flush>
                <div className="table-wrap"><table><thead><tr><th>{t("tech.spec.name")}</th><th>{t("tech.spec.level")}</th><th>{t("common.status")}</th><th /></tr></thead><tbody>
                  {x.specializationDetails.map((s: any) => <tr key={s.id}><td><strong>{s.name}</strong><small className="block">{s.categoryName}</small></td><td>{enumLabel("ExperienceLevel", s.level)}</td><td><EnumBadge group="SpecStatus" code={s.status} /></td><td>{s.status === "PENDING_APPROVAL" && <span className="flex gap-1"><button type="button" className="btn primary btn-sm" onClick={() => verify("SPECIALIZATION", s.id, true)}>{t("actions.approve")}</button><button type="button" className="btn outline btn-sm" onClick={() => setReject({ target: "SPECIALIZATION", targetId: s.id })}>{t("adm.claims.reject")}</button></span>}</td></tr>)}
                </tbody></table></div>
              </Card>
              <Card title={t("tech.nav.documents")} flush>
                <div className="table-wrap"><table><thead><tr><th>{t("tech.docs.kind")}</th><th>{t("tech.docs.file")}</th><th>{t("tech.docs.expires")}</th><th>{t("common.status")}</th><th /></tr></thead><tbody>
                  {x.documents.map((d: any) => <tr key={d.id}><td>{enumLabel("DocKind", d.kind)}</td><td>{d.name}<small className="block">{date(d.uploadedAt)}</small></td><td>{d.expiresAt ? date(d.expiresAt) : "—"}</td><td><EnumBadge group="VerificationStatus" code={d.status} />{d.note && <small className="block text-danger">{d.note}</small>}</td><td>{d.status === "PENDING" && <span className="flex gap-1"><button type="button" className="btn primary btn-sm" onClick={() => verify("DOCUMENT", d.id, true)}>{t("actions.approve")}</button><button type="button" className="btn outline btn-sm" onClick={() => setReject({ target: "DOCUMENT", targetId: d.id })}>{t("adm.claims.reject")}</button></span>}</td></tr>)}
                </tbody></table></div>
              </Card>
              <Card title={t("tech.nav.jobs")}>
                {x.jobs?.length ? <ul className="kit-list">{x.jobs.map((o: any) => <li key={o.id}><Link to={`/service-orders/${o.id}`} className="grow"><strong>{o.number} · {text(o.serviceName)}</strong><small className="block text-muted">{o.customerName} · {o.scheduledAt ? dateTime(o.scheduledAt) : "—"}</small></Link><EnumBadge group="OrderStatus" code={o.status} /></li>)}</ul> : <EmptyState />}
              </Card>
              <Card title={t("tech.nav.reviews")}>
                <div className="kit-reviews">{x.reviews.map((r: any) => <article key={r.id}><div className="flex justify-between"><strong>{r.authorName}</strong><Stars value={r.rating} /></div><p>{r.comment}</p><small className="text-muted">{date(r.createdAt)}</small></article>)}</div>
              </Card>
            </div>
            <div className="kit-stack">
              <Card title={t("adm.people.profile")}>
                <KeyValue cols={1} items={[[t("adm.f.phone"), x.phone], [t("adm.f.email"), x.email], [t("adm.f.branch"), x.branchName], [t("tech.settings.zones"), x.zoneNames.join(", ")], [t("tech.settings.languages"), x.languages.join(", ").toUpperCase()], [t("tech.spec.skills"), x.skills.join(", ")], [t("adm.f.workload"), x.workload], [t("adm.people.joined"), date(x.joinedAt)], [t("adm.f.lastLogin"), x.user?.lastLoginAt ? dateTime(x.user.lastLoginAt) : null]]} />
                <p className="text-sm mt-3">{text(x.bio)}</p>
              </Card>
              {x.employmentType === "INDEPENDENT" ? (
                <Card title={t("tech.nav.subscription")}>
                  {x.subscription ? <KeyValue cols={1} items={[[t("adm.f.plan"), x.planCode], [t("common.status"), <EnumBadge key="s" group="SubscriptionStatus" code={x.subscription.status} />], [t("acc.sub.periodEnd"), date(x.subscription.currentPeriodEnd)]]} /> : <EmptyState />}
                </Card>
              ) : (
                <Card title={t("tech.nav.license")} actions={<Link to="/technicians/licenses" className="btn ghost btn-sm">{t("common.edit")}</Link>}>
                  {x.license ? <KeyValue cols={1} items={[[t("common.status"), <EnumBadge key="l" group="LicenseStatus" code={x.license.status} />], [t("tech.docs.issuedBy"), x.license.issuedBy], [t("tech.docs.issuedAt"), date(x.license.issuedAt)]]} /> : <EmptyState title={t("adm.people.noLicense")} />}
                </Card>
              )}
              <Card title={t("tech.docs.partnerships")}>
                {x.partnerships.length ? <ul className="kit-list">{x.partnerships.map((p: any) => <li key={p.id}><span className="grow">{p.companyName}<small className="block text-muted">{p.zones.join(", ")}</small></span><EnumBadge group="PartnershipStatus" code={p.status} /></li>)}</ul> : <EmptyState />}
              </Card>
              {x.location && <Card flush title={t("map.label")}><MapView height={200} zoom={12} points={[{ id: "t", lat: x.location.lat, lng: x.location.lng, label: x.fullName }]} /></Card>}
            </div>
          </div>
          {reject && <RejectDialog onClose={() => setReject(null)} onSubmit={(note) => verify(reject.target, reject.targetId, false, note)} />}
        </>
      )}
    </QueryView>
  );
}

function RejectDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (note: string) => Promise<unknown> }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  return (
    <Dialog open onClose={onClose} size="sm" title={t("adm.claims.reject")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn danger" disabled={!note.trim()} onClick={async () => { await onSubmit(note); onClose(); }}>{t("common.confirm")}</button></>}>
      <TextArea label={t("common.reason")} required value={note} onValue={setNote} rows={3} />
    </Dialog>
  );
}

export function VerificationPage() {
  const { t, date, enumLabel } = useI18n();
  const q = useApi<any[]>("/admin/technicians-verification");
  return (
    <>
      <PageHeader back="/technicians" title={t("adm.nav.verification")} subtitle={t("adm.people.verificationHint")} />
      <QueryView query={q} empty={<EmptyState icon={ShieldCheck} title={t("adm.people.nothingToVerify")} />}>
        {(list) => (
          <Grid cols={2}>
            {list.map((x) => {
              const docs = x.documents.filter((d: any) => ["PENDING", "EXPIRED"].includes(d.status));
              const specs = x.specializationDetails.filter((s: any) => ["PENDING_APPROVAL", "INACTIVE_CERT_EXPIRED"].includes(s.status));
              return (
                <Link key={x.id} to={`/technicians/${x.id}`} className="kit-card clickable">
                  <div className="kit-card-body">
                    <div className="flex justify-between gap-2"><span className="entity-row"><Avatar name={x.fullName} tone={x.avatarTone} /><span><strong>{x.fullName}</strong><small>{enumLabel("EmploymentType", x.employmentType)} · {date(x.appliedAt)}</small></span></span><EnumBadge group="TechnicianStatus" code={x.status} /></div>
                    {docs.length > 0 && <p className="text-sm mt-3">{t("tech.nav.documents")}: {docs.map((d: any) => `${enumLabel("DocKind", d.kind)} (${enumLabel("VerificationStatus", d.status)})`).join(", ")}</p>}
                    {specs.length > 0 && <p className="text-sm mt-1">{t("tech.nav.specializations")}: {specs.map((s: any) => s.name).join(", ")}</p>}
                  </div>
                </Link>
              );
            })}
          </Grid>
        )}
      </QueryView>
    </>
  );
}

export function LicensesPage() {
  const { t, date } = useI18n();
  const q = useApi<any>("/admin/licenses?pageSize=100");
  const refresh = useRefresh();
  const [confirm, setConfirm] = useState<any | null>(null);
  const act = async (techId: string, action: string, capabilities?: any) => {
    try { await post(`/admin/licenses/${techId}`, { action, capabilities }); await refresh(); toast.success(t("common.saved")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  return (
    <>
      <PageHeader back="/technicians" title={t("adm.nav.licenses")} subtitle={q.data ? t("adm.people.licenseSummary", { active: q.data.summary.active, contracted: q.data.summary.contracted }) : undefined} />
      <QueryView query={q}>
        {(d) => (
          <Card flush>
            <div className="table-wrap"><table><thead><tr><th>{t("adm.f.technician")}</th><th>{t("adm.f.branch")}</th><th>{t("common.status")}</th><th>{t("tech.docs.issuedAt")}</th><th>{t("tech.docs.capabilities")}</th><th /></tr></thead><tbody>
              {d.items.map((l: any) => (
                <tr key={l.technicianId}>
                  <td><Link to={`/technicians/${l.technicianId}`}><strong>{l.technicianName}</strong></Link></td>
                  <td>{l.branchName}</td>
                  <td>{l.status === "NONE" ? <span className="badge">—</span> : <EnumBadge group="LicenseStatus" code={l.status} />}</td>
                  <td>{l.issuedAt ? `${date(l.issuedAt)} · ${l.issuedBy}` : "—"}{l.revokedAt && <small className="block text-danger">{date(l.revokedAt)}</small>}</td>
                  <td>{l.capabilities ? Object.entries(l.capabilities).map(([k, v]) => <Check key={k} label={t(`tech.docs.cap.${k}`)} checked={!!v} disabled={l.status !== "ACTIVE"} onValue={(c) => act(l.technicianId, "update", { ...l.capabilities, [k]: c })} />) : "—"}</td>
                  <td>{l.status === "ACTIVE" ? <button type="button" className="btn outline danger-outline btn-sm" onClick={() => setConfirm(l)}>{t("adm.people.revoke")}</button> : <button type="button" className="btn primary btn-sm" onClick={() => act(l.technicianId, "issue")}>{t("adm.people.issue")}</button>}</td>
                </tr>
              ))}
            </tbody></table></div>
          </Card>
        )}
      </QueryView>
      <ConfirmDialog open={!!confirm} danger title={t("adm.people.revoke")} text={t("adm.people.revokeText", { name: confirm?.technicianName ?? "" })} onClose={() => setConfirm(null)} onConfirm={async () => { await act(confirm.technicianId, "revoke"); setConfirm(null); }} />
    </>
  );
}

export function PartnershipsPage() {
  const { t, date, enumLabel } = useI18n();
  const refresh = useRefresh();
  return (
    <>
      <PageHeader back="/technicians" title={t("adm.nav.partnerships")} subtitle={t("adm.people.partnershipHint")} />
      <ResourceTable
        path="/admin/partnerships"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("PartnershipStatus").map((s) => ({ value: s, label: enumLabel("PartnershipStatus", s) })) }]}
        columns={[
          { key: "technicianName", header: t("adm.f.technician"), render: (r: any) => <Link to={`/technicians/${r.technicianId}`}><strong>{r.technicianName}</strong></Link> },
          { key: "companyName", header: t("adm.f.company") },
          { key: "initiatedBy", header: t("adm.people.initiatedBy"), render: (r: any) => enumLabel("Role", r.initiatedBy) },
          { key: "zones", header: t("tech.settings.zones"), render: (r: any) => r.zones.join(", ") },
          { key: "priceListName", header: t("adm.f.priceList"), hideOnMobile: true },
          { key: "jobsCount", header: t("adm.f.orders"), className: "num" },
          { key: "createdAt", header: t("adm.f.createdAt"), render: (r: any) => date(r.createdAt), hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="PartnershipStatus" code={r.status} /> },
          { key: "_a", header: "", render: (r: any) => (
            <span className="flex gap-1">
              {r.status === "PENDING" && <><button type="button" className="btn primary btn-sm" onClick={async () => { await post(`/admin/partnerships/${r.id}`, { status: "APPROVED" }); await refresh(); }}>{t("actions.approve")}</button><button type="button" className="btn outline btn-sm" onClick={async () => { await post(`/admin/partnerships/${r.id}`, { status: "REJECTED" }); await refresh(); }}>{t("adm.claims.reject")}</button></>}
              {r.status === "APPROVED" && <button type="button" className="btn ghost btn-sm text-danger" onClick={async () => { await post(`/admin/partnerships/${r.id}`, { status: "ENDED" }); await refresh(); }}>{t("adm.people.end")}</button>}
            </span>
          ) },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* İstifadəçilər və rollar (§8)                                          */
/* ------------------------------------------------------------------ */

const ALL_ROLES = () => enumKeys("Role");

export function UsersPage() {
  const { t, dateTime, enumLabel, text } = useI18n();
  const { can, role } = useSession();
  const [editing, setEditing] = useState<any | null>(null);
  const [inviting, setInviting] = useState(false);
  const refresh = useRefresh();
  return (
    <>
      <PageHeader title={t("adm.nav.users")} actions={can("users:create") || can("users:edit") ? <button type="button" className="btn primary" onClick={() => setInviting(true)}><Plus size={16} /> {t("adm.people.invite")}</button> : null} />
      <ResourceTable
        path="/admin/users"
        filters={[{ key: "roles", label: t("adm.f.role"), options: ALL_ROLES().map((r) => ({ value: r, label: enumLabel("Role", r) })) }, { key: "status", label: t("common.status"), options: enumKeys("UserStatus").map((s) => ({ value: s, label: enumLabel("UserStatus", s) })) }]}
        columns={[
          { key: "fullName", header: t("adm.f.fullName"), sortKey: "fullName", render: (u: any) => <span className="entity-row"><Avatar name={u.fullName} tone={u.avatarTone} size={32} /><span><strong>{u.fullName}</strong><small>{u.email ?? u.phone}</small></span></span> },
          { key: "roles", header: t("adm.f.roles"), render: (u: any) => <span className="flex gap-1 flex-wrap">{u.roles.map((r: string) => <span key={r} className="badge">{enumLabel("Role", r)}</span>)}</span> },
          { key: "branchName", header: t("adm.f.branch"), hideOnMobile: true, render: (u: any) => text(u.branchName) || u.companyName || "—" },
          { key: "twoFactorEnabled", header: "2FA", hideOnMobile: true, render: (u: any) => (u.twoFactorEnabled ? <span className="badge badge-success">✓</span> : "—") },
          { key: "lastLoginAt", header: t("adm.f.lastLogin"), sortKey: "lastLoginAt", hideOnMobile: true, render: (u: any) => (u.lastLoginAt ? dateTime(u.lastLoginAt) : "—") },
          { key: "status", header: t("common.status"), render: (u: any) => <EnumBadge group="UserStatus" code={u.status} /> },
          { key: "_a", header: "", render: (u: any) => can("users:edit") && (role === "SUPER_ADMIN" || !u.roles.includes("SUPER_ADMIN")) ? (
            <span className="flex gap-1">
              <button type="button" className="btn ghost btn-sm" onClick={() => setEditing(u)}>{t("common.edit")}</button>
              <button type="button" className="btn ghost btn-sm" onClick={async () => { try { await patch(`/admin/users/${u.id}`, { status: u.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" }); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{u.status === "BLOCKED" ? t("actions.activate") : t("adm.people.block")}</button>
            </span>
          ) : null },
        ]}
      />
      {(editing || inviting) && <UserDialog user={editing} onClose={() => { setEditing(null); setInviting(false); }} />}
    </>
  );
}

function UserDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  const { t, enumLabel, text } = useI18n();
  const { role } = useSession();
  const lookups = useLookups();
  const refresh = useRefresh();
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", roles: user?.roles ?? ["OPERATOR"], branchId: user?.branchId ?? "" });
  const [error, setError] = useState<unknown>(null);
  const roles = ALL_ROLES().filter((r) => role === "SUPER_ADMIN" || r !== "SUPER_ADMIN");
  return (
    <Dialog open onClose={onClose} size="lg" title={user ? `${user.fullName} — ${t("common.edit")}` : t("adm.people.invite")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { if (user) await patch(`/admin/users/${user.id}`, { roles: v.roles, branchId: v.branchId || null }); else await post("/admin/users", { ...v, branchId: v.branchId || undefined }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      {!user && (
        <div className="kit-form-grid">
          <TextField label={t("fields.firstName")} value={v.firstName} onValue={(x) => setV({ ...v, firstName: x })} />
          <TextField label={t("fields.lastName")} value={v.lastName} onValue={(x) => setV({ ...v, lastName: x })} />
          <TextField label={t("fields.email")} type="email" value={v.email} onValue={(x) => setV({ ...v, email: x })} />
          <PhoneField label={t("fields.phone")} value={v.phone} onValue={(x) => setV({ ...v, phone: x })} />
        </div>
      )}
      <SelectField label={t("adm.f.branch")} value={v.branchId} onValue={(x) => setV({ ...v, branchId: x })} placeholder="—" options={(lookups.data?.branches ?? []).map((b: any) => ({ value: b.id, label: text(b.name) }))} />
      <fieldset className="kit-field">
        <legend className="form-label mb-2">{t("adm.f.roles")}</legend>
        <div className="kit-form-grid">{roles.map((r) => <Check key={r} label={enumLabel("Role", r)} checked={v.roles.includes(r)} onValue={(c) => setV({ ...v, roles: c ? [...v.roles, r] : v.roles.filter((x: string) => x !== r) })} />)}</div>
      </fieldset>
      <p className="text-sm text-muted">{t("adm.people.rolesHint")}</p>
    </Dialog>
  );
}

export function RolesPage() {
  const { t, text, enumLabel } = useI18n();
  const q = useApi<any>("/admin/roles");
  const refresh = useRefresh();
  const [selected, setSelected] = useState<string>("OPERATOR");
  const [perms, setPerms] = useState<Record<string, string> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const role = q.data?.roles.find((r: any) => r.code === selected);
  useEffect(() => { if (role) { setPerms(Object.fromEntries(role.permissions.map((p: any) => [p.code, p.scope]))); setDirty(false); } }, [role?.code, q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.isLoading || !perms) return <Loading rows={10} />;
  const d = q.data;
  const readOnly = !d.canEdit || selected === "SUPER_ADMIN";
  const toggle = (code: string, on: boolean) => { setPerms((p) => { const n = { ...p! }; if (on) n[code] = n[code] ?? "ORGANIZATION"; else delete n[code]; return n; }); setDirty(true); };
  return (
    <>
      <PageHeader title={t("adm.nav.roles")} subtitle={t("adm.roles.subtitle")} actions={!readOnly && <button type="button" className="btn primary" disabled={!dirty} onClick={async () => { setError(null); try { await put(`/admin/roles/${selected}`, { permissions: Object.entries(perms).map(([code, scope]) => ({ code, scope })) }); await refresh(); setDirty(false); toast.success(t("common.saved")); } catch (e) { setError(e); } }}>{t("common.save")}</button>} />
      <FormError error={error} />
      <div className="kit-chip-grid mb-4">{d.roles.map((r: any) => <button key={r.code} type="button" className={cn("chip", selected === r.code && "active")} onClick={() => setSelected(r.code)}>{text(r.name)} <small>({r.userCount})</small></button>)}</div>
      {role && <p className="text-sm text-muted mb-3">{text(role.description)}{role.system && ` · ${t("adm.roles.system")}`}{readOnly && ` · ${t("adm.roles.readOnly")}`}</p>}
      <Card flush>
        <div className="table-wrap">
          <table className="kit-matrix">
            <thead><tr><th>{t("adm.f.resource")}</th>{d.actions.map((a: string) => <th key={a}>{enumLabel("Action", a)}</th>)}<th>{t("adm.roles.scope")}</th></tr></thead>
            <tbody>
              {d.resources.map((res: string) => {
                const any = d.actions.some((a: string) => perms[`${res}:${a}`]);
                const scope = d.actions.map((a: string) => perms[`${res}:${a}`]).find(Boolean) ?? "";
                return (
                  <tr key={res}>
                    <td>{enumLabel("Resource", res)}</td>
                    {d.actions.map((a: string) => <td key={a}><input type="checkbox" aria-label={`${enumLabel("Resource", res)} — ${enumLabel("Action", a)}`} checked={!!perms[`${res}:${a}`] || !!perms["*"]} disabled={readOnly} onChange={(e) => toggle(`${res}:${a}`, e.target.checked)} /></td>)}
                    <td>
                      {any ? (
                        <select className="form-input" value={scope} disabled={readOnly} aria-label={t("adm.roles.scope")} onChange={(e) => { const s = e.target.value; setPerms((p) => Object.fromEntries(Object.entries(p!).map(([k, v]) => [k, k.startsWith(`${res}:`) ? s : v]))); setDirty(true); }}>
                          {d.scopes.map((s: string) => <option key={s} value={s}>{enumLabel("Scope", s)}</option>)}
                        </select>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-sm text-muted mt-3">{t("adm.roles.backendHint")}</p>
    </>
  );
}
