"use client";
import React, { useState, useMemo } from "react";
import { Search, Users, Star, Award, ShieldCheck } from "lucide-react";
import { TechnicianCard } from "../../components/domain/technician-card";
import { resolveTechnicianName, resolveText, type AppLocale } from "../../utils/i18n";

export interface TechniciansViewProps {
  technicians: any[];
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onBookTechnician: (technician: any) => void;
}

export function TechniciansView({
  technicians,
  locale = "az",
  onNavigate,
  onBookTechnician,
}: TechniciansViewProps) {
  const [selectedSpec, setSelectedSpec] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const specializations = [
    "Kondisioner",
    "Kombi",
    "İstilik sistemi",
    "Havalandırma",
    "Nasos",
    "Elektrik",
  ];

  const filteredTechnicians = useMemo(() => {
    return technicians.filter((t) => {
      const name = resolveTechnicianName(t, "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        name.includes(q) ||
        (t.specializations &&
          t.specializations.some((s: any) =>
            resolveText(s, locale as AppLocale, "").toLowerCase().includes(q)
          ));

      const matchSpec =
        !selectedSpec ||
        (t.specializations &&
          t.specializations.some((s: any) =>
            resolveText(s, locale as AppLocale, "").toLowerCase().includes(selectedSpec.toLowerCase())
          ));

      return matchQuery && matchSpec;
    });
  }, [technicians, searchQuery, selectedSpec, locale]);

  return (
    <div className="technicians-view container py-8">
      <div className="page-header">
        <span className="eyebrow">Mütəxəssislər</span>
        <h1>Sertifikatlı Servis Ustaları</h1>
        <p className="page-desc">
          Bütün ustalarımız peşəkar yoxlamadan keçmiş, ixtisas sertifikatına malik mütəxəssislərdir.
        </p>
      </div>

      {/* Toolbar */}
      <div className="services-toolbar">
        <div className="category-chips">
          <button
            className={`chip ${!selectedSpec ? "active" : ""}`}
            onClick={() => setSelectedSpec("")}
          >
            Bütün İxtisaslar ({technicians.length})
          </button>
          {specializations.map((spec) => (
            <button
              key={spec}
              className={`chip ${selectedSpec === spec ? "active" : ""}`}
              onClick={() => setSelectedSpec(spec)}
            >
              {spec}
            </button>
          ))}
        </div>

        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Usta adı və ya ixtisas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredTechnicians.length > 0 ? (
        <div className="grid three technicians-grid mt-6">
          {filteredTechnicians.map((tech) => (
            <TechnicianCard
              key={tech.id}
              technician={tech}
              locale={locale}
              onSelect={(t) => onBookTechnician(t)}
              onBook={(t) => onBookTechnician(t)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Users size={40} className="text-muted mb-2" />
          <h3>Axtarışa uyğun usta tapılmadı</h3>
          <p>İxtisas seçimini dəyişərək yenidən yoxlayın.</p>
        </div>
      )}
    </div>
  );
}
