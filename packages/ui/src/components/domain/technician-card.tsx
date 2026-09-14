"use client";
import React from "react";
import { Star, ShieldCheck, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";
import { getInitials, resolveTechnicianName } from "../../utils/i18n";

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

export function TechnicianCard({ technician, locale = "az", onSelect, onBook, className }: TechnicianCardProps) {
  const { t, text, date, num } = useI18n();
  const displayName = resolveTechnicianName(technician, t("site.card.technician"));
  const initials = getInitials(displayName);
  const isPromoted = technician.promoted ?? technician.isPromoted ?? false;
  const completedJobs = technician.completedJobs ?? technician.completedJobsCount;
  const nextSlot = technician.nextAvailableAt ?? technician.nextAvailableSlot;
  const detail = onSelect ? anchorProps(locale, `/technicians/${technician.id}`, () => onSelect(technician)) : null;

  return (
    <article className={cn("technician-card", className)}>
      {isPromoted && <span className="badge-promoted">{t("site.card.promoted")}</span>}

      <div className="tech-header">
        <div className="tech-avatar">
          {technician.avatarUrl ? (
            <img width={56} height={56} loading="lazy" decoding="async" src={technician.avatarUrl} alt={displayName} />
          ) : (
            <span className="avatar-initials" aria-hidden>{initials}</span>
          )}
          {technician.employmentType === "STAFF" && (
            <span className="staff-badge" title={t("site.card.staff")} aria-label={t("site.card.staff")}>
              <ShieldCheck size={14} />
            </span>
          )}
        </div>

        <div className="tech-info">
          <h3 className="tech-name">{detail ? <a className="title-action" {...detail}>{displayName}</a> : displayName}</h3>

          <div className="tech-stats">
            {technician.rating != null && (
              <div className="rating">
                <Star size={13} fill="currentColor" aria-hidden />
                <span>{num(technician.rating, 1)}</span>
              </div>
            )}
            {completedJobs != null && (
              <span className="jobs-count">
                <CheckCircle2 size={13} /> {t("site.card.jobs", { count: completedJobs })}
              </span>
            )}
          </div>
        </div>
      </div>

      {technician.specializations && technician.specializations.length > 0 && (
        <div className="tech-specs">
          {technician.specializations.slice(0, 3).map((spec, idx) => (
            <span key={idx} className="spec-tag">
              {text(spec)}
            </span>
          ))}
          {technician.specializations.length > 3 && <span className="spec-tag more">+{technician.specializations.length - 3}</span>}
        </div>
      )}

      {nextSlot && (
        <div className="tech-slot">
          <Calendar size={13} />
          <small>
            {t("site.card.nextSlot")} <strong>{date(nextSlot)}</strong>
          </small>
        </div>
      )}

      <div className="card-actions">
        {detail && (
          <a className="btn btn-sm outline" {...detail}>
            {t("site.card.profile")}
          </a>
        )}
        {onBook && (
          <button type="button" className="btn btn-sm primary" onClick={() => onBook(technician)}>
            {t("site.card.select")}
          </button>
        )}
      </div>
    </article>
  );
}
