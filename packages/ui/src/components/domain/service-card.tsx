"use client";
import React from "react";
import { Wrench, Snowflake, Flame, Waves, Droplets, Zap, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";

export interface ServiceCardData {
  id: string;
  slug: string;
  name: string | { az?: string; ru?: string; en?: string };
  shortDescription?: string | { az?: string; ru?: string; en?: string };
  icon?: string;
  estimatedDurationMinutes?: number;
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

const ICON_MAP: Record<string, typeof Wrench> = {
  snowflake: Snowflake,
  flame: Flame,
  waves: Waves,
  droplets: Droplets,
  zap: Zap,
};

export function ServiceCard({ service, locale = "az", onSelect, onBook, className }: ServiceCardProps) {
  const { t, text, money, minutes } = useI18n();
  const Icon = (service.icon && ICON_MAP[service.icon]) || Wrench;
  const displayName = text(service.name);
  const displayDesc = text(service.shortDescription);
  const detail = onSelect ? anchorProps(locale, `/services/${service.slug}`, () => onSelect(service)) : null;
  const priceLabel = service.price
    ? service.priceModel === "STARTING_FROM"
      ? t("serviceInfo.from", { price: money(service.price) })
      : money(service.price)
    : t("site.serviceDetail.afterDiagnostics");

  return (
    <article className={cn("service-card", className)}>
      <div className="card-top">
        <span className="icon-box tone0">
          <Icon size={24} />
        </span>
        {service.estimatedDurationMinutes ? (
          <span className="duration-badge">
            <Clock size={13} />
            {minutes(service.estimatedDurationMinutes)}
          </span>
        ) : null}
      </div>

      <h3 className="service-title">{detail ? <a className="title-action" {...detail}>{displayName}</a> : displayName}</h3>

      {displayDesc ? <p className="service-desc">{displayDesc}</p> : null}

      <div className="card-bottom">
        <div>
          <small className="text-muted block">{t("site.card.price")}</small>
          <strong>{priceLabel}</strong>
        </div>

        <div className="card-actions">
          {onBook && (
            <button type="button" className="btn btn-sm primary" onClick={() => onBook(service)}>
              {t("site.card.book")}
            </button>
          )}
          {detail && (
            <a className="round-link" aria-label={displayName} {...detail}>
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
