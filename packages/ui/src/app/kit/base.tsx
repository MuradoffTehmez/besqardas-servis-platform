"use client";
import React, { useEffect, useId, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, Search, Star, WifiOff, X } from "lucide-react";
import { cn } from "@sp/utils";
import { ApiError, isUnreachable } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";

/* ------------------------------------------------------------------ */
/* Səhifə quruluşu                                                     */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, subtitle, actions, back, crumbs, badge }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: string; crumbs?: { label: string; to?: string }[]; badge?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="pg-header">
      {crumbs?.length ? (
        <nav className="pg-crumbs" aria-label={t("common.breadcrumbs")}>
          {crumbs.map((c, i) => (
            <span key={i}>
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              {i < crumbs.length - 1 && <ChevronRight size={14} aria-hidden />}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="pg-header-row">
        <div className="pg-title">
          {back && (
            <Link to={back} className="icon-button" aria-label={t("common.back")}>
              <ArrowLeft size={18} />
            </Link>
          )}
          <div>
            <h1>
              {title} {badge}
            </h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="pg-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ title, actions, children, className, subtitle, flush, id }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; subtitle?: React.ReactNode; flush?: boolean; id?: string }) {
  return (
    <section className={cn("kit-card", flush && "flush", className)} id={id}>
      {(title || actions) && (
        <div className="kit-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="kit-card-actions">{actions}</div>}
        </div>
      )}
      <div className="kit-card-body">{children}</div>
    </section>
  );
}

export function Grid({ cols = 2, children, className }: { cols?: 1 | 2 | 3 | 4; children: React.ReactNode; className?: string }) {
  return <div className={cn("kit-grid", `cols-${cols}`, className)}>{children}</div>;
}

export function Stat({ label, value, hint, tone = "default", icon: Icon, to }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; tone?: string; icon?: React.ComponentType<{ size?: number }>; to?: string }) {
  const body = (
    <>
      <div className="kit-stat-top">
        <span className="kit-stat-label">{label}</span>
        {Icon && (
          <span className="kit-stat-icon">
            <Icon size={18} />
          </span>
        )}
      </div>
      <strong className="kit-stat-value">{value}</strong>
      {hint && <span className="kit-stat-hint">{hint}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={cn("kit-stat", `tone-${tone}`, "clickable")}>
      {body}
    </Link>
  ) : (
    <div className={cn("kit-stat", `tone-${tone}`)}>{body}</div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: React.ReactNode; badge?: number | string | null }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="kit-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" type="button" aria-selected={tab.id === value} className={cn("kit-tab", tab.id === value && "active")} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && <span className="kit-tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ items, cols = 2 }: { items: [React.ReactNode, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("kit-kv", `cols-${cols}`)}>
      {items.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, tone = "sky", size = 36 }: { name: string; tone?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span className={cn("kit-avatar", `tone-${tone}`)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials || "?"}
    </span>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  const { t } = useI18n();
  return (
    <span className="kit-stars" aria-label={t("common.ratingOf", { value })}>
      <Star size={14} fill="currentColor" />
      <strong>{value ? value.toFixed(1) : "—"}</strong>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}

const TONE_BY_CODE: [RegExp, string][] = [
  [/(CANCEL|REJECT|FAIL|EXPIRED|BLOCK|VOID|DOWN|DISCREPANCY|OUT_OF_STOCK|REVOKED|DISPUTED|PAST_DUE)/, "danger"],
  [/(WAIT|PENDING|HOLD|DRAFT|LOW|GRACE|EXPIRING|REQUESTED|UNDER_REVIEW|DEGRADED|PARTIAL|RETURN_REQUESTED|PENDING_PAYMENT|INVITED|ON_THE_WAY|ARRIVED|IN_TRANSIT)/, "warning"],
  [/(COMPLETED|CLOSED|PAID|ACTIVE|APPROVED|VERIFIED|DELIVERED|IN_STOCK|PUBLISHED|RECEIVED|DONE|OK|ACCEPTED|CONFIRMED|CONVERTED|REFUNDED|ISSUED|ACKNOWLEDGED)/, "success"],
  [/(NEW|READY|ASSIGNED|IN_PROGRESS|PROCESSING|SENT|SHIPPED|PLANNED|TRIAL|PICKED_UP|INITIATED)/, "info"],
];

export function toneFor(code: string | null | undefined) {
  if (!code) return "default";
  for (const [re, tone] of TONE_BY_CODE) if (re.test(code)) return tone;
  return "default";
}

export function EnumBadge({ group, code, tone }: { group: string; code: string | null | undefined; tone?: string }) {
  const { enumLabel } = useI18n();
  if (!code) return <span className="text-muted">—</span>;
  return <span className={cn("badge", `badge-${tone ?? toneFor(code)}`)}>{enumLabel(group, code)}</span>;
}

/* ------------------------------------------------------------------ */
/* Vəziyyətlər: yüklənir / boş / xəta (PRD §75.2)                       */
/* ------------------------------------------------------------------ */

export function Loading({ rows = 3, label }: { rows?: number; label?: string }) {
  const { t } = useI18n();
  return (
    <div className="kit-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${95 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="kit-spin" aria-hidden />;
}

export function errorText(e: unknown, fallback: string) {
  if (isUnreachable(e)) return fallback;
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useI18n();
  const status = error instanceof ApiError ? error.status : 0;
  const goBack = useGoBack("/");
  const missing = status === 403 || status === 404;
  const offline = isUnreachable(error);
  return (
    <div className="kit-state error" role="alert">
      {offline ? <WifiOff size={28} /> : <AlertTriangle size={28} />}
      <h3>{offline ? t("errors.offlineTitle") : title ?? (status === 403 ? t("errors.forbiddenTitle") : status === 404 ? t("errors.notFoundTitle") : t("errors.loadFailed"))}</h3>
      <p>{offline ? t("errors.offlineText") : errorText(error, t("errors.generic"))}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        {missing && (
          <button className="btn primary btn-sm" onClick={goBack} type="button">
            <ArrowLeft size={14} /> {t("common.back")}
          </button>
        )}
        {onRetry && !missing && (
          <button className="btn outline btn-sm" onClick={onRetry} type="button">
            <RefreshCw size={14} /> {t("common.retry")}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action, icon: Icon = Inbox }: { title?: React.ReactNode; text?: React.ReactNode; action?: React.ReactNode; icon?: React.ComponentType<{ size?: number }> }) {
  const { t } = useI18n();
  return (
    <div className="kit-state empty">
      <Icon size={30} />
      <h3>{title ?? t("common.emptyTitle")}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Sorğu nəticəsini yükləmə, xəta və boş halları ilə göstərir. */
export function QueryView<T>({ query, children, empty, isEmpty, rows }: { query: { data: T | undefined; isLoading: boolean; error: unknown; refetch: () => unknown }; children: (data: T) => React.ReactNode; empty?: React.ReactNode; isEmpty?: (data: T) => boolean; rows?: number }) {
  if (query.isLoading) return <Loading rows={rows} />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return <Loading rows={rows} />;
  const data = query.data;
  const emptyNow = isEmpty ? isEmpty(data) : Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items.length === 0 : Array.isArray(data) ? data.length === 0 : false;
  if (emptyNow) return <>{empty ?? <EmptyState />}</>;
  return <>{children(data)}</>;
}

export function Pagination({ meta, onPage }: { meta: { page: number; totalPages: number; total: number; pageSize: number } | undefined; onPage: (page: number) => void }) {
  const { t } = useI18n();
  if (!meta || meta.totalPages <= 1) return meta ? <div className="kit-pagination"><span className="text-muted text-sm">{t("common.totalCount", { count: meta.total })}</span></div> : null;
  return (
    <nav className="kit-pagination" aria-label={t("common.pagination")}>
      <span className="text-muted text-sm">{t("common.pageOf", { page: meta.page, pages: meta.totalPages, total: meta.total })}</span>
      <div className="flex gap-2">
        <button className="btn btn-sm outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} type="button" aria-label={t("common.prev")}>
          <ChevronLeft size={14} />
        </button>
        <button className="btn btn-sm outline" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} type="button" aria-label={t("common.next")}>
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const { t } = useI18n();
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const h = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(h);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="kit-search">
      <Search size={16} aria-hidden />
      <input type="search" value={local} placeholder={placeholder ?? t("common.search")} aria-label={placeholder ?? t("common.search")} onChange={(e) => setLocal(e.target.value)} autoFocus={autoFocus} />
      {local && (
        <button type="button" onClick={() => { setLocal(""); onChange(""); }} aria-label={t("common.clear")}>
          <X size={14} />
        </button>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Form sahələri                                                        */
/* ------------------------------------------------------------------ */

export function Field({ label, error, hint, required, children, className }: { label?: React.ReactNode; error?: string | string[] | null; hint?: React.ReactNode; required?: boolean; children: (id: string, describedBy: string | undefined) => React.ReactNode; className?: string }) {
  const id = useId();
  const { validation } = useI18n();
  const msg = Array.isArray(error) ? error[0] : error;
  const describedBy = msg ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("form-group kit-field", msg && "has-error", className)}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span className="text-danger" aria-hidden> *</span>}
        </label>
      )}
      {children(id, describedBy)}
      {msg ? (
        <p className="kit-field-error" id={`${id}-err`} role="alert">
          {validation(msg)}
        </p>
      ) : hint ? (
        <p className="kit-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label?: React.ReactNode; error?: string | string[] | null; hint?: React.ReactNode; onValue?: (v: string) => void; onChange?: React.ChangeEventHandler<HTMLInputElement> };

export function TextField({ label, error, hint, required, onValue, onChange, className, ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!error || undefined} className={cn("form-input", error && "input-error")} required={required} onChange={(e) => { onChange?.(e); onValue?.(e.target.value); }} {...rest} />}
    </Field>
  );
}

export function TextArea({ label, error, hint, required, onValue, className, rows = 3, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & { label?: React.ReactNode; error?: string | string[] | null; hint?: React.ReactNode; onValue?: (v: string) => void }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, d) => <textarea id={id} aria-describedby={d} aria-invalid={!!error || undefined} rows={rows} className={cn("form-input form-textarea", error && "input-error")} required={required} onChange={(e) => onValue?.(e.target.value)} {...rest} />}
    </Field>
  );
}

export function SelectField({ label, error, hint, required, options, value, onValue, placeholder, className, disabled }: { label?: React.ReactNode; error?: string | string[] | null; hint?: React.ReactNode; required?: boolean; options: { value: string; label: string; disabled?: boolean }[]; value: string; onValue: (v: string) => void; placeholder?: string; className?: string; disabled?: boolean }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, d) => (
        <select id={id} aria-describedby={d} aria-invalid={!!error || undefined} className={cn("form-input", error && "input-error")} value={value} onChange={(e) => onValue(e.target.value)} required={required} disabled={disabled}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Check({ label, checked, onValue, disabled, hint }: { label: React.ReactNode; checked: boolean; onValue: (v: boolean) => void; disabled?: boolean; hint?: React.ReactNode }) {
  return (
    <label className={cn("kit-check", disabled && "disabled")}>
      <input type="checkbox" checked={checked} onChange={(e) => onValue(e.target.checked)} disabled={disabled} />
      <span>
        {label}
        {hint && <small className="block text-muted">{hint}</small>}
      </span>
    </label>
  );
}

export function Toggle({ label, checked, onValue, disabled }: { label: React.ReactNode; checked: boolean; onValue: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("kit-toggle", disabled && "disabled")}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onValue(e.target.checked)} disabled={disabled} />
      <span className="kit-toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Radios<T extends string>({ name, value, onValue, options, columns = 1 }: { name: string; value: T; onValue: (v: T) => void; options: { value: T; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean; badge?: React.ReactNode }[]; columns?: number }) {
  return (
    <div className="kit-radios" role="radiogroup" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${columns > 1 ? 220 : 400}px), 1fr))` }}>
      {options.map((o) => (
        <label key={o.value} className={cn("choice-card kit-radio", value === o.value && "active", o.disabled && "disabled")}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onValue(o.value)} />
          <span className="flex justify-between items-center gap-2">
            <strong>{o.label}</strong>
            {o.badge}
          </span>
          {o.hint && <small className="text-muted">{o.hint}</small>}
        </label>
      ))}
    </div>
  );
}

/** Kiçik form vəziyyəti köməkçisi — server `fieldErrors` sahələrə bağlanır. */
export function useFormState<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  };
  const fromError = (e: unknown) => {
    if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
  };
  return { values, setValues, set, errors, setErrors, fromError, reset: () => { setValues(initial); setErrors({}); } };
}

export function FormError({ error }: { error: unknown }) {
  const { t, validation } = useI18n();
  if (!error) return null;
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  const general = fieldErrors._?.[0];
  return (
    <div className="alert alert-danger kit-form-error" role="alert">
      {general ? validation(general) : errorText(error, t("errors.generic"))}
    </div>
  );
}

export function useGoBack(fallback: string) {
  const { navigate } = useRouter();
  return () => (typeof window !== "undefined" && window.history.length > 1 ? window.history.back() : navigate(fallback));
}
