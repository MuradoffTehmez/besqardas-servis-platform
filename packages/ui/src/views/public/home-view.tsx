"use client";
import React, { useState } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Briefcase, CalendarCheck, Check, CheckCircle2, ClipboardCheck, FileCheck2, Megaphone, MonitorSmartphone, Navigation, QrCode,
  ShieldCheck, Star, UserCheck, Wrench,
} from "lucide-react";
import { cn } from "@sp/utils";
import { ProductCard } from "../../components/domain/product-card";
import { ServiceCard } from "../../components/domain/service-card";
import { ServiceIcon } from "../../components/domain/service-icon";
import { anchorProps } from "../../components/nav-anchor";
import { useI18n } from "../../app/core/i18n";
import { Avatar } from "../../app/kit/base";

export interface HomeViewProps {
  services: any[];
  products: any[];
  technicians: any[];
  categories: any[];
  stats?: { completedServices: number; technicians: number; branches: number; rating: number } | null;
  reviews?: { id: string; authorName: string; rating: number; comment: string; createdAt?: string }[];
  banners?: any[];
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onBookService: (service?: any) => void;
  onAddToCart: (product: any) => void;
  /** Mağaza plitəsi tətbiq tərəfindən verilir (seçilmişlər, müqayisə, səbət əməliyyatları ilə). */
  renderProduct?: (product: any) => React.ReactNode;
}

const TONES = ["teal", "orange", "rose", "sky", "violet", "amber", "emerald", "indigo"];

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="star-row" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill="currentColor" className={cn(n > full && "off")} />)}
    </span>
  );
}

