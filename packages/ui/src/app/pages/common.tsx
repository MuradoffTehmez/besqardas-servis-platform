"use client";
import React, { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { idempotencyKey, post, useApi, useQueryClient } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { Card, EmptyState, EnumBadge, FormError, Loading, TextArea, TextField, errorText } from "../kit/base";
import { Dialog } from "../kit/actions";
import { DocumentPreview } from "../kit/domain";

/* ------------------------------------------------------------------ */
/* Bir neçə paneldə təkrarlanan bloklar                                 */
/* ------------------------------------------------------------------ */

/** Bütün `["api", ...]` sorğularını yeniləyir — mutasiyadan sonra ekranlar backend-in yeni vəziyyətini göstərir. */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["api"] });
}

/** Servis sifarişi əməliyyatını göndərir (PRD §18.4) — status keçidini backend müəyyən edir. */
export function useOrderAction(orderId: string) {
  const refresh = useRefresh();
  return async (action: { code: string; stageId?: string }, extra: Record<string, unknown> = {}) => {
    const r = await post(`/service-orders/${orderId}/actions`, { action: action.code, stageId: action.stageId, ...extra });
    await refresh();
    return r;
  };
}

/** Sənəd siyahısı: klik edildikdə önizləmə dialoqu açılır (§49). */
export function DocumentsList({ docs, empty }: { docs: { id: string; number: string; type: string; status?: string; issuedAt?: string; createdAt?: string }[]; empty?: string }) {
  const { t, enumLabel, date } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  if (!docs.length) return <EmptyState icon={FileText} title={empty ?? t("docs.none")} />;
  return (
    <>
      <ul className="kit-list">
        {docs.map((d) => (
          <li key={d.id}>
            <span className="grow entity-row">
              <FileText size={18} className="text-muted" />
              <span>
                <strong>{enumLabel("DocumentType", d.type)}</strong>
                <small>№ {d.number}{d.issuedAt || d.createdAt ? ` · ${date(d.issuedAt ?? d.createdAt)}` : ""}</small>
              </span>
            </span>
            {d.status && <EnumBadge group="DocumentStatus" code={d.status} />}
            <button type="button" className="btn outline btn-sm" onClick={() => setOpen(d.id)}>{t("common.view")}</button>
          </li>
        ))}
      </ul>
      {open && <DocumentDialog id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function DocumentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const doc = useApi<any>(`/documents/${id}`);
  const { t } = useI18n();
  return (
    <Dialog open onClose={onClose} title={t("docs.preview")} size="lg">
      {doc.isLoading ? <Loading rows={6} /> : doc.error ? <FormError error={doc.error} /> : <DocumentPreview doc={doc.data} />}
    </Dialog>
  );
}

/** Sifariş tarixçəsi (audit izi) — kim, nə vaxt, hansı dəyişiklik (§18.6). */
export function HistoryList({ items }: { items: { id: string; at: string; actorName: string; actorRole?: string; action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; note?: string | null }[] }) {
  const { t, dateTime, enumLabel, has } = useI18n();
  if (!items?.length) return <EmptyState title={t("history.empty")} />;
  return (
    <ul className="kit-list">
      {items.map((h) => (
        <li key={h.id}>
          <span className="grow">
            <strong>{has(`history.actions.${h.action}`) ? t(`history.actions.${h.action}`) : h.action}</strong>
            {h.toStatus && <span className="text-sm"> · {h.fromStatus ? `${enumLabel("OrderStatus", h.fromStatus)} → ` : ""}{enumLabel("OrderStatus", h.toStatus)}</span>}
            <small className="block text-muted">{h.actorName}{h.actorRole ? ` (${enumLabel("Role", h.actorRole)})` : ""} · {dateTime(h.at)}</small>
            {(h.reason || h.note) && <small className="block">{[h.reason, h.note].filter(Boolean).join(" — ")}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Onlayn ödənişi başladır və provayder səhifəsinə yönləndirir (§48). */
export function usePayOnline() {
  const { navigate } = useRouter();
  const { t } = useI18n();
  return async (orderType: "SERVICE" | "SALES" | "SUBSCRIPTION" | "B2B_INVOICE", orderId: string, amount?: string) => {
    try {
      const r = await post<{ redirectUrl: string }>("/payments", { orderType, orderId, method: "CARD_ONLINE", amount, idempotencyKey: idempotencyKey() });
      navigate(r.redirectUrl);
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    }
  };
}

/** Sadə siyahı kartı: başlıq + "hamısına bax" linki. */
export function ListCard({ title, to, children, empty, count }: { title: React.ReactNode; to?: string; children: React.ReactNode; empty?: boolean; count?: number }) {
  const { t } = useI18n();
  return (
    <Card title={title} actions={to ? <Link to={to} className="btn ghost btn-sm">{t("common.viewAll")}{count ? ` (${count})` : ""}</Link> : undefined}>
      {empty ? <EmptyState /> : children}
    </Card>
  );
}

/** Progress zolağı. */
export function Progress({ value, tone }: { value: number; tone?: "warning" | "danger" }) {
  return (
    <div className={`kit-progress ${tone ?? ""}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Limit istifadəsi (plan imkanları, §42). */
export function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null | string }) {
  const { t } = useI18n();
  const unlimited = limit === null || limit === "UNLIMITED";
  const pct = unlimited ? 0 : Number(limit) ? (used / Number(limit)) * 100 : 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <strong>{used} / {unlimited ? t("plans.unlimited") : limit}</strong>
      </div>
      {!unlimited && <Progress value={pct} tone={pct >= 100 ? "danger" : pct >= 80 ? "warning" : undefined} />}
    </div>
  );
}

/** Tək sahəli sürətli dialoq (qeyd, cavab, səbəb). */
export function PromptDialog({ open, title, label, onClose, onSubmit, multiline = true, initial = "", required = true, confirmLabel }: { open: boolean; title: React.ReactNode; label: string; onClose: () => void; onSubmit: (value: string) => Promise<unknown>; multiline?: boolean; initial?: string; required?: boolean; confirmLabel?: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button>
          <button type="button" className="btn primary" disabled={busy || (required && !value.trim())} onClick={async () => { setBusy(true); setError(null); try { await onSubmit(value); onClose(); } catch (e) { setError(e); } finally { setBusy(false); } }}>
            {confirmLabel ?? t("common.save")}
          </button>
        </>
      }
    >
      <FormError error={error} />
      {multiline ? <TextArea label={label} value={value} onValue={setValue} rows={4} /> : <TextField label={label} value={value} onValue={setValue} />}
    </Dialog>
  );
}

export function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}
