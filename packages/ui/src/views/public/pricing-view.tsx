"use client";
import React, { useState } from "react";
import { Check, X, ShieldCheck, Zap, Star } from "lucide-react";

export interface PricingViewProps {
  locale?: "az" | "ru" | "en";
  onSelectPlan: (planCode: string) => void;
}

export function PricingView({ locale = "az", onSelectPlan }: PricingViewProps) {
  const [targetAudience, setTargetAudience] = useState<"CUSTOMER" | "TECHNICIAN">("CUSTOMER");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  const customerPlans = [
    {
      code: "CUSTOMER_BASIC",
      name: "Basic",
      priceMonthly: "0",
      priceAnnual: "0",
      description: "Fərdi istifadə üçün standart xidmət paketi",
      isPopular: false,
      features: [
        { title: "Cihaz qeydiyyatı", value: "10 cihaz" },
        { title: "Yadda saxlanılan ünvan", value: "1 ünvan" },
        { title: "Birdəfəlik ünvan daxil etmə", value: false },
        { title: "Məhsul endirimi", value: false },
        { title: "Servis endirimi", value: false },
        { title: "Reaksiya SLA-sı", value: "24 saat" },
        { title: "Təcili servis (4 saat)", value: false },
        { title: "Uzadılmış iş zəmanəti", value: "Standart" },
      ],
    },
    {
      code: "CUSTOMER_PRO",
      name: "Pro",
      priceMonthly: "9.90",
      priceAnnual: "99.00",
      description: "Daha çox cihaz və endirim üstünlükləri",
      isPopular: true,
      features: [
        { title: "Cihaz qeydiyyatı", value: "25 cihaz" },
        { title: "Yadda saxlanılan ünvan", value: "3 ünvan" },
        { title: "Birdəfəlik ünvan daxil etmə", value: true },
        { title: "Məhsul endirimi", value: "5% endirim" },
        { title: "Servis endirimi", value: "10% endirim" },
        { title: "Reaksiya SLA-sı", value: "8 saat" },
        { title: "Təcili servis (4 saat)", value: false },
        { title: "Uzadılmış iş zəmanəti", value: "+3 ay əlavə" },
      ],
    },
    {
      code: "CUSTOMER_PREMIUM",
      name: "Premium",
      priceMonthly: "19.90",
      priceAnnual: "199.00",
      description: "Maksimum prioritet, təcili servis və ailə hesabı",
      isPopular: false,
      features: [
        { title: "Cihaz qeydiyyatı", value: "50 cihaz" },
        { title: "Yadda saxlanılan ünvan", value: "10 ünvan" },
        { title: "Birdəfəlik ünvan daxil etmə", value: true },
        { title: "Məhsul endirimi", value: "10% endirim" },
        { title: "Servis endirimi", value: "15% endirim" },
        { title: "Reaksiya SLA-sı", value: "2 saat" },
        { title: "Təcili servis (4 saat)", value: "✓ Daxildir" },
        { title: "Uzadılmış iş zəmanəti", value: "+6 ay əlavə" },
      ],
    },
  ];

  const technicianPlans = [
    {
      code: "TECH_BASIC",
      name: "Usta Baza",
      priceMonthly: "19.00",
      priceAnnual: "190.00",
      description: "Müstəqil fəaliyyətə başlayan ustalar üçün",
      features: [
        { title: "Aylıq qəbul edilən sifariş", value: "20 sifariş" },
        { title: "Eyni vaxtda aktiv iş", value: "3 iş" },
        { title: "İxtisas sayı", value: "2 ixtisas" },
        { title: "Usta qiymətləri ilə ehtiyat hissəsi", value: true },
        { title: "Mobil anbar rezervasiyası", value: false },
        { title: "Axtarışda prioritet", value: "Standart" },
      ],
    },
    {
      code: "TECH_PRO",
      name: "Usta Pro",
      priceMonthly: "39.00",
      priceAnnual: "390.00",
      description: "Aktiv işləyən peşəkar ustalar üçün",
      isPopular: true,
      features: [
        { title: "Aylıq qəbul edilən sifariş", value: "60 sifariş" },
        { title: "Eyni vaxtda aktiv iş", value: "6 iş" },
        { title: "İxtisas sayı", value: "5 ixtisas" },
        { title: "Usta qiymətləri ilə ehtiyat hissəsi", value: true },
        { title: "Mobil anbar rezervasiyası", value: "5 rezerv" },
        { title: "Axtarışda prioritet", value: "Yüksək" },
      ],
    },
    {
      code: "TECH_PREMIUM",
      name: "Usta Premium",
      priceMonthly: "69.00",
      priceAnnual: "690.00",
      description: "Limitsiz sifariş və platformada reklam üstünlüyü",
      features: [
        { title: "Aylıq qəbul edilən sifariş", value: "Limitsiz" },
        { title: "Eyni vaxtda aktiv iş", value: "10 iş" },
        { title: "İxtisas sayı", value: "Limitsiz" },
        { title: "Usta qiymətləri ilə ehtiyat hissəsi", value: true },
        { title: "Mobil anbar rezervasiyası", value: "20 rezerv" },
        { title: "Axtarışda prioritet", value: "Maksimum (Reklam)" },
      ],
    },
  ];

  const activePlans = targetAudience === "CUSTOMER" ? customerPlans : technicianPlans;

  return (
    <div className="pricing-view container py-8">
      <div className="page-header text-center max-w-2xl mx-auto mb-8">
        <span className="eyebrow">Abunəlik Planları</span>
        <h1>Ehtiyacınıza Uyğun Planı Seçin</h1>
        <p className="page-desc">
          Planlar dinamik imkanlar və limitlər sistemi (Entitlements — §41) əsasında işləyir.
        </p>

        {/* Audience Toggle */}
        <div className="audience-toggle flex justify-center gap-2 mt-4">
          <button
            className={`btn btn-sm ${targetAudience === "CUSTOMER" ? "primary" : "outline"}`}
            onClick={() => setTargetAudience("CUSTOMER")}
          >
            Fərdi Müştərilər
          </button>
          <button
            className={`btn btn-sm ${targetAudience === "TECHNICIAN" ? "primary" : "outline"}`}
            onClick={() => setTargetAudience("TECHNICIAN")}
          >
            Müstəqil Ustalar
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid three pricing-grid gap-6">
        {activePlans.map((plan) => (
          <div
            key={plan.code}
            className={`pricing-card panel ${plan.isPopular ? "popular border-brand shadow-lg" : ""}`}
          >
            {plan.isPopular && <span className="badge badge-popular">Ən Çox Seçilən</span>}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-xs text-muted mb-4">{plan.description}</p>

            <div className="plan-price my-4">
              <span className="price-amount text-3xl font-extrabold">
                {billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceAnnual} AZN
              </span>
              <span className="price-period text-xs text-muted">
                {billingCycle === "MONTHLY" ? " / ay" : " / il"}
              </span>
            </div>

            <button
              className={`btn w-full mb-6 ${plan.isPopular ? "primary" : "outline"}`}
              onClick={() => onSelectPlan(plan.code)}
            >
              {plan.code === "CUSTOMER_BASIC" ? "Hazırkı Plan" : "Plana Keç"}
            </button>

            <div className="plan-features space-y-3 border-t pt-4 text-sm">
              {plan.features.map((feat, idx) => (
                <div key={idx} className="feature-item flex justify-between items-center text-xs">
                  <span className="text-muted">{feat.title}:</span>
                  <span className="font-semibold">
                    {typeof feat.value === "boolean" ? (
                      feat.value ? (
                        <Check size={14} className="text-success inline" />
                      ) : (
                        <X size={14} className="text-muted inline" />
                      )
                    ) : (
                      feat.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
