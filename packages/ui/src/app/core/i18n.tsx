"use client";
import React, { createContext, useContext, useMemo } from "react";
import { formatDate, formatDateTime, formatMinutes, formatMoney, formatNumber, formatQuantity, formatRelative, formatTime, loadMessages, lookup, unitLabel, type AppLocale } from "@sp/i18n";

/**
 * Lokalizasiya konteksti (PRD §62). UI mətnləri tərcümə açarları ilə gəlir; tərcümə yoxdursa AZ göstərilir.
 * Pul, tarix və miqdar yalnız formatlanır — hesablanmır.
 */

type Vars = Record<string, string | number | null | undefined>;
type Money = { amount: string; currency?: string } | null | undefined;
type Qty = { value: string; unit: string } | null | undefined;

export interface I18n {
  locale: AppLocale;
  t: (key: string, vars?: Vars) => string;
  has: (key: string) => boolean;
  enumLabel: (group: string, code: string | null | undefined) => string;
  text: (value: unknown) => string;
  money: (m: Money) => string;
  date: (iso: string | null | undefined) => string;
  time: (iso: string | null | undefined) => string;
  dateTime: (iso: string | null | undefined) => string;
  relative: (iso: string | null | undefined) => string;
  qty: (q: Qty) => string;
  num: (n: number | string, digits?: number) => string;
  unit: (u: string) => string;
  minutes: (m: number) => string;
  validation: (key: string | undefined) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: AppLocale; children: React.ReactNode }) {
  const value = useMemo<I18n>(() => {
    const messages = loadMessages(locale);
    const t = (key: string, vars?: Vars) => {
      let s = lookup(messages, key);
      if (s === undefined) {
        if (process.env.NODE_ENV !== "production") console.warn(`[i18n] tərcümə yoxdur: ${key}`);
        s = key.split(".").pop() ?? key;
      }
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v === null || v === undefined ? "" : String(v));
      return s;
    };
    return {
      locale,
      t,
      has: (key) => lookup(messages, key) !== undefined,
      enumLabel: (group, code) => (code ? lookup(messages, `enum.${group}.${code}`) ?? code : "—"),
      text: (value) => {
        if (value === null || value === undefined) return "";
        if (typeof value === "string" || typeof value === "number") return String(value);
        if (typeof value === "object" && "az" in (value as object)) {
          const v = value as Record<string, string>;
          return v[locale] || v.az || "";
        }
        return "";
      },
      money: (m) => formatMoney(m, locale),
      date: (iso) => formatDate(iso, locale),
      time: (iso) => formatTime(iso, locale),
      dateTime: (iso) => formatDateTime(iso, locale),
      relative: (iso) => formatRelative(iso, locale),
      qty: (q) => formatQuantity(q, locale),
      num: (n, digits) => formatNumber(n, locale, digits),
      unit: (u) => unitLabel(u, locale),
      minutes: (m) => formatMinutes(m, locale),
      validation: (key) => (!key ? "" : key.startsWith("validation.") ? lookup(messages, key) ?? lookup(messages, "validation.invalid") ?? key : key),
    };
  }, [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("I18nProvider yoxdur");
  return ctx;
}
