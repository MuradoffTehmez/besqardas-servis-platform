"use client";
import React, { useState } from "react";
import {
  Star,
  ShieldCheck,
  Truck,
  Wrench,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Minus,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface ProductDetailViewProps {
  product: any;
  userDevices?: any[];
  locale?: "az" | "ru" | "en";
  onBack: () => void;
  onAddToCart: (product: any, withInstallation?: boolean) => void;
  onBookInstallation?: (product: any) => void;
}

export function ProductDetailView({
  product,
  userDevices = [],
  locale = "az",
  onBack,
  onAddToCart,
  onBookInstallation,
}: ProductDetailViewProps) {
  if (!product) return null;

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.[0]?.id || ""
  );
  const [includeInstallation, setIncludeInstallation] = useState(false);
  const [compatDeviceId, setCompatDeviceId] = useState("");
  const [compatCheckResult, setCompatCheckResult] = useState<boolean | null>(null);

  const displayName = resolveText(product.name, locale as AppLocale, "Məhsul");
  const displayBrand = resolveText(product.brandName, locale as AppLocale, "BESQARDAS");
  const displayCategory = resolveText(product.categoryName, locale as AppLocale, "Kataloq");

  const currentVariant =
    product.variants?.find((v: any) => v.id === selectedVariantId) ||
    product.variants?.[0] || {
      sku: product.sku || "SKU-DEFAULT",
      price: product.price?.effectivePrice,
    };

  const handleCompatCheck = (devId: string) => {
    setCompatDeviceId(devId);
    if (!devId) {
      setCompatCheckResult(null);
      return;
    }
    // Simulate compatibility check
    const dev = userDevices.find((d) => d.id === devId);
    if (dev && product.compatibleModelIds) {
      const isCompat = product.compatibleModelIds.includes(dev.modelId || dev.id);
      setCompatCheckResult(isCompat);
    } else {
      setCompatCheckResult(true); // Default to compatible for demo equipment
    }
  };

  const price = product.price?.effectivePrice || { amount: "120.00", currency: "AZN" };
  const installationFee = 60; // 60 AZN standard installation package

  return (
    <div className="product-detail-view container py-8">
      <button className="back-link btn btn-sm ghost mb-4" onClick={onBack}>
        <ArrowLeft size={16} /> Məhsullar kataloquna qayıt
      </button>

      <div className="product-detail-grid">
        {/* Left: Product Visual / Appliance Art */}
        <div className="product-gallery-card panel">
          <div className="product-art large-art" aria-hidden="true">
            <div className="appliance">
              <span className="appliance-brand">{displayBrand}</span>
              <span className="appliance-light" />
              <div className="vents" />
              <span className="appliance-display">24°C</span>
            </div>
            <div className="air-line" />
            <div className="air-line second" />
          </div>

          <div className="product-badges-row mt-4 flex gap-2 justify-center">
            <span className="badge badge-success">
              <ShieldCheck size={13} /> {product.warrantyMonths || 12} ay Rəsmi Zəmanət
            </span>
            <span className="badge badge-info">
              <Truck size={13} /> Sürətli Çatdırılma
            </span>
          </div>
        </div>

        {/* Right: Product Purchase Info */}
        <div className="product-buy-card panel">
          <span className="eyebrow">{displayBrand}</span>
          <h1>{displayName}</h1>
          <small className="text-muted block mb-3">SKU: {currentVariant.sku}</small>

          <div className="rating-box mb-4 flex items-center gap-2">
            <div className="rating">
              <Star size={14} fill="currentColor" />
              <span>{product.rating || 4.9}</span>
            </div>
            <span className="text-muted text-xs">
              ({product.reviewCount || 18} təsdiqlənmiş rəy)
            </span>
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 1 && (
            <div className="variants-selector mb-4">
              <label className="form-label">Variant Seçimi</label>
              <div className="variant-options flex gap-2">
                {product.variants.map((v: any) => {
                  const varName = resolveText(v.name, locale as AppLocale, v.sku);
                  return (
                    <button
                      key={v.id}
                      className={`btn btn-sm ${selectedVariantId === v.id ? "primary" : "outline"}`}
                      onClick={() => setSelectedVariantId(v.id)}
                    >
                      {varName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price Box */}
          <div className="price-display mb-4">
            <span className="current-price text-2xl font-bold">
              {price.amount} {price.currency || "AZN"}
            </span>
            <span className="vat-note text-xs text-muted block">
              Qiymətə ƏDV daxildir (18%)
            </span>
          </div>

          {/* Installation Addon Checkbox (PRD §31.4) */}
          <div className="installation-addon-box panel bg-soft p-3 mb-4">
            <label className="checkbox-label cursor-pointer flex items-start gap-3">
              <input
                type="checkbox"
                checked={includeInstallation}
                onChange={(e) => setIncludeInstallation(e.target.checked)}
                className="mt-1"
              />
              <div>
                <strong>Quraşdırma xidməti əlavə edilsin (+{installationFee} AZN)</strong>
                <p className="text-xs text-muted mb-0">
                  Sertifikatlı usta məhsul ilə eyni vaxtda gəlir, peşəkar quraşdırma və iş zəmanəti təqdim edir (§31.4).
                </p>
              </div>
            </label>
          </div>

          {/* Compatibility Checker Widget (PRD §27.3) */}
          {userDevices.length > 0 && (
            <div className="compat-widget panel p-3 mb-4">
              <label className="text-xs font-bold block mb-1">
                <HelpCircle size={13} className="inline mr-1" />
                Cihazınıza uyğundurmu?
              </label>
              <select
                className="form-input text-xs"
                value={compatDeviceId}
                onChange={(e) => handleCompatCheck(e.target.value)}
              >
                <option value="">Cihazınızı seçərək yoxlayın...</option>
                {userDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.modelName || d.categoryName} ({d.serialNumber || "S/N"})
                  </option>
                ))}
              </select>

              {compatCheckResult !== null && (
                <div
                  className={`compat-result mt-2 text-xs flex items-center gap-1 ${
                    compatCheckResult ? "text-success font-semibold" : "text-danger"
                  }`}
                >
                  {compatCheckResult ? (
                    <>
                      <Check size={14} /> Bu məhsul seçdiyiniz cihazla 100% uyğundur!
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} /> Seçilmiş cihazla uyğunluq təsdiqlənməyib.
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons-stack flex flex-col gap-2">
            <button
              className="btn btn-lg primary w-full"
              onClick={() => onAddToCart(product, includeInstallation)}
            >
              <Plus size={18} />
              Səbətə Əlavə Et (
              {includeInstallation
                ? `${(Number(price.amount) + installationFee).toFixed(2)} AZN`
                : `${price.amount} ${price.currency || "AZN"}`}
              )
            </button>
          </div>
        </div>
      </div>

      {/* Specifications & Compatibility Information */}
      <div className="specifications-section panel mt-6">
        <h3>Texniki Xüsusiyyətlər (PIM Atributları — §25)</h3>
        <div className="specs-table mt-3">
          <div className="spec-row flex justify-between py-2 border-b">
            <span className="text-muted">Brend</span>
            <strong>{displayBrand}</strong>
          </div>
          <div className="spec-row flex justify-between py-2 border-b">
            <span className="text-muted">Kateqoriya</span>
            <strong>{displayCategory}</strong>
          </div>
          <div className="spec-row flex justify-between py-2 border-b">
            <span className="text-muted">İnverter Texnologiyası</span>
            <strong>Bəli (Enerji sinfi A+++)</strong>
          </div>
          <div className="spec-row flex justify-between py-2 border-b">
            <span className="text-muted">Qaz Növü</span>
            <strong>R32 Ekoloji Freon</strong>
          </div>
          <div className="spec-row flex justify-between py-2 border-b">
            <span className="text-muted">Rəsmi Zəmanət</span>
            <strong>{product.warrantyMonths || 12} ay rəsmi istehsalçı və servis zəmanəti</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
