"use client";
import React from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Users,
  HelpCircle,
} from "lucide-react";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface InfoViewProps {
  pageType: "about" | "contact" | "branches" | "faq" | "terms" | "privacy";
  branches?: any[];
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
}

export function InfoView({
  pageType,
  branches = [],
  locale = "az",
  onNavigate,
}: InfoViewProps) {
  if (pageType === "about") {
    return (
      <div className="info-page container py-10 max-w-4xl">
        <span className="eyebrow">Şirkət Haqqında</span>
        <h1>Peşəkar İqlim və Məişət Servisi</h1>
        <p className="lead-text mt-3">
          Platformamız texniki servis xidmətlərini, peşəkar ustaları, anbar uçotunu və müştəri cihazlarını vahid rəqəmsal ekosistemdə birləşdirir (PRD §1).
        </p>

        <div className="grid three my-8 gap-4">
          <div className="panel p-5 text-center">
            <ShieldCheck size={32} className="text-brand mx-auto mb-2" />
            <strong className="block text-lg">Rəsmi Zəmanət</strong>
            <small className="text-muted">Bütün görülən işlərə və orijinal ehtiyat hissələrinə rəsmi akt və QR kodlu zəmanət təqdim olunur.</small>
          </div>
          <div className="panel p-5 text-center">
            <Users size={32} className="text-brand mx-auto mb-2" />
            <strong className="block text-lg">Sertifikatlı Ustalar</strong>
            <small className="text-muted">Daxili lisenziyalı və müstəqil ustalarımız ciddi peşəkarlıq və təhlükəsizlik yoxlamasından keçir.</small>
          </div>
          <div className="panel p-5 text-center">
            <Clock size={32} className="text-brand mx-auto mb-2" />
            <strong className="block text-lg">SLA Təminatı</strong>
            <small className="text-muted">15 dəqiqə ərzində sifariş reaksiyası və təcili hallarda 4 saatadək operativ gəliş imkanı.</small>
          </div>
        </div>
      </div>
    );
  }

  if (pageType === "contact" || pageType === "branches") {
    return (
      <div className="info-page container py-10">
        <span className="eyebrow">Əlaqə və Filiallar</span>
        <h1>Bizimlə Əlaqə Saxlayın</h1>
        <p className="lead-text mb-8">
          Servis mərkəzlərimiz və operativ çağrı xidmətimiz həftənin 7 günü xidmətinizdədir.
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="panel p-6 space-y-4">
            <h3>Mərkəzi Qərargah</h3>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-brand mt-1" />
              <span>Bakı şəhəri, Nərimanov rayonu, Əhməd Rəcəbli küç. 25</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-brand" />
              <strong>+994 (12) 500-00-00</strong>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-brand" />
              <span>info@besqardas.az</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-brand" />
              <span>Hər gün: 08:00 – 21:00</span>
            </div>
          </div>

          <div className="lg:col-span-2 panel p-6">
            <h3 className="mb-4">Xidmət Filiallarımız və Servis Mərkəzləri</h3>
            <div className="grid two gap-4">
              {branches.length > 0 ? (
                branches.map((b) => (
                  <div key={b.id} className="border p-4 rounded-lg">
                    <strong className="block text-base">{resolveText(b.name, locale as AppLocale, "Filial")}</strong>
                    <small className="text-muted block mt-1">{resolveText(b.address, locale as AppLocale, "")}</small>
                    <small className="text-brand block mt-1">{b.phone || "+994 (12) 500-00-00"}</small>
                  </div>
                ))
              ) : (
                <>
                  <div className="border p-4 rounded-lg">
                    <strong className="block text-base">Bakı Mərkəzi Filialı</strong>
                    <small className="text-muted block mt-1">Nərimanov r-nu, Əhməd Rəcəbli 25</small>
                    <small className="text-brand block mt-1">08:00 - 21:00</small>
                  </div>
                  <div className="border p-4 rounded-lg">
                    <strong className="block text-base">Sumqayıt Servis Mərkəzi</strong>
                    <small className="text-muted block mt-1">Sumqayıt ş., Sülh küçəsi 14</small>
                    <small className="text-brand block mt-1">09:00 - 19:00</small>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageType === "faq") {
    const faqs = [
      {
        q: "Smetadan imtina etsəm çağırış haqqı ödəyirəmmi?",
        a: "Xeyr. Standart qaydalarımıza əsasən, ustanın təqdim etdiyi diaqnostika smetasını təsdiq etmədiyiniz təqdirdə heç bir xidmət haqqı tutulmur (PRD §20.1).",
      },
      {
        q: "Görülən işlərə və hissələrə zəmanət necə verilir?",
        a: "Təmir başa çatdıqdan sonra sistem avtomatik olaraq rəsmi servis aktı və QR kodlu elektron zəmanət sənədi yaradır. Bu sənəd şəxsi kabinetinizdə arxivlənir və QR kod vasitəsilə ictimai yoxlanıla bilir (PRD §23).",
      },
      {
        q: "Təcili servis sifarişi necə işləyir?",
        a: "Premium abunəçilər üçün nəzərdə tutulmuş təcili servis rejimində mütəxəssis şəhər daxilində 4 saat ərzində ünvana çatır (PRD §42).",
      },
      {
        q: "Ödəniş hansı üsullarla aparılır?",
        a: "Sayt üzərindən onlayn bank kartı, ustanın mobil POS terminalı və ya şirkət adına nağd ödəniş (fiskal çeklə) qəbul edilir (PRD §47).",
      },
    ];

    return (
      <div className="info-page container py-10 max-w-3xl">
        <span className="eyebrow">Kömək Mərkəzi</span>
        <h1>Tez-Tez Verilən Suallar</h1>
        <div className="faq-list mt-8 space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="panel p-5">
              <h4 className="flex items-center gap-2 text-base font-bold mb-2">
                <HelpCircle size={18} className="text-brand" /> {f.q}
              </h4>
              <p className="text-muted text-sm mb-0">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="info-page container py-10 max-w-3xl">
      <h1>{pageType === "terms" ? "İstifadə Qaydaları" : "Məxfilik Siyasəti"}</h1>
      <div className="panel p-6 mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Platformadan istifadə edərkən bütün fərdi məlumatlar və xidmət müqavilələri Azərbaycan Respublikasının qanunvericiliyinə və PRD standartlarına uyğun qorunur.
        </p>
        <p>
          Rəsmi hesablaşmalar, elektron qaimə-fakturalar və fiskal çeklər platformanı idarə edən rəsmi şirkət rekvizitləri ilə təqdim edilir (§49).
        </p>
      </div>
    </div>
  );
}
