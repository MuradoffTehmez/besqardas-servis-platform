"use client";
import React from "react";
import { Boxes, Cable, Droplets, Fan, Flame, Hammer, Heater, Package, PackageOpen, Ruler, ShowerHead, Snowflake, Sparkles, Stethoscope, Thermometer, Waves, Wind, Wrench, Zap } from "lucide-react";

/** API-dən gələn ikon kodunu Lucide ikonuna çevirir (xidmət və avadanlıq kateqoriyaları). */
const ICONS: Record<string, typeof Wrench> = {
  boxes: Boxes,
  cable: Cable,
  droplets: Droplets,
  fan: Fan,
  flame: Flame,
  hammer: Hammer,
  heater: Heater,
  package: Package,
  "package-open": PackageOpen,
  ruler: Ruler,
  "shower-head": ShowerHead,
  snowflake: Snowflake,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  thermometer: Thermometer,
  waves: Waves,
  wind: Wind,
  wrench: Wrench,
  zap: Zap,
};

/** Məhsul kateqoriyalarında ikon kodu yoxdur — slug üzrə uyğun ikon seçilir. */
const PRODUCT_CATEGORY_ICONS: Record<string, string> = {
  kondisionerler: "snowflake",
  kombiler: "flame",
  radiatorlar: "heater",
  "su-qizdiricilari": "shower-head",
  nasoslar: "waves",
  "isitme-avtomatikasi": "thermometer",
  borular: "ruler",
  "qaz-ve-freon": "wind",
  "ehtiyat-hisseleri": "wrench",
  "hovuz-avadanligi": "waves",
  elektrik: "zap",
  ventilyasiya: "fan",
  "serfiyyat-materiallari": "package",
  "montaj-materiallari": "boxes",
  aletler: "hammer",
  "su-temizleme": "droplets",
};

export const productCategoryIcon = (slug?: string | null) => (slug && PRODUCT_CATEGORY_ICONS[slug]) || "package-open";

export function ServiceIcon({ name, size = 22 }: { name?: string | null; size?: number }) {
  const Icon = (name && ICONS[name]) || Wrench;
  return <Icon size={size} aria-hidden />;
}
