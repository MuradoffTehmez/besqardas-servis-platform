"use client";
import React, { useState, useMemo } from "react";
import { Search, Filter, Wrench } from "lucide-react";
import { ServiceCard } from "../../components/domain/service-card";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface ServicesViewProps {
  services: any[];
  categories: any[];
  initialCategory?: string;
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onBookService: (service: any) => void;
}

export function ServicesView({
  services,
  categories,
  initialCategory,
  locale = "az",
  onNavigate,
  onBookService,
}: ServicesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = !selectedCategory || s.categoryId === selectedCategory;
      const name = resolveText(s.name, locale as AppLocale, "").toLowerCase();
      const desc = resolveText(s.shortDescription, locale as AppLocale, "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        name.includes(q) ||
        desc.includes(q);
      return matchCat && matchQuery;
    });
  }, [services, selectedCategory, searchQuery, locale]);

  return (
    <div className="services-view container py-8">
      {/* Header */}
      <div className="page-header">
        <span className="eyebrow">Xidmət Kataloqu</span>
        <h1>Peşəkar Servis Xidmətləri</h1>
        <p className="page-desc">
          Bütün təmir, quraşdırma və diaqnostika xidmətləri rəsmi yazılı akt və zəmanətlə icra olunur.
        </p>
      </div>

      {/* Toolbar & Category Filters */}
      <div className="services-toolbar">
        <div className="category-chips">
          <button
            className={`chip ${!selectedCategory ? "active" : ""}`}
            onClick={() => setSelectedCategory("")}
          >
            Bütün Xidmətlər ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`chip ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name?.[locale] || cat.name?.az || cat.name}
            </button>
          ))}
        </div>

        <div className="search-input">
          <Search size={18} />
          <input
            type="search" aria-label="Axtarış"
            placeholder="Xidmət adı ilə axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredServices.length > 0 ? (
        <div className="grid three services-grid mt-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              locale={locale}
              onSelect={(svc) => onNavigate(`/services/${svc.slug}`)}
              onBook={(svc) => onBookService(svc)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Wrench size={40} className="text-muted mb-2" />
          <h3>Axtarışa uyğun xidmət tapılmadı</h3>
          <p>Filterləri dəyişərək yenidən yoxlayın və ya operatorla əlaqə saxlayın.</p>
        </div>
      )}
    </div>
  );
}
