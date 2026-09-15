"use client";
import React, { useId } from "react";
import { cn } from "@sp/utils";

export type FlagLocale = "az" | "ru" | "en";

/** Dillərin öz dilində adı — dil seçimi menyularında istifadə olunur */
export const LOCALE_NAMES: Record<FlagLocale, string> = { az: "Azərbaycan", ru: "Русский", en: "English" };
export const LOCALE_CODES: FlagLocale[] = ["az", "ru", "en"];

// Azərbaycan bayrağındakı səkkizguşəli ulduz
const AZ_STAR = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const r = i % 2 ? 22 : 50;
  return `${(660 + r * Math.cos(a)).toFixed(1)},${(300 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

/**
 * Dil üçün ölkə bayrağı (SVG). Windows emoji bayraqları göstərmədiyi üçün şəkil kimi çəkilir.
 * az → Azərbaycan, ru → Rusiya, en → Böyük Britaniya.
 */
export function LocaleFlag({ locale, width = 20, className }: { locale: FlagLocale; width?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const height = Math.round(width * 0.7);
  const common = { width, height, className: cn("locale-flag", className), preserveAspectRatio: "xMidYMid slice", "aria-hidden": true, focusable: false } as const;
  if (locale === "az") {
    return (
      <svg viewBox="0 0 1200 600" {...common}>
        <rect width="1200" height="200" fill="#00B5E2" />
        <rect y="200" width="1200" height="200" fill="#EF3340" />
        <rect y="400" width="1200" height="200" fill="#509E2F" />
        <circle cx="570" cy="300" r="90" fill="#fff" />
        <circle cx="593" cy="300" r="75" fill="#EF3340" />
        <polygon points={AZ_STAR} fill="#fff" />
      </svg>
    );
  }
  if (locale === "ru") {
    return (
      <svg viewBox="0 0 9 6" {...common}>
        <rect width="9" height="2" fill="#fff" />
        <rect y="2" width="9" height="2" fill="#0039A6" />
        <rect y="4" width="9" height="2" fill="#D52B1E" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 30" {...common}>
      <clipPath id={`${id}s`}><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id={`${id}t`}><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
