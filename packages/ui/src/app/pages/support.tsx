"use client";
import React, { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, LifeBuoy, Lock, MessageSquare, Paperclip, Phone, Plus, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { Card, EmptyState, EnumBadge, FormError, KeyValue, PageHeader, QueryView, SelectField, Tabs, TextArea, TextField, errorText, useFormState } from "../kit/base";
import { ConfirmDialog, Dialog } from "../kit/actions";
import { FileDrop, type PickedFile } from "../kit/media";
import { useRefresh } from "./common";

/**
 * Dəstək müraciətləri — müştəri, B2B və usta kabinetləri üçün ortaq ekranlar.
 * Status keçidləri və SLA backend-dədir; ekran yalnız `availableActions`-ı göstərir.
 */

export interface TicketMessageDto {
  id: string;
  kind: "PUBLIC" | "INTERNAL" | "SYSTEM";
  authorName: string;
  authorRole: string;
  fromCustomer: boolean;
  body: string;
  attachments: { name: string; url: string | null }[];
  createdAt: string;
}

export const PRIORITY_TONE: Record<string, string> = { LOW: "default", NORMAL: "info", HIGH: "warning", URGENT: "danger" };

/** Sistem mesajları kod kimi gəlir (`auto_closed:72`) və burada tərcümə olunur. */
function systemText(t: (k: string, v?: Record<string, string | number>) => string, body: string) {
  const [code, arg] = body.split(":");
  if (code === "auto_closed") return t("support.system.auto_closed", { hours: arg ?? "72" });
  if (code === "service_order_created") return t("support.system.service_order_created", { number: arg ?? "" });
  return body;
}

/** Yazışma lenti: müştəri bir tərəfdə, dəstək digər tərəfdə, daxili qeydlər və sistem hadisələri ayrıca görünür. */
export function TicketThread({ messages, perspective }: { messages: TicketMessageDto[]; perspective: "agent" | "customer" }) {
  const { t, dateTime } = useI18n();
  return (
    <ol className="tk-thread" aria-label={t("support.conversation")}>
      {messages.map((m) => {
        if (m.kind === "SYSTEM") return <li key={m.id} className="tk-system"><span>{systemText(t, m.body)}</span><time dateTime={m.createdAt}>{dateTime(m.createdAt)}</time></li>;
        const mine = perspective === "customer" ? m.fromCustomer : !m.fromCustomer;
        return (
          <li key={m.id} className={cn("tk-msg", mine ? "mine" : "theirs", m.kind === "INTERNAL" && "internal")}>
            <div className="tk-msg-head">
              <strong>{perspective === "customer" && m.fromCustomer ? t("support.you") : m.authorName}</strong>
              {m.kind === "INTERNAL" && <span className="badge badge-warning"><Lock size={11} aria-hidden /> {t("adm.tickets.internal")}</span>}
              <time dateTime={m.createdAt}>{dateTime(m.createdAt)}</time>
            </div>
            <p className="tk-msg-body">{m.body}</p>
            {m.attachments.length > 0 && (
              <ul className="tk-files">
                {m.attachments.map((a, i) => (
                  <li key={i}>{a.url ? <a href={a.url} download={a.name} target="_blank" rel="noreferrer"><Paperclip size={13} aria-hidden /> {a.name}</a> : <span><Paperclip size={13} aria-hidden /> {a.name}</span>}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Siyahı                                                               */
/* ------------------------------------------------------------------ */

const ACTIVE = "NEW,OPEN,PENDING_CUSTOMER,ON_HOLD";

export function SupportTicketsPage({ base }: { base: string }) {
  const { t, relative, enumLabel, text } = useI18n();
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const [creating, setCreating] = useState(false);
  const q = useApi<any>(`/support/tickets${qs({ status: tab === "active" ? ACTIVE : "RESOLVED,CLOSED", pageSize: 50 })}`);
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  return (
    <>
      <PageHeader title={t("support.title")} subtitle={t("support.subtitle")} actions={<button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("support.new")}</button>} />
      <div className="kit-split">
        <div className="kit-stack">
          <Tabs value={tab} onChange={(v) => setTab(v as "active" | "resolved")} tabs={[{ id: "active", label: t("support.tabActive") }, { id: "resolved", label: t("support.tabResolved") }]} />
          <QueryView query={q} rows={4} empty={<EmptyState icon={LifeBuoy} title={t("support.empty")} text={t("support.emptyText")} action={tab === "active" ? <button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("support.new")}</button> : undefined} />}>
            {(d) => (
              <ul className="tk-list">
                {d.items.map((x: any) => (
                  <li key={x.id}>
                    <Link to={`${base}/${x.id}`} className="tk-list-item">
                      <span className="tk-list-main">
                        <span className="tk-list-meta">{x.number} · {text(x.categoryName)}</span>
                        <strong>{x.subject}</strong>
                        <span className="tk-list-meta">
                          <MessageSquare size={13} aria-hidden /> {t("support.messages", { count: x.messageCount })} · {t("support.updated", { time: relative(x.updatedAt) })}
                          {x.relatedNumber ? ` · ${x.relatedNumber}` : ""}
                        </span>
                      </span>
                      <span className="tk-list-side">
                        {x.status === "PENDING_CUSTOMER" ? <span className="badge badge-warning">{t("support.awaitingYou")}</span> : <EnumBadge group="TicketStatus" code={x.status} />}
                        {x.availableActions?.some((a: any) => a.code === "rate") && <span className="badge badge-info"><Star size={11} aria-hidden /> {t("support.actions.rate")}</span>}
                        <ChevronRight size={16} className="text-muted" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryView>
        </div>
        <Card title={t("support.help.title")}>
          <p className="text-sm text-muted mb-3">{t("support.help.text")}</p>
          <div className="kit-stack">
            <Link to="/faq" className="btn outline w-full">{t("support.help.faq")}</Link>
            {brand.data?.contacts?.hotline && <a href={`tel:${String(brand.data.contacts.hotline).replace(/[^\d+]/g, "")}`} className="btn ghost w-full"><Phone size={16} aria-hidden /> {brand.data.contacts.hotline}</a>}
          </div>
          <p className="text-sm text-muted mt-3">{enumLabel("TicketChannel", "PORTAL")} · {enumLabel("TicketChannel", "WHATSAPP")} · {enumLabel("TicketChannel", "PHONE")}</p>
        </Card>
      </div>
      {creating && <NewTicketDialog base={base} onClose={() => setCreating(false)} />}
    </>
  );
}

function NewTicketDialog({ base, onClose }: { base: string; onClose: () => void }) {
  const { t, text, minutes, enumLabel } = useI18n();
  const { navigate } = useRouter();
  const refresh = useRefresh();
  const categories = useApi<any[]>("/support/categories", { staleTime: 300_000 });
  const related = useApi<any[]>("/support/related");
  const form = useFormState({ categoryId: "", related: "", subject: "", body: "" });
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const v = form.values;
  const category = categories.data?.find((c) => c.id === v.categoryId);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const [relatedType, relatedId] = v.related ? v.related.split(":") : [];
      const r = await post("/support/tickets", { categoryId: v.categoryId, subject: v.subject, body: v.body, relatedType, relatedId, attachments: files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })) });
      await refresh();
      toast.success(t("support.created", { number: r.number }));
      onClose();
      navigate(`${base}/${r.id}`);
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={t("support.new")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={submit}><Send size={16} /> {t("support.send")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <SelectField className="span-2" label={t("support.category")} required value={v.categoryId} onValue={(x) => form.set("categoryId", x)} placeholder={t("common.choose")} error={form.errors.categoryId} hint={category ? `${text(category.description)} · ${t("support.replyWithin", { time: minutes(category.firstResponseMinutes) })}` : undefined} options={(categories.data ?? []).map((c) => ({ value: c.id, label: text(c.name) }))} />
        <SelectField className="span-2" label={t("support.related")} value={v.related} onValue={(x) => form.set("related", x)} placeholder={t("support.relatedNone")} error={form.errors.relatedId} options={(related.data ?? []).map((r) => ({ value: `${r.type}:${r.id}`, label: `${enumLabel("TicketRelatedType", r.type)} · ${r.number} — ${text(r.label)}` }))} />
        <TextField className="span-2" label={t("support.subject")} required value={v.subject} onValue={(x) => form.set("subject", x)} error={form.errors.subject} placeholder={t("support.subjectHint")} maxLength={140} />
        <TextArea className="span-2" label={t("support.body")} required rows={6} value={v.body} onValue={(x) => form.set("body", x)} error={form.errors.body} hint={t("support.bodyHint")} maxLength={5000} />
      </div>
      <FileDrop files={files} onChange={setFiles} max={5} maxSizeMb={5} label={t("support.attachments")} />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detal                                                                */
/* ------------------------------------------------------------------ */

export function SupportTicketDetailPage({ id, base }: { id: string; base: string }) {
  const { t, text, dateTime, enumLabel } = useI18n();
  const q = useApi<any>(`/support/tickets/${id}`);
  const refresh = useRefresh();
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [rating, setRating] = useState(false);
  const act = async (code: string, extra: Record<string, unknown> = {}) => {
    try {
      await post(`/support/tickets/${id}/actions`, { code, ...extra });
      await refresh();
      return true;
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
      return false;
    }
  };
  return (
    <QueryView query={q} rows={8}>
      {(x) => {
        const can = (code: string) => x.availableActions.some((a: any) => a.code === code);
        return (
          <>
            <PageHeader
              back={base}
              title={x.subject}
              badge={<EnumBadge group="TicketStatus" code={x.status} />}
              subtitle={`${x.number} · ${text(x.categoryName)} · ${dateTime(x.createdAt)}`}
              actions={
                <>
                  {can("rate") && <button type="button" className="btn primary" onClick={() => setRating(true)}><Star size={16} /> {t("support.actions.rate")}</button>}
                  {can("reopen") && <button type="button" className="btn outline" onClick={() => setReopening(true)}>{t("support.actions.reopen")}</button>}
                  {can("mark_resolved") && <button type="button" className="btn outline" onClick={() => setConfirmResolve(true)}><CheckCircle2 size={16} /> {t("support.actions.mark_resolved")}</button>}
                </>
              }
            />
            {x.status === "PENDING_CUSTOMER" && <div className="kit-note warning mb-4">{t("support.pendingNote")}</div>}
            <div className="kit-split">
              <div className="kit-stack">
                <Card title={t("support.conversation")}>
                  <TicketThread messages={x.messages} perspective="customer" />
                </Card>
                {x.canReply ? <CustomerReply id={id} resolved={x.status === "RESOLVED"} /> : <div className="kit-note info">{t("support.closedNote")}</div>}
              </div>
              <div className="kit-stack">
                <Card title={t("support.details")}>
                  <KeyValue
                    cols={1}
                    items={[
                      [t("support.number"), x.number],
                      [t("support.status"), <EnumBadge key="s" group="TicketStatus" code={x.status} />],
                      [t("support.priority"), <EnumBadge key="p" group="TicketPriority" code={x.priority} tone={PRIORITY_TONE[x.priority]} />],
                      [t("support.channel"), enumLabel("TicketChannel", x.channel)],
                      [t("support.assignee"), x.assigneeName ? x.assigneeName.split(" ")[0] : null],
                      [x.sla.firstRespondedAt ? t("support.repliedAt") : t("support.expectedReply"), dateTime(x.sla.firstRespondedAt ?? x.sla.firstResponseDueAt)],
                      [t("support.relatedTo"), x.related ? (x.related.link ? <Link key="r" to={x.related.link} className="text-brand">{enumLabel("TicketRelatedType", x.related.type)} · {x.related.number}</Link> : `${enumLabel("TicketRelatedType", x.related.type)} · ${x.related.number}`) : null],
                      [t("support.serviceOrder"), x.serviceOrderId ? <Link key="o" to={x.serviceOrderLink} className="text-brand">{x.serviceOrderNumber}</Link> : null],
                    ]}
                  />
                </Card>
                {x.csat && (
                  <Card title={t("support.yourRating")}>
                    <div className="kit-rate" aria-label={`${x.csat.rating}/5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={20} className={n <= x.csat.rating ? "text-warning" : "text-muted"} fill={n <= x.csat.rating ? "currentColor" : "none"} aria-hidden />)}</div>
                    {x.csat.comment && <p className="text-sm mt-2">{x.csat.comment}</p>}
                  </Card>
                )}
              </div>
            </div>
            <ConfirmDialog open={confirmResolve} title={t("support.actions.mark_resolved")} text={t("support.confirmResolve")} onClose={() => setConfirmResolve(false)} onConfirm={async () => { if (await act("mark_resolved")) { setConfirmResolve(false); setRating(true); } }} />
            {reopening && <ReopenDialog onClose={() => setReopening(false)} onSubmit={async (comment) => { if (await act("reopen", { comment })) setReopening(false); }} />}
            {rating && <RateDialog onClose={() => setRating(false)} onSubmit={async (value, comment) => { if (await act("rate", { rating: value, comment })) { toast.success(t("support.rateThanks")); setRating(false); } }} />}
          </>
        );
      }}
    </QueryView>
  );
}

function CustomerReply({ id, resolved }: { id: string; resolved: boolean }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [attach, setAttach] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await post(`/support/tickets/${id}/messages`, { body, attachments: files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })) });
      setBody("");
      setFiles([]);
      setAttach(false);
      await refresh();
      toast.success(t("support.sent"));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      {resolved && <p className="kit-note info text-sm mb-3">{t("support.resolvedNote")}</p>}
      <FormError error={error} />
      <TextArea label={t("common.comment")} value={body} onValue={setBody} rows={4} placeholder={t("support.replyPlaceholder")} maxLength={5000} />
      {attach && <FileDrop files={files} onChange={setFiles} max={5} maxSizeMb={5} label={t("support.attachments")} />}
      <div className="flex justify-between gap-2 flex-wrap mt-3">
        <button type="button" className="btn ghost" onClick={() => setAttach((a) => !a)} aria-expanded={attach}><Paperclip size={16} /> {t("support.attachments")}</button>
        <button type="button" className="btn primary" disabled={busy || !body.trim()} onClick={send}><Send size={16} /> {t("support.send")}</button>
      </div>
    </Card>
  );
}

function ReopenDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (comment: string) => Promise<void> }) {
  const { t } = useI18n();
  const [comment, setComment] = useState("");
  return (
    <Dialog open onClose={onClose} size="sm" title={t("support.actions.reopen")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!comment.trim()} onClick={() => onSubmit(comment)}>{t("support.actions.reopen")}</button></>}>
      <TextArea label={t("support.reopenLabel")} required value={comment} onValue={setComment} rows={4} />
    </Dialog>
  );
}

export function RateDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (rating: number, comment: string) => Promise<void> }) {
  const { t } = useI18n();
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState("");
  const labels = useMemo(() => [1, 2, 3, 4, 5], []);
  return (
    <Dialog open onClose={onClose} size="sm" title={t("support.rateTitle")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!value} onClick={() => onSubmit(value, comment)}>{t("common.send")}</button></>}>
      <p className="text-sm text-muted mb-3">{t("support.rateText")}</p>
      <div className="kit-rate" role="radiogroup" aria-label={t("support.rateTitle")}>
        {labels.map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`} className={cn(n <= value && "on")} onClick={() => setValue(n)}><Star size={28} fill={n <= value ? "currentColor" : "none"} /></button>)}
      </div>
      <TextArea label={t("support.rateComment")} value={comment} onValue={setComment} rows={3} maxLength={1000} />
    </Dialog>
  );
}
