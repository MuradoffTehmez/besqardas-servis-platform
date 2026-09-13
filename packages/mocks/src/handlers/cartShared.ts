import { db } from "../db/state";
import type { CartRec } from "../db/types";
import type { Ctx } from "../engine/context";
import { combineDiscounts, stockSummary, variantPrice, VAT_RATE } from "../engine/pricing";
import { findVariant } from "../engine/stock";
import { money, vatIncluded } from "../lib/money";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";
import { t, tr } from "../lib/i18n";
import { attributeDisplay } from "../dto";

/** Səbət hesablamaları (backend məntiqi, PRD §31.1, §46.3). */

export function cartItemCount(cart: CartRec) {
  return cart.items.length;
}

export function getCart(ctx: Ctx, create = false): CartRec | null {
  const key = ctx.user?.id ?? ctx.guestKey;
  if (!key) return null;
  let cart = db.carts.find((c) => c.ownerKey === key) ?? null;
  if (!cart && create) {
    cart = { id: newId("cart"), ownerKey: key, items: [], promoCode: null, merged: false, updatedAt: nowIso() };
    db.carts.push(cart);
  }
  return cart;
}

/** Qonaq səbətinin girişdən sonra hesab səbəti ilə birləşdirilməsi (§31.1). */
export function mergeGuestCart(guestKey: string, userId: string) {
  const guest = db.carts.find((c) => c.ownerKey === guestKey);
  if (!guest || !guest.items.length) return;
  let cart = db.carts.find((c) => c.ownerKey === userId);
  if (!cart) {
    guest.ownerKey = userId;
    guest.merged = true;
    return;
  }
  for (const item of guest.items) {
    const existing = cart.items.find((i) => i.variantId === item.variantId && i.unit === item.unit);
    if (existing) existing.quantity = String(Number(existing.quantity) + Number(item.quantity));
    else cart.items.push(item);
  }
  cart.merged = true;
  db.carts = db.carts.filter((c) => c !== guest);
}

export function lineUnitCents(price: ReturnType<typeof variantPrice>, unit: string) {
  const up = price.unitPrices?.find((u) => u.unit === unit);
  return Math.round(Number((up?.price ?? price.effectivePrice).amount) * 100);
}

