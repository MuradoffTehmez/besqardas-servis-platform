import type { AppliedDiscount, Price, PriceType } from "@sp/types";
import { db } from "../db/state";
import type { PromotionRec } from "../db/seedTypes";
import type { ProductRec, VariantRec } from "../data/catalog";
import { money, percentOf, vatIncluded } from "../lib/money";
import { t, tr } from "../lib/i18n";
import type { Ctx } from "./context";

/**
 * Qiymət mühərriki (PRD §46). Frontend heç vaxt qiyməti hesablamır — bu funksiyalar backend-in
 * rolunu oynayır və §46.4-dəki cavab formatını qaytarır.
 */

export const VAT_RATE = 18;

export function categoryAncestors(categoryId: string): string[] {
  const out: string[] = [];
  let current = db.productCategories.find((c) => c.id === categoryId);
  while (current) {
    out.push(current.id);
    current = current.parentId ? db.productCategories.find((c) => c.id === current!.parentId) : undefined;
  }
  return out;
}

export function listPriceCents(variant: VariantRec, priceType: PriceType, ctx: Ctx): number {
  if (priceType === "CORPORATE") {
    const pct = ctx.company?.discountPercent ?? 0;
    return variant.prices.RETAIL - percentOf(variant.prices.RETAIL, pct);
  }
  return variant.prices[priceType];
}

interface DiscountResult {
  effectiveCents: number;
  applied: { promo: PromotionRec; cents: number }[];
  report: AppliedDiscount[];
}

/** §46.3 — endirimlərin birləşdirilməsi alqoritmi */
export function combineDiscounts(baseCents: number, candidates: PromotionRec[], ctx: Ctx): DiscountResult {
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
  const report: AppliedDiscount[] = [];
  const applied: { promo: PromotionRec; cents: number }[] = [];
  const label = (p: PromotionRec) => tr(p.name, ctx.locale);

  const exclusive = sorted.find((p) => p.stacking === "EXCLUSIVE");
  if (exclusive) {
    const cents = amountFor(exclusive, baseCents, baseCents);
    applied.push({ promo: exclusive, cents });
    for (const p of sorted) {
      if (p === exclusive) report.push({ code: p.code, label: label(p), amount: money(cents), stacking: p.stacking, applied: true, skippedReason: null });
      else report.push({ code: p.code, label: label(p), amount: money(0), stacking: p.stacking, applied: false, skippedReason: t("discount.skippedExclusive", ctx.locale) });
    }
    return { effectiveCents: Math.max(0, baseCents - cents), applied, report };
  }

  let running = baseCents;
  for (const p of sorted) {
    const conflict = applied.find(
      ({ promo }) =>
        (p.stacking === "COMBINABLE_WITH_LIST" && !p.combinableWith.includes(promo.code)) ||
        (promo.stacking === "COMBINABLE_WITH_LIST" && !promo.combinableWith.includes(p.code)),
    );
    if (conflict) {
      report.push({ code: p.code, label: label(p), amount: money(0), stacking: p.stacking, applied: false, skippedReason: t("discount.skippedList", ctx.locale) });
      continue;
    }
    let cents = amountFor(p, baseCents, running);
    let reason: string | null = null;
    if (p.maxDiscountCents !== null && cents > p.maxDiscountCents) {
      cents = p.maxDiscountCents;
      reason = t("discount.capped", ctx.locale);
    }
    running = Math.max(0, running - cents);
    applied.push({ promo: p, cents });
    report.push({ code: p.code, label: label(p), amount: money(cents), stacking: p.stacking, applied: true, skippedReason: reason });
  }
  return { effectiveCents: running, applied, report };
}

function amountFor(p: PromotionRec, base: number, running: number): number {
  const basis = p.base === "BASE_PRICE" ? base : running;
  if (p.kind === "FIXED") return Math.min(basis, Math.round(p.value * 100));
  return percentOf(basis, p.value);
}

function isActive(p: PromotionRec) {
  const now = Date.now();
  return p.active && new Date(p.startsAt).getTime() <= now && (!p.endsAt || new Date(p.endsAt).getTime() > now);
}

export function productPromotions(product: ProductRec, ctx: Ctx): PromotionRec[] {
  const ancestors = categoryAncestors(product.categoryId);
  return db.promotions.filter((p) => {
    if (!isActive(p) || p.kind === "PROMO_CODE") return false;
    if (p.appliesTo !== "PRODUCTS") return false;
    if (p.kind === "SUBSCRIPTION") return !!ctx.plan && p.planCodes.includes(ctx.plan.code) && ctx.priceType === "RETAIL";
    if (p.segments.length && !p.segments.includes(ctx.priceType)) return false;
    if (p.productIds.length && !p.productIds.includes(product.id)) return false;
    if (p.categoryIds.length && !p.categoryIds.some((c) => ancestors.includes(c))) return false;
    return true;
  });
}

