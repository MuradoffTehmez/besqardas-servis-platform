"use client";
import React from "react";
import { Star, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@sp/utils";
import { resolveText, type AppLocale } from "../../utils/i18n";

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

export function ProductCard({
  product,
  locale = "az",
  onSelect,
  onAddToCart,
  className,
}: ProductCardProps) {
  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK";
  const price = product.price?.effectivePrice;
  const displayName = resolveText(product.name, locale as AppLocale, "Məhsul");
  const displayBrand = resolveText(product.brandName, locale as AppLocale, "BESQARDAS");

  return (
    <article className={cn("product-card", className)}>
      <div
        className="product-art cursor-pointer"
        onClick={() => onSelect && onSelect(product)}
      >
        <div className="appliance">
          <span className="appliance-brand">{displayBrand}</span>
          <span className="appliance-light" />
          <div className="vents" />
          <span className="appliance-display">24°</span>
        </div>
        <div className="air-line" />
        <div className="air-line second" />
      </div>

      <div className="product-info">
        {displayBrand && (
          <span className="product-brand">{displayBrand}</span>
        )}

        <h3 className="product-title">{onSelect ? <button className="title-action" onClick={() => onSelect(product)}>{displayName}</button> : displayName}</h3>

        <div className="product-meta">
          {product.rating != null && (
            <div className="rating">
              <Star size={13} fill="currentColor" />
              <span>{product.rating}</span>
              {product.reviewCount ? (
                <span className="review-count">({product.reviewCount})</span>
              ) : null}
            </div>
          )}

          {product.warrantyMonths ? (
            <span className="warranty-tag">
              <ShieldCheck size={12} /> {product.warrantyMonths}{" "}
              {locale === "az" ? "ay zəmanət" : locale === "ru" ? "мес. гарантия" : "mo warranty"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="card-bottom">
        <div className="price-box">
          {price ? (
            <strong>
              {price.amount} {price.currency || "AZN"}
            </strong>
          ) : (
            <span>-</span>
          )}
        </div>

        {onAddToCart && (
          <button
            className="icon-button add"
            disabled={isOutOfStock}
            aria-label="Səbətə əlavə et"
            onClick={() => onAddToCart(product)}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </article>
  );
}
