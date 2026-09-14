"use client";
import React, { useState, useMemo } from "react";
import { Search, Wrench } from "lucide-react";
import { ServiceCard } from "../../components/domain/service-card";
import { useI18n } from "../../app/core/i18n";

export interface ServicesViewProps {
  services: any[];
  categories: any[];
  initialCategory?: string;
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onBookService: (service: any) => void;
}

export function ServicesView({ services, categories, initialCategory, locale = "az", onNavigate, onBookService }: ServicesViewProps) {
  const { t, text } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLocaleLowerCase(locale);
    return services.filter((s) => {
      const matchCat = !selectedCategory || s.categoryId === selectedCategory;
      const haystack = `${text(s.name)} ${text(s.shortDescription)}`.toLocaleLowerCase(locale);
      return matchCat && (!q || haystack.includes(q));
    });
  }, [services, selectedCategory, searchQuery, locale, text]);

  return (
    <div className="services-view container py-8">
      <div className="page-header">
        <span className="eyebrow">{t("site.services.eyebrow")}</span>
        <h1>{t("site.services.title")}</h1>
        <p className="page-desc">{t("site.services.desc")}</p>
      </div>

      <div className="services-toolbar">
        <div className="category-chips" role="group" aria-label={t("shop.categories")}>
          <button type="button" className={`chip ${!selectedCategory ? "active" : ""}`} aria-pressed={!selectedCategory} onClick={() => setSelectedCategory("")}>
            {t("site.services.all", { count: services.length })}
          </button>
          {categories.map((cat) => (
            <button type="button" key={cat.id} className={`chip ${selectedCategory === cat.id ? "active" : ""}`} aria-pressed={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)}>
              {text(cat.nameI18n ?? cat.name)}
            </button>
          ))}
        </div>

        <div className="search-input">
          <Search size={18} aria-hidden />
          <input type="search" aria-label={t("site.services.searchPlaceholder")} placeholder={t("site.services.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {filteredServices.length > 0 ? (
        <div className="grid three services-grid mt-6">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} locale={locale} onSelect={(svc) => onNavigate(`/services/${svc.slug}`)} onBook={(svc) => onBookService(svc)} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <Wrench size={40} className="text-muted mb-2" aria-hidden />
          <h2 className="h3">{t("site.services.emptyTitle")}</h2>
          <p>{t("site.services.emptyText")}</p>
        </div>
      )}
    </div>
  );
}
