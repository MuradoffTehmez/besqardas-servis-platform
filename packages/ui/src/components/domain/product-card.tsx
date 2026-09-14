"use client";
import React from "react";
import { Star, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string | { az?: string; ru?: string; en?: string };
  brandName?: string | { az?: string; ru?: string; en?: string };
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  price?: {
    effectivePrice?: { amount: string; currency: string };
    basePrice?: { amount: string; currency: string };
  };
  stockStatus?: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK" | string;
  warrantyMonths?: number;
}

export interface ProductCardProps {
  product: ProductCardData;
  locale?: "az" | "ru" | "en";
  onSelect?: (product: ProductCardData) => void;
  onAddToCart?: (product: ProductCardData) => void;
  className?: string;
}

export function ProductCard({ product, locale = "az", onSelect, onAddToCart, className }: ProductCardProps) {
  const { t, text, money } = useI18n();
  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
  const price = product.price?.effectivePrice;
  const displayName = text(product.name);
  const displayBrand = text(product.brandName);
  const detail = onSelect ? anchorProps(locale, `/product/${product.slug}`, () => onSelect(product)) : null;
  const addLabel = `${t("site.card.addToCart")}: ${displayName}`;

  return (
    <article className={cn("product-card", className)}>
      {detail ? (
        <a className="product-art cursor-pointer" tabIndex={-1} aria-hidden {...detail}>
          <ApplianceArt brand={displayBrand} />
        </a>
      ) : (
        <div className="product-art" aria-hidden>
          <ApplianceArt brand={displayBrand} />
        </div>
      )}

      <div className="product-info">
        {displayBrand && <span className="product-brand">{displayBrand}</span>}

        <h3 className="product-title">{detail ? <a className="title-action" {...detail}>{displayName}</a> : displayName}</h3>

        <div className="product-meta">
          {product.rating != null && (
            <div className="rating">
              <Star size={13} fill="currentColor" aria-hidden />
              <span>{product.rating}</span>
              {product.reviewCount ? <span className="review-count">({product.reviewCount})</span> : null}
            </div>
          )}

          {product.warrantyMonths ? (
            <span className="warranty-tag">
              <ShieldCheck size={12} /> {t("site.card.warrantyMonths", { months: product.warrantyMonths })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="card-bottom">
        <div className="price-box">{price ? <strong>{money(price)}</strong> : <span>—</span>}</div>

        {onAddToCart && (
          <button type="button" className="icon-button add" disabled={isOutOfStock} aria-label={addLabel} title={addLabel} onClick={() => onAddToCart(product)}>
            <Plus size={18} />
          </button>
        )}
      </div>
    </article>
  );
}

function ApplianceArt({ brand }: { brand: string }) {
  return (
    <>
      <div className="appliance">
        <span className="appliance-brand">{brand}</span>
        <span className="appliance-light" />
        <div className="vents" />
        <span className="appliance-display">24°</span>
      </div>
      <div className="air-line" />
      <div className="air-line second" />
    </>
  );
}
