"use client";
import React from "react";
import { Wrench, Clock, ShieldCheck, CheckCircle2, ArrowLeft, Calendar } from "lucide-react";
import { Timeline } from "../../components/ui/timeline";
import { useI18n } from "../../app/core/i18n";

export interface ServiceDetailViewProps {
  service: any;
  locale?: "az" | "ru" | "en";
  supportPhone?: string | null;
  onBack: () => void;
  onBook: (service: any) => void;
}

export function ServiceDetailView({ service, supportPhone, onBack, onBook }: ServiceDetailViewProps) {
  const { t, text, money, minutes, enumLabel } = useI18n();
  if (!service) return null;
  const k = (key: string) => t(`site.serviceDetail.${key}`);

  const displayName = text(service.name);
  const displayCategory = text(service.categoryName);
  const displayDesc = text(service.description || service.shortDescription);

  // Ümumi icra ardıcıllığı; konkret mərhələlər sifarişin workflow şablonundan gəlir (§17)
  const workflowSteps = [1, 2, 3, 4, 5].map((n) => ({
    id: String(n),
    name: `${n}. ${k(`step${n}`)}`,
    description: k(`step${n}Desc`),
    status: n === 1 ? "COMPLETED" : n === 2 ? "IN_PROGRESS" : "PENDING",
  }));

  return (
    <div className="service-detail-view container py-8">
      <button type="button" className="back-link btn btn-sm ghost mb-4" onClick={onBack}>
        <ArrowLeft size={16} /> {k("back")}
      </button>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-header">
            {displayCategory && <span className="eyebrow">{displayCategory}</span>}
            <h1>{displayName}</h1>
            {displayDesc && <p className="lead-text">{displayDesc}</p>}
          </div>

          <div className="detail-badges">
            {service.estimatedDurationMinutes && (
              <div className="meta-pill">
                <Clock size={16} />
                <span>{minutes(service.estimatedDurationMinutes)}</span>
              </div>
            )}
            <div className="meta-pill">
              <ShieldCheck size={16} />
              <span>{k("officialWarranty")}</span>
            </div>
            {service.executionForms?.length > 0 && (
              <div className="meta-pill">
                <Wrench size={16} />
                <span>{service.executionForms.map((f: string) => enumLabel("ExecutionForm", f)).join(", ")}</span>
              </div>
            )}
          </div>

          <section className="section-card panel mt-6">
            <h2 className="h3">{k("workflowTitle")}</h2>
            <p className="text-muted text-sm mb-4">{k("workflowText")}</p>
            <Timeline steps={workflowSteps} />
          </section>

          <section className="section-card panel mt-6">
            <h2 className="h3">{k("includedTitle")}</h2>
            <ul className="included-list">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <CheckCircle2 size={16} className="text-success" aria-hidden />
                  <span>{k(`included${n}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="detail-sidebar">
          <div className="booking-card panel">
            <div className="price-tag-large">
              <small>{k("fee")}</small>
              <strong>
                {service.price ? (service.priceModel === "STARTING_FROM" ? t("serviceInfo.from", { price: money(service.price) }) : money(service.price)) : k("afterDiagnostics")}
              </strong>
            </div>

            <p className="text-sm text-muted mb-4">{service.priceModel === "STARTING_FROM" ? k("startingNote") : k("fixedNote")}</p>

            <button type="button" className="btn btn-lg primary w-full" onClick={() => onBook(service)}>
              <Calendar size={18} />
              {t("book")}
            </button>

            {supportPhone && (
              <div className="sidebar-support mt-4">
                <small className="text-muted block">{k("questions")}</small>
                <a href={`tel:${supportPhone.replace(/[^\d+*]/g, "")}`}>
                  <strong>{supportPhone}</strong>
                </a>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
