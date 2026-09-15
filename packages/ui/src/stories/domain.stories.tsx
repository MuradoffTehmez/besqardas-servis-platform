import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ServiceCard } from "../components/domain/service-card";
import { ProductCard } from "../components/domain/product-card";
import { TechnicianCard } from "../components/domain/technician-card";
import { DeviceCard } from "../components/domain/device-card";
import { LocaleFlag, LOCALE_CODES, LOCALE_NAMES } from "../components/domain/locale-flag";
import { ServiceIcon } from "../components/domain/service-icon";

/** Domen kartları: xidmət, məhsul, usta, cihaz; bayraqlar və xidmət ikonları */
const meta: Meta = { title: "Domen/Kartlar" };
export default meta;
type Story = StoryObj;

const grid: React.CSSProperties = { display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" };
const noop = () => {};

export const Services: Story = {
  name: "Xidmət kartları",
  render: () => (
    <div style={grid}>
      <ServiceCard
        onSelect={noop}
        onBook={noop}
        service={{ id: "s1", slug: "kondisioner-periodik-servis", name: { az: "Kondisioner periodik servisi", ru: "Периодическое обслуживание кондиционера", en: "Air conditioner periodic service" }, shortDescription: { az: "Filtr təmizliyi, freon yoxlanışı və diaqnostika", ru: "Чистка фильтров, проверка фреона", en: "Filter cleaning, refrigerant check" }, categoryName: { az: "Kondisioner", ru: "Кондиционер", en: "Air conditioning" }, icon: "air-vent", estimatedDurationMinutes: 90, workWarrantyMonths: 3, rating: 4.8, completedCount: 1240, executionForms: ["ON_SITE"], price: { amount: "45.00", currency: "AZN" }, priceModel: "STARTING_FROM" }}
      />
      <ServiceCard
        onSelect={noop}
        onBook={noop}
        service={{ id: "s2", slug: "kombi-temiri", name: "Kombi təmiri", shortDescription: "Nasaz kombinin diaqnostikası və təmiri", categoryName: "İstilik", icon: "flame", estimatedDurationMinutes: 120, workWarrantyMonths: 6, rating: 4.6, completedCount: 640, executionForms: ["ON_SITE", "CARRY_IN"], price: null, priceModel: "ESTIMATE_BASED" }}
      />
    </div>
  ),
};

export const Products: Story = {
  name: "Məhsul kartları",
  render: () => (
    <div style={grid}>
      <ProductCard onSelect={noop} onAddToCart={noop} product={{ id: "p1", slug: "midea-xtreme-save", name: "Midea Xtreme Save 12", brandName: "Midea", rating: 4.7, reviewCount: 38, price: { effectivePrice: { amount: "1149.00", currency: "AZN" }, basePrice: { amount: "1299.00", currency: "AZN" } }, stockStatus: "IN_STOCK", warrantyMonths: 24 }} />
      <ProductCard onSelect={noop} onAddToCart={noop} product={{ id: "p2", slug: "lg-dualcool", name: "LG DualCool X123", brandName: "LG", rating: 4.9, reviewCount: 12, price: { effectivePrice: { amount: "1590.00", currency: "AZN" } }, stockStatus: "LOW_STOCK", warrantyMonths: 36 }} />
      <ProductCard onSelect={noop} onAddToCart={noop} product={{ id: "p3", slug: "filtr", name: "Karbon filtr dəsti", brandName: "Universal", price: { effectivePrice: { amount: "24.90", currency: "AZN" } }, stockStatus: "OUT_OF_STOCK" }} />
    </div>
  ),
};

export const Technicians: Story = {
  name: "Usta kartları",
  render: () => (
    <div style={grid}>
      <TechnicianCard onSelect={noop} onBook={noop} technician={{ id: "t1", fullName: "Elvin Həsənov", avatarTone: 2, rating: 4.9, reviewCount: 214, completedJobs: 830, specializations: ["Kondisioner", "Soyuducu"], serviceZones: ["Nərimanov", "Yasamal"], employmentType: "STAFF", experienceYears: 9, verified: true, promoted: true, nextAvailableAt: "2026-09-16T10:00:00+04:00" }} />
      <TechnicianCard onSelect={noop} onBook={noop} technician={{ id: "t2", fullName: "Rauf Səfərov", avatarTone: 5, rating: 4.6, reviewCount: 57, completedJobs: 190, specializations: ["Kombi"], serviceZones: ["Xətai"], employmentType: "INDEPENDENT", experienceYears: 4, verified: true }} />
    </div>
  ),
};

export const Devices: Story = {
  name: "Cihaz kartları",
  render: () => (
    <div style={grid}>
      <DeviceCard onBookService={noop} onClaimWarranty={noop} onViewHistory={noop} device={{ id: "d1", categoryName: "Kondisioner", brandName: "LG", modelName: "DualCool X123", serialNumber: "LG-2291-AZ", addressShort: "Nərimanov r., Təbriz küç. 44", warrantyUntil: "2027-05-01", isUnderWarranty: true, nextPeriodicServiceDate: "2026-10-01" }} />
      <DeviceCard onBookService={noop} onViewHistory={noop} device={{ id: "d2", categoryName: "Kombi", brandName: "Baxi", modelName: "Eco Four", serialNumber: "BX-7781", addressShort: "Yasamal r.", warrantyUntil: "2025-01-10", isUnderWarranty: false }} />
    </div>
  ),
};

export const Flags: Story = {
  name: "Dil bayraqları və xidmət ikonları",
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {LOCALE_CODES.map((l) => (
          <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <LocaleFlag locale={l} width={28} /> {LOCALE_NAMES[l]}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#0f766e" }}>
        {["air-vent", "flame", "refrigerator", "washing-machine", "tv", "droplets", "zap", "package-open"].map((n) => (
          <span key={n} title={n} style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "#ccfbf1" }}><ServiceIcon name={n} /></span>
        ))}
      </div>
    </div>
  ),
};
