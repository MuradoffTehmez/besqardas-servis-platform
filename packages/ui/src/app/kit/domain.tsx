"use client";
import React from "react";
import { Check, CheckCircle2, Circle, Clock, Crown, Minus, Printer, QrCode, TriangleAlert, X } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../core/i18n";
import { EnumBadge, toneFor } from "./base";

/* ------------------------------------------------------------------ */
/* Qiymət, stok                                                         */
/* ------------------------------------------------------------------ */

export interface PriceDto {
  basePrice: { amount: string; currency: string };
  effectivePrice: { amount: string; currency: string };
  priceType: string;
  appliedDiscounts: { code: string; label: string; amount: { amount: string }; applied: boolean; skippedReason?: string | null }[];
  vat: { rate: string; included: boolean };
  tiers?: { minQuantity: string; price: { amount: string; currency: string } }[];
  unitPrices?: { unit: string; label: string; factor: string; price: { amount: string; currency: string } }[];
  installment?: { months: number; monthly: { amount: string; currency: string }; provider: string } | null;
}

/** API-nin hazır qiymət obyektini göstərir (PRD §46.4) — hesablama yoxdur. */
export function PriceTag({ price, size = "md", showVat, showInstallment }: { price: PriceDto | null | undefined; size?: "sm" | "md" | "lg"; showVat?: boolean; showInstallment?: boolean }) {
  const { t, money, enumLabel } = useI18n();
  if (!price) return <span className="text-muted">—</span>;
  const discounted = price.basePrice.amount !== price.effectivePrice.amount;
  return (
    <div className={cn("kit-price", `size-${size}`)}>
      <div className="flex items-end gap-2 flex-wrap">
        <strong className="kit-price-now">{money(price.effectivePrice)}</strong>
        {discounted && <s className="kit-price-old">{money(price.basePrice)}</s>}
        {price.priceType !== "RETAIL" && <span className="badge badge-info">{enumLabel("PriceType", price.priceType)}</span>}
      </div>
      {showVat && <small className="text-muted">{price.vat.included ? t("price.vatIncluded", { rate: Number(price.vat.rate) }) : t("price.vatExcluded", { rate: Number(price.vat.rate) })}</small>}
      {showInstallment && price.installment && <small className="kit-price-installment">{t("price.installment", { months: price.installment.months, monthly: money(price.installment.monthly), provider: price.installment.provider })}</small>}
    </div>
  );
}

export function StockPill({ status, label }: { status: string; label?: string }) {
  const { enumLabel } = useI18n();
  return <span className={cn("kit-stock", `tone-${toneFor(status)}`)}><span className="dot" />{label ?? enumLabel("StockStatus", status)}</span>;
}

/* ------------------------------------------------------------------ */
/* Workflow timeline (PRD §18.5)                                        */
/* ------------------------------------------------------------------ */

export interface StageDto {
  id: string;
  order: number;
  name: string;
  customerName: string | null;
  type: string;
  executor: string;
  status: string;
  mandatory: boolean;
  assigneeName: string | null;
  specializationName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  slaBreached: boolean;
  completionRequirements: string[];
  checklist: { label: string; done: boolean }[];
  photos: { id: string; name: string }[];
  note: string | null;
  signed: boolean;
  failReason: string | null;
}

