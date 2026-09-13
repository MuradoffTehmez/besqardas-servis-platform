"use client";
import React from "react";
import {
  Wrench,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Timeline } from "../../components/ui/timeline";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface ServiceDetailViewProps {
  service: any;
  locale?: "az" | "ru" | "en";
  onBack: () => void;
  onBook: (service: any) => void;
}

export function ServiceDetailView({
  service,
  locale = "az",
  onBack,
  onBook,
}: ServiceDetailViewProps) {
  if (!service) return null;

  const displayName = resolveText(service.name, locale as AppLocale, "Xidmət");
  const displayCategory = resolveText(service.categoryName, locale as AppLocale, "Servis");
  const displayDesc = resolveText(service.description || service.shortDescription, locale as AppLocale, "");

  const executionFormNames: Record<string, string> = {
    ON_SITE: "Ünvanda icra",
    CARRY_IN: "Servis mərkəzində",
    PICKUP_DELIVERY: "Götürmə və geri çatdırılma",
  };

  const workflowSteps = [
    {
      id: "1",
      name: "1. Sifarişin Qeydiyyatı",
      description: "Müraciətiniz qəbul edilir və uyğun ixtisaslı usta ilə vaxt slotu təsdiqlənir.",
      status: "COMPLETED",
    },
    {
      id: "2",
      name: "2. Diaqnostika və Baxış",
      description: "Usta ünvana yaxınlaşaraq avadanlığı yoxlayır və dəqiq nasazlığı aşkar edir.",
      status: "IN_PROGRESS",
    },
    {
      id: "3",
      name: "3. Smeta və Müştəri Razılığı",
      description: "Material və iş haqqı üzrə smeta hazırlanır; iş yalnız təsdiqinizdən sonra başlayır.",
      status: "PENDING",
    },
    {
      id: "4",
      name: "4. Təmir və Test Mərhələsi",
      description: "İş peşəkar alətlərlə icra edilir və avadanlıq iş rejimində sınaqdan keçirilir.",
      status: "PENDING",
    },
    {
      id: "5",
      name: "5. Rəsmi Təhvil və QR Zəmanət",
      description: "Servis aktı və rəqəmsal zəmanət təqdim olunur, ödəniş qəbul edilir.",
      status: "PENDING",
    },
  ];

  return (
    <div className="service-detail-view container py-8">
      <button className="back-link btn btn-sm ghost mb-4" onClick={onBack}>
        <ArrowLeft size={16} /> Xidmətlər siyahısına qayıt
      </button>

      <div className="detail-grid">
        {/* Main Info Column */}
        <div className="detail-main">
          <div className="detail-header">
            <span className="eyebrow">{displayCategory}</span>
            <h1>{displayName}</h1>
            {displayDesc && (
              <p className="lead-text">{displayDesc}</p>
            )}
          </div>

          <div className="detail-badges">
            {service.estimatedDurationMinutes && (
              <div className="meta-pill">
                <Clock size={16} />
                <span>{service.estimatedDurationMinutes} dəqiqə</span>
              </div>
            )}
            <div className="meta-pill">
              <ShieldCheck size={16} />
              <span>Rəsmi İş Zəmanəti</span>
            </div>
            {service.executionForms && (
              <div className="meta-pill">
                <Wrench size={16} />
                <span>
                  {service.executionForms
                    .map((f: string) => executionFormNames[f] || f)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Workflow Steps Section */}
          <div className="section-card panel mt-6">
            <h3>Xidmətin İcra Ardıcıllığı (Workflow)</h3>
            <p className="text-muted text-sm mb-4">
              Platformamızda hər bir servis şəffaf addımlarla idarə olunur:
            </p>
            <Timeline steps={workflowSteps} />
          </div>

          {/* Included Services */}
          <div className="section-card panel mt-6">
            <h3>Xidmətə Nələr Daxildir?</h3>
            <ul className="included-list">
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>Peşəkar usta tərəfindən yerində texniki baxış</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>Təhlükəsizlik və elektrik/təzyiq testləri</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>Orijinal və ya uyğun ehtiyat hissələrinin təklif edilməsi</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>Yazılı təhvil-təslim aktı və QR kodlu rəqəmsal zəmanət</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Sticky Booking Card */}
        <aside className="detail-sidebar">
          <div className="booking-card panel">
            <div className="price-tag-large">
              <small>Xidmət Haqqı</small>
              <strong>
                {service.price ? `${service.price.amount} ${service.price.currency}` : "Diaqnostikadan sonra"}
              </strong>
            </div>

            <p className="text-sm text-muted mb-4">
              {service.priceModel === "STARTING_FROM"
                ? "Göstərilən qiymət ilkin başlanğıc məbləğidir. Yekun qiymət diaqnostika smetasında dəqiqləşir."
                : "Smetadan imtina edildikdə standart qaydalara əsasən çağırış haqqı tutulmur."}
            </p>

            <button
              className="btn btn-lg primary w-full"
              onClick={() => onBook(service)}
            >
              <Calendar size={18} />
              Servis Sifariş Et
            </button>

            <div className="sidebar-support mt-4">
              <small className="text-muted block">Sualınız var?</small>
              <strong>+994 (12) 500-00-00</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
