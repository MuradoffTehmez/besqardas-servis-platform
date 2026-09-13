"use client";
import React from "react";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: { amount: string; currency: string };
  totalPrice: { amount: string; currency: string };
  unit?: string;
  hasInstallation?: boolean;
}

export interface CartViewProps {
  cart: {
    items: CartItem[];
    subtotal?: { amount: string; currency: string };
    total?: { amount: string; currency: string };
  };
  locale?: "az" | "ru" | "en";
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export function CartView({
  cart,
  locale = "az",
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping,
}: CartViewProps) {
  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  const totalAmount =
    cart?.total?.amount ||
    items
      .reduce((sum, item) => sum + Number(item.totalPrice?.amount || item.unitPrice?.amount || 0) * item.quantity, 0)
      .toFixed(2);

  return (
    <div className="cart-view container py-8">
      <div className="page-header mb-6">
        <h1>Səbətiniz</h1>
        <p className="text-muted">
          {isEmpty ? "Səbətinizdə hazırda məhsul yoxdur." : `${items.length} adda məhsul və xidmət`}
        </p>
      </div>

      {isEmpty ? (
        <div className="empty-state panel p-8 text-center">
          <ShoppingBag size={48} className="text-muted mx-auto mb-3" />
          <h3>Səbətiniz boşdur</h3>
          <p className="text-muted mb-4">Ehtiyacınız olan məhsul və ehtiyat hissələrini kataloqdan seçin.</p>
          <button className="btn btn-md primary" onClick={onContinueShopping}>
            Kataloqa Keçid
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Items List */}
          <div className="cart-items-list panel">
            {items.map((item) => (
              <div key={item.id} className="cart-item-row flex justify-between items-center py-4 border-b">
                <div className="item-info">
                  <strong className="item-title block text-base">{resolveText(item.name, locale as AppLocale, "Məhsul")}</strong>
                  <small className="text-muted">
                    {item.unitPrice?.amount} {item.unitPrice?.currency || "AZN"} / {item.unit || "ədəd"}
                  </small>
                  {item.hasInstallation && (
                    <span className="badge badge-success text-xs mt-1 block">
                      + Quraşdırma xidməti daxildir
                    </span>
                  )}
                </div>

                <div className="item-controls flex items-center gap-4">
                  <div className="quantity-counter flex items-center gap-2">
                    <button
                      className="icon-button btn-sm"
                      aria-label="Miqdarı azalt"
                      disabled={item.quantity <= 1}
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-semibold px-2">{item.quantity}</span>
                    <button
                      className="icon-button btn-sm"
                      aria-label="Miqdarı artır"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <strong className="item-total-price min-w-[80px] text-right">
                    {(Number(item.unitPrice?.amount || 0) * item.quantity).toFixed(2)} AZN
                  </strong>

                  <button
                    className="icon-button text-danger"
                    aria-label="Sil"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <aside className="cart-summary panel">
            <h3 className="text-lg font-bold mb-4">Sifariş Məbləği</h3>
            <div className="summary-row flex justify-between mb-2">
              <span className="text-muted">Məhsullar:</span>
              <strong>{totalAmount} AZN</strong>
            </div>
            <div className="summary-row flex justify-between mb-2">
              <span className="text-muted">ƏDV (18% daxil):</span>
              <span>{(Number(totalAmount) * 0.18 / 1.18).toFixed(2)} AZN</span>
            </div>
            <div className="summary-row flex justify-between py-3 border-t font-bold text-lg">
              <span>Yekun:</span>
              <span>{totalAmount} AZN</span>
            </div>

            <button
              className="btn btn-lg primary w-full mt-4"
              onClick={onProceedToCheckout}
            >
              Sifarişi Rəsmiləşdir <ArrowRight size={18} />
            </button>

            <div className="trust-note text-xs text-muted mt-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-success" />
              <span>Təhlükəsiz ödəniş və rəsmi elektron qəbz təminatı</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