export function StageTimeline({ stages, mode = "full", renderExtra, activeId }: { stages: StageDto[]; mode?: "customer" | "full" | "technician"; renderExtra?: (s: StageDto) => React.ReactNode; activeId?: string | null }) {
  const { t, enumLabel, dateTime } = useI18n();
  return (
    <ol className="kit-timeline">
      {stages.map((s) => {
        const done = s.status === "COMPLETED";
        const skipped = s.status === "SKIPPED" || s.status === "CANCELLED";
        const failed = s.status === "FAILED" || s.status === "BLOCKED";
        const active = !done && !skipped && s.status !== "PENDING";
        return (
          <li key={s.id} className={cn("kit-tl-item", done && "done", active && "active", failed && "failed", skipped && "skipped", activeId === s.id && "focus")}>
            <span className="kit-tl-dot" aria-hidden>
              {done ? <Check size={14} /> : failed ? <TriangleAlert size={13} /> : skipped ? <Minus size={13} /> : active ? <Clock size={13} /> : <Circle size={10} />}
            </span>
            <div className="kit-tl-body">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <strong>{mode === "customer" ? s.customerName ?? s.name : s.name}</strong>
                <span className="flex gap-2 items-center flex-wrap">
                  {!s.mandatory && mode !== "customer" && <span className="badge">{t("workflow.optional")}</span>}
                  {s.slaBreached && mode !== "customer" && <span className="badge badge-danger">SLA</span>}
                  <EnumBadge group="StageStatus" code={s.status} />
                </span>
              </div>
              {mode !== "customer" && (
                <div className="kit-tl-meta">
                  <span>{enumLabel("Executor", s.executor)}{s.specializationName ? ` · ${s.specializationName}` : ""}</span>
                  {s.assigneeName && <span>{s.assigneeName}</span>}
                  {s.dueAt && !done && <span className={cn(s.slaBreached && "text-danger")}>{t("workflow.due", { at: dateTime(s.dueAt) })}</span>}
                  {s.completionRequirements.length > 0 && <span>{s.completionRequirements.map((r) => enumLabel("Requirement", r)).join(", ")}</span>}
                </div>
              )}
              {(s.completedAt || s.startedAt) && <small className="text-muted">{done ? t("workflow.completedAt", { at: dateTime(s.completedAt) }) : s.startedAt ? t("workflow.startedAt", { at: dateTime(s.startedAt) }) : null}</small>}
              {s.failReason && <p className="text-danger text-sm">{s.failReason}</p>}
              {s.note && mode !== "customer" && <p className="text-sm">{s.note}</p>}
              {renderExtra?.(s)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Smeta (PRD §19)                                                      */
/* ------------------------------------------------------------------ */

export function EstimateView({ estimate, declined, onToggleDecline, compact }: { estimate: any; declined?: string[]; onToggleDecline?: (lineId: string) => void; compact?: boolean }) {
  const { t, money, qty, enumLabel, date } = useI18n();
  return (
    <div className="kit-estimate">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
        <div>
          <strong>{estimate.number}</strong> <span className="text-muted">· v{estimate.version}</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <EnumBadge group="EstimateStatus" code={estimate.status} />
          <small className="text-muted">{t("estimate.validUntil", { date: date(estimate.validUntil) })}</small>
        </div>
      </div>
      <div className="table-wrap">
        <table className="kit-estimate-table">
          <thead>
            <tr>
              {onToggleDecline && <th scope="col" className="kit-col-check">{t("estimate.include")}</th>}
              <th scope="col">{t("estimate.line")}</th>
              {!compact && <th scope="col">{t("estimate.type")}</th>}
              <th scope="col" className="num">{t("common.quantity")}</th>
              <th scope="col" className="num">{t("estimate.unitPrice")}</th>
              <th scope="col" className="num">{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((l: any) => {
              const isDeclined = l.declined || declined?.includes(l.id);
              return (
                <tr key={l.id} className={cn(isDeclined && "declined")}>
                  {onToggleDecline && (
                    <td className="kit-col-check">
                      <input type="checkbox" aria-label={t("estimate.includeLine", { name: l.name })} checked={!isDeclined} disabled={!l.optional} onChange={() => onToggleDecline(l.id)} />
                    </td>
                  )}
                  <td>
                    {l.name}
                    <div className="flex gap-1 flex-wrap mt-1">
                      {l.optional && <span className="badge">{t("estimate.optional")}</span>}
                      {l.ownMaterial && <span className="badge badge-info">{t("estimate.ownMaterial")}</span>}
                      {l.warrantyMonths ? <span className="badge badge-success">{t("estimate.warranty", { months: l.warrantyMonths })}</span> : null}
                      {l.sku && <small className="text-muted">{l.sku}</small>}
                    </div>
                  </td>
                  {!compact && <td>{enumLabel("EstimateLineType", l.type)}</td>}
                  <td className="num">{qty(l.quantity)}</td>
                  <td className="num">{money(l.unitPrice)}</td>
                  <td className="num">{money(l.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <dl className="kit-totals">
        <div><dt>{t("estimate.subtotal")}</dt><dd>{money(estimate.subtotal)}</dd></div>
        {estimate.appliedDiscounts.map((d: any) => (
          <div key={d.code} className="text-success"><dt>{d.label}</dt><dd>−{money(d.amount)}</dd></div>
        ))}
        <div className="text-muted"><dt>{t("estimate.vatIncluded")}</dt><dd>{money(estimate.vatTotal)}</dd></div>
        <div className="grand"><dt>{t("common.total")}</dt><dd>{money(estimate.total)}</dd></div>
      </dl>
      {declined && declined.length > 0 && <p className="text-sm text-muted">{t("estimate.partialHint")}</p>}
      {estimate.applicableFees?.length > 0 && (
        <div className="kit-note mt-3">
          <strong>{t("estimate.feesTitle")}</strong>
          <ul>
            {estimate.applicableFees.map((f: any, i: number) => (
              <li key={i}>{f.label}{Number(f.amount.amount) > 0 ? ` — ${f.amount.currency === "%" ? `${f.amount.amount}` : money(f.amount)}` : ""}</li>
            ))}
          </ul>
        </div>
      )}
      {estimate.previousVersions?.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm">{t("estimate.previousVersions", { count: estimate.previousVersions.length })}</summary>
          <ul className="text-sm">
            {estimate.previousVersions.map((v: any) => (
              <li key={v.version}>v{v.version} · {money(v.total)} · {enumLabel("EstimateStatus", v.status)} · {date(v.createdAt)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slot seçimi (PRD §16)                                                */
/* ------------------------------------------------------------------ */

export function SlotPicker({ days, value, onChange }: { days: { date: string; slots: { start: string; end: string; available: boolean; urgent?: boolean }[] }[]; value: string | null; onChange: (start: string) => void }) {
  const { t, time, locale } = useI18n();
  const urgent = days.find((d) => d.date === "URGENT");
  const regular = days.filter((d) => d.date !== "URGENT");
  const [dayIdx, setDayIdx] = React.useState(0);
  const day = regular[dayIdx];
  const weekday = (d: string) => new Intl.DateTimeFormat(locale === "az" ? "az-Latn-AZ" : locale, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Asia/Baku" }).format(new Date(`${d}T08:00:00Z`));
  if (!regular.length && !urgent) return <p className="text-muted">{t("booking.noSlots")}</p>;
  return (
    <div className="kit-slots">
      {urgent && urgent.slots[0] && (
        <button type="button" className={cn("choice-card kit-urgent", value === urgent.slots[0].start && "active")} disabled={!urgent.slots[0].available} onClick={() => onChange(urgent.slots[0]!.start)}>
          <strong><Crown size={14} /> {t("booking.urgentSlot")}</strong>
          <small>{t("booking.urgentHint", { time: time(urgent.slots[0].start) })}</small>
        </button>
      )}
      <div className="kit-days" role="tablist">
        {regular.map((d, i) => (
          <button key={d.date} type="button" role="tab" aria-selected={i === dayIdx} className={cn("chip", i === dayIdx && "active")} onClick={() => setDayIdx(i)}>
            {weekday(d.date)}
            <small>{t("booking.freeCount", { count: d.slots.filter((s) => s.available).length })}</small>
          </button>
        ))}
      </div>
      {day && (
        <div className="kit-slot-grid">
          {day.slots.map((s) => (
            <button key={s.start} type="button" disabled={!s.available} className={cn("kit-slot", value === s.start && "active")} onClick={() => onChange(s.start)} aria-pressed={value === s.start}>
              {time(s.start)}–{time(s.end)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan müqayisəsi (PRD §42–43)                                         */
/* ------------------------------------------------------------------ */

export function PlanComparison({ plans, definitions, period, currentCode, onSelect, busyCode }: { plans: any[]; definitions: { code: string; valueType: string; label: unknown }[]; period: string; currentCode?: string | null; onSelect?: (plan: any) => void; busyCode?: string | null }) {
  const { t, money, text, enumLabel } = useI18n();
  const codes = definitions.filter((d) => plans.some((p) => p.entitlements[d.code] !== undefined)).map((d) => d);
  const cell = (d: { code: string; valueType: string }, v: unknown) => {
    if (v === undefined) return <Minus size={14} className="text-muted" aria-label={t("plans.notIncluded")} />;
    if (typeof v === "boolean") return v ? <CheckCircle2 size={16} className="text-success" aria-label={t("plans.included")} /> : <X size={14} className="text-muted" aria-label={t("plans.notIncluded")} />;
    if (v === "UNLIMITED") return <strong>{t("plans.unlimited")}</strong>;
    if (d.valueType === "PERCENT") return Number(v) ? `${v}%` : <X size={14} className="text-muted" />;
    return Number(v) === 0 ? <X size={14} className="text-muted" /> : String(v);
  };
  return (
    <div className="kit-plans">
      <div className="kit-plan-cards">
        {plans.map((p) => {
          const price = p.prices.find((x: any) => x.period === period && x.enabled) ?? p.prices[0];
          const current = currentCode === p.code;
          return (
            <article key={p.id} className={cn("kit-plan", p.highlight && "highlight", current && "current")}>
              {p.highlight && <span className="badge badge-warning kit-plan-flag">{t("plans.popular")}</span>}
              <h3>{text(p.name)}</h3>
              <p className="text-sm">{text(p.description)}</p>
              <div className="kit-plan-price">
                {Number(price.price.amount) === 0 ? <strong>{t("plans.free")}</strong> : (<><strong>{money(price.price)}</strong><span>/ {enumLabel("BillingPeriod", price.period)}</span></>)}
              </div>
              {p.trialDays ? <small className="text-success">{t("plans.trial", { days: p.trialDays })}</small> : null}
              {onSelect && (
                <button type="button" className={cn("btn w-full mt-3", current ? "outline" : "primary")} disabled={current || busyCode === p.code} onClick={() => onSelect(p)}>
                  {current ? t("plans.current") : t("plans.choose")}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="table-wrap mt-6">
        <table className="kit-plan-table">
          <thead>
            <tr>
              <th scope="col">{t("plans.feature")}</th>
              {plans.map((p) => <th key={p.id} scope="col">{text(p.name)}</th>)}
            </tr>
          </thead>
          <tbody>
            {codes.map((d) => (
              <tr key={d.code}>
                <th scope="row">{text(d.label)}</th>
                {plans.map((p) => <td key={p.id}>{cell(d, p.entitlements[d.code])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sənəd önizləməsi (PRD §49)                                           */
/* ------------------------------------------------------------------ */

export function DocumentPreview({ doc }: { doc: any }) {
  const { t, money, dateTime, enumLabel, text } = useI18n();
  return (
    <article className="kit-doc" aria-label={enumLabel("DocumentType", doc.type)}>
      <header className="kit-doc-head">
        <div>
          <strong className="kit-doc-brand" style={{ color: doc.brand?.primary }}>{doc.brand?.companyName ?? doc.issuer.name}</strong>
          <small className="block">{doc.issuer.name} · {t("docs.voen")} {doc.issuer.voen}</small>
          <small className="block">{doc.issuer.address}</small>
        </div>
        <div className="text-right">
          <h2>{enumLabel("DocumentType", doc.type)}</h2>
          <strong>№ {doc.number}</strong>
          <small className="block">{dateTime(doc.issuedAt)}</small>
          <EnumBadge group="DocumentStatus" code={doc.status} />
        </div>
      </header>
      <section className="kit-doc-parties">
        <div>
          <small className="text-muted">{t("docs.counterparty")}</small>
          <p><strong>{doc.counterpartyName}</strong>{doc.counterpartyVoen && <><br />{t("docs.voen")} {doc.counterpartyVoen}</>}</p>
        </div>
        {doc.orderNumber && (
          <div>
            <small className="text-muted">{t("docs.order")}</small>
            <p><strong>{doc.orderNumber}</strong></p>
          </div>
        )}
        {doc.fiscalNumber && (
          <div>
            <small className="text-muted">{t("docs.fiscalNumber")}</small>
            <p><strong>{doc.fiscalNumber}</strong></p>
          </div>
        )}
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t("docs.item")}</th>
              <th className="num">{t("common.quantity")}</th>
              <th className="num">{t("estimate.unitPrice")}</th>
              <th className="num">{t("docs.vat")}</th>
              <th className="num">{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{text(l.name)}</td>
                <td className="num">{l.quantity} {l.unit !== "pcs" ? l.unit : ""}</td>
                <td className="num">{money(l.unitPrice)}</td>
                <td className="num">{Number(l.vatRate)}% · {money(l.vat)}</td>
                <td className="num">{money(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="kit-totals">
        <div><dt>{t("docs.vatTotal")}</dt><dd>{money(doc.vatTotal)}</dd></div>
        <div className="grand"><dt>{t("common.total")}</dt><dd>{money(doc.total)}</dd></div>
      </dl>
      <footer className="kit-doc-foot">
        {doc.qrCode && (
          <span className="flex items-center gap-2"><QrCode size={40} aria-hidden /><small>{doc.verifyUrl ?? doc.qrCode}</small></span>
        )}
        {doc.correctionOf && <small>{t("docs.correctionOf", { number: doc.correctionOf })}</small>}
        <small>{doc.brand?.footer}</small>
        <button type="button" className="btn outline btn-sm no-print" onClick={() => window.print()}>
          <Printer size={14} /> {t("docs.print")}
        </button>
      </footer>
    </article>
  );
}