export function servicePromotions(ctx: Ctx): PromotionRec[] {
  return db.promotions.filter((p) => isActive(p) && p.appliesTo === "SERVICES" && p.kind === "SUBSCRIPTION" && !!ctx.plan && p.planCodes.includes(ctx.plan.code));
}

export function variantPrice(product: ProductRec, variant: VariantRec, ctx: Ctx): Price {
  const priceType = ctx.priceType;
  const baseCents = listPriceCents(variant, priceType, ctx);
  const retailCents = variant.prices.RETAIL;
  const { effectiveCents, report } = combineDiscounts(baseCents, productPromotions(product, ctx), ctx);
  const b2b = priceType === "PARTNER" || priceType === "WHOLESALE" || priceType === "CORPORATE";
  const net = (c: number) => (b2b ? c - vatIncluded(c, VAT_RATE) : c);
  const factorPrice = (factor: number, pkg?: number) => {
    if (pkg) return Math.round((pkg * effectiveCents) / retailCents);
    return Math.round(effectiveCents * factor);
  };

  const price: Price = {
    basePrice: money(net(priceType === "RETAIL" ? baseCents : Math.max(baseCents, 0))),
    effectivePrice: money(net(effectiveCents)),
    priceType,
    appliedDiscounts: report.map((d) => ({ ...d, amount: money(net(Number(d.amount.amount) * 100)) })),
    vat: { rate: VAT_RATE.toFixed(2), included: !b2b },
  };
  if (priceType === "WHOLESALE" || priceType === "PARTNER") {
    price.tiers = [
      { minQuantity: "10", price: money(net(effectiveCents - percentOf(effectiveCents, 3))) },
      { minQuantity: "50", price: money(net(effectiveCents - percentOf(effectiveCents, 6))) },
    ];
  }
  if (product.conversions.length) {
    price.unitPrices = [
      { unit: product.baseUnit, label: "1", factor: "1", price: money(net(effectiveCents)) },
      ...product.conversions.map((c) => ({ unit: c.unit, label: String(c.factor), factor: String(c.factor), price: money(net(factorPrice(c.factor, c.packagePriceCents))) })),
    ];
  }
  price.installment =
    !b2b && effectiveCents >= 30000 ? { months: 12, monthly: money(Math.ceil(effectiveCents / 12)), provider: "BirKart" } : null;
  return price;
}

/** Vahid çevirməsi: daxil edilən vahiddə miqdarı əsas vahidə çevirir (backend məntiqi). */
export function toBaseQuantity(product: ProductRec, quantity: number, unit: string): number {
  if (unit === product.baseUnit) return quantity;
  const conv = product.conversions.find((c) => c.unit === unit);
  return conv ? quantity * conv.factor : quantity;
}

/** Göstərilən vahid üzrə bir vahidin qiyməti (qablaşdırma qiyməti nəzərə alınır). */
export function unitPriceCents(product: ProductRec, variant: VariantRec, unit: string, ctx: Ctx): number {
  const price = variantPrice(product, variant, ctx);
  const up = price.unitPrices?.find((u) => u.unit === unit);
  const cents = Math.round(Number((up?.price ?? price.effectivePrice).amount) * 100);
  return cents;
}

export function stockSummary(variantId: string, purposes: ("SALES" | "SERVICE")[] = ["SALES"]) {
  const rows = db.stock.filter((s) => s.variantId === variantId && purposes.includes(s.purpose));
  const usable = rows.filter((s) => {
    const wh = db.warehouses.find((w) => w.id === s.warehouseId);
    return wh && wh.type !== "TRANSIT" && wh.type !== "QUARANTINE";
  });
  const available = usable.reduce((sum, s) => sum + Math.max(0, s.physical - s.reserved - s.damaged), 0);
  const min = usable.reduce((sum, s) => sum + s.minLevel, 0);
  const status: "IN_STOCK" | "LOW" | "OUT_OF_STOCK" = available <= 0 ? "OUT_OF_STOCK" : available <= Math.max(min, 3) ? "LOW" : "IN_STOCK";
  return { available, status };
}

export function productVisible(product: ProductRec, ctx: Ctx) {
  if (product.status !== "ACTIVE") return false;
  if (!product.visibility.length) return true;
  if (ctx.role === "SUPER_ADMIN" || ctx.role === "ADMIN") return true;
  return product.visibility.includes(ctx.priceType);
}
