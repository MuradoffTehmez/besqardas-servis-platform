"use client";
import React from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Award,
  PhoneCall,
} from "lucide-react";
import { ServiceCard } from "../../components/domain/service-card";
import { ProductCard } from "../../components/domain/product-card";
import { TechnicianCard } from "../../components/domain/technician-card";

export interface HomeViewProps {
  services: any[];
  products: any[];
  technicians: any[];
  categories: any[];
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onBookService: (service?: any) => void;
  onAddToCart: (product: any) => void;
}

export function HomeView({
  services,
  products,
  technicians,
  categories,
  locale = "az",
  onNavigate,
  onBookService,
  onAddToCart,
}: HomeViewProps) {
  const t = {
    az: {
      badge: "Rəsmi İqlim və Məişət Xidmətləri",
      heroTitle: "Evinizin Texniki Rahatlığı",
      heroTitleEm: "Peşəkar Əllərdə",
      heroDesc:
        "Kondisioner, kombi, isitmə və su sistemləri üçün 15 dəqiqə ərzində təsdiq, şəffaf smeta və rəsmi yazılı zəmanət.",
      bookBtn: "Servis Sifariş Et",
      browseServices: "Bütün Xidmətlər",
      statSatisfaction: "98.7% Məmnuniyyət",
      statOrders: "12,000+ Uğurlu Servis",
      statWarranty: "6–12 Ay Rəsmi Zəmanət",
      categoriesTitle: "Xidmət və Avadanlıq Kateqoriyaları",
      popularServices: "Ən Çox Tələb Olunan Servislər",
      popularProducts: "Tövsiyə Olunan Məhsullar və Hissələr",
      featuredTechs: "Sertifikatlı Mütəxəssislər",
      howItWorksTitle: "Servis Prosesi Necə İşləyir?",
      step1Title: "1. Müraciət və Slot",
      step1Desc: "Xidməti və sizə uyğun vaxt aralığını onlayn seçin.",
      step2Title: "2. Usta Təyinatı",
      step2Desc: "İxtisaslı usta qeyd edilən vaxtda ünvana yaxınlaşır.",
      step3Title: "3. Diaqnostika & Smeta",
      step3Desc: "Yalnız smetanı təsdiq etdikdən sonra təmirə başlanılır.",
      step4Title: "4. Zəmanətli Təhvil",
      step4Desc: "İş başa çatdıqdan sonra rəsmi akt və QR zəmanət verilir.",
      viewAll: "Hamısına bax",
    },
    ru: {
      badge: "Официальные климатические услуги",
      heroTitle: "Технический уют вашего дома",
      heroTitleEm: "в надёжных руках",
      heroDesc:
        "Кондиционеры, комби, отопление и насосные системы с подтверждением за 15 минут, прозрачной сметой и гарантией.",
      bookBtn: "Заказать сервис",
      browseServices: "Все услуги",
      statSatisfaction: "98.7% Довольных клиентов",
      statOrders: "12,000+ Ремонтов",
      statWarranty: "6–12 мес. гарантии",
      categoriesTitle: "Категории оборудования",
      popularServices: "Популярные услуги",
      popularProducts: "Популярные товары и запчасти",
      featuredTechs: "Сертифицированные мастера",
      howItWorksTitle: "Как работает сервис?",
      step1Title: "1. Заявка и время",
      step1Desc: "Выберите услугу и удобное время визита.",
      step2Title: "2. Визит мастера",
      step2Desc: "Квалифицированный специалист приедет по адресу.",
      step3Title: "3. Диагностика и смета",
      step3Desc: "Ремонт начинается только после согласования сметы.",
      step4Title: "4. Гарантия и сдача",
      step4Desc: "Вы получаете официальный акт и QR-гарантию.",
      viewAll: "Смотреть все",
    },
    en: {
      badge: "Official HVAC & Appliance Care",
      heroTitle: "Technical Peace of Mind",
      heroTitleEm: "in Expert Hands",
      heroDesc:
        "Air conditioners, boilers, heating and pump systems with 15-minute confirmation, transparent estimates, and formal warranty.",
      bookBtn: "Book Service",
      browseServices: "All Services",
      statSatisfaction: "98.7% Satisfaction",
      statOrders: "12,000+ Completed Jobs",
      statWarranty: "6–12 Months Warranty",
      categoriesTitle: "Equipment Categories",
      popularServices: "Popular Services",
      popularProducts: "Featured Products & Parts",
      featuredTechs: "Certified Technicians",
      howItWorksTitle: "How It Works",
      step1Title: "1. Book Appointment",
      step1Desc: "Pick service type and convenient time slot.",
      step2Title: "2. Technician Arrives",
      step2Desc: "Certified specialist arrives on schedule.",
      step3Title: "3. Diagnosis & Estimate",
      step3Desc: "Work starts only after you approve the estimate.",
      step4Title: "4. Warranty Delivery",
      step4Desc: "Receive digital completion act and QR warranty.",
      viewAll: "View all",
    },
  }[locale];

  return (
    <div className="home-view">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" />
              {t.badge}
            </span>

            <h1>
              {t.heroTitle} <br />
              <em>{t.heroTitleEm}</em>
            </h1>

            <p className="hero-desc">{t.heroDesc}</p>

            <div className="hero-actions">
              <button
                className="btn btn-lg primary"
                onClick={() => onBookService()}
              >
                {t.bookBtn}
                <ArrowUpRight size={20} />
              </button>

              <button
                className="btn btn-lg outline"
                onClick={() => onNavigate("/services")}
              >
                {t.browseServices}
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-item">
                <ShieldCheck size={18} className="text-success" />
                <span>{t.statWarranty}</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} className="text-success" />
                <span>{t.statOrders}</span>
              </div>
            </div>
          </div>

          {/* Animated Appliance Visual */}
          <div className="hero-visual">
            <div className="product-art large-art" aria-hidden="true">
              <div className="appliance">
                <span className="appliance-brand">BESQARDAS INVERTER</span>
                <span className="appliance-light" />
                <div className="vents" />
                <span className="appliance-display">24°C</span>
              </div>
              <div className="air-line" />
              <div className="air-line second" />
            </div>
          </div>
        </div>
      </section>

      {/* Equipment Categories */}
      {categories && categories.length > 0 && (
        <section className="section categories-section">
          <div className="container">
            <div className="section-header">
              <h2>{t.categoriesTitle}</h2>
              <button
                className="btn btn-sm ghost"
                onClick={() => onNavigate("/services")}
              >
                {t.viewAll} <ArrowRight size={15} />
              </button>
            </div>

            <div className="grid categories-grid">
              {categories.map((cat) => (
                <button type="button"
                  key={cat.id}
                  className="category-card cursor-pointer"
                  onClick={() => onNavigate(`/services?category=${cat.id}`)}
                >
                  <div className="cat-icon-box">
                    <Sparkles size={20} />
                  </div>
                  <strong>{cat.name?.[locale] || cat.name?.az || cat.name}</strong>
                  <small>{cat.serviceCount || "Servislər"}</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="section how-it-works-section bg-soft">
        <div className="container">
          <div className="section-header center">
            <h2>{t.howItWorksTitle}</h2>
          </div>

          <div className="grid four steps-grid">
            <div className="step-card">
              <span className="step-num">01</span>
              <h4>{t.step1Title}</h4>
              <p>{t.step1Desc}</p>
            </div>
            <div className="step-card">
              <span className="step-num">02</span>
              <h4>{t.step2Title}</h4>
              <p>{t.step2Desc}</p>
            </div>
            <div className="step-card">
              <span className="step-num">03</span>
              <h4>{t.step3Title}</h4>
              <p>{t.step3Desc}</p>
            </div>
            <div className="step-card">
              <span className="step-num">04</span>
              <h4>{t.step4Title}</h4>
              <p>{t.step4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      {services && services.length > 0 && (
        <section className="section services-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">Xidmətlər</span>
                <h2>{t.popularServices}</h2>
              </div>
              <button
                className="btn btn-sm outline"
                onClick={() => onNavigate("/services")}
              >
                {t.viewAll} <ArrowRight size={15} />
              </button>
            </div>

            <div className="grid three services-grid">
              {services.slice(0, 6).map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  locale={locale}
                  onSelect={(svc) => onNavigate(`/services/${svc.slug}`)}
                  onBook={(svc) => onBookService(svc)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Products */}
      {products && products.length > 0 && (
        <section className="section products-section bg-soft">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">Mağaza</span>
                <h2>{t.popularProducts}</h2>
              </div>
              <button
                className="btn btn-sm outline"
                onClick={() => onNavigate("/shop")}
              >
                {t.viewAll} <ArrowRight size={15} />
              </button>
            </div>

            <div className="grid four products-grid">
              {products.slice(0, 4).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  locale={locale}
                  onSelect={(prod) => onNavigate(`/product/${prod.slug}`)}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Technicians */}
      {technicians && technicians.length > 0 && (
        <section className="section technicians-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">Peşəkarlar</span>
                <h2>{t.featuredTechs}</h2>
              </div>
              <button
                className="btn btn-sm outline"
                onClick={() => onNavigate("/technicians")}
              >
                {t.viewAll} <ArrowRight size={15} />
              </button>
            </div>

            <div className="grid three technicians-grid">
              {technicians.slice(0, 3).map((tech) => (
                <TechnicianCard
                  key={tech.id}
                  technician={tech}
                  locale={locale}
                  onSelect={() => onNavigate("/technicians")}
                  onBook={(t) => onBookService({ technicianId: t.id })}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
