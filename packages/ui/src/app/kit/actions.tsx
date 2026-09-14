"use client";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDownUp, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@sp/utils";
import { qs, useApi } from "@sp/api-client";
import { Modal } from "../../components/ui/modal";
import { useI18n } from "../core/i18n";
import { useRouter } from "../core/router";
import { EmptyState, ErrorState, FormError, Loading, Pagination, SearchBox, SelectField, TextArea, errorText } from "./base";

/* ------------------------------------------------------------------ */
/* Dialoqlar                                                            */
/* ------------------------------------------------------------------ */

export function Dialog({ open, onClose, title, subtitle, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} maxWidth={size}>
      <div className="kit-dialog-body">{children}</div>
      {footer && <div className="kit-dialog-footer">{footer}</div>}
    </Modal>
  );
}

/** Kritik əməliyyatlar üçün təsdiq dialoqu (PRD §70). */
export function ConfirmDialog({ open, onClose, onConfirm, title, text, danger, confirmLabel, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title: React.ReactNode; text?: React.ReactNode; danger?: boolean; confirmLabel?: string; busy?: boolean }) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn outline" type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className={cn("btn", danger ? "danger" : "primary")} type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel ?? t("common.confirm")}
          </button>
        </>
      }
    >
      {text && <p>{text}</p>}
    </Dialog>
  );
}

/** Səbət kodu tələb edən əməliyyatlar — kodlar admin tərəfindən idarə olunur (PRD §18.4). */
export function ReasonDialog({ open, onClose, onSubmit, category, title, busy, error, withNote = true, extra }: { open: boolean; onClose: () => void; onSubmit: (reasonCode: string, note: string) => void; category: string; title: React.ReactNode; busy?: boolean; error?: unknown; withNote?: boolean; extra?: React.ReactNode }) {
  const { t, text } = useI18n();
  const reasons = useApi<{ code: string; label: unknown }[]>(open ? `/reason-codes?category=${category}` : null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn outline" type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn primary" type="button" disabled={!code || busy} onClick={() => onSubmit(code, note)}>
            {t("common.confirm")}
          </button>
        </>
      }
    >
      <FormError error={error} />
      {reasons.isLoading ? (
        <Loading rows={2} />
      ) : (
        <SelectField label={t("common.reason")} required value={code} onValue={setCode} placeholder={t("common.choose")} options={(reasons.data ?? []).map((r) => ({ value: r.code, label: text(r.label) }))} />
      )}
      {extra}
      {withNote && <TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} />}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* availableActions düymələri                                           */
/* ------------------------------------------------------------------ */

export interface ApiAction {
  code: string;
  stageId?: string;
  requiresReason?: boolean;
  reasonCategory?: string;
  variant?: "primary" | "secondary" | "destructive";
  payload?: Record<string, unknown>;
}

/**
 * Backend-in qaytardığı əməliyyatları göstərir. Frontend status keçidini özü müəyyən etmir (PRD §18.4).
 * `custom` — xüsusi dialoq tələb edən kodlar (smeta, təhvil və s.) üçün çağırılır.
 */
