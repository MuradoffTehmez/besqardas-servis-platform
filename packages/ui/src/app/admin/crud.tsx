"use client";
import React, { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { del, patch, post, useApi } from "@sp/api-client";
import { loadMessages } from "@sp/i18n";
import { useI18n } from "../core/i18n";
import { useSession } from "../core/session";
import { Check, EnumBadge, FormError, KeyValue, Loading, PageHeader, SelectField, TextArea, TextField, Toggle, errorText } from "../kit/base";
import { ActionBar, ConfirmDialog, Dialog, ResourceTable, type ApiAction, type TableColumn, type TableFilter } from "../kit/actions";
import { useRefresh } from "../pages/common";

/**
 * Konfiqurasiya əsaslı CRUD səhifəsi (PRD §61, §69): server-side cədvəl, filtrlər, yaratma/redaktə formu,
 * `*I18n` sahələri üçün AZ/RU/EN tabları, `availableActions` əsasında sətir əməliyyatları və audit üçün təsdiq.
 */

export type CellType = "text" | "money" | "date" | "datetime" | "enum" | "bool" | "i18n" | "number" | "list" | "badge" | "percent";

export interface ColumnDef {
  key: string;
  label: string;
  type?: CellType;
  group?: string;
  sort?: boolean;
  mobile?: boolean;
  render?: (row: any) => React.ReactNode;
  sub?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "bool" | "i18n" | "i18nText" | "date" | "datetime" | "multi" | "color" | "email" | "tel" | "json" | "cents";
  options?: { value: string; label: string }[];
  enumGroup?: string;
  enumValues?: string[];
  lookup?: string;
  required?: boolean;
  hint?: string;
  createOnly?: boolean;
  span?: boolean;
}

export interface ResourceConfig {
  path: string;
  title: string;
  subtitle?: string;
  perm: string;
  columns: ColumnDef[];
  filters?: { key: string; label: string; enumGroup?: string; values?: string[]; options?: { value: string; label: string }[]; lookup?: string }[];
  fields?: FieldDef[];
  create?: boolean;
  edit?: boolean;
  remove?: boolean;
  searchable?: boolean;
  defaultSort?: string;
  pageSize?: number;
  rowTo?: (row: any) => string | null;
  opUrl?: (row: any, code: string) => string;
  opBody?: (row: any, code: string, extra: { reasonCode?: string; note?: string }) => Record<string, unknown>;
  details?: (row: any) => React.ReactNode;
  toolbar?: React.ReactNode;
  extraQuery?: Record<string, string | undefined>;
  initial?: Record<string, unknown>;
}

/** Enum qrupunun bütün kodları — tərcümə faylından oxunur (kodlar və etiketlər bir yerdə saxlanılır). */
export function enumKeys(group: string): string[] {
  const all = loadMessages("az") as { enum?: Record<string, Record<string, string>> };
  return Object.keys(all.enum?.[group] ?? {});
}

export function useLookups() {
  return useApi<any>("/admin/lookups", { staleTime: 120_000 });
}

export function Cell({ row, col }: { row: any; col: ColumnDef }) {
  const { money, date, dateTime, enumLabel, text, num, t } = useI18n();
  if (col.render) return <>{col.render(row)}</>;
  const v = col.key.split(".").reduce((o, k) => (o == null ? o : o[k]), row);
  const main = (() => {
    switch (col.type) {
      case "money": return v ? money(v) : "—";
      case "date": return v ? date(v) : "—";
      case "datetime": return v ? dateTime(v) : "—";
      case "enum": return <EnumBadge group={col.group!} code={v} />;
      case "badge": return v ? <span className="badge">{col.group ? enumLabel(col.group, v) : String(v)}</span> : "—";
      case "bool": return v ? <span className="badge badge-success">{t("common.yes")}</span> : <span className="badge">{t("common.no")}</span>;
      case "i18n": return text(v) || "—";
      case "number": return v === null || v === undefined ? "—" : num(v);
      case "percent": return v === null || v === undefined ? "—" : `${v}%`;
      case "list": return Array.isArray(v) && v.length ? v.map((x) => (col.group ? enumLabel(col.group, x) : text(x))).join(", ") : "—";
      default: return v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? text(v) : String(v);
    }
  })();
  if (!col.sub) return <>{main}</>;
  const sub = col.sub.split(".").reduce((o: any, k) => (o == null ? o : o[k]), row);
  return <span>{main}{sub ? <small className="block">{typeof sub === "object" ? text(sub) : String(sub)}</small> : null}</span>;
}

function useOptions(f: { options?: { value: string; label: string }[]; enumGroup?: string; enumValues?: string[]; values?: string[]; lookup?: string }, lookups: any) {
  const { enumLabel, text } = useI18n();
  return useMemo(() => {
    if (f.options) return f.options;
    const values = f.enumValues ?? f.values ?? (f.enumGroup ? enumKeys(f.enumGroup) : undefined);
    if (values) return values.map((v) => ({ value: v, label: f.enumGroup ? enumLabel(f.enumGroup, v) : v }));
    if (f.lookup && lookups) return (lookups[f.lookup] ?? []).map((x: any) => ({ value: x.id ?? x.code, label: text(x.name ?? x.label ?? x.sku ?? x.code) }));
    return [];
  }, [f, lookups, enumLabel, text]);
}

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { t, enumLabel } = useI18n();
  const { can } = useSession();
  const lookups = useLookups();
  const [editing, setEditing] = useState<any | null>(null);
  const [removing, setRemoving] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const refresh = useRefresh();
  const res = config.perm;
  const canCreate = config.create !== false && !!config.fields?.length && (can(`${res}:create`) || can(`${res}:edit`));
  const canEdit = config.edit !== false && !!config.fields?.length && can(`${res}:edit`);
  const canDelete = !!config.remove && can(`${res}:delete`);
  const hasOps = !!config.opUrl;
  const columns: TableColumn<any>[] = [
    ...config.columns.map((c) => ({ key: c.key, header: c.label, sortKey: c.sort ? c.key : undefined, hideOnMobile: c.mobile === false, className: c.type === "money" || c.type === "number" ? "num" : undefined, render: (row: any) => <Cell row={row} col={c} /> })),
    ...(canEdit || canDelete || hasOps || config.details
      ? [{
          key: "_actions",
          header: "",
          render: (row: any) => (
            <span className="flex gap-1 items-center justify-end flex-wrap">
              {hasOps && row.availableActions?.length ? <RowOps row={row} config={config} /> : null}
              {config.details && <button type="button" className="btn ghost btn-sm" onClick={() => setViewing(row)}>{t("common.details")}</button>}
              {canEdit && <button type="button" className="icon-button" aria-label={t("common.edit")} onClick={() => setEditing(row)}><Pencil size={14} /></button>}
              {canDelete && <button type="button" className="icon-button" aria-label={t("common.delete")} onClick={() => setRemoving(row)}><Trash2 size={14} /></button>}
            </span>
          ),
        }]
      : []),
  ];
  const filters: TableFilter[] = (config.filters ?? []).map((f) => ({ key: f.key, label: f.label, options: f.options ?? (f.values ?? (f.enumGroup ? enumKeys(f.enumGroup) : [])).map((v) => ({ value: v, label: f.enumGroup ? enumLabel(f.enumGroup, v) : v })) }));
  const lookupFilters = (config.filters ?? []).filter((f) => f.lookup);
  lookupFilters.forEach((f) => {
    const target = filters.find((x) => x.key === f.key)!;
    target.options = (lookups.data?.[f.lookup!] ?? []).map((x: any) => ({ value: x.id ?? x.code, label: x.name ?? x.label }));
  });
  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitle} actions={<>{config.toolbar}{canCreate && <button type="button" className="btn primary" onClick={() => setEditing({ ...(config.initial ?? {}) })}><Plus size={16} /> {t("common.create")}</button>}</>} />
      <ResourceTable path={config.path} columns={columns} filters={filters} searchable={config.searchable !== false} defaultSort={config.defaultSort} pageSize={config.pageSize ?? 25} rowTo={config.rowTo} extraQuery={config.extraQuery} />
      {editing && <ResourceForm config={config} record={editing} lookups={lookups.data} onClose={() => setEditing(null)} />}
      {viewing && config.details && <Dialog open size="lg" title={config.title} onClose={() => setViewing(null)}>{config.details(viewing)}</Dialog>}
      <ConfirmDialog
        open={!!removing}
        danger
        title={t("common.delete")}
        text={t("adm.common.deleteText")}
        onClose={() => setRemoving(null)}
        onConfirm={async () => { try { await del(`${config.path}/${removing.id}`); await refresh(); toast.success(t("common.deleted")); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } setRemoving(null); }}
      />
    </>
  );
}

