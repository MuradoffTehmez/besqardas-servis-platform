"use client";
import React from "react";
import { Droplets, Flame, PackageOpen, Ruler, Snowflake, Sparkles, Stethoscope, Thermometer, Waves, Wrench, Zap } from "lucide-react";

/** API-dən gələn ikon kodunu Lucide ikonuna çevirir (xidmət və avadanlıq kateqoriyaları). */
const ICONS: Record<string, typeof Wrench> = {
  droplets: Droplets,
  flame: Flame,
  "package-open": PackageOpen,
  ruler: Ruler,
  snowflake: Snowflake,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  thermometer: Thermometer,
  waves: Waves,
  wrench: Wrench,
  zap: Zap,
};

export function ServiceIcon({ name, size = 22 }: { name?: string | null; size?: number }) {
  const Icon = (name && ICONS[name]) || Wrench;
  return <Icon size={size} aria-hidden />;
}
