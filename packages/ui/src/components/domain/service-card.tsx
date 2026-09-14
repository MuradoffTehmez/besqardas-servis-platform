"use client";
import React from "react";
import { ArrowRight, BadgeCheck, Clock, Star } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";
import { ServiceIcon } from "./service-icon";

export interface ServiceCardData {
  id: string;
  slug: string;
  name: string | { az?: string; ru?: string; en?: string };
  shortDescription?: string | { az?: string; ru?: string; en?: string };
  categoryName?: string | { az?: string; ru?: string; en?: string };
  icon?: string;
  imageTone?: string;
  estimatedDurationMinutes?: number;
  workWarrantyMonths?: number;
  rating?: number;
  completedCount?: number;
  executionForms?: string[];
  price?: { amount: string; currency: string } | null;
  priceModel?: "FIXED" | "STARTING_FROM" | "ESTIMATE_BASED" | string;
}

export interface ServiceCardProps {
  service: ServiceCardData;
  locale?: "az" | "ru" | "en";
  onSelect?: (service: ServiceCardData) => void;
  onBook?: (service: ServiceCardData) => void;
  className?: string;
}

/** Xidmət kartı: kateqoriya, reytinq və iş sayı, müddət/zəmanət, icra formaları, qiymət və iki əməliyyat. */
export function ServiceCard({ service, locale = "az", onSelect, onBook, className }: ServiceCardProps) {
  const { t, text, money, minutes, num, enumLabel } = useI18n();
  const name = text(service.name);
  const desc = text(service.shortDescription);
  const detail = onSelect ? anchorProps(locale, `/services/${service.slug}`, () => onSelect(service)) : null;
  const priceLabel = service.price ? (service.priceModel === "STARTING_FROM" ? t("site.serviceDetail.priceFrom") : t("site.card.price")) : t("site.card.price");

  return (
    <article className={cn("svc-card", `svc-tone-${service.imageTone ?? "teal"}`, className)}>
      <div className="svc-card-top">
        <span className="svc-card-icon"><ServiceIcon name={service.icon} size={24} /></span>
        {service.categoryName && <span className="svc-card-cat">{text(service.categoryName)}</span>}
      </div>

      <h3 className="svc-card-title">{detail ? <a {...detail}>{name}</a> : name}</h3>
      {desc && <p className="svc-card-desc">{desc}</p>}

      <ul className="svc-card-meta">
        {service.rating ? <li><Star size={14} fill="currentColor" className="svc-star" aria-hidden /> <strong>{num(service.rating, 1)}</strong>{service.completedCount ? <span className="text-muted"> · {t("site.services.jobs", { count: num(service.completedCount) })}</span> : null}</li> : null}
        {service.estimatedDurationMinutes ? <li><Clock size={14} aria-hidden /> {minutes(service.estimatedDurationMinutes)}</li> : null}
        {service.workWarrantyMonths ? <li><BadgeCheck size={14} aria-hidden /> {t("site.card.warrantyMonths", { months: service.workWarrantyMonths })}</li> : null}
      </ul>

      {service.executionForms && service.executionForms.length > 0 && (
        <div className="svc-card-forms">
          {service.executionForms.map((f) => <span key={f}>{enumLabel("ExecutionForm", f)}</span>)}
        </div>
      )}

      <div className="svc-card-foot">
        <div className="svc-card-price">
          <small>{priceLabel}</small>
          <strong>{service.price ? money(service.price) : t("site.serviceDetail.afterDiagnostics")}</strong>
        </div>
        <div className="svc-card-actions">
          {detail && <a className="btn ghost btn-sm svc-card-more" {...detail} aria-label={`${t("site.services.details")}: ${name}`}>{t("site.services.details")} <ArrowRight size={14} aria-hidden /></a>}
          {onBook && <button type="button" className="btn primary btn-sm" onClick={() => onBook(service)}>{t("site.card.book")}</button>}
        </div>
      </div>
    </article>
  );
}