/** "Daha çox" açılan menyusu — ikinci dərəcəli əməliyyatlar üçün. */
export function MoreMenu({ children, size = "md", disabled, label }: { children: (close: () => void) => React.ReactNode; size?: "sm" | "md"; disabled?: boolean; label?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="kit-dropdown" ref={ref}>
      <button type="button" className={cn("btn outline", size === "sm" && "btn-sm")} disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} /> {label ?? t("actions.more")}
      </button>
      {open && <div className="kit-dropdown-menu kit-more-menu" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function ActionBar({ actions, run, custom, exclude = [], size = "md", labelPrefix = "actions", maxInline = 3 }: { actions: ApiAction[]; run: (action: ApiAction, extra: { reasonCode?: string; note?: string }) => Promise<unknown>; custom?: Record<string, (a: ApiAction) => void>; exclude?: string[]; size?: "sm" | "md"; labelPrefix?: string; maxInline?: number }) {
  const { t } = useI18n();
  const [reasonFor, setReasonFor] = useState<ApiAction | null>(null);
  const [confirmFor, setConfirmFor] = useState<ApiAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const visible = actions.filter((a) => !exclude.includes(a.code));
  if (!visible.length) return null;
  const exec = async (a: ApiAction, extra: { reasonCode?: string; note?: string } = {}) => {
    setBusy(true);
    setError(null);
    try {
      await run(a, extra);
      toast.success(t("actions.done", { action: t(`${labelPrefix}.${a.code}`) }));
      setReasonFor(null);
      setConfirmFor(null);
    } catch (e) {
      setError(e);
      if (!a.requiresReason) toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  };
  const click = (a: ApiAction) => {
    if (custom?.[a.code]) return custom[a.code]!(a);
    if (a.requiresReason) return setReasonFor(a);
    if (a.variant === "destructive") return setConfirmFor(a);
    void exec(a);
  };
  // Əsas əməliyyatlar görünür, qalanları "Daha çox" menyusundadır — ekran sadə qalır
  const ordered = [...visible.filter((a) => a.variant === "primary"), ...visible.filter((a) => a.variant !== "primary" && a.variant !== "destructive"), ...visible.filter((a) => a.variant === "destructive")];
  const inline = ordered.length <= maxInline + 1 ? ordered : ordered.slice(0, maxInline);
  const overflow = ordered.slice(inline.length);
  const label = (a: ApiAction) => (
    <>
      {t(`${labelPrefix}.${a.code}`)}
      {(a.payload as { onBehalf?: boolean } | undefined)?.onBehalf && <span className="kit-behalf" title={t("actions.onBehalfHint")}>*</span>}
    </>
  );
  return (
    <>
      <div className="kit-actionbar">
        {inline.map((a, i) => (
          <button key={`${a.code}-${a.stageId ?? i}`} type="button" disabled={busy} className={cn("btn", size === "sm" && "btn-sm", a.variant === "primary" ? "primary" : a.variant === "destructive" ? "outline danger-outline" : "outline")} onClick={() => click(a)}>
            {label(a)}
          </button>
        ))}
        {overflow.length > 0 && (
          <MoreMenu size={size} disabled={busy}>
            {(close) => overflow.map((a, i) => (
              <button key={`${a.code}-${a.stageId ?? i}`} type="button" role="menuitem" className={cn("dropdown-item", a.variant === "destructive" && "danger")} onClick={() => { close(); click(a); }}>
                {label(a)}
              </button>
            ))}
          </MoreMenu>
        )}
      </div>
      {reasonFor && (
        <ReasonDialog open onClose={() => setReasonFor(null)} category={reasonFor.reasonCategory ?? "CANCELLED"} title={t(`${labelPrefix}.${reasonFor.code}`)} busy={busy} error={error} onSubmit={(reasonCode, note) => exec(reasonFor, { reasonCode, note })} />
      )}
      {confirmFor && <ConfirmDialog open danger busy={busy} onClose={() => setConfirmFor(null)} title={t(`${labelPrefix}.${confirmFor.code}`)} text={t("actions.confirmText")} onConfirm={() => exec(confirmFor)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Server-side cədvəl (PRD §69)                                         */
/* ------------------------------------------------------------------ */

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortKey?: string;
  className?: string;
  hideOnMobile?: boolean;
}

export interface TableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

/** URL-də saxlanılan filtr, sort və pagination ilə server-side cədvəl. */
export function ResourceTable<T extends { id: string }>({ path, columns, filters = [], rowTo, searchable = true, defaultSort, pageSize = 20, toolbar, empty, extraQuery = {}, dense, selectable, bulkActions, queryPrefix = "" }: { path: string; columns: TableColumn<T>[]; filters?: TableFilter[]; rowTo?: (row: T) => string | null; searchable?: boolean; defaultSort?: string; pageSize?: number; toolbar?: React.ReactNode; empty?: React.ReactNode; extraQuery?: Record<string, string | undefined>; dense?: boolean; selectable?: boolean; bulkActions?: (ids: string[], clear: () => void) => React.ReactNode; queryPrefix?: string }) {
  const { t } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [colsOpen, setColsOpen] = useState(false);
  const p = (k: string) => `${queryPrefix}${k}`;
  const state = {
    q: query.get(p("q")) ?? "",
    page: Number(query.get(p("page")) ?? 1),
    sort: query.get(p("sort")) ?? defaultSort ?? "",
    ...Object.fromEntries(filters.map((f) => [f.key, query.get(p(f.key)) ?? ""])),
  } as Record<string, string | number>;
  const url = `${path}${qs({ ...Object.fromEntries(filters.map((f) => [f.key, state[f.key]])), q: state.q, page: state.page, pageSize, sort: state.sort, ...extraQuery })}`;
  const q = useApi<{ items: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>(url, { placeholderData: (prev) => prev });
  const cols = columns.filter((c) => !hidden.includes(c.key));
  const toggleSort = (key: string) => {
    const cur = String(state.sort);
    setQuery({ [p("sort")]: cur === key ? `-${key}` : key, [p("page")]: 1 });
  };
  const exportCsv = () => {
    const rows = q.data?.items ?? [];
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = cols.map((c) => esc(typeof c.header === "string" ? c.header : c.key)).join(",");
    const body = rows.map((r) => cols.map((c) => esc(typeof (r as Record<string, unknown>)[c.key] === "object" ? JSON.stringify((r as Record<string, unknown>)[c.key]) : (r as Record<string, unknown>)[c.key])).join(",")).join("\n");
    const blob = new Blob([`﻿${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${path.split("/").pop()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className={cn("kit-table", dense && "dense")}>
      <div className="kit-table-toolbar">
        {searchable && <SearchBox value={String(state.q)} onChange={(v) => setQuery({ [p("q")]: v, [p("page")]: 1 })} />}
        {filters.map((f) => (
          <SelectField key={f.key} className="kit-filter" label={undefined} value={String(state[f.key] ?? "")} onValue={(v) => setQuery({ [p(f.key)]: v, [p("page")]: 1 })} placeholder={f.label} options={f.options} />
        ))}
        <div className="kit-table-tools">
          {toolbar}
          <div className="kit-dropdown">
            <button type="button" className="btn outline btn-sm" onClick={() => setColsOpen((o) => !o)} aria-expanded={colsOpen}>
              {t("table.columns")} <ChevronDown size={14} />
            </button>
            {colsOpen && (
              <div className="kit-dropdown-menu" role="menu">
                {columns.map((c) => (
                  <label key={c.key} className="kit-check">
                    <input type="checkbox" checked={!hidden.includes(c.key)} onChange={(e) => setHidden((h) => (e.target.checked ? h.filter((x) => x !== c.key) : [...h, c.key]))} />
                    <span>{c.header}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn outline btn-sm" onClick={exportCsv} disabled={!q.data?.items.length}>
            {t("table.export")}
          </button>
        </div>
      </div>
      {selectable && selected.length > 0 && bulkActions && (
        <div className="kit-bulkbar">
          <span>{t("table.selected", { count: selected.length })}</span>
          {bulkActions(selected, () => setSelected([]))}
        </div>
      )}
      {q.isLoading ? (
        <Loading rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.items.length ? (
        empty ?? <EmptyState text={state.q ? t("table.noResultsFor", { q: state.q }) : undefined} />
      ) : (
        <div className="table-wrap" role="region" aria-label={t("table.region")} tabIndex={0}>
          <table className={cn(q.isFetching && "is-fetching")}>
            <thead>
              <tr>
                {selectable && (
                  <th className="kit-col-check">
                    <input type="checkbox" aria-label={t("table.selectAll")} checked={q.data.items.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? q.data!.items.map((r) => r.id) : [])} />
                  </th>
                )}
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={cn(c.className, c.hideOnMobile && "hide-mobile")} aria-sort={c.sortKey ? (state.sort === c.sortKey ? "ascending" : state.sort === `-${c.sortKey}` ? "descending" : "none") : undefined}>
                    {c.sortKey ? (
                      <button type="button" className="th-content" onClick={() => toggleSort(c.sortKey!)}>
                        {c.header} <ArrowDownUp size={12} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((row) => {
                const to = rowTo?.(row);
                return (
                  <tr key={row.id} className={cn(to && "clickable")} tabIndex={to ? 0 : undefined} onClick={(e) => { if (to && !(e.target as HTMLElement).closest("button,a,input,select,label")) navigate(to); }} onKeyDown={(e) => { if (to && e.key === "Enter" && e.target === e.currentTarget) navigate(to); }}>
                    {selectable && (
                      <td className="kit-col-check">
                        <input type="checkbox" aria-label={t("table.selectRow")} checked={selected.includes(row.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, row.id] : s.filter((x) => x !== row.id)))} />
                      </td>
                    )}
                    {cols.map((c) => (
                      <td key={c.key} className={cn(c.className, c.hideOnMobile && "hide-mobile")}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={q.data?.meta} onPage={(page) => setQuery({ [p("page")]: page })} />
    </div>
  );
}
