"use client";
import React, { useState } from "react";
import { MapPin, Navigation, Package, Phone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import type { RouteDef } from "../core/router";
import { EmptyState, EnumBadge, FormError, KeyValue, QueryView, SelectField, Tabs, TextArea, TextField } from "../kit/base";
import { Dialog } from "../kit/actions";
import { FileDrop, MapView, SignaturePad, type PickedFile } from "../kit/media";
import { useRefresh } from "./common";

/**
 * Kuryer interfeysi (PRD §21.6): mobil, böyük düymələr, yalnız öz tapşırıqları. Müştəri əlaqəsi tapşırıq aktiv olanda görünür.
 */

const COURIER = ["COURIER", "TECHNICIAN"];

export const courierRoutes: RouteDef[] = [
  { pattern: "/courier", render: () => <CourierTasksPage />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
  { pattern: "/courier/tasks", render: () => <CourierTasksPage />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
  { pattern: "/courier/tasks/:id", render: (p) => <CourierTaskPage id={p.id!} />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
];

function CourierTasksPage() {
  const { t, time, date, money, enumLabel } = useI18n();
  const { query, setQuery } = useRouter();
  const view = query.get("view") ?? "today";
  const q = useApi<any>(`/courier/tasks${qs({ view })}`, { refetchInterval: 30_000 });
  const summary = useApi<any>("/courier/summary");
  return (
    <>
      <h1 className="courier-title">{t("courier.tasksTitle")}</h1>
      {summary.data && (
        <div className="courier-task">
          <div className="flex justify-between gap-2 flex-wrap text-sm">
            <span>{t("courier.open", { count: summary.data.open })}</span>
            <span>{t("courier.delivered", { count: summary.data.delivered })}</span>
            {summary.data.cashBalance && <span className="flex items-center gap-1"><Wallet size={14} /> {money(summary.data.cashBalance)}</span>}
          </div>
        </div>
      )}
      <Tabs value={view} onChange={(v) => setQuery({ view: v })} tabs={[{ id: "today", label: t("courier.today"), badge: q.data?.counts.today }, { id: "upcoming", label: t("courier.upcoming"), badge: q.data?.counts.upcoming }, { id: "done", label: t("courier.done") }]} />
      <QueryView query={q} empty={<EmptyState icon={Package} title={t("courier.empty")} />}>
        {(d) => (
          <>
            {d.items.map((task: any) => (
              <Link key={task.id} to={`/courier/tasks/${task.id}`} className="courier-task">
                <div className="flex justify-between items-center gap-2">
                  <strong>{task.number} · {enumLabel("LogisticsType", task.type)}</strong>
                  <EnumBadge group="LogisticsStatus" code={task.status} />
                </div>
                <small className="text-muted">{date(task.windowStart)} {time(task.windowStart)}–{time(task.windowEnd)}{task.relatedOrderNumber ? ` · ${task.relatedOrderNumber}` : ""}</small>
                <p className="flex items-start gap-2 text-sm"><MapPin size={14} className="text-muted" /> <span><b>{task.from.label}</b> — {task.from.address}</span></p>
                <p className="flex items-start gap-2 text-sm"><Navigation size={14} className="text-brand" /> <span><b>{task.to.label}</b> — {task.to.address}</span></p>
                {task.collectCash && <span className="badge badge-warning">{t("courier.collect", { amount: money(task.collectCash) })}</span>}
              </Link>
            ))}
          </>
        )}
      </QueryView>
    </>
  );
}

function CourierTaskPage({ id }: { id: string }) {
  const { t, time, date, dateTime, money, enumLabel, text } = useI18n();
  const q = useApi<any>(`/courier/tasks/${id}`);
  const [action, setAction] = useState<string | null>(null);
  return (
    <QueryView query={q} rows={8}>
      {(task) => (
        <>
          <Link to="/courier" className="btn ghost btn-sm">← {t("common.back")}</Link>
          <div className="courier-task">
            <div className="flex justify-between items-center gap-2">
              <h1 className="text-xl">{task.number}</h1>
              <EnumBadge group="LogisticsStatus" code={task.status} />
            </div>
            <KeyValue cols={2} items={[[t("courier.type"), enumLabel("LogisticsType", task.type)], [t("courier.window"), `${date(task.windowStart)} ${time(task.windowStart)}–${time(task.windowEnd)}`], [t("courier.order"), task.relatedOrderNumber], [t("courier.branch"), task.branchName]]} />
          </div>
          <MapView height={220} points={[{ id: "from", lat: task.from.location.lat, lng: task.from.location.lng, label: "A", tone: "muted" }, { id: "to", lat: task.to.location.lat, lng: task.to.location.lng, label: "B" }]} />
          <div className="courier-task">
            <p className="flex items-start gap-2"><MapPin size={16} className="text-muted" /> <span><small className="block text-muted">{t("courier.from")}</small><b>{task.from.label}</b><br />{task.from.address}</span></p>
            <p className="flex items-start gap-2"><Navigation size={16} className="text-brand" /> <span><small className="block text-muted">{t("courier.to")}</small><b>{task.to.label}</b><br />{task.to.address}</span></p>
            <a className="btn outline" href={`https://www.openstreetmap.org/directions?to=${task.to.location.lat},${task.to.location.lng}`} target="_blank" rel="noreferrer"><Navigation size={16} /> {t("tech.job.route")}</a>
            {task.contact ? (
              <a className="btn outline" href={`tel:${task.contact.phone}`}><Phone size={16} /> {task.contact.name} · {task.contact.phone}</a>
            ) : task.contactHidden ? (
              <small className="text-muted">{t("courier.contactHidden")}</small>
            ) : null}
          </div>
          <div className="courier-task">
            <strong>{t("courier.cargo")}</strong>
            <ul className="kit-list">{task.cargo.map((c: any, i: number) => <li key={i}><span className="grow">{text(c.name)}<small className="block text-muted">{enumLabel("CargoKind", c.kind)}{c.note ? ` · ${c.note}` : ""}</small></span><strong>{c.quantity}</strong></li>)}</ul>
            {task.collectCash && <p className="kit-note warning">{t("courier.collect", { amount: money(task.collectCash) })}</p>}
            {task.note && <p className="kit-note">{task.note}</p>}
            {(task.photos > 0 || task.signed) && <small className="text-muted">{t("acc.devices.photos", { count: task.photos })}{task.signed ? ` · ${t("media.signed")}` : ""}</small>}
            {task.failReason && <p className="kit-note danger">{task.failReason}</p>}
          </div>
          {task.availableActions?.length > 0 && (
            <div className="courier-big">
              {task.availableActions.map((a: any) => (
                <button key={a.code} type="button" className={cn("btn", a.code === "fail" ? "outline danger-outline" : "primary")} onClick={() => setAction(a.code)}>{t(`actions.${a.code === "start" ? "start_travel" : a.code}`)}</button>
              ))}
            </div>
          )}
          <details className="courier-task">
            <summary>{t("acc.orders.history")}</summary>
            <ul className="kit-list">{task.history.map((h: any, i: number) => <li key={i}><span className="grow">{enumLabel("LogisticsStatus", h.status)}<small className="block text-muted">{dateTime(h.at)} · {h.actor}{h.note ? ` · ${h.note}` : ""}</small></span></li>)}</ul>
          </details>
          {action && <CourierActionDialog task={task} action={action} onClose={() => setAction(null)} />}
        </>
      )}
    </QueryView>
  );
}

function CourierActionDialog({ task, action, onClose }: { task: any; action: string; onClose: () => void }) {
  const { t, money, text } = useI18n();
  const refresh = useRefresh();
  const reasons = useApi<any[]>(action === "fail" ? "/reason-codes?category=FAILED" : null);
  const needsProof = (action === "picked_up" && task.type === "PICKUP") || action === "delivered";
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [signed, setSigned] = useState(false);
  const [reasonCode, setReason] = useState("");
  const [note, setNote] = useState("");
  const [cash, setCash] = useState(task.collectCash?.amount ?? "");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const label = t(`actions.${action === "start" ? "start_travel" : action}`);
  const simple = !needsProof && action !== "fail";
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await post(`/courier/tasks/${task.id}/status`, { action, photos: photos.length || undefined, signed: signed || undefined, reasonCode: reasonCode || undefined, note: note || undefined, cashCollected: action === "delivered" && task.collectCash ? cash : undefined });
      await refresh();
      toast.success(t("actions.done", { action: label }));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={label} size={simple ? "sm" : "md"} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || (action === "fail" && !reasonCode)} onClick={submit}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      {simple && <p>{t("actions.confirmText")}</p>}
      {action === "fail" && <SelectField label={t("common.reason")} required value={reasonCode} onValue={setReason} placeholder={t("common.choose")} options={(reasons.data ?? []).map((r) => ({ value: r.code, label: text(r.label) }))} />}
      {(needsProof || action === "fail") && <FileDrop files={photos} onChange={setPhotos} accept="image/*" capture max={5} label={t("courier.photo")} />}
      {needsProof && <div className="mt-3"><p className="form-label mb-2">{t("wf.complete.signature")}</p><SignaturePad onChange={setSigned} /></div>}
      {action === "delivered" && task.collectCash && <TextField label={t("courier.cashCollected", { amount: money(task.collectCash) })} inputMode="decimal" value={cash} onValue={setCash} />}
      {!simple && <TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} />}
    </Dialog>
  );
}