function SectionHead({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="hm-head">
      <div className="hm-head-copy">
        <span className="hm-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}

/** Ana səhifə (§9): kampaniya, hero, statistika, kateqoriyalar, proses, xidmətlər, mağaza, üstünlüklər, ustalar, rəylər. */
export function HomeView({ services, products, technicians, categories, stats, reviews = [], banners = [], locale = "az", onNavigate, onBookService, onAddToCart, renderProduct }: HomeViewProps) {
  const { t, text, num, money } = useI18n();
  const h = (key: string, vars?: Record<string, string | number>) => t(`site.home.${key}`, vars);
  const link = (href: string) => anchorProps(locale, href, onNavigate);
  const [code, setCode] = useState("");

  const hero = banners.find((b) => b.placement === "HOME_HERO");
  const strip = banners.find((b) => b.placement === "HOME_STRIP");
  const featured = services[0];
  const tech = technicians[0];
  const rating = stats?.rating ?? 0;
  const viewAll = (href: string) => <a className="btn outline hm-all" {...link(href)}>{h("viewAll")} <ArrowRight size={16} aria-hidden /></a>;

  return (
    <div className="hm">
      {/* ---------------- Hero ---------------- */}
      <section className="hm-hero">
        <div className="container hm-hero-grid">
          <div className="hm-hero-copy">
            {hero ? (
              <a className="hm-promo" {...link(hero.ctaHref)}>
                <span className="hm-promo-icon"><Megaphone size={14} aria-hidden /></span>
                <span className="hm-promo-text"><strong>{hero.title}</strong></span>
                <span className="hm-promo-cta">{hero.ctaLabel} <ArrowRight size={14} aria-hidden /></span>
              </a>
            ) : (
              <span className="hm-promo is-static"><span className="hm-promo-icon"><ShieldCheck size={14} aria-hidden /></span>{h("badge")}</span>
            )}
            <h1>{h("heroTitle")} <em>{h("heroTitleEm")}</em></h1>
            <p className="hm-lead">{h("heroDesc")}</p>
            <div className="hm-actions">
              <button type="button" className="btn btn-lg primary" onClick={() => onBookService()}>
                {h("bookBtn")} <ArrowUpRight size={20} aria-hidden />
              </button>
              <a className="btn btn-lg outline" {...link("/services")}>{h("browseServices")} <ArrowRight size={18} aria-hidden /></a>
            </div>
            {services.length > 0 && (
              <div className="hm-quick">
                <span>{h("popular")}</span>
                {services.slice(0, 4).map((s) => (
                  <a key={s.id} {...link(`/services/${s.slug}`)}>
                    <ServiceIcon name={s.icon} size={14} /> {text(s.nameI18n ?? s.name)}
                  </a>
                ))}
              </div>
            )}
            <ul className="hm-trust">
              {rating > 0 && <li><Stars value={rating} /> <strong>{h("trustRating", { rating: num(rating, 1) })}</strong></li>}
              {stats?.completedServices ? <li><CheckCircle2 size={17} aria-hidden /> {h("trustJobs", { count: num(stats.completedServices) })}</li> : null}
              <li><FileCheck2 size={17} aria-hidden /> {h("trustDocs")}</li>
            </ul>
          </div>

          {/* Dekorativ vizual: sifarişin izlənməsi necə görünür */}
          <div className="hm-visual" aria-hidden>
            <div className="hm-orb" />
            <div className="hm-order">
              <div className="hm-order-head">
                <span className="hm-order-label">{h("cardTitle")}</span>
                <span className="hm-live"><i /> LIVE</span>
              </div>
              {featured && (
                <div className={cn("hm-order-service", `svc-tone-${featured.imageTone ?? "teal"}`)}>
                  <span className="svc-card-icon"><ServiceIcon name={featured.icon} size={22} /></span>
                  <div>
                    <strong>{text(featured.nameI18n ?? featured.name)}</strong>
                    <small>{featured.price ? money(featured.price) : text(featured.categoryName)}</small>
                  </div>
                </div>
              )}
              <ol className="hm-order-steps">
                <li className="done"><span><Check size={12} /></span>{h("cardStep1")}</li>
                <li className="done"><span><Check size={12} /></span>{h("cardStep2")}</li>
                <li className="now"><span><Navigation size={11} /></span>{h("cardStep3")}<em>{h("cardEta", { min: 18 })}</em></li>
              </ol>
              {tech && (
                <div className="hm-order-tech">
                  <Avatar name={tech.fullName} tone={tech.avatarTone} src={tech.avatarUrl} size={40} />
                  <div>
                    <strong>{tech.fullName}</strong>
                    <small><Star size={12} fill="currentColor" className="svc-star" /> {num(tech.rating, 1)} · {t("site.card.jobs", { count: num(tech.completedJobs ?? 0) })}</small>
                  </div>
                  <BadgeCheck size={20} className="hm-verified" />
                </div>
              )}
            </div>
            <div className="hm-float f1">
              <span><ShieldCheck size={18} /></span>
              <div><strong>{h("floatWarranty")}</strong><small>{h("floatWarrantyText")}</small></div>
            </div>
            <div className="hm-float f2">
              <span><CalendarCheck size={18} /></span>
              <div><strong>{h("floatConfirm")}</strong><small>{h("floatConfirmText")}</small></div>
            </div>
          </div>
        </div>

        {stats && (
          <div className="container">
            <dl className="hm-stats">
              <div><dt>{t("homeExtra.completed")}</dt><dd>{num(stats.completedServices)}+</dd></div>
              <div><dt>{t("homeExtra.technicians")}</dt><dd>{num(stats.technicians)}</dd></div>
              <div><dt>{t("homeExtra.branches")}</dt><dd>{num(stats.branches)}</dd></div>
              <div><dt>{t("homeExtra.rating")}</dt><dd>{num(stats.rating, 1)}<small>/5</small></dd></div>
            </dl>
          </div>
        )}
      </section>

      {/* ---------------- Kateqoriyalar ---------------- */}
      {categories.length > 0 && (
        <section className="hm-section">
          <div className="container">
            <SectionHead eyebrow={h("categoriesEyebrow")} title={h("categoriesTitle")} text={h("categoriesText")} action={viewAll("/services")} />
            <div className="hm-cats hm-scroll">
              {categories.map((cat, i) => (
                <a key={cat.id} className={cn("hm-cat", `svc-tone-${TONES[i % TONES.length]}`)} {...link(`/services?category=${cat.id}`)}>
                  <span className="svc-card-icon"><ServiceIcon name={cat.icon} size={24} /></span>
                  <strong>{text(cat.nameI18n ?? cat.name)}</strong>
                  {cat.serviceCount ? <small>{h("servicesCount", { count: cat.serviceCount })}</small> : <small>&nbsp;</small>}
                  <ArrowRight size={16} className="hm-cat-arrow" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Proses ---------------- */}
      <section className="hm-section hm-how">
        <div className="container">
          <SectionHead eyebrow={h("howEyebrow")} title={h("howItWorksTitle")} text={h("howText")} />
          <ol className="hm-steps">
            {[ClipboardCheck, UserCheck, FileCheck2, ShieldCheck].map((Icon, i) => (
              <li key={i}>
                <span className="hm-step-icon"><Icon size={24} aria-hidden /><b>{i + 1}</b></span>
                <h3>{h(`step${i + 1}Title`)}</h3>
                <p>{h(`step${i + 1}Desc`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Xidmətlər ---------------- */}
      {services.length > 0 && (
        <section className="hm-section">
          <div className="container">
            <SectionHead eyebrow={h("servicesEyebrow")} title={h("popularServices")} text={h("servicesText")} action={viewAll("/services")} />
            <div className="svc-grid hm-services">
              {services.slice(0, 6).map((s) => (
                <ServiceCard key={s.id} service={s} locale={locale} onSelect={(svc) => onNavigate(`/services/${svc.slug}`)} onBook={(svc) => onBookService(svc)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Aksiya zolağı ---------------- */}
      {strip && (
        <section className="container">
          <div className={cn("hm-strip", `tone-${strip.tone ?? "accent"}`)}>
            <span className="hm-strip-icon"><Wrench size={26} aria-hidden /></span>
            <div className="hm-strip-copy">
              <h2>{strip.title}</h2>
              <p>{strip.subtitle}</p>
            </div>
            <a className="btn btn-lg hm-strip-btn" {...link(strip.ctaHref)}>{strip.ctaLabel} <ArrowRight size={18} aria-hidden /></a>
          </div>
        </section>
      )}

      {/* ---------------- Mağaza ---------------- */}
      {products.length > 0 && (
        <section className="hm-section hm-soft">
          <div className="container">
            <SectionHead eyebrow={h("shopEyebrow")} title={h("popularProducts")} text={h("productsText")} action={viewAll("/shop")} />
            <div className="shop-grid hm-products">
              {products.slice(0, 8).map((p) => (
                <React.Fragment key={p.id}>
                  {renderProduct ? renderProduct(p) : <ProductCard product={p} locale={locale} onSelect={(prod) => onNavigate(`/product/${prod.slug}`)} onAddToCart={onAddToCart} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Niyə biz + zəmanət yoxlaması ---------------- */}
      <section className="hm-section">
        <div className="container hm-why">
          <div className="hm-why-copy">
            <span className="hm-eyebrow">{h("whyEyebrow")}</span>
            <h2>{h("whyTitle")}</h2>
            <p>{h("whyText")}</p>
            <ul className="hm-why-list">
              {[ClipboardCheck, BadgeCheck, ShieldCheck, MonitorSmartphone].map((Icon, i) => (
                <li key={i}>
                  <span><Icon size={20} aria-hidden /></span>
                  <div><strong>{h(`why${i + 1}Title`)}</strong><p>{h(`why${i + 1}Text`)}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="hm-warranty">
            <span className="hm-warranty-icon"><QrCode size={30} aria-hidden /></span>
            <h3>{h("warrantyTitle")}</h3>
            <p>{h("warrantyText")}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) onNavigate(`/warranty/verify/${encodeURIComponent(code.trim())}`); }}>
              <input className="form-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="W30012AB12" aria-label={t("warrantyVerify.code")} />
              <button className="btn primary">{t("warrantyVerify.check")}</button>
            </form>
            <ul>
              <li><Check size={15} aria-hidden /> {t("site.serviceDetail.trust2")}</li>
              <li><Check size={15} aria-hidden /> {t("warrantyVerify.privacy")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- Ustalar ---------------- */}
      {technicians.length > 0 && (
        <section className="hm-section hm-soft">
          <div className="container">
            <SectionHead eyebrow={h("techEyebrow")} title={h("featuredTechs")} text={h("techText")} action={viewAll("/technicians")} />
            <div className="hm-techs hm-scroll">
              {technicians.slice(0, 4).map((x) => (
                <article key={x.id} className="hm-tech">
                  <span className="tch-avatar">
                    <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} size={72} />
                    {x.verified && <span className="tch-check"><BadgeCheck size={16} aria-hidden /></span>}
                  </span>
                  <h3 className="tch-name"><a {...link(`/technicians/${x.id}`)}>{x.fullName}</a></h3>
                  <span className="tch-rating"><Star size={15} fill="currentColor" className="svc-star" aria-hidden /> <strong>{num(x.rating, 1)}</strong> <span>· {t("site.card.jobs", { count: num(x.completedJobs ?? 0) })}</span></span>
                  <ul className="tch-specs">
                    {(x.specializations ?? []).slice(0, 2).map((s: any) => <li key={typeof s === "string" ? s : s.id}>{typeof s === "string" ? s : s.name}</li>)}
                  </ul>
                  <button type="button" className="btn outline btn-sm w-full" onClick={() => onNavigate(`/technicians/${x.id}#book`)}>{t("techniciansPage.choose")}</button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Rəylər ---------------- */}
      {reviews.length > 0 && (
        <section className="hm-section">
          <div className="container hm-reviews">
            <div className="hm-score">
              <span className="hm-eyebrow">{h("reviewsEyebrow")}</span>
              <h2>{t("homeExtra.reviewsTitle")}</h2>
              <div className="hm-score-num"><strong>{num(rating, 1)}</strong><span>/ 5</span></div>
              <Stars value={rating} size={22} />
              <p>{h("reviewsBased")}</p>
              <a className="btn outline" {...link("/technicians")}>{h("reviewsCta")} <ArrowRight size={16} aria-hidden /></a>
            </div>
            <div className="hm-review-list hm-scroll">
              {reviews.slice(0, 4).map((r) => (
                <blockquote key={r.id} className="hm-review">
                  <Stars value={r.rating} />
                  <p>“{r.comment}”</p>
                  <footer>
                    <span className="pdp-avatar" aria-hidden>{r.authorName?.[0]}</span>
                    <cite>{r.authorName}</cite>
                    <CheckCircle2 size={15} className="hm-verified" aria-hidden />
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Qoşulma ---------------- */}
      <section className="hm-section hm-join-wrap">
        <div className="container hm-join">
          <article className="hm-join-card is-tech">
            <span className="hm-join-icon"><Wrench size={26} aria-hidden /></span>
            <h2>{t("homeExtra.joinTitle")}</h2>
            <p>{t("homeExtra.joinText")}</p>
            <a className="btn btn-lg" {...link("/become-technician")}>{t("auth.technicianApply")} <ArrowRight size={18} aria-hidden /></a>
          </article>
          <article className="hm-join-card is-b2b">
            <span className="hm-join-icon"><Briefcase size={26} aria-hidden /></span>
            <h2>{t("homeExtra.b2bTitle")}</h2>
            <p>{t("homeExtra.b2bText")}</p>
            <a className="btn btn-lg" {...link("/business")}>{t("auth.b2bApply")} <ArrowRight size={18} aria-hidden /></a>
          </article>
        </div>
      </section>
    </div>
  );
}
