"use client";
import React, { useMemo, useState } from "react";
import { AlertTriangle, Clock, Gauge, Headset, Lock, MessageSquare, Paperclip, Phone, Plus, Send, SmilePlus, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { patch, post, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, EnumBadge, FormError, Grid, KeyValue, PageHeader, QueryView, SelectField, Stat, Tabs, TextArea, TextField, Toggle, errorText, useFormState } from "../kit/base";
import { ActionBar, Dialog, ResourceTable, type ApiAction } from "../kit/actions";
import { FileDrop, PhoneField, type PickedFile } from "../kit/media";
import { useRefresh } from "../pages/common";
import { PRIORITY_TONE, TicketThread } from "../pages/support";
import { enumKeys, useLookups } from "./crud";

/**
 * Help Desk — CRM növbəsi (PRD §61): görünüşlər, SLA nəzarəti, cavab redaktoru, daxili qeydlər,
 * hazır cavablar və müraciətdən servis sifarişi. Keçidlər və SLA hesabı backend-dədir.
 */

const VIEWS = ["mine", "unassigned", "open", "at_risk", "breached", "pending", "resolved", "all"] as const;

function useSupportLookups() {
  return useApi<any>("/admin/support-lookups", { staleTime: 60_000 });
}

/** SLA vəziyyəti + qalan / gecikən vaxt. */
export function SlaCell({ sla, compact }: { sla: any; compact?: boolean }) {
  const { t, minutes } = useI18n();
  const remaining = sla.remainingMinutes as number | null;
  return (
    <span className={cn("tk-sla", `is-${String(sla.state).toLowerCase()}`)}>
      <EnumBadge group="TicketSlaState" code={sla.state} />
      {remaining !== null && sla.state !== "PAUSED" && (
        <small className="block">
          {!compact && `${sla.target === "FIRST_RESPONSE" ? t("adm.tickets.firstResponse") : t("adm.tickets.resolution")} · `}
          {remaining >= 0 ? t("adm.tickets.left", { time: minutes(remaining) }) : t("adm.tickets.overdue", { time: minutes(-remaining) })}
        </small>
      )}
      {!compact && sla.escalationLevel > 0 && <small className="block text-danger">{t("adm.tickets.escalation", { level: sla.escalationLevel })}</small>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Növbə                                                                */
/* ------------------------------------------------------------------ */

export function TicketsPage() {
  const { t, text, enumLabel, relative, minutes, num } = useI18n();
  const { can } = useSession();
  const { query, setQuery } = useRouter();
  const stats = useApi<any>("/admin/tickets/stats", { refetchInterval: 60_000 });
  const [creating, setCreating] = useState(query.get("new") === "1");
  const view = (query.get("view") as (typeof VIEWS)[number]) || (can("tickets:assign") ? "unassigned" : "mine");
  const s = stats.data;
  const badge: Partial<Record<(typeof VIEWS)[number], number | undefined>> = { mine: s?.mine, unassigned: s?.unassigned, open: s?.open, at_risk: s?.atRisk, breached: s?.breached, pending: s?.pendingCustomer };
  const opts = (group: string) => enumKeys(group).map((c) => ({ value: c, label: enumLabel(group, c) }));
  return (
    <>
      <PageHeader title={t("adm.nav.tickets")} subtitle={t("adm.tickets.subtitle")} actions={can("tickets:create") ? <button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("adm.tickets.new")}</button> : undefined} />
      {s && (
        <Grid cols={4} className="mb-4">
          <Stat label={t("adm.tickets.stats.open")} value={num(s.open)} hint={t("adm.tickets.stats.awaiting", { count: s.awaitingAgent })} icon={Headset} to="/tickets?view=open" />
          <Stat label={t("adm.tickets.stats.breached")} value={num(s.breached)} hint={t("adm.tickets.stats.atRisk", { count: s.atRisk })} icon={AlertTriangle} tone={s.breached ? "danger" : "default"} to="/tickets?view=breached" />
          <Stat label={t("adm.tickets.stats.firstResponse")} value={s.avgFirstResponseMinutes !== null ? minutes(s.avgFirstResponseMinutes) : "—"} hint={s.slaCompliance !== null ? t("adm.tickets.stats.compliance", { value: s.slaCompliance }) : undefined} icon={Clock} />
          <Stat label={t("adm.tickets.stats.csat")} value={s.csatAverage !== null ? `${s.csatAverage} / 5` : "—"} hint={`${t("adm.tickets.stats.csatCount", { count: s.csatCount })} · ${t("adm.tickets.stats.resolvedToday")}: ${s.resolvedToday}`} icon={SmilePlus} />
        </Grid>
      )}
      <Tabs value={view} onChange={(v) => setQuery({ view: v, page: 1 })} tabs={VIEWS.map((v) => ({ id: v, label: t(`adm.tickets.views.${v}`), badge: badge[v] ?? null }))} />
      <ResourceTable
        path="/admin/tickets"
        extraQuery={{ _view: view }}
        rowTo={(r: any) => `/tickets/${r.id}`}
        pageSize={25}
        filters={[
          { key: "status", label: t("adm.tickets.col.status"), options: opts("TicketStatus") },
          { key: "priority", label: t("adm.tickets.col.priority"), options: opts("TicketPriority") },
          { key: "queue", label: t("adm.tickets.col.queue"), options: opts("TicketQueue") },
          { key: "channel", label: t("adm.tickets.col.channel"), options: opts("TicketChannel") },
        ]}
        columns={[
          {
            key: "subject",
            header: t("adm.tickets.col.ticket"),
            render: (r: any) => (
              <span className="tk-cell-main">
                <small className="text-muted">{r.number} · {enumLabel("TicketChannel", r.channel)}</small>
                <strong>{r.subject}</strong>
                <span className="flex gap-1 flex-wrap">
                  {r.awaitingAgent && <span className="badge badge-warning"><MessageSquare size={11} aria-hidden /> {t("adm.tickets.awaitingAgent")}</span>}
                  {r.tags.slice(0, 3).map((tag: string) => <span key={tag} className="badge">{tag}</span>)}
                </span>
              </span>
            ),
          },
          { key: "requesterName", header: t("adm.tickets.col.requester"), render: (r: any) => <span>{r.requesterName}{r.companyName && <small className="block text-muted">{r.companyName}</small>}</span> },
          { key: "categoryName", header: t("adm.tickets.col.category"), hideOnMobile: true, render: (r: any) => <span>{text(r.categoryName)}<small className="block text-muted">{enumLabel("TicketQueue", r.queue)}</small></span> },
          { key: "priority", header: t("adm.tickets.col.priority"), render: (r: any) => <EnumBadge group="TicketPriority" code={r.priority} tone={PRIORITY_TONE[r.priority]} /> },
          { key: "status", header: t("adm.tickets.col.status"), hideOnMobile: true, render: (r: any) => <EnumBadge group="TicketStatus" code={r.status} /> },
          { key: "assigneeName", header: t("adm.tickets.col.assignee"), hideOnMobile: true, render: (r: any) => r.assigneeName ?? <span className="text-muted">{t("adm.tickets.unassigned")}</span> },
          { key: "sla", header: t("adm.tickets.col.sla"), sortKey: "sla.remainingMinutes", render: (r: any) => <SlaCell sla={r.sla} /> },
          { key: "updatedAt", header: t("adm.tickets.col.updated"), sortKey: "updatedAt", hideOnMobile: true, render: (r: any) => relative(r.updatedAt) },
        ]}
      />
      {s && (
        <Grid cols={2} className="mt-4">
          <Card title={t("adm.tickets.stats.byQueue")}>
            <ul className="kit-list">
              {s.byQueue.map((x: any) => (
                <li key={x.queue}>
                  <span className="grow">{enumLabel("TicketQueue", x.queue)}</span>
                  <strong>{x.open}</strong> <span className="text-muted text-sm">{t("adm.tickets.stats.openShort")}</span>
                  {x.breached > 0 && <span className="badge badge-danger">{x.breached} SLA</span>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t("adm.tickets.stats.agents")}>
            <ul className="kit-list">
              {s.agents.map((a: any) => (
                <li key={a.id}>
                  <span className="grow entity-row"><UserRound size={16} className="text-muted" aria-hidden /> {a.name}</span>
                  <span className="text-sm">{a.open} {t("adm.tickets.stats.openShort")} · {a.resolved} {t("adm.tickets.stats.resolvedShort")}</span>
                  {a.csat !== null && <span className="badge"><Star size={11} aria-hidden /> {a.csat}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </Grid>
      )}
      {creating && <CreateTicketDialog onClose={() => { setCreating(false); if (query.get("new")) setQuery({ new: "" }); }} />}
    </>
  );
}

function CreateTicketDialog({ onClose }: { onClose: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const { user } = useSession();
  const { navigate } = useRouter();
  const refresh = useRefresh();
  const lookups = useLookups();
  const support = useSupportLookups();
  const form = useFormState({ requesterMode: "customer", requesterId: "", requesterName: "", requesterPhone: "", categoryId: "", channel: "PHONE", priority: "", subject: "", body: "", assignToMe: true });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const v = form.values;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await post("/admin/tickets", {
        categoryId: v.categoryId,
        channel: v.channel,
        priority: v.priority || undefined,
        subject: v.subject,
        body: v.body,
        ...(v.requesterMode === "customer" ? { requesterId: v.requesterId || undefined } : { requesterName: v.requesterName, requesterPhone: v.requesterPhone }),
        assigneeId: v.assignToMe ? user?.id : undefined,
      });
      await refresh();
      toast.success(t("adm.tickets.created", { number: r.number }));
      onClose();
      navigate(`/tickets/${r.id}`);
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.tickets.new")} subtitle={t("adm.tickets.newHint")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={submit}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-segment mb-3" role="tablist">
        {(["customer", "guest"] as const).map((m) => <button key={m} type="button" role="tab" aria-selected={v.requesterMode === m} className={cn(v.requesterMode === m && "active")} onClick={() => form.set("requesterMode", m)}>{m === "customer" ? t("adm.tickets.requesterPick") : t("adm.tickets.requesterNew")}</button>)}
      </div>
      <div className="kit-form-grid">
        {v.requesterMode === "customer" ? (
          <SelectField className="span-2" label={t("adm.tickets.requesterPick")} required value={v.requesterId} onValue={(x) => form.set("requesterId", x)} placeholder={t("common.choose")} error={form.errors.requesterId ?? form.errors.requesterName} options={(lookups.data?.customers ?? []).map((c: any) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }))} />
        ) : (
          <>
            <TextField label={t("adm.tickets.requesterName")} required value={v.requesterName} onValue={(x) => form.set("requesterName", x)} error={form.errors.requesterName} />
            <PhoneField label={t("adm.tickets.requesterPhone")} value={v.requesterPhone} onValue={(x) => form.set("requesterPhone", x)} />
          </>
        )}
        <SelectField label={t("adm.tickets.col.category")} required value={v.categoryId} onValue={(x) => form.set("categoryId", x)} placeholder={t("common.choose")} error={form.errors.categoryId} options={(support.data?.categories ?? []).map((c: any) => ({ value: c.id, label: text(c.name) }))} />
        <SelectField label={t("adm.tickets.col.channel")} value={v.channel} onValue={(x) => form.set("channel", x)} options={["PHONE", "EMAIL", "WHATSAPP", "INTERNAL"].map((c) => ({ value: c, label: enumLabel("TicketChannel", c) }))} />
        <SelectField label={t("adm.tickets.col.priority")} value={v.priority} onValue={(x) => form.set("priority", x)} placeholder={support.data?.categories?.find((c: any) => c.id === v.categoryId) ? enumLabel("TicketPriority", support.data.categories.find((c: any) => c.id === v.categoryId).defaultPriority) : t("common.choose")} options={enumKeys("TicketPriority").map((c) => ({ value: c, label: enumLabel("TicketPriority", c) }))} />
        <div className="kit-field"><Toggle label={t("adm.tickets.assignToMe")} checked={v.assignToMe} onValue={(x) => form.set("assignToMe", x)} /></div>
        <TextField className="span-2" label={t("support.subject")} required value={v.subject} onValue={(x) => form.set("subject", x)} error={form.errors.subject} maxLength={140} />
        <TextArea className="span-2" label={t("adm.tickets.firstMessage")} required rows={5} value={v.body} onValue={(x) => form.set("body", x)} error={form.errors.body} maxLength={5000} />
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detal                                                                */
/* ------------------------------------------------------------------ */

export function TicketDetailPage({ id }: { id: string }) {
  const { t, text, enumLabel, dateTime } = useI18n();
  const { can } = useSession();
  const refresh = useRefresh();
  const q = useApi<any>(`/admin/tickets/${id}`);
  const support = useSupportLookups();
  const [dialog, setDialog] = useState<"assign" | "priority" | "order" | null>(null);
  const run = async (a: ApiAction, extra: { reasonCode?: string; note?: string } = {}) => {
    await post(`/admin/tickets/${id}/actions`, { code: a.code, ...extra });
    await refresh();
  };
  return (
    <QueryView query={q} rows={10}>
      {(x) => (
        <>
          <PageHeader
            back="/tickets"
            crumbs={[{ label: t("adm.nav.tickets"), to: "/tickets" }, { label: x.number }]}
            title={x.subject}
            badge={<><EnumBadge group="TicketStatus" code={x.status} /> <EnumBadge group="TicketPriority" code={x.priority} tone={PRIORITY_TONE[x.priority]} /></>}
            subtitle={`${x.number} · ${text(x.categoryName)} · ${enumLabel("TicketChannel", x.channel)} · ${dateTime(x.createdAt)}`}
            actions={<ActionBar actions={x.availableActions} labelPrefix="adm.tickets.actions" run={run} custom={{ assign: () => setDialog("assign"), change_priority: () => setDialog("priority"), create_service_order: () => setDialog("order") }} />}
          />
          {x.sla.state === "BREACHED" && x.status !== "CLOSED" && x.status !== "RESOLVED" && <div className="kit-note danger mb-4"><AlertTriangle size={16} aria-hidden /> {t("adm.tickets.historyActions.sla_breached")} · {t("adm.tickets.escalation", { level: x.sla.escalationLevel })}</div>}
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("adm.tickets.conversation")}>
                <TicketThread messages={x.messages} perspective="agent" />
              </Card>
              {x.canReply ? <Composer ticket={x} canned={support.data?.cannedResponses ?? []} /> : <div className="kit-note info">{t("adm.tickets.closed")}</div>}
              <Card title={t("adm.tickets.history")}>
                <ul className="kit-list">
                  {x.history.map((h: any) => (
                    <li key={h.id}>
                      <span className="grow">
                        <strong>{t(`adm.tickets.historyActions.${h.action}`)}</strong>
                        {h.toStatus && h.action !== "priority_changed" && <span className="text-sm"> · {h.fromStatus ? `${enumLabel("TicketStatus", h.fromStatus)} → ` : ""}{enumLabel("TicketStatus", h.toStatus)}</span>}
                        {h.action === "priority_changed" && <span className="text-sm"> · {enumLabel("TicketPriority", h.fromStatus)} → {enumLabel("TicketPriority", h.toStatus)}</span>}
                        <small className="block text-muted">{h.actorName}{h.actorRole && h.actorRole !== "SYSTEM" ? ` (${enumLabel("Role", h.actorRole)})` : ""} · {dateTime(h.at)}</small>
                        {(h.reason || h.note) && <small className="block">{[h.reason, h.note].filter(Boolean).join(" — ")}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="kit-stack">
              <SlaCard ticket={x} />
              <DetailsCard ticket={x} categories={support.data?.categories ?? []} canEdit={can("tickets:edit")} />
              <RequesterCard ticket={x} />
            </div>
          </div>
          {dialog === "assign" && <AssignDialog ticket={x} agents={support.data?.agents ?? []} onClose={() => setDialog(null)} />}
          {dialog === "priority" && <PriorityDialog ticket={x} onClose={() => setDialog(null)} />}
          {dialog === "order" && <ServiceOrderDialog ticket={x} onClose={() => setDialog(null)} />}
        </>
      )}
    </QueryView>
  );
}

function Composer({ ticket, canned }: { ticket: any; canned: any[] }) {
  const { t, text, locale } = useI18n();
  const refresh = useRefresh();
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [body, setBody] = useState("");
  const [cannedId, setCannedId] = useState<string | undefined>();
  const [lang, setLang] = useState<"az" | "ru" | "en">(locale as "az" | "ru" | "en");
  const [statusAfter, setStatusAfter] = useState<"OPEN" | "PENDING_CUSTOMER" | "RESOLVED">("PENDING_CUSTOMER");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [attach, setAttach] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const slash = body.startsWith("/") && !body.includes(" ") ? body.toLowerCase() : null;
  const suggestions = useMemo(() => (slash ? canned.filter((c) => c.shortcut.startsWith(slash) && (!c.categoryId || c.categoryId === ticket.categoryId)).slice(0, 6) : []), [slash, canned, ticket.categoryId]);
  const insert = (c: any) => {
    const value = c.bodyI18n?.[lang] || c.bodyI18n?.az || c.body;
    setBody((b) => (b.startsWith("/") ? value : b ? `${b}\n\n${value}` : value));
    setCannedId(c.id);
  };
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await post(`/admin/tickets/${ticket.id}/messages`, { body, internal: mode === "internal", statusAfter: mode === "reply" ? statusAfter : undefined, cannedResponseId: cannedId, attachments: files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })) });
      setBody("");
      setFiles([]);
      setAttach(false);
      setCannedId(undefined);
      await refresh();
      toast.success(mode === "internal" ? t("adm.tickets.noteAdded") : t("adm.tickets.sent"));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={cn("kit-card tk-composer", mode === "internal" && "is-internal")}>
      <div className="kit-card-body">
        <div className="flex justify-between items-center gap-2 flex-wrap mb-3">
          <div className="kit-segment" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "reply"} className={cn(mode === "reply" && "active")} onClick={() => setMode("reply")}><Send size={14} aria-hidden /> {t("adm.tickets.reply")}</button>
            <button type="button" role="tab" aria-selected={mode === "internal"} className={cn(mode === "internal" && "active")} onClick={() => setMode("internal")}><Lock size={14} aria-hidden /> {t("adm.tickets.internal")}</button>
          </div>
          {mode === "reply" && canned.length > 0 && (
            <div className="flex gap-2 items-center">
              <SelectField ariaLabel={t("adm.tickets.canned")} className="tk-canned-select" value="" onValue={(v) => { const c = canned.find((x) => x.id === v); if (c) insert(c); }} placeholder={t("adm.tickets.canned")} options={canned.filter((c) => !c.categoryId || c.categoryId === ticket.categoryId).map((c) => ({ value: c.id, label: `${c.shortcut} — ${text(c.title)}` }))} />
              <div className="kit-segment" role="tablist" aria-label={t("common.language")}>
                {(["az", "ru", "en"] as const).map((l) => <button key={l} type="button" role="tab" aria-selected={lang === l} className={cn(lang === l && "active")} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
              </div>
            </div>
          )}
        </div>
        <FormError error={error} />
        <div className="tk-composer-input">
          <TextArea label={mode === "internal" ? t("adm.tickets.internal") : t("adm.tickets.reply")} value={body} onValue={(v) => { setBody(v); if (!v) setCannedId(undefined); }} rows={5} placeholder={mode === "internal" ? t("adm.tickets.notePlaceholder") : t("adm.tickets.replyPlaceholder")} hint={mode === "internal" ? t("adm.tickets.internalHint") : undefined} maxLength={5000} />
          {mode === "reply" && suggestions.length > 0 && (
            <ul className="tk-suggest" role="listbox" aria-label={t("adm.tickets.canned")}>
              {suggestions.map((c) => <li key={c.id}><button type="button" role="option" aria-selected={false} onClick={() => insert(c)}><strong>{c.shortcut}</strong> {text(c.title)}</button></li>)}
            </ul>
          )}
        </div>
        {attach && <FileDrop files={files} onChange={setFiles} max={5} maxSizeMb={5} />}
        <div className="flex justify-between items-end gap-2 flex-wrap mt-3">
          <button type="button" className="btn ghost" onClick={() => setAttach((a) => !a)} aria-expanded={attach}><Paperclip size={16} /> {t("support.attachments")}</button>
          <div className="flex gap-2 items-end flex-wrap">
            {mode === "reply" && <SelectField label={t("adm.tickets.statusAfter")} value={statusAfter} onValue={(v) => setStatusAfter(v as typeof statusAfter)} options={(["PENDING_CUSTOMER", "OPEN", "RESOLVED"] as const).map((s) => ({ value: s, label: t(`adm.tickets.after.${s}`) }))} />}
            <button type="button" className={cn("btn", mode === "internal" ? "outline" : "primary")} disabled={busy || !body.trim() || body.startsWith("/")} onClick={send}>{mode === "internal" ? <><Lock size={16} /> {t("adm.tickets.addNote")}</> : <><Send size={16} /> {t("adm.tickets.send")}</>}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SlaCard({ ticket: x }: { ticket: any }) {
  const { t, dateTime, minutes } = useI18n();
  const sla = x.sla;
  return (
    <Card title={<span className="flex items-center gap-2"><Gauge size={16} aria-hidden /> SLA</span>} actions={<EnumBadge group="TicketSlaState" code={sla.state} />}>
      {sla.state === "PAUSED" && <p className="kit-note info text-sm mb-3">{t("adm.tickets.paused")}</p>}
      <ul className="tk-sla-steps">
        <li className={cn(sla.firstRespondedAt ? (sla.breachedFirstResponse ? "late" : "done") : sla.breachedFirstResponse ? "late" : "wait")}>
          <strong>{t("adm.tickets.firstResponse")}</strong>
          <small>{sla.firstRespondedAt ? t("adm.tickets.respondedAt", { time: dateTime(sla.firstRespondedAt) }) : t("adm.tickets.dueBy", { time: dateTime(sla.firstResponseDueAt) })}</small>
        </li>
        <li className={cn(x.resolvedAt ? (sla.breachedResolution ? "late" : "done") : sla.breachedResolution ? "late" : "wait")}>
          <strong>{t("adm.tickets.resolution")}</strong>
          <small>{x.resolvedAt ? dateTime(x.resolvedAt) : t("adm.tickets.dueBy", { time: dateTime(sla.resolutionDueAt) })}</small>
          {sla.resolutionRemainingMinutes !== null && sla.state !== "PAUSED" && <small className={cn(sla.resolutionRemainingMinutes < 0 && "text-danger")}>{sla.resolutionRemainingMinutes >= 0 ? t("adm.tickets.left", { time: minutes(sla.resolutionRemainingMinutes) }) : t("adm.tickets.overdue", { time: minutes(-sla.resolutionRemainingMinutes) })}</small>}
        </li>
      </ul>
      {sla.escalationLevel > 0 && <p className="text-sm text-danger mt-2">{t("adm.tickets.escalation", { level: sla.escalationLevel })}</p>}
      {x.csat && (
        <p className="mt-3 flex items-center gap-2"><Star size={16} className="text-warning" fill="currentColor" aria-hidden /> <strong>{x.csat.rating}/5</strong>{x.csat.comment && <small className="text-muted">“{x.csat.comment}”</small>}</p>
      )}
    </Card>
  );
}

function DetailsCard({ ticket: x, categories, canEdit }: { ticket: any; categories: any[]; canEdit: boolean }) {
  const { t, text, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [tags, setTags] = useState<string>(x.tags.join(", "));
  const save = async (body: Record<string, unknown>) => {
    try {
      await patch(`/admin/tickets/${x.id}`, body);
      await refresh();
      toast.success(t("common.saved"));
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    }
  };
  return (
    <Card title={t("adm.tickets.details")}>
      <KeyValue
        cols={1}
        items={[
          [t("adm.tickets.col.queue"), enumLabel("TicketQueue", x.queue)],
          [t("adm.tickets.col.assignee"), x.assigneeName ?? <span key="u" className="text-muted">{t("adm.tickets.unassigned")}</span>],
          [t("adm.tickets.related"), x.related ? (x.related.link ? <Link key="r" to={x.related.link} className="text-brand">{enumLabel("TicketRelatedType", x.related.type)} · {x.related.number}</Link> : `${enumLabel("TicketRelatedType", x.related.type)} · ${x.related.number}`) : null],
          [t("support.serviceOrder"), x.serviceOrderId ? <Link key="o" to={x.serviceOrderLink} className="text-brand">{x.serviceOrderNumber}</Link> : null],
        ]}
      />
      {canEdit ? (
        <div className="kit-stack mt-3">
          <SelectField label={t("adm.tickets.col.category")} value={x.categoryId} onValue={(v) => save({ categoryId: v })} options={categories.map((c) => ({ value: c.id, label: text(c.name) }))} />
          <div className="flex gap-2 items-end">
            <TextField className="grow" label={t("adm.tickets.tags")} hint={t("adm.tickets.tagsHint")} value={tags} onValue={setTags} />
            <button type="button" className="btn outline" disabled={tags === x.tags.join(", ")} onClick={() => save({ tags: tags.split(",") })}>{t("common.save")}</button>
          </div>
        </div>
      ) : (
        x.tags.length > 0 && <p className="flex gap-1 flex-wrap mt-3">{x.tags.map((tag: string) => <span key={tag} className="badge">{tag}</span>)}</p>
      )}
    </Card>
  );
}

function RequesterCard({ ticket: x }: { ticket: any }) {
  const { t, enumLabel, text, date } = useI18n();
  const r = x.requester;
  return (
    <Card title={t("adm.tickets.requester")} actions={r?.customerLink ? <Link to={r.customerLink} className="btn ghost btn-sm">{t("adm.tickets.customerCard")}</Link> : undefined}>
      <p className="entity-row"><UserRound size={18} className="text-muted" aria-hidden /><span><strong>{x.requesterName}</strong><small>{r ? `${enumLabel("Role", r.role)}${r.planName ? ` · ${text(r.planName)}` : ""}` : t("adm.tickets.guest")}</small></span></p>
      <ul className="kit-list mt-2">
        {(r?.phone ?? x.requesterPhone) && <li><Phone size={14} className="text-muted" aria-hidden /> <a href={`tel:${r?.phone ?? x.requesterPhone}`}>{r?.phone ?? x.requesterPhone}</a></li>}
        {(r?.email ?? x.requesterEmail) && <li><MessageSquare size={14} className="text-muted" aria-hidden /> <a href={`mailto:${r?.email ?? x.requesterEmail}`}>{r?.email ?? x.requesterEmail}</a></li>}
      </ul>
      {r && (
        <>
          <p className="text-sm text-muted mt-2">{t("adm.tickets.since", { date: date(r.since) })}</p>
          <p className="text-sm">{t("adm.tickets.counts", { services: r.serviceOrders, sales: r.salesOrders, tickets: r.openTickets })}</p>
          {r.recentOrders.length > 0 && (
            <>
              <h3 className="tk-subhead">{t("adm.tickets.recentOrders")}</h3>
              <ul className="kit-list">
                {r.recentOrders.map((o: any) => <li key={o.id}><Link to={o.link} className="grow text-brand">{o.number}</Link><span className="text-sm text-muted">{date(o.createdAt)}</span></li>)}
              </ul>
            </>
          )}
        </>
      )}
      {x.otherTickets.length > 0 && (
        <>
          <h3 className="tk-subhead">{t("adm.tickets.otherTickets")}</h3>
          <ul className="kit-list">
            {x.otherTickets.map((o: any) => <li key={o.id}><Link to={`/tickets/${o.id}`} className="grow"><strong className="block">{o.number}</strong><small className="text-muted">{o.subject}</small></Link><EnumBadge group="TicketStatus" code={o.status} /></li>)}
          </ul>
        </>
      )}
    </Card>
  );
}

function AssignDialog({ ticket, agents, onClose }: { ticket: any; agents: any[]; onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [assigneeId, setAssigneeId] = useState<string>(ticket.assigneeId ?? "");
  const [error, setError] = useState<unknown>(null);
  const submit = async () => {
    try {
      await post(`/admin/tickets/${ticket.id}/actions`, { code: "assign", assigneeId: assigneeId || undefined });
      await refresh();
      toast.success(t("actions.done", { action: t("adm.tickets.actions.assign") }));
      onClose();
    } catch (e) { setError(e); }
  };
  return (
    <Dialog open onClose={onClose} size="sm" title={t("adm.tickets.assignTitle")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!assigneeId} onClick={submit}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("adm.tickets.assignee")} value={assigneeId} onValue={setAssigneeId} placeholder={t("common.choose")} options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${enumLabel("Role", a.role)} · ${t("adm.tickets.openCount", { count: a.open })}` }))} />
    </Dialog>
  );
}

function PriorityDialog({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const { t, enumLabel } = useI18n();
  const refresh = useRefresh();
  const [priority, setPriority] = useState<string>(ticket.priority);
  const [note, setNote] = useState("");
  const [error, setError] = useState<unknown>(null);
  const submit = async () => {
    try {
      await post(`/admin/tickets/${ticket.id}/actions`, { code: "change_priority", priority, note: note || undefined });
      await refresh();
      toast.success(t("common.saved"));
      onClose();
    } catch (e) { setError(e); }
  };
  return (
    <Dialog open onClose={onClose} size="sm" title={t("adm.tickets.priorityTitle")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={priority === ticket.priority} onClick={submit}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("adm.tickets.col.priority")} value={priority} onValue={setPriority} hint={t("adm.tickets.priorityHint")} options={enumKeys("TicketPriority").map((c) => ({ value: c, label: enumLabel("TicketPriority", c) }))} />
      <TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} />
    </Dialog>
  );
}

function ServiceOrderDialog({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const lookups = useLookups();
  const form = useFormState({ serviceId: "", executionForm: "", deviceId: "", addressId: ticket.requester?.addresses?.[0]?.id ?? "", urgent: ticket.priority === "URGENT" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const v = form.values;
  const service = (lookups.data?.services ?? []).find((s: any) => s.id === v.serviceId);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await post(`/admin/tickets/${ticket.id}/service-order`, { serviceId: v.serviceId, executionForm: v.executionForm, deviceId: v.deviceId || undefined, addressId: v.addressId || undefined, urgent: v.urgent });
      await refresh();
      toast.success(t("adm.tickets.orderCreated", { number: r.orderNumber }), { action: { label: t("adm.tickets.openOrder"), onClick: () => navigate(`/service-orders/${r.orderId}`) } });
      onClose();
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.tickets.orderTitle")} subtitle={t("adm.tickets.orderHint")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={submit}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <SelectField className="span-2" label={t("adm.tickets.service")} required value={v.serviceId} onValue={(x) => { form.set("serviceId", x); form.set("executionForm", ""); }} placeholder={t("common.choose")} error={form.errors.serviceId} options={(lookups.data?.services ?? []).map((s: any) => ({ value: s.id, label: text(s.name) }))} />
        <SelectField label={t("adm.tickets.form")} required value={v.executionForm} onValue={(x) => form.set("executionForm", x)} placeholder={t("common.choose")} error={form.errors.executionForm} options={(service?.executionForms ?? []).map((f: string) => ({ value: f, label: enumLabel("ExecutionForm", f) }))} />
        <SelectField label={t("adm.tickets.device")} value={v.deviceId} onValue={(x) => form.set("deviceId", x)} placeholder="—" error={form.errors.deviceId} options={(ticket.requester?.devices ?? []).map((d: any) => ({ value: d.id, label: d.name }))} />
        <SelectField className="span-2" label={t("adm.tickets.address")} required={v.executionForm === "ON_SITE"} value={v.addressId} onValue={(x) => form.set("addressId", x)} placeholder="—" error={form.errors.addressId} options={(ticket.requester?.addresses ?? []).map((a: any) => ({ value: a.id, label: a.label }))} />
        <div className="kit-field"><Toggle label={t("adm.tickets.urgent")} checked={v.urgent} onValue={(x) => form.set("urgent", x)} /></div>
      </div>
    </Dialog>
  );
}
