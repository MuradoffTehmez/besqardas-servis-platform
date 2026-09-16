"use client";
import React, { useState } from "react";
import { Building2, CalendarClock, CircleDollarSign, ClipboardPlus, Mail, Phone, Plus, Target, TrendingUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { patch, post, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link } from "../core/router";
import { useSession } from "../core/session";
import { Card, EmptyState, EnumBadge, FormError, Grid, KeyValue, PageHeader, QueryView, SelectField, Stat, TextArea, TextField, errorText, useFormState } from "../kit/base";
import { Dialog } from "../kit/actions";
import { useRefresh } from "../pages/common";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const SOURCES = ["WEBSITE", "PHONE", "REFERRAL", "SOCIAL", "PARTNER", "WALK_IN", "OTHER"];
const ACTIVITY_TYPES = ["NOTE", "EMAIL", "MEETING", "TASK"];
const OUTCOMES = ["ANSWERED", "NO_ANSWER", "BUSY", "CALLBACK", "INTERESTED", "NOT_INTERESTED"];
const STAGE_TONE: Record<string, string> = { NEW: "info", CONTACTED: "default", QUALIFIED: "warning", PROPOSAL: "violet", NEGOTIATION: "orange", WON: "success", LOST: "danger" };

/** Satış qıfı — lead kartları mərhələlər üzrə kanban görünüşündə. */
export function CrmPipelinePage() {
  const { t, money, num, date } = useI18n();
  const { can } = useSession();
  const q = useApi<any>("/admin/crm");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.crmPipeline")} subtitle={t("adm.crm.subtitle")} actions={can("crm:create") ? <button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("adm.crm.newLead")}</button> : undefined} />
      <QueryView query={q} rows={8}>
        {(d) => (
          <>
            <Grid cols={4} className="mb-4">
              <Stat label={t("adm.crm.stats.open")} value={num(d.stats.open)} hint={d.stats.overdue ? `${num(d.stats.overdue)} ${t("adm.crm.overdue").toLowerCase()}` : undefined} icon={Target} />
              <Stat label={t("adm.crm.stats.pipeline")} value={money(d.stats.pipelineValue)} icon={CircleDollarSign} />
              <Stat label={t("adm.crm.stats.weighted")} value={money(d.stats.weightedValue)} icon={TrendingUp} />
              <Stat label={t("adm.crm.stats.conversion")} value={`${d.stats.conversionRate}%`} hint={money(d.stats.wonValue)} icon={UserPlus} />
            </Grid>
            <div className="crm-toolbar"><TextField aria-label={t("adm.crm.search")} placeholder={t("adm.crm.search")} value={search} onValue={setSearch} /></div>
            <div className="crm-board" aria-label={t("adm.nav.crmPipeline")}>
              {d.stages.map((stage: any) => {
                const leads = stage.leads.filter((lead: any) => `${lead.number} ${lead.name} ${lead.companyName ?? ""} ${lead.phone}`.toLowerCase().includes(search.toLowerCase()));
                const total = leads.reduce((sum: number, lead: any) => sum + Number(lead.estimatedValue.amount), 0);
                return (
                  <section className="crm-column" key={stage.code} aria-labelledby={`crm-${stage.code}`}>
                    <header><span><EnumBadge group="CrmLeadStage" code={stage.code} tone={STAGE_TONE[stage.code]} /></span><strong>{num(leads.length)}</strong><small>{money({ amount: total.toFixed(2), currency: "AZN" })}</small></header>
                    <div className="crm-column-body">
                      {leads.length ? leads.map((lead: any) => (
                        <Link key={lead.id} to={`/crm/leads/${lead.id}`} className="crm-lead-card">
                          <span className="crm-lead-no">{lead.number}</span>
                          <strong>{lead.name}</strong>
                          {lead.companyName && <small><Building2 size={12} /> {lead.companyName}</small>}
                          <span className="crm-lead-value">{money(lead.estimatedValue)} <small>{lead.probability}%</small></span>
                          <span className="crm-lead-meta"><span>{lead.ownerName}</span>{lead.nextActionAt && <span className={lead.nextActionAt < new Date().toISOString() && !["WON", "LOST"].includes(lead.stage) ? "text-danger" : ""}><CalendarClock size={12} /> {date(lead.nextActionAt)}</span>}</span>
                        </Link>
                      )) : <EmptyState title={t("adm.crm.emptyStage")} />}
                    </div>
                  </section>
                );
              })}
            </div>
            {creating && <LeadDialog owners={d.owners} onClose={() => setCreating(false)} />}
          </>
        )}
      </QueryView>
    </>
  );
}