function RowOps({ row, config }: { row: any; config: ResourceConfig }) {
  const refresh = useRefresh();
  return (
    <ActionBar
      size="sm"
      actions={row.availableActions as ApiAction[]}
      run={async (a, extra) => {
        const body = config.opBody ? config.opBody(row, a.code, extra) : { note: extra.note || extra.reasonCode, reason: extra.note || extra.reasonCode, reasonCode: extra.reasonCode };
        await post(config.opUrl!(row, a.code), body);
        await refresh();
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Forma                                                                */
/* ------------------------------------------------------------------ */

export function ResourceForm({ config, record, lookups, onClose, onSaved }: { config: Pick<ResourceConfig, "path" | "fields" | "title">; record: any; lookups: any; onClose: () => void; onSaved?: (r: any) => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const isNew = !record.id;
  const fields = (config.fields ?? []).filter((f) => isNew || !f.createOnly);
  const [values, setValues] = useState<Record<string, any>>(() => Object.fromEntries(fields.map((f) => [f.name, initialValue(f, record)])));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      let v = values[f.name];
      if (f.type === "number") v = v === "" || v === null ? null : Number(v);
      if (f.type === "cents") v = v === "" || v === null ? null : Math.round(Number(v) * 100);
      if (f.type === "json") { try { v = v ? JSON.parse(v) : null; } catch { setErrors({ [f.name]: ["validation.invalid"] }); setBusy(false); return; } }
      if ((f.type === "date" || f.type === "datetime") && v) v = new Date(v).toISOString();
      body[f.name] = v;
    }
    try {
      const r = isNew ? await post(config.path, body) : await patch(`${config.path}/${record.id}`, body);
      await refresh();
      toast.success(t("common.saved"));
      onSaved?.(r);
      onClose();
    } catch (e: any) {
      setError(e);
      if (e?.fieldErrors) setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={isNew ? `${config.title} — ${t("common.create")}` : `${config.title} — ${t("common.edit")}`} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{t("common.save")}</button></>}>
      <FormError error={error} />
      {!isNew && <p className="text-sm text-muted mb-3">{t("adm.common.auditHint")}</p>}
      <div className="kit-form-grid">
        {fields.map((f) => (
          <FieldInput key={f.name} field={f} value={values[f.name]} error={errors[f.name] ?? errors[f.name.replace(/I18n$/, "")]} lookups={lookups} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
        ))}
      </div>
    </Dialog>
  );
}

function initialValue(f: FieldDef, record: any) {
  const raw = record[f.name] ?? (f.name.endsWith("I18n") ? record[f.name] : undefined);
  switch (f.type) {
    case "bool": return raw ?? false;
    case "multi": return raw ?? [];
    case "i18n":
    case "i18nText": return raw ?? (typeof record[f.name.replace(/I18n$/, "")] === "object" ? record[f.name.replace(/I18n$/, "")] : { az: record[f.name.replace(/I18n$/, "")] ?? "", ru: "", en: "" });
    case "cents": return raw === null || raw === undefined ? "" : (Number(raw) / 100).toFixed(2);
    case "json": return raw ? JSON.stringify(raw, null, 2) : "";
    case "date": return raw ? String(raw).slice(0, 10) : "";
    case "datetime": return raw ? String(raw).slice(0, 16) : "";
    default: return raw ?? "";
  }
}

export function FieldInput({ field: f, value, onChange, error, lookups }: { field: FieldDef; value: any; onChange: (v: any) => void; error?: string[]; lookups: any }) {
  const { t } = useI18n();
  const options = useOptions(f, lookups);
  const cls = f.span || f.type === "textarea" || f.type === "i18n" || f.type === "i18nText" || f.type === "multi" || f.type === "json" ? "span-2" : undefined;
  switch (f.type) {
    case "textarea":
      return <TextArea className={cls} label={f.label} required={f.required} value={value} onValue={onChange} error={error} hint={f.hint} />;
    case "json":
      return <TextArea className={cls} label={f.label} value={value} onValue={onChange} error={error} hint={f.hint} rows={5} />;
    case "select":
      return <SelectField className={cls} label={f.label} required={f.required} value={value ?? ""} onValue={onChange} options={options} placeholder={t("common.choose")} error={error} hint={f.hint} />;
    case "bool":
      return <div className={cn("kit-field", cls)}><Toggle label={f.label} checked={!!value} onValue={onChange} />{f.hint && <p className="kit-field-hint">{f.hint}</p>}</div>;
    case "multi":
      return (
        <fieldset className={cn("kit-field", cls)}>
          <legend className="form-label mb-2">{f.label}</legend>
          <div className="flex flex-wrap gap-3">
            {options.map((o) => <Check key={o.value} label={o.label} checked={(value ?? []).includes(o.value)} onValue={(c) => onChange(c ? [...(value ?? []), o.value] : (value ?? []).filter((x: string) => x !== o.value))} />)}
          </div>
          {error && <p className="kit-field-error">{error[0]}</p>}
        </fieldset>
      );
    case "i18n":
    case "i18nText":
      return <I18nInput className={cls} label={f.label} required={f.required} value={value} onChange={onChange} error={error} multiline={f.name.toLowerCase().includes("body") || f.name.toLowerCase().includes("description") || f.name.toLowerCase().includes("answer")} />;
    case "color":
      return <TextField className={cls} label={f.label} type="color" value={value || "#0f766e"} onValue={onChange} error={error} />;
    case "cents":
      return <TextField className={cls} label={f.label} inputMode="decimal" value={value} onValue={(v) => onChange(v.replace(",", "."))} error={error} hint={f.hint ?? "AZN"} />;
    default:
      return <TextField className={cls} label={f.label} required={f.required} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} value={value ?? ""} onValue={onChange} error={error} hint={f.hint} />;
  }
}

export function I18nInput({ label, value, onChange, required, error, multiline, className }: { label: string; value: { az: string; ru: string; en: string } | null; onChange: (v: any) => void; required?: boolean; error?: string[]; multiline?: boolean; className?: string }) {
  const { t } = useI18n();
  const [lang, setLang] = useState<"az" | "ru" | "en">("az");
  const v = value ?? { az: "", ru: "", en: "" };
  return (
    <div className={cn("kit-field kit-i18n-tabs", className)}>
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <span className="form-label">{label}{required && <span className="text-danger"> *</span>}</span>
        <div className="kit-segment" role="tablist" aria-label={t("common.language")}>
          {(["az", "ru", "en"] as const).map((l) => <button key={l} type="button" role="tab" aria-selected={lang === l} className={cn(lang === l && "active")} onClick={() => setLang(l)}>{l.toUpperCase()}{!v[l] && l !== "az" ? " •" : ""}</button>)}
        </div>
      </div>
      {multiline ? (
        <textarea className="form-input form-textarea" rows={4} value={v[lang] ?? ""} aria-label={`${label} (${lang})`} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} />
      ) : (
        <input className="form-input" value={v[lang] ?? ""} aria-label={`${label} (${lang})`} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} />
      )}
      {!v.ru || !v.en ? <p className="kit-field-hint">{t("adm.common.fallbackHint")}</p> : null}
      {error && <p className="kit-field-error">{error[0]}</p>}
    </div>
  );
}

/** Obyektin bütün sadə sahələrini göstərir (detal dialoqu üçün). */
export function RecordView({ row, fields }: { row: any; fields: ColumnDef[] }) {
  return <KeyValue cols={2} items={fields.map((f) => [f.label, <Cell key={f.key} row={row} col={f} />])} />;
}

export function Busy() {
  return <Loading rows={6} />;
}
