"use client";
import React from "react";
import {
  Wrench,
  Snowflake,
  Flame,
  Waves,
  Droplets,
  Zap,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@sp/utils";
import { resolveText, type AppLocale } from "../../utils/i18n";

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

export function ServiceCard({
  service,
  locale = "az",
  onSelect,
  onBook,
  className,
}: ServiceCardProps) {
  const Icon = (service.icon && ICON_MAP[service.icon]) || Wrench;
  const displayName = resolveText(service.name, locale as AppLocale, "Xidmət");
  const displayDesc = resolveText(service.shortDescription, locale as AppLocale, "");

  const getPriceLabel = () => {
    if (service.price) {
      const prefix = service.priceModel === "STARTING_FROM" ? (locale === "az" ? "-dan " : "от ") : "";
      return `${prefix}${service.price.amount} ${service.price.currency || "AZN"}`;
    }
    if (locale === "az") return "Diaqnostikadan sonra";
    if (locale === "ru") return "После диагностики";
    return "After diagnosis";
  };

  return (
    <article className={cn("service-card", className)}>
      <div className="card-top">
        <span className="icon-box tone0">
          <Icon size={24} />
        </span>
        {service.estimatedDurationMinutes ? (
          <span className="duration-badge">
            <Clock size={13} />
            {service.estimatedDurationMinutes} {locale === "az" ? "dəq" : locale === "ru" ? "мин" : "min"}
          </span>
        ) : null}
      </div>

      <h3 className="service-title">{onSelect ? <button className="title-action" onClick={() => onSelect(service)}>{displayName}</button> : displayName}</h3>

      {displayDesc ? (
        <p className="service-desc">{displayDesc}</p>
      ) : null}

      <div className="card-bottom">
        <div>
          <small className="text-muted block">
            {locale === "az" ? "Qiymət" : locale === "ru" ? "Цена" : "Price"}
          </small>
          <strong>{getPriceLabel()}</strong>
        </div>

        <div className="card-actions">
          {onBook && (
            <button
              className="btn btn-sm primary"
              onClick={() => onBook(service)}
            >
              {locale === "az" ? "Sifariş et" : locale === "ru" ? "Заказать" : "Book"}
            </button>
          )}
          {onSelect && (
            <button
              className="round-link"
              aria-label={displayName}
              onClick={() => onSelect(service)}
            >
              <ArrowUpRight size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