function LeadDialog({ owners, onClose }: { owners: any[]; onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const form = useFormState({ name: "", companyName: "", phone: "", email: "", source: "WEBSITE", estimatedValue: "", ownerId: owners[0]?.id ?? "", note: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await post("/admin/crm/leads", { ...form.values, companyName: form.values.companyName || null, email: form.values.email || null, estimatedValue: Number(form.values.estimatedValue || 0), note: form.values.note || null });
      await refresh(); toast.success(t("adm.crm.created")); onClose();
    } catch (e) { setError(e); form.fromError(e); } finally { setBusy(false); }
  };
  const v = form.values;
  return <Dialog open onClose={onClose} title={t("adm.crm.newLead")} subtitle={t("adm.crm.leadHint")} footer={<><button className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button className="btn primary" disabled={busy} onClick={submit}>{t("common.create")}</button></>}>
    <FormError error={error} />
    <div className="kit-form-grid">
      <TextField label={t("adm.f.fullName")} required value={v.name} onValue={(x) => form.set("name", x)} error={form.errors.name} />
      <TextField label={t("adm.crm.company")} value={v.companyName} onValue={(x) => form.set("companyName", x)} />
      <TextField label={t("adm.f.phone")} required value={v.phone} onValue={(x) => form.set("phone", x)} error={form.errors.phone} />
      <TextField label={t("adm.f.email")} type="email" value={v.email} onValue={(x) => form.set("email", x)} error={form.errors.email} />
      <SelectField label={t("adm.crm.source")} value={v.source} onValue={(x) => form.set("source", x)} options={SOURCES.map((x) => ({ value: x, label: enumLabel("CrmLeadSource", x) }))} />
      <TextField label={t("adm.crm.value")} type="number" value={v.estimatedValue} onValue={(x) => form.set("estimatedValue", x)} />
      <SelectField className="span-2" label={t("adm.crm.owner")} value={v.ownerId} onValue={(x) => form.set("ownerId", x)} options={owners.map((x) => ({ value: x.id, label: x.name }))} />
      <TextArea className="span-2" label={t("adm.crm.note")} rows={3} value={v.note} onValue={(x) => form.set("note", x)} />
    </div>
  </Dialog>;
}

/** Lead 360° görünüşü: məlumatlar, mərhələ idarəsi, zəng və fəaliyyət tarixçəsi. */
export function CrmLeadDetailPage({ id }: { id: string }) {
  const { t, money, dateTime, enumLabel } = useI18n();
  const { can } = useSession();
  const q = useApi<any>(`/admin/crm/leads/${id}`);
  const refresh = useRefresh();
  const [dialog, setDialog] = useState<"activity" | "call" | "lost" | null>(null);
  const move = async (stage: string, lostReason?: string) => {
    if (stage === "LOST" && !lostReason) { setDialog("lost"); return; }
    try { await patch(`/admin/crm/leads/${id}`, { stage, lostReason }); await refresh(); toast.success(t("adm.crm.stageChanged")); setDialog(null); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  const convert = async (target: "CUSTOMER" | "QUOTE") => {
    try { const lead = await post(`/admin/crm/leads/${id}/convert`, { target }); await refresh(); toast.success(target === "CUSTOMER" ? t("adm.crm.convertedCustomer") : t("adm.crm.convertedQuote", { number: lead.quoteNumber })); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  return <QueryView query={q} rows={8}>{(lead) => <>
    <PageHeader back="/crm" title={`${lead.number} · ${lead.name}`} subtitle={lead.companyName ?? lead.phone} badge={<EnumBadge group="CrmLeadStage" code={lead.stage} tone={STAGE_TONE[lead.stage]} />} actions={can("crm:edit") ? <><button className="btn outline" onClick={() => setDialog("call")}><Phone size={16} /> {t("adm.crm.call")}</button><button className="btn outline" onClick={() => setDialog("activity")}><ClipboardPlus size={16} /> {t("adm.crm.addActivity")}</button></> : undefined} />
    <Grid cols={3} className="mb-4"><Stat label={t("adm.crm.value")} value={money(lead.estimatedValue)} icon={CircleDollarSign} /><Stat label={t("adm.crm.probability")} value={`${lead.probability}%`} icon={Target} /><Stat label={t("adm.crm.nextAction")} value={lead.nextActionAt ? dateTime(lead.nextActionAt) : "—"} icon={CalendarClock} /></Grid>
    <div className="kit-split">
      <div className="kit-stack">
        <Card title={t("adm.crm.activities")}>
          {lead.activities.length ? <ul className="crm-timeline">{lead.activities.map((a: any) => <li key={a.id}><span className="crm-activity-icon">{a.type === "CALL" ? <Phone size={14} /> : a.type === "EMAIL" ? <Mail size={14} /> : <ClipboardPlus size={14} />}</span><div><strong>{a.subject}</strong><small>{enumLabel("CrmActivityType", a.type)} · {a.actorName} · {dateTime(a.createdAt)}</small>{a.note && <p>{a.note}</p>}{a.outcome && <EnumBadge group="CrmCallOutcome" code={a.outcome} />}</div></li>)}</ul> : <EmptyState />}
        </Card>
      </div>
      <div className="kit-stack">
        <Card title={t("adm.crm.details")}>
          <KeyValue cols={1} items={[[t("adm.f.phone"), lead.phone], [t("adm.f.email"), lead.email], [t("adm.crm.company"), lead.companyName], [t("adm.crm.source"), enumLabel("CrmLeadSource", lead.source)], [t("adm.crm.owner"), lead.ownerName], [t("adm.crm.note"), lead.note], [t("adm.crm.lostReason"), lead.lostReason], [t("adm.nav.customers"), lead.customerId ? <Link key="c" to={`/customers/${lead.customerId}`}>{lead.customerId}</Link> : null], [t("adm.nav.quotes"), lead.quoteNumber]]} />
        </Card>
        {can("crm:edit") && <Card title={t("common.actions")}>
          <SelectField label={t("common.status")} value={lead.stage} onValue={move} options={STAGES.map((x) => ({ value: x, label: enumLabel("CrmLeadStage", x) }))} />
          <div className="grid gap-2 mt-3"><button className="btn primary" disabled={!!lead.customerId} onClick={() => convert("CUSTOMER")}><UserPlus size={16} /> {t("adm.crm.convertCustomer")}</button><button className="btn outline" disabled={!!lead.quoteNumber} onClick={() => convert("QUOTE")}><ClipboardPlus size={16} /> {t("adm.crm.createQuote")}</button></div>
        </Card>}
      </div>
    </div>
    {dialog === "activity" && <ActivityDialog leadId={id} onClose={() => setDialog(null)} />}
    {dialog === "call" && <CallDialog leadId={id} phone={lead.phone} onClose={() => setDialog(null)} />}
    {dialog === "lost" && <ReasonDialog onClose={() => setDialog(null)} onSubmit={(reason) => move("LOST", reason)} />}
  </>}</QueryView>;
}

function ActivityDialog({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { t, enumLabel } = useI18n(); const refresh = useRefresh();
  const form = useFormState({ type: "NOTE", subject: "", note: "" }); const [error, setError] = useState<unknown>(null);
  return <Dialog open onClose={onClose} title={t("adm.crm.addActivity")} footer={<><button className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button className="btn primary" onClick={async () => { try { await post(`/admin/crm/leads/${leadId}/activities`, { ...form.values, completed: true }); await refresh(); onClose(); } catch (e) { setError(e); form.fromError(e); } }}>{t("common.save")}</button></>}><FormError error={error} /><SelectField label={t("adm.crm.activityType")} value={form.values.type} onValue={(x) => form.set("type", x)} options={ACTIVITY_TYPES.map((x) => ({ value: x, label: enumLabel("CrmActivityType", x) }))} /><TextField label={t("adm.crm.activitySubject")} required value={form.values.subject} onValue={(x) => form.set("subject", x)} error={form.errors.subject} /><TextArea label={t("common.note")} value={form.values.note} onValue={(x) => form.set("note", x)} /></Dialog>;
}

function CallDialog({ leadId, phone, onClose }: { leadId: string; phone: string; onClose: () => void }) {
  const { t, enumLabel } = useI18n(); const refresh = useRefresh();
  const form = useFormState({ outcome: "ANSWERED", durationSeconds: "120", note: "" }); const [error, setError] = useState<unknown>(null);
  return <Dialog open onClose={onClose} title={`${t("adm.crm.call")} · ${phone}`} subtitle={t("adm.crm.callHint")} footer={<><button className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button className="btn primary" onClick={async () => { try { await post(`/admin/crm/leads/${leadId}/calls`, { ...form.values, durationSeconds: Number(form.values.durationSeconds) }); await refresh(); onClose(); } catch (e) { setError(e); form.fromError(e); } }}>{t("common.save")}</button></>}><FormError error={error} /><SelectField label={t("adm.crm.outcome")} value={form.values.outcome} onValue={(x) => form.set("outcome", x)} options={OUTCOMES.map((x) => ({ value: x, label: enumLabel("CrmCallOutcome", x) }))} /><TextField label={t("adm.crm.duration")} type="number" value={form.values.durationSeconds} onValue={(x) => form.set("durationSeconds", x)} /><TextArea label={t("common.note")} value={form.values.note} onValue={(x) => form.set("note", x)} /></Dialog>;
}

function ReasonDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const { t } = useI18n(); const [reason, setReason] = useState("");
  return <Dialog open onClose={onClose} title={t("adm.crm.lostReason")} footer={<><button className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button className="btn danger" disabled={!reason.trim()} onClick={() => onSubmit(reason)}>{t("common.save")}</button></>}><TextArea label={t("adm.crm.lostReason")} required value={reason} onValue={setReason} /></Dialog>;
}
