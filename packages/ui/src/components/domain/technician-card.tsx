"use client";
import React from "react";
import { Star, ShieldCheck, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@sp/utils";
import { resolveText, resolveTechnicianName, getInitials, type AppLocale } from "../../utils/i18n";

export interface TechnicianCardData {
  id: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  avatarTone?: number;
  rating?: number;
  reviewCount?: number;
  completedJobsCount?: number;
  completedJobs?: number;
  specializations?: Array<string | { az?: string; ru?: string; en?: string } | any>;
  serviceZones?: string[];
  nextAvailableSlot?: string;
  nextAvailableAt?: string;
  isPromoted?: boolean;
  promoted?: boolean;
  employmentType?: "STAFF" | "INDEPENDENT" | string;
  experienceYears?: number;
  verified?: boolean;
}

export interface TechnicianCardProps {
  technician: TechnicianCardData;
  locale?: "az" | "ru" | "en";
  onSelect?: (technician: TechnicianCardData) => void;
  onBook?: (technician: TechnicianCardData) => void;
  className?: string;
}

export function TechnicianCard({
  technician,
  locale = "az",
  onSelect,
  onBook,
  className,
}: TechnicianCardProps) {
  const displayName = resolveTechnicianName(
    technician,
    locale === "az" ? "Usta" : locale === "ru" ? "Мастер" : "Technician"
  );
  const initials = getInitials(displayName);
  const isPromoted = technician.promoted ?? technician.isPromoted ?? false;
  const completedJobs = technician.completedJobs ?? technician.completedJobsCount;
  const nextSlotRaw = technician.nextAvailableAt ?? technician.nextAvailableSlot;
  const nextSlot = nextSlotRaw
    ? typeof nextSlotRaw === "string" && nextSlotRaw.includes("T")
      ? nextSlotRaw.split("T")[0]
      : String(nextSlotRaw)
    : null;

  return (
    <article className={cn("technician-card", className)}>
      {isPromoted && (
        <span className="badge-promoted">
          {locale === "az" ? "Tövsiyə olunur" : locale === "ru" ? "Рекомендуем" : "Promoted"}
        </span>
      )}

      <div className="tech-header">
        <div className="tech-avatar">
          {technician.avatarUrl ? (
            <img width={56} height={56} loading="lazy" decoding="async" src={technician.avatarUrl} alt={displayName} />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
          {technician.employmentType === "STAFF" && (
            <span className="staff-badge" title="Rəsmi servis əməkdaşı">
              <ShieldCheck size={14} />
            </span>
          )}
        </div>

        <div className="tech-info">
          <h3 className="tech-name">{onSelect ? <button className="title-action" onClick={() => onSelect(technician)}>{displayName}</button> : displayName}</h3>

          <div className="tech-stats">
            {technician.rating != null && (
              <div className="rating">
                <Star size={13} fill="currentColor" />
                <span>{Number(technician.rating).toFixed(1)}</span>
              </div>
            )}
            {completedJobs != null && (
              <span className="jobs-count">
                <CheckCircle2 size={13} /> {completedJobs}{" "}
                {locale === "az" ? "iş" : locale === "ru" ? "заказов" : "jobs"}
              </span>
            )}
          </div>
        </div>
      </div>

      {technician.specializations && technician.specializations.length > 0 && (
        <div className="tech-specs">
          {technician.specializations.slice(0, 3).map((spec, idx) => {
            const specText = resolveText(spec, locale as AppLocale);
            return (
              <span key={idx} className="spec-tag">
                {specText}
              </span>
            );
          })}
          {technician.specializations.length > 3 && (
            <span className="spec-tag more">
              +{technician.specializations.length - 3}
            </span>
          )}
        </div>
      )}

      {nextSlot && (
        <div className="tech-slot">
          <Calendar size={13} />
          <small>
            {locale === "az" ? "Ən yaxın vaxt: " : locale === "ru" ? "Ближайшее время: " : "Next slot: "}
            <strong>{nextSlot}</strong>
          </small>
        </div>
      )}

      <div className="card-actions">
        {onSelect && (
          <button
            className="btn btn-sm outline"
            onClick={() => onSelect(technician)}
          >
            {locale === "az" ? "Profil" : locale === "ru" ? "Профиль" : "Profile"}
          </button>
        )}
        {onBook && (
          <button
            className="btn btn-sm primary"
            onClick={() => onBook(technician)}
          >
            {locale === "az" ? "Ustanı seç" : locale === "ru" ? "Выбрать" : "Select"}
          </button>
        )}
      </div>
    </article>
  );
}

