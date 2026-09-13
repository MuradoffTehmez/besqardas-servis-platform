"use client";
import React, { useMemo, useState } from "react";
import { BadgeCheck, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { useSession } from "../core/session";
import { Check, FormError, Loading, Radios, SelectField, Stars, TextArea, TextField, errorText } from "../kit/base";
import { ActionBar, Dialog, ReasonDialog, type ApiAction } from "../kit/actions";
import { SlotPicker } from "../kit/domain";
import { FileDrop, QuantityInput, SignaturePad, type PickedFile } from "../kit/media";
import { PromptDialog, useOrderAction } from "./common";

/**
 * Servis sifarişi əməliyyatları üçün ortaq dialoqlar (PRD §18–20). Usta paneli və CRM eyni komponentlərdən istifadə edir;
 * hansı düymənin görünəcəyini yalnız backend-in `availableActions` siyahısı müəyyən edir.
 */

type Order = any;

export function OrderActions({ order, exclude = [], size }: { order: Order; exclude?: string[]; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const run = useOrderAction(order.id);
  const [dialog, setDialog] = useState<{ kind: string; action: ApiAction } | null>(null);
  const open = (kind: string) => (a: ApiAction) => setDialog({ kind, action: a });
  const close = () => setDialog(null);
  const stage = dialog?.action.stageId ? order.stages.find((s: any) => s.id === dialog.action.stageId) : null;
  return (
    <>
      <ActionBar
        actions={order.availableActions ?? []}
        exclude={exclude}
        size={size}
        run={(a, extra) => run(a, extra)}
        custom={{
          submit_estimate: open("estimate"),
          complete_stage: (a) => {
            const st = order.stages.find((s: any) => s.id === a.stageId);
            const needs = st && (st.completionRequirements.length || st.type === "HANDOVER" || st.checklist.length);
            if (needs) setDialog({ kind: "complete", action: a });
            else void run(a).then(() => toast.success(t("actions.done", { action: t("actions.complete_stage") }))).catch((e) => toast.error(errorText(e, t("errors.generic"))));
          },
          consume_materials: open("materials"),
          record_payment: open("payment"),
          customer_absent: open("absent"),
          add_note: open("note"),
          assign: open("assign"),
          assign_courier: open("courier"),
          reschedule: open("reschedule"),
          change_execution_form: open("form"),
          wait_part: open("waitPart"),
        }}
      />
      {dialog?.kind === "estimate" && <EstimateBuilderDialog order={order} action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "complete" && stage && <CompleteStageDialog order={order} stage={stage} action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "materials" && <MaterialsDialog order={order} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "payment" && <PaymentDialog due={(dialog.action.payload as any)?.dueAmount} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "absent" && <AbsentDialog action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "note" && <NoteDialog onClose={close} onSubmit={(note) => run(dialog.action, { note })} />}
      {dialog?.kind === "waitPart" && <NoteDialog title="actions.wait_part" required={false} onClose={close} onSubmit={(note) => run(dialog.action, { note })} />}
      {dialog?.kind === "assign" && <AssignDialog order={order} action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "courier" && <CourierDialog action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "reschedule" && <RescheduleOrderDialog order={order} action={dialog.action} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
      {dialog?.kind === "form" && <ExecutionFormDialog order={order} onClose={close} onSubmit={(extra) => run(dialog.action, extra)} />}
    </>
  );
}

function useSubmit(onSubmit: (extra: Record<string, unknown>) => Promise<unknown>, onClose: () => void, doneKey: string) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (extra: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(extra);
      toast.success(t("actions.done", { action: t(doneKey) }));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

/* ------------------------------------------------------------------ */
/* Smeta qurucusu (§19) — material qiyməti sistemdən gəlir               */
/* ------------------------------------------------------------------ */

interface Line {
  key: string;
  type: "LABOR" | "MATERIAL" | "EXTRA" | "DISCOUNT";
  productId?: string | null;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  optional: boolean;
  ownMaterial: boolean;
  units?: string[];
  compatible?: boolean;
  systemPrice?: boolean;
}

export function EstimateBuilderDialog({ order, action, onClose, onSubmit }: { order: Order; action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, money, text, unit: unitLabel, enumLabel } = useI18n();
  const { role } = useSession();
  const prev = order.estimate;
  const [lines, setLines] = useState<Line[]>(() =>
    prev
      ? prev.lines.filter((l: any) => l.type !== "DISCOUNT" || !String(l.name).includes("Zəmanət")).map((l: any, i: number) => ({ key: `p${i}`, type: l.type, productId: l.productId, name: text(l.name), quantity: l.quantity.value, unit: l.quantity.unit, unitPrice: l.unitPrice.amount.replace("-", ""), optional: l.optional, ownMaterial: l.ownMaterial, systemPrice: !!l.productId && !l.ownMaterial }))
      : [{ key: "l0", type: "LABOR", name: text(order.serviceName), quantity: "1", unit: "pcs", unitPrice: order.total?.amount ?? "", optional: false, ownMaterial: false }],
  );
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const materialsPath = role === "TECHNICIAN" ? `/technician/jobs/${order.id}/materials${qs({ q })}` : null;
  const materials = useApi<any[]>(materialsPath);
  const products = useApi<any>(role !== "TECHNICIAN" ? `/products${qs({ q, pageSize: 12 })}` : null);
  const stage = order.stages.find((s: any) => s.id === action.stageId);
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.submit_estimate");
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (l.type === "DISCOUNT" ? -1 : 1) * Number(l.unitPrice || 0) * Number(l.quantity || 0), 0);
  const addMaterial = (m: any) =>
    setLines((ls) => [...ls, { key: `m${Date.now()}`, type: "MATERIAL", productId: m.productId ?? m.id, name: text(m.name), quantity: "1", unit: m.baseUnit, unitPrice: (m.customerPrice ?? m.price?.effectivePrice)?.amount ?? "0", optional: false, ownMaterial: false, units: m.units ?? [m.baseUnit], compatible: m.compatible, systemPrice: true }]);
  const catalog: any[] = role === "TECHNICIAN" ? materials.data ?? [] : (products.data?.items ?? []).map((p: any) => ({ ...p, productId: p.id, units: [p.baseUnit], customerPrice: p.price?.effectivePrice }));
  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={t("wf.estimate.title", { number: order.number })}
      subtitle={stage ? stage.name : undefined}
      footer={
        <>
          <strong className="flex-1">{t("wf.estimate.draftTotal", { total: money({ amount: total.toFixed(2), currency: "AZN" }) })}</strong>
          <button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button>
          <button type="button" className="btn primary" disabled={busy || !lines.length} onClick={() => submit({ lines: lines.map(({ type, productId, name, quantity, unit, unitPrice, optional, ownMaterial }) => ({ type, productId: productId ?? null, name, quantity, unit, unitPrice: unitPrice ? Number(unitPrice).toFixed(2) : undefined, optional, ownMaterial })), note: note || undefined, photos: photos.map((p) => ({ name: p.name })) })}>
            {t("wf.estimate.send")}
          </button>
        </>
      }
    >
      <FormError error={error} />
      {prev && <p className="kit-note info text-sm mb-3">{t("wf.estimate.newVersion", { version: prev.version + 1 })}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>{t("estimate.type")}</th><th>{t("estimate.line")}</th><th>{t("common.quantity")}</th><th>{t("estimate.unitPrice")}</th><th>{t("wf.estimate.flags")}</th><th /></tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td style={{ minWidth: 130 }}>
                  <select className="form-input" value={l.type} onChange={(e) => update(l.key, { type: e.target.value as Line["type"] })} aria-label={t("estimate.type")} disabled={!!l.productId}>
                    {["LABOR", "MATERIAL", "EXTRA", "DISCOUNT"].map((x) => <option key={x} value={x}>{enumLabel("EstimateLineType", x)}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 220 }}>
                  <input className="form-input" value={l.name} onChange={(e) => update(l.key, { name: e.target.value })} aria-label={t("estimate.line")} disabled={!!l.productId} />
                  {l.compatible && <small className="text-success flex items-center gap-1 mt-1"><BadgeCheck size={12} /> {t("shop.fits")}</small>}
                </td>
                <td><QuantityInput value={l.quantity} onValue={(v) => update(l.key, { quantity: v })} unit={l.unit} units={l.units} onUnit={(u) => update(l.key, { unit: u })} min={0} step={l.unit === "pcs" ? 1 : 0.5} /></td>
                <td style={{ minWidth: 110 }}>
                  <input className="form-input" inputMode="decimal" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value.replace(",", ".") })} disabled={l.systemPrice && !l.ownMaterial} aria-label={t("estimate.unitPrice")} />
                  {l.systemPrice && !l.ownMaterial && <small className="text-muted">{t("wf.estimate.systemPrice")}</small>}
                </td>
                <td style={{ minWidth: 150 }}>
                  <Check label={t("estimate.optional")} checked={l.optional} onValue={(v) => update(l.key, { optional: v })} />
                  {l.type === "MATERIAL" && <Check label={t("estimate.ownMaterial")} checked={l.ownMaterial} onValue={(v) => update(l.key, { ownMaterial: v })} />}
                </td>
                <td><button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 flex-wrap mt-3">
        <button type="button" className="btn outline btn-sm" onClick={() => setLines((ls) => [...ls, { key: `x${Date.now()}`, type: "LABOR", name: "", quantity: "1", unit: "pcs", unitPrice: "", optional: false, ownMaterial: false }])}><Plus size={14} /> {t("wf.estimate.addLabor")}</button>
        <button type="button" className="btn outline btn-sm" onClick={() => setLines((ls) => [...ls, { key: `d${Date.now()}`, type: "DISCOUNT", name: t("wf.estimate.discount"), quantity: "1", unit: "pcs", unitPrice: "", optional: false, ownMaterial: false }])}><Plus size={14} /> {t("wf.estimate.addDiscount")}</button>
      </div>
      <div className="kit-card mt-4">
        <div className="kit-card-head"><h2>{t("wf.estimate.materials")}</h2><label className="kit-search"><Search size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("wf.estimate.searchMaterial")} aria-label={t("wf.estimate.searchMaterial")} /></label></div>
        <div className="kit-card-body">
          {(materials.isLoading || products.isLoading) ? <Loading rows={3} /> : (
            <ul className="kit-list">
              {catalog.slice(0, 10).map((m) => (
                <li key={m.productId}>
                  <span className="grow">
                    <strong>{text(m.name)}</strong> {m.compatible && <span className="badge badge-success"><BadgeCheck size={11} /> {t("shop.fits")}</span>}
                    <small className="block text-muted">{m.sku} · {money(m.customerPrice)}{m.technicianPrice ? ` · ${t("wf.estimate.myPrice", { price: money(m.technicianPrice) })}` : ""}{m.available ? ` · ${t("wf.estimate.inVan", { qty: `${m.available.value} ${unitLabel(m.available.unit)}` })}` : ""}</small>
                  </span>
                  <button type="button" className="btn outline btn-sm" onClick={() => addMaterial(m)}><Plus size={14} /> {t("common.add")}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {stage && stage.type !== "ESTIMATE_APPROVAL" && (
        <div className="mt-4">
          <TextArea label={t("wf.estimate.diagnosis")} value={note} onValue={setNote} rows={2} />
          <FileDrop files={photos} onChange={setPhotos} accept="image/*" capture label={t("wf.estimate.photos")} />
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Mərhələnin tamamlanması: foto, imza, checklist, qeyd, ödəniş (§18.3) */
/* ------------------------------------------------------------------ */

export function CompleteStageDialog({ order, stage, action, onClose, onSubmit }: { order: Order; stage: any; action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, enumLabel, money } = useI18n();
  const reqs: string[] = stage.completionRequirements ?? [];
  const onBehalf = (action.payload as any)?.onBehalf;
  const [checklist, setChecklist] = useState<{ label: string; done: boolean }[]>(stage.checklist?.length ? stage.checklist : reqs.includes("CHECKLIST") ? [t("wf.complete.check1"), t("wf.complete.check2"), t("wf.complete.check3")].map((label) => ({ label, done: false })) : []);
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [signed, setSigned] = useState(!!stage.signed);
  const [note, setNote] = useState(stage.note ?? "");
  const handover = stage.type === "HANDOVER";
  const due = order.dueAmount?.amount ?? "0.00";
  const [method, setMethod] = useState("CARD_POS");
  const [amount, setAmount] = useState(Number(due) > 0 ? due : "");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.complete_stage");
  const missing = [reqs.includes("PHOTO") && !photos.length && !stage.photos.length && "PHOTO", reqs.includes("SIGNATURE") && !signed && "SIGNATURE", reqs.includes("CHECKLIST") && checklist.some((c) => !c.done) && "CHECKLIST", reqs.includes("NOTE") && !note.trim() && "NOTE"].filter(Boolean) as string[];
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t("wf.complete.title", { stage: stage.name })}
      subtitle={reqs.length ? t("wf.complete.requires", { list: reqs.map((r) => enumLabel("Requirement", r)).join(", ") }) : undefined}
      footer={
        <>
          {missing.length > 0 && <small className="text-warning flex-1">{t("wf.complete.missing", { list: missing.map((r) => enumLabel("Requirement", r)).join(", ") })}</small>}
          <button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button>
          <button type="button" className="btn primary" disabled={busy || (missing.length > 0 && !onBehalf)} onClick={() => submit({ checklist: checklist.length ? checklist : undefined, photos: photos.map((p) => ({ name: p.name })), signed, note: onBehalf && missing.length ? `${note} [simulyasiya]`.trim() : note || undefined, payment: handover && Number(amount) > 0 ? { method, amount: Number(amount).toFixed(2) } : undefined })}>
            {t("actions.complete_stage")}
          </button>
        </>
      }
    >
      <FormError error={error} />
      {onBehalf && <p className="kit-note warning text-sm mb-3">{t("wf.complete.onBehalf")}</p>}
      {checklist.length > 0 && (
        <fieldset className="mb-4">
          <legend className="form-label mb-2">{enumLabel("Requirement", "CHECKLIST")}</legend>
          <ul className="checklist">
            {checklist.map((c, i) => <li key={i}><Check label={c.label} checked={c.done} onValue={(v) => setChecklist((cl) => cl.map((x, j) => (j === i ? { ...x, done: v } : x)))} /></li>)}
          </ul>
        </fieldset>
      )}
      {(reqs.includes("PHOTO") || handover || stage.type === "EXECUTION") && (
        <div className="mb-4">
          <p className="form-label mb-2">{enumLabel("Requirement", "PHOTO")}{stage.photos.length ? ` · ${t("wf.complete.already", { count: stage.photos.length })}` : ""}</p>
          <FileDrop files={photos} onChange={setPhotos} accept="image/*" capture />
        </div>
      )}
      {(reqs.includes("SIGNATURE") || handover) && (
        <div className="mb-4">
          <p className="form-label mb-2">{t("wf.complete.signature")}</p>
          <SignaturePad signed={signed} onChange={setSigned} />
        </div>
      )}
      <TextArea label={t("common.note")} required={reqs.includes("NOTE")} value={note} onValue={setNote} rows={2} />
      {handover && (
        <fieldset className="kit-card mt-2">
          <div className="kit-card-body">
            <legend className="form-label mb-2">{t("wf.complete.payment", { due: money(order.dueAmount) })}</legend>
            <Radios name="pm" value={method} onValue={setMethod} columns={3} options={["CARD_POS", "CASH", "BANK_TRANSFER"].map((m) => ({ value: m, label: enumLabel("PaymentMethod", m) }))} />
            <TextField label={t("wf.payment.amount")} inputMode="decimal" value={amount} onValue={(v) => setAmount(v.replace(",", "."))} hint={t("wf.complete.paymentHint")} />
          </div>
        </fieldset>
      )}
    </Dialog>
  );
}

function MaterialsDialog({ order, onClose, onSubmit }: { order: Order; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, text, unit } = useI18n();
  const { role } = useSession();
  const [q, setQ] = useState("");
  const list = useApi<any[]>(role === "TECHNICIAN" ? `/technician/jobs/${order.id}/materials${qs({ q })}` : null);
  const products = useApi<any>(role !== "TECHNICIAN" ? `/products${qs({ q, pageSize: 12 })}` : null);
  const catalog: any[] = role === "TECHNICIAN" ? list.data ?? [] : (products.data?.items ?? []).map((p: any) => ({ productId: p.id, name: p.name, sku: "", baseUnit: p.baseUnit, units: [p.baseUnit] }));
  const [picked, setPicked] = useState<{ productId: string; name: string; quantity: string; unit: string; units: string[]; ownMaterial: boolean }[]>([]);
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.consume_materials");
  return (
    <Dialog open onClose={onClose} size="lg" title={t("actions.consume_materials")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !picked.length} onClick={() => submit({ materials: picked.map(({ productId, quantity, unit, ownMaterial }) => ({ productId, quantity, unit, ownMaterial })) })}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{t("wf.materials.hint")}</p>
      {picked.length > 0 && (
        <ul className="kit-list mb-3">
          {picked.map((p, i) => (
            <li key={p.productId}>
              <span className="grow">{p.name}</span>
              <QuantityInput value={p.quantity} onValue={(v) => setPicked((x) => x.map((y, j) => (j === i ? { ...y, quantity: v } : y)))} unit={p.unit} units={p.units} onUnit={(u) => setPicked((x) => x.map((y, j) => (j === i ? { ...y, unit: u } : y)))} min={0} step={p.unit === "pcs" ? 1 : 0.5} />
              <Check label={t("estimate.ownMaterial")} checked={p.ownMaterial} onValue={(v) => setPicked((x) => x.map((y, j) => (j === i ? { ...y, ownMaterial: v } : y)))} />
              <button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => setPicked((x) => x.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <TextField label={t("wf.estimate.searchMaterial")} type="search" value={q} onValue={setQ} />
      <ul className="kit-list">
        {catalog.slice(0, 8).map((m) => (
          <li key={m.productId}>
            <span className="grow"><strong>{text(m.name)}</strong><small className="block text-muted">{m.sku}{m.available ? ` · ${m.available.value} ${unit(m.available.unit)}` : ""}</small></span>
            <button type="button" className="btn outline btn-sm" disabled={picked.some((p) => p.productId === m.productId)} onClick={() => setPicked((x) => [...x, { productId: m.productId, name: text(m.name), quantity: "1", unit: m.baseUnit, units: m.units, ownMaterial: false }])}>{t("common.add")}</button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function PaymentDialog({ due, onClose, onSubmit, methods = ["CASH", "CARD_POS", "BANK_TRANSFER"] }: { due?: string; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown>; methods?: string[] }) {
  const { t, enumLabel, money } = useI18n();
  const [method, setMethod] = useState(methods[0]!);
  const [amount, setAmount] = useState(due ?? "");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.record_payment");
  return (
    <Dialog open onClose={onClose} size="sm" title={t("actions.record_payment")} subtitle={due ? t("wf.payment.due", { due: money({ amount: due, currency: "AZN" }) }) : undefined} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !(Number(amount) > 0)} onClick={() => submit({ payment: { method, amount: Number(amount).toFixed(2) } })}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <Radios name="method" value={method} onValue={setMethod} options={methods.map((m) => ({ value: m, label: enumLabel("PaymentMethod", m) }))} />
      <TextField label={t("wf.payment.amount")} inputMode="decimal" value={amount} onValue={(v) => setAmount(v.replace(",", "."))} hint={Number(amount) < Number(due ?? 0) ? t("wf.payment.partial") : undefined} />
      <p className="text-sm text-muted">{t("wf.payment.fiscal")}</p>
    </Dialog>
  );
}

function AbsentDialog({ action, onClose, onSubmit }: { action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [err, setErr] = useState<unknown>(null);
  return (
    <ReasonDialog
      open
      category={action.reasonCategory ?? "FAILED"}
      title={t("actions.customer_absent")}
      error={err}
      onClose={onClose}
      extra={<FileDrop files={photos} onChange={setPhotos} accept="image/*" capture label={t("wf.absent.photo")} />}
      onSubmit={async (reasonCode, note) => { try { await onSubmit({ reasonCode, note, photos: photos.map((p) => ({ name: p.name })) }); toast.success(t("actions.done", { action: t("actions.customer_absent") })); onClose(); } catch (e) { setErr(e); } }}
    />
  );
}

function NoteDialog({ onClose, onSubmit, title = "actions.add_note", required = true }: { onClose: () => void; onSubmit: (note: string) => Promise<unknown>; title?: string; required?: boolean }) {
  const { t } = useI18n();
  return <PromptDialog open title={t(title)} label={t("common.note")} required={required} onClose={onClose} onSubmit={async (v) => { await onSubmit(v); toast.success(t("actions.done", { action: t(title) })); }} />;
}

/* ------------------------------------------------------------------ */
/* Təyinat (§15.3): uyğunluq sıralaması və iş yükü                       */
/* ------------------------------------------------------------------ */

export function AssignDialog({ order, action, onClose, onSubmit }: { order: Order; action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, dateTime, num } = useI18n();
  const candidates = useApi<any[]>(`/admin/service-orders/${order.id}/candidates${qs({ stageId: action.stageId })}`);
  const [tech, setTech] = useState("");
  const [when, setWhen] = useState(order.scheduledAt ? order.scheduledAt.slice(0, 16) : "");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.assign");
  return (
    <Dialog open onClose={onClose} size="lg" title={t("actions.assign")} subtitle={`${order.number} · ${order.stages.find((s: any) => s.id === action.stageId)?.name ?? ""}`} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !tech} onClick={() => submit({ technicianId: tech, scheduledAt: when ? new Date(when).toISOString() : undefined })}>{t("actions.assign")}</button></>}>
      <FormError error={error} />
      {candidates.isLoading ? <Loading rows={4} /> : (
        <div className="kit-radios">
          {(candidates.data ?? []).map((c: any) => (
            <label key={c.id} className={cn("choice-card kit-radio", tech === c.id && "active")}>
              <input type="radio" name="tech" value={c.id} checked={tech === c.id} onChange={() => setTech(c.id)} />
              <span className="flex justify-between gap-2 flex-wrap">
                <strong>{c.technician.fullName}</strong>
                <span className="flex gap-2 items-center"><Stars value={c.technician.rating} /><span className="badge badge-info">{t("wf.assign.score", { score: num(c.score, 0) })}</span></span>
              </span>
              <small className="text-muted">
                {[t("wf.assign.distance", { km: num(c.distanceKm, 1) }), t("wf.assign.workload", { count: c.load }), t(`wf.assign.${c.technician.employmentType}`), c.technician.nextAvailableAt && t("wf.assign.next", { at: dateTime(c.technician.nextAvailableAt) })].filter(Boolean).join(" · ")}
              </small>
              {c.technician.specializations?.length > 0 && <small>{c.technician.specializations.join(" · ")}</small>}
            </label>
          ))}
        </div>
      )}
      <TextField label={t("wf.assign.time")} type="datetime-local" value={when} onValue={setWhen} />
    </Dialog>
  );
}

function CourierDialog({ action, onClose, onSubmit }: { action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t } = useI18n();
  const couriers = useApi<any[]>("/admin/couriers-available");
  const [id, setId] = useState("");
  const [when, setWhen] = useState("");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.assign_courier");
  return (
    <Dialog open onClose={onClose} size="sm" title={t("actions.assign_courier")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !id} onClick={() => submit({ technicianId: id, scheduledAt: when ? new Date(when).toISOString() : undefined, stageId: action.stageId })}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      {couriers.isLoading ? <Loading /> : <SelectField label={t("wf.courier.who")} value={id} onValue={setId} placeholder={t("common.choose")} options={(couriers.data ?? []).map((c: any) => ({ value: c.id, label: `${c.fullName}${c.kind === "TECHNICIAN" ? ` (${t("wf.courier.tech")})` : ""} · ${t("wf.courier.tasks", { count: c.openTasks ?? 0 })}` }))} />}
      <TextField label={t("wf.courier.window")} type="datetime-local" value={when} onValue={setWhen} />
    </Dialog>
  );
}

function RescheduleOrderDialog({ order, action, onClose, onSubmit }: { order: Order; action: ApiAction; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, text } = useI18n();
  const slots = useApi<any[]>(`/services/${order.serviceId}/slots${qs({ addressId: order.address?.id, days: 7, executionForm: order.executionForm })}`);
  const reasons = useApi<any[]>(`/reason-codes?category=${action.reasonCategory ?? "RESCHEDULE"}`);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.reschedule");
  return (
    <Dialog open onClose={onClose} size="lg" title={t("actions.reschedule")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !reason} onClick={() => submit({ reasonCode: reason, note, scheduledAt: slot ?? undefined })}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("common.reason")} required value={reason} onValue={setReason} placeholder={t("common.choose")} options={(reasons.data ?? []).map((r: any) => ({ value: r.code, label: text(r.label) }))} />
      {slots.isLoading ? <Loading rows={3} /> : <SlotPicker days={slots.data ?? []} value={slot} onChange={setSlot} />}
      <div className="mt-3"><TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} /></div>
    </Dialog>
  );
}

function ExecutionFormDialog({ order, onClose, onSubmit }: { order: Order; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, enumLabel } = useI18n();
  const svc = useApi<any>(`/services/${order.serviceSlug}`);
  const forms: string[] = useMemo(() => (svc.data?.executionForms ?? []).filter((f: string) => f !== order.executionForm), [svc.data, order.executionForm]);
  const [form, setForm] = useState("");
  const { busy, error, submit } = useSubmit(onSubmit, onClose, "actions.change_execution_form");
  return (
    <Dialog open onClose={onClose} size="sm" title={t("actions.change_execution_form")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !form} onClick={() => submit({ executionForm: form })}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{t("wf.form.hint", { current: enumLabel("ExecutionForm", order.executionForm) })}</p>
      {svc.isLoading ? <Loading /> : <Radios name="form" value={form} onValue={setForm} options={forms.map((f) => ({ value: f, label: enumLabel("ExecutionForm", f) }))} />}
    </Dialog>
  );
}
