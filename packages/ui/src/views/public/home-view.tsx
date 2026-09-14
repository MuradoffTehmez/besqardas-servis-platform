"use client";
import React from "react";
import { ArrowUpRight, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { ServiceCard } from "../../components/domain/service-card";
import { ProductCard } from "../../components/domain/product-card";
import { TechnicianCard } from "../../components/domain/technician-card";
import { anchorProps } from "../../components/nav-anchor";
import { useI18n } from "../../app/core/i18n";

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

export function HomeView({ services, products, technicians, categories, locale = "az", onNavigate, onBookService, onAddToCart }: HomeViewProps) {
  const { t, text } = useI18n();
  const h = (key: string, vars?: Record<string, string | number>) => t(`site.home.${key}`, vars);
  const link = (href: string) => anchorProps(locale, href, onNavigate);

  return (
    <div className="home-view">
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" />
              {h("badge")}
            </span>

            <h1>
              {h("heroTitle")} <br />
              <em>{h("heroTitleEm")}</em>
            </h1>

            <p className="hero-desc">{h("heroDesc")}</p>

            <div className="hero-actions">
              <button type="button" className="btn btn-lg primary" onClick={() => onBookService()}>
                {h("bookBtn")}
                <ArrowUpRight size={20} />
              </button>
              <a className="btn btn-lg outline" {...link("/services")}>
                {h("browseServices")}
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-item">
                <ShieldCheck size={18} className="text-success" />
                <span>{h("statWarranty")}</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} className="text-success" />
                <span>{h("statOrders")}</span>
              </div>
            </div>
          </div>

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

      {categories?.length > 0 && (
        <section className="section categories-section">
          <div className="container">
            <div className="section-header">
              <h2>{h("categoriesTitle")}</h2>
              <a className="btn btn-sm ghost" {...link("/services")}>
                {h("viewAll")} <ArrowRight size={15} />
              </a>
            </div>

            <div className="grid categories-grid">
              {categories.map((cat) => (
                <a key={cat.id} className="category-card cursor-pointer" {...link(`/services?category=${cat.id}`)}>
                  <div className="cat-icon-box" aria-hidden>
                    <Sparkles size={20} />
                  </div>
                  <strong>{text(cat.nameI18n ?? cat.name)}</strong>
                  {cat.serviceCount ? <small>{h("servicesCount", { count: cat.serviceCount })}</small> : null}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section how-it-works-section bg-soft">
        <div className="container">
          <div className="section-header center">
            <h2>{h("howItWorksTitle")}</h2>
          </div>
          <ol className="grid four steps-grid" role="list">
            {[1, 2, 3, 4].map((n) => (
              <li className="step-card" key={n}>
                <span className="step-num" aria-hidden>{String(n).padStart(2, "0")}</span>
                <h3 className="h4">{h(`step${n}Title`)}</h3>
                <p>{h(`step${n}Desc`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {services?.length > 0 && (
        <section className="section services-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">{h("servicesEyebrow")}</span>
                <h2>{h("popularServices")}</h2>
              </div>
              <a className="btn btn-sm outline" {...link("/services")}>
                {h("viewAll")} <ArrowRight size={15} />
              </a>
            </div>
            <div className="grid three services-grid">
              {services.slice(0, 6).map((s) => (
                <ServiceCard key={s.id} service={s} locale={locale} onSelect={(svc) => onNavigate(`/services/${svc.slug}`)} onBook={(svc) => onBookService(svc)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {products?.length > 0 && (
        <section className="section products-section bg-soft">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">{h("shopEyebrow")}</span>
                <h2>{h("popularProducts")}</h2>
              </div>
              <a className="btn btn-sm outline" {...link("/shop")}>
                {h("viewAll")} <ArrowRight size={15} />
              </a>
            </div>
            <div className="grid four products-grid">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} onSelect={(prod) => onNavigate(`/product/${prod.slug}`)} onAddToCart={onAddToCart} />
              ))}
            </div>
          </div>
        </section>
      )}

      {technicians?.length > 0 && (
        <section className="section technicians-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">{h("techEyebrow")}</span>
                <h2>{h("featuredTechs")}</h2>
              </div>
              <a className="btn btn-sm outline" {...link("/technicians")}>
                {h("viewAll")} <ArrowRight size={15} />
              </a>
            </div>
            <div className="grid three technicians-grid">
              {technicians.slice(0, 3).map((tech) => (
                <TechnicianCard key={tech.id} technician={tech} locale={locale} onSelect={(x) => onNavigate(`/technicians/${x.id}`)} onBook={(x) => onBookService({ technicianId: x.id })} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
