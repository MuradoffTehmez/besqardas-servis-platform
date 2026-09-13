import type { Money, Quantity } from "@sp/types";

/** Decimal-safe money math on integer qəpik (1/100 AZN). The backend would use NUMERIC. */

export const toCents = (amount: string | number): number => Math.round(Number(amount) * 100);
export const fromCents = (cents: number): string => (Math.round(cents) / 100).toFixed(2);
export const money = (cents: number, currency = "AZN"): Money => ({ amount: fromCents(cents), currency });
export const moneyOf = (amount: string | number): Money => money(toCents(amount));
export const zero = (): Money => money(0);
export const centsOf = (m: Money | null | undefined): number => (m ? toCents(m.amount) : 0);

export const qty = (value: number | string, unit: string, precision = 2): Quantity => ({
  value: Number(value).toFixed(precision).replace(/\.?0+$/, "") || "0",
  unit,
});

/** Multiplies a unit price by a decimal quantity string. */
export function lineTotal(unitCents: number, quantity: string | number): number {
  return Math.round(unitCents * Number(quantity));
}

export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/** VAT portion of a VAT-inclusive amount. */
export function vatIncluded(cents: number, rate = 18): number {
  return Math.round(cents - cents / (1 + rate / 100));
}

export function vatOnTop(cents: number, rate = 18): number {
  return Math.round((cents * rate) / 100);
}