export function computeCart(cart: CartRec, ctx: Ctx) {
  const b2b = ctx.priceType === "PARTNER" || ctx.priceType === "WHOLESALE" || ctx.priceType === "CORPORATE";
  let subtotal = 0;
  let productDiscount = 0;
  let installation = 0;
  const discountMap = new Map<string, { code: string; label: string; cents: number }>();
  const items = cart.items
    .map((item) => {
      const found = findVariant(item.variantId);
      if (!found) return null;
      const { product, variant } = found;
      const price = variantPrice(product, variant, ctx);
      const unitCents = lineUnitCents(price, item.unit);
      const conv = product.conversions.find((c) => c.unit === item.unit);
      const factor = conv?.factor ?? 1;
      const baseQty = Number(item.quantity) * factor;
      const lineCents = Math.round(unitCents * Number(item.quantity));
      subtotal += lineCents;
      const baseUnitCents = Math.round(Number(price.basePrice.amount) * 100);
      const effUnitCents = Math.round(Number(price.effectivePrice.amount) * 100);
      productDiscount += Math.round((baseUnitCents - effUnitCents) * baseQty);
      for (const d of price.appliedDiscounts.filter((x) => x.applied)) {
        const cents = Math.round(Number(d.amount.amount) * 100 * baseQty);
        const prev = discountMap.get(d.code);
        discountMap.set(d.code, { code: d.code, label: d.label, cents: (prev?.cents ?? 0) + cents });
      }
      const service = product.installServiceId ? db.services.find((s) => s.id === product.installServiceId) : null;
      const install = service ? { serviceId: service.id, name: tr(service.name, ctx.locale), price: money(service.priceCents ?? 0) } : null;
      if (item.withInstallation && service) installation += (service.priceCents ?? 0) * Math.ceil(Number(item.quantity));
      const stock = stockSummary(variant.id);
      const warnings: { code: "PRICE_CHANGED" | "STOCK_LOW" | "OUT_OF_STOCK"; message: string }[] = [];
      if (item.priceSnapshotCents && Math.abs(item.priceSnapshotCents - unitCents) > 1) warnings.push({ code: "PRICE_CHANGED", message: t("cart.priceChanged", ctx.locale) });
      if (stock.available <= 0) warnings.push({ code: "OUT_OF_STOCK", message: t("cart.outOfStock", ctx.locale) });
      else if (stock.available < baseQty) warnings.push({ code: "STOCK_LOW", message: t("cart.stockLow", ctx.locale) });
      return {
        id: item.id,
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: tr(product.name, ctx.locale),
        variantName: Object.entries(variant.attributes).map(([c, v]) => tr(attributeDisplay(c, v), ctx.locale)).join(" · "),
        sku: variant.sku,
        imageTone: product.imageTone,
        imageUrl: `illu:${product.imageKind}`,
        quantity: { value: item.quantity, unit: item.unit },
        baseQuantity: { value: String(+baseQty.toFixed(3)), unit: product.baseUnit },
        availableUnits: [{ unit: product.baseUnit, label: product.baseUnit, factor: "1" }, ...product.conversions.map((c) => ({ unit: c.unit, label: c.unit, factor: String(c.factor) }))],
        unitPrice: price,
        unitPriceForUnit: money(unitCents),
        lineTotal: money(lineCents),
        installation: item.withInstallation ? install : null,
        installationAvailable: install,
        stockStatus: stock.status,
        warnings,
        returnRestriction: product.returnRestriction ? t(product.returnRestriction, ctx.locale) : null,
      };
    })
    .filter(Boolean);

  // Səbət səviyyəsində promo kod (§46.3 birləşmə qaydaları)
  let promoError: string | null = null;
  let promoCents = 0;
  const applied = [...discountMap.values()].map((d) => ({ code: d.code, label: d.label, amount: money(d.cents), applied: true, skippedReason: null as string | null }));
  if (cart.promoCode) {
    const promo = db.promotions.find((p) => p.promoCode?.toUpperCase() === cart.promoCode!.toUpperCase() && p.active && (!p.endsAt || new Date(p.endsAt).getTime() > Date.now()));
    if (!promo || (promo.segments.length && !promo.segments.includes(ctx.priceType))) {
      promoError = t("error.promo", ctx.locale);
    } else {
      const existing = db.promotions.filter((p) => discountMap.has(p.code));
      const result = combineDiscounts(subtotal, [...existing.map((p) => ({ ...p, kind: "FIXED" as const, value: 0, stacking: p.stacking === "EXCLUSIVE" ? ("STACKABLE" as const) : p.stacking })), promo], ctx);
      let r = result.report.find((x) => x.code === promo.code)!;
      if (promo.stacking === "EXCLUSIVE" && existing.length) r = { ...r, applied: false, skippedReason: t("discount.skippedExclusive", ctx.locale) };
      else if (promo.stacking === "EXCLUSIVE") r = { ...r, applied: true };
      if (r.applied) {
        promoCents = Math.round(Number(r.amount.amount) * 100);
        applied.push({ code: promo.code, label: tr(promo.name, ctx.locale), amount: money(promoCents), applied: true, skippedReason: r.skippedReason ?? null });
      } else {
        applied.push({ code: promo.code, label: tr(promo.name, ctx.locale), amount: money(0), applied: false, skippedReason: r.skippedReason ?? null });
      }
    }
  }
  const total = Math.max(0, subtotal - promoCents + installation);
  return {
    id: cart.id,
    items,
    promoCode: cart.promoCode,
    promoError,
    totals: {
      subtotal: money(subtotal + productDiscount),
      discountTotal: money(productDiscount + promoCents),
      installationTotal: money(installation),
      deliveryTotal: money(0),
      vatTotal: money(b2b ? Math.round((total * VAT_RATE) / 100) : vatIncluded(total)),
      total: money(b2b ? Math.round(total * (1 + VAT_RATE / 100)) : total),
      appliedDiscounts: applied,
      vatIncluded: !b2b,
      itemsTotal: money(subtotal),
      promoDiscount: money(promoCents),
    },
    itemCount: items.length,
    merged: cart.merged,
    _raw: { subtotal, promoCents, installation, total, b2b },
  };
}
