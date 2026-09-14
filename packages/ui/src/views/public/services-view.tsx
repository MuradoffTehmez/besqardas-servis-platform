"use client";
import React, { useMemo, useState } from "react";
import { CheckCircle2, Headset, Phone, Search, Star, Wrench } from "lucide-react";
import { cn } from "@sp/utils";
import { ServiceCard } from "../../components/domain/service-card";
import { ServiceIcon } from "../../components/domain/service-icon";
import { useI18n } from "../../app/core/i18n";

export interface ServicesViewProps {
  services: any[];
  categories: any[];
  initialCategory?: string;
  locale?: "az" | "ru" | "en";
  supportPhone?: string | null;
  onNavigate: (href: string) => void;
  onBookService: (service: any) => void;
}

type Sort = "popular" | "price" | "rating" | "duration";

/** Xidmət kataloqu (§10): axtarış, kateqoriya plitələri, sıralama və xidmət kartları. */
export function ServicesView({ services, categories, initialCategory, locale = "az", supportPhone, onNavigate, onBookService }: ServicesViewProps) {
  const { t, text, num } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const s = (key: string, vars?: Record<string, string | number>) => t(`site.services.${key}`, vars);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase(locale);
    const list = services.filter((sv) => {
      const matchCat = !selectedCategory || sv.categoryId === selectedCategory;
      const haystack = `${text(sv.name)} ${text(sv.shortDescription)} ${text(sv.categoryName)}`.toLocaleLowerCase(locale);
      return matchCat && (!q || haystack.includes(q));
    });
    const price = (sv: any) => (sv.price ? Number(sv.price.amount) : Number.POSITIVE_INFINITY);
    return [...list].sort((a, b) =>
      sort === "price" ? price(a) - price(b) : sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : sort === "duration" ? (a.estimatedDurationMinutes ?? 0) - (b.estimatedDurationMinutes ?? 0) : (b.completedCount ?? 0) - (a.completedCount ?? 0),
    );
  }, [services, selectedCategory, searchQuery, sort, locale, text]);

  const totalJobs = services.reduce((n, sv) => n + (sv.completedCount ?? 0), 0);
  const rated = services.filter((sv) => sv.rating);
  const avgRating = rated.length ? rated.reduce((n, sv) => n + sv.rating, 0) / rated.length : 0;
  const countFor = (id: string) => services.filter((sv) => sv.categoryId === id).length;

  return (
    <div className="svc-page">
      <section className="svc-hero">
        <div className="container svc-hero-inner">
          <div className="svc-hero-copy">
            <span className="eyebrow">{s("eyebrow")}</span>
            <h1>{s("title")}</h1>
            <p>{s("desc")}</p>
            <label className="svc-search">
              <Search size={20} aria-hidden />
              <input type="search" aria-label={s("searchPlaceholder")} placeholder={s("searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
          </div>
          <dl className="svc-hero-stats">
            <div><dt>{s("statServices")}</dt><dd>{services.length}</dd></div>
            <div><dt>{s("statRating")}</dt><dd><Star size={20} fill="currentColor" className="svc-star" aria-hidden /> {num(avgRating, 1)}</dd></div>
            <div><dt>{s("statJobs")}</dt><dd>{num(totalJobs)}+</dd></div>
          </dl>
        </div>
      </section>

      <div className="container">
        <nav className="svc-cats" aria-label={t("shop.categories")}>
          <button type="button" className={cn("svc-cat", !selectedCategory && "active")} aria-pressed={!selectedCategory} onClick={() => setSelectedCategory("")}>
            <span className="svc-cat-icon"><Wrench size={20} aria-hidden /></span>
            <span className="svc-cat-name">{s("allCategories")}</span>
            <small>{services.length}</small>
          </button>
          {categories.map((cat) => (
            <button key={cat.id} type="button" className={cn("svc-cat", selectedCategory === cat.id && "active")} aria-pressed={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)}>
              <span className="svc-cat-icon"><ServiceIcon name={cat.icon} size={20} /></span>
              <span className="svc-cat-name">{text(cat.nameI18n ?? cat.name)}</span>
              <small>{countFor(cat.id)}</small>
            </button>
          ))}
        </nav>

        <div className="svc-toolbar">
          <strong>{s("resultCount", { count: filtered.length })}</strong>
          <label className="shop-sort">
            <span>{t("shop.sortLabel")}</span>
            <select className="form-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="popular">{s("sortPopular")}</option>
              <option value="price">{s("sortPriceAsc")}</option>
              <option value="rating">{s("sortRating")}</option>
              <option value="duration">{s("sortDuration")}</option>
            </select>
          </label>
        </div>

        {filtered.length > 0 ? (
          <div className="svc-grid">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} locale={locale} onSelect={(svc) => onNavigate(`/services/${svc.slug}`)} onBook={(svc) => onBookService(svc)} />
            ))}
          </div>
        ) : (
          <div className="empty-state svc-empty" role="status">
            <Wrench size={40} className="text-muted mb-2" aria-hidden />
            <h2 className="h3">{s("emptyTitle")}</h2>
            <p>{s("emptyText")}</p>
          </div>
        )}

        <section className="svc-help">
          <span className="svc-help-icon"><Headset size={28} aria-hidden /></span>
          <div className="svc-help-copy">
            <h2>{s("helpTitle")}</h2>
            <p>{s("helpText")}</p>
            <ul>
              <li><CheckCircle2 size={16} aria-hidden /> {t("site.serviceDetail.trust1")}</li>
              <li><CheckCircle2 size={16} aria-hidden /> {t("site.serviceDetail.trust2")}</li>
            </ul>
          </div>
          {supportPhone && <a className="btn primary btn-lg" href={`tel:${supportPhone.replace(/[^\d+*]/g, "")}`}><Phone size={18} aria-hidden /> {s("callUs")}: {supportPhone}</a>}
        </section>
      </div>
    </div>
  );
}
