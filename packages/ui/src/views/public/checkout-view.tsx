"use client";
import React, { useState } from "react";
import {
  Truck,
  Building2,
  CreditCard,
  Banknote,
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Check,
  Lock,
} from "lucide-react";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface CheckoutViewProps {
  cart: any;
  user: any;
  savedAddresses?: any[];
  branches?: any[];
  locale?: "az" | "ru" | "en";
  onBackToCart: () => void;
  onRequireLogin: () => void;
  onSubmitCheckout: (orderData: any) => Promise<any>;
  onOrderSuccess: (order: any) => void;
}

export function CheckoutView({
  cart,
  user,
  savedAddresses = [],
  branches = [],
  locale = "az",
  onBackToCart,
  onRequireLogin,
  onSubmitCheckout,
  onOrderSuccess,
}: CheckoutViewProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<"COURIER" | "PICKUP">("COURIER");
  const [selectedAddressId, setSelectedAddressId] = useState(savedAddresses[0]?.id || "");
  const [oneTimeAddress, setOneTimeAddress] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE_CARD" | "CASH" | "POS">("ONLINE_CARD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Guest checkout check (PRD §9.3)
  if (!user) {
    return (
      <div className="checkout-auth-gate container py-12 text-center">
        <div className="gate-card panel max-w-md mx-auto p-8">
          <Lock size={40} className="text-brand mx-auto mb-3" />
          <h2>Sifarişi tamamlamaq üçün daxil olun</h2>
          <p className="text-muted mb-6">
            Qanunvericiliyə və xidmət qaydalarına uyğun olaraq elektron qaimə və zəmanət sənədləri şəxsi kabinetinizdə saxlanılır (§9.3).
          </p>
          <button className="btn btn-lg primary w-full" onClick={onRequireLogin}>
            Daxil Ol və ya Qeydiyyatdan Keç
          </button>
        </div>
      </div>
    );
  }

  const userPlan = user.planCode || "CUSTOMER_BASIC";
  const allowsOneTimeAddress = userPlan !== "CUSTOMER_BASIC"; // Pro & Premium allow one-time address (§42)

  const items = cart?.items || [];
  const totalAmount = cart?.total?.amount || "0.00";

  const handlePlaceOrder = async () => {
    setError("");
    setSubmitting(true);
    try {
      const order = await onSubmitCheckout({
        deliveryMethod,
        addressId: deliveryMethod === "COURIER" ? selectedAddressId || undefined : undefined,
        oneTimeAddress: deliveryMethod === "COURIER" && !selectedAddressId ? oneTimeAddress : undefined,
        branchId: deliveryMethod === "PICKUP" ? selectedBranchId : undefined,
        paymentMethod,
        notes,
      });
      setSubmitting(false);
      onOrderSuccess(order);
    } catch (e: any) {
      setSubmitting(false);
      setError(e.message || "Sifariş rəsmiləşdirilərkən xəta baş verdi.");
    }
  };

  return (
    <div className="checkout-view container py-8">
      <button className="back-link btn btn-sm ghost mb-4" onClick={onBackToCart}>
        <ArrowLeft size={16} /> Səbətə qayıt
      </button>

      <div className="page-header mb-6">
        <h1>Sifarişin Rəsmiləşdirilməsi</h1>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="checkout-layout grid lg:grid-cols-3 gap-8">
        {/* Main Steps Column */}
        <div className="checkout-main lg:col-span-2 space-y-6">
          {/* Step 1: Delivery Method */}
          <div className="panel p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Truck size={20} /> 1. Çatdırılma Üsulu
            </h3>
            <div className="grid two gap-4">
              <div
                className={`choice-card ${deliveryMethod === "COURIER" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("COURIER")}
              >
                <strong>Kuryer Çatdırılması</strong>
                <small>Ünvana qapıda təhvil verilmə.</small>
              </div>
              <div
                className={`choice-card ${deliveryMethod === "PICKUP" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("PICKUP")}
              >
                <strong>Filialdan Götürmə</strong>
                <small>Servis mərkəzimizdən ödənişsiz götürün.</small>
              </div>
            </div>

            {deliveryMethod === "COURIER" && (
              <div className="address-substep mt-4">
                <label className="form-label">Çatdırılma Ünvanı</label>
                {savedAddresses.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`choice-card flex items-center gap-2 ${
                          selectedAddressId === addr.id ? "active" : ""
                        }`}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        <MapPin size={16} />
                        <span>
                          {addr.label}: {addr.city}, {addr.street || addr.addressLine}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {allowsOneTimeAddress ? (
                  <div className="form-group mt-3">
                    <label className="text-xs text-muted block mb-1">
                      Və ya birdəfəlik fərqli ünvan daxil edin (Pro/Premium imkanı — §42):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Fərqli ünvan yazın..."
                      value={oneTimeAddress}
                      onChange={(e) => {
                        setOneTimeAddress(e.target.value);
                        setSelectedAddressId("");
                      }}
                    />
                  </div>
                ) : (
                  <small className="text-muted block mt-1">
                    * Basic planda yalnız hesabda yadda saxlanılan ünvan istifadə olunur (§42).
                  </small>
                )}
              </div>
            )}

            {deliveryMethod === "PICKUP" && branches.length > 0 && (
              <div className="branch-substep mt-4">
                <label className="form-label">Təhvil Filialı</label>
                <select
                  className="form-input"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {resolveText(b.name, locale as AppLocale, "Filial")} ({resolveText(b.address, locale as AppLocale, "")})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 2: Payment Method (PRD §47) */}
          <div className="panel p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard size={20} /> 2. Ödəniş Üsulu
            </h3>
            <div className="grid three gap-4">
              <div
                className={`choice-card ${paymentMethod === "ONLINE_CARD" ? "active" : ""}`}
                onClick={() => setPaymentMethod("ONLINE_CARD")}
              >
                <CreditCard size={20} className="mb-2" />
                <strong>Onlayn Bank Kartı</strong>
                <small>Visa / MasterCard / Birbank</small>
              </div>

              <div
                className={`choice-card ${paymentMethod === "POS" ? "active" : ""}`}
                onClick={() => setPaymentMethod("POS")}
              >
                <CreditCard size={20} className="mb-2 text-info" />
                <strong>Qapıda POS Terminal</strong>
                <small>Kuryerdə kartla ödəniş</small>
              </div>

              <div
                className={`choice-card ${paymentMethod === "CASH" ? "active" : ""}`}
                onClick={() => setPaymentMethod("CASH")}
              >
                <Banknote size={20} className="mb-2 text-success" />
                <strong>Qapıda Nağd Ödəniş</strong>
                <small>Fiskal çek təqdim olunur</small>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sticky Order Summary */}
        <aside className="checkout-sidebar">
          <div className="panel p-6">
            <h3 className="text-lg font-bold mb-4">Sifarişiniz</h3>
            <div className="items-mini-list space-y-2 mb-4">
              {items.map((it: any) => (
                <div key={it.id} className="flex justify-between text-sm py-1 border-b">
                  <span>
                    {resolveText(it.name, locale as AppLocale, "Məhsul")} <small className="text-muted">x{it.quantity}</small>
                  </span>
                  <strong>{it.totalPrice?.amount || it.unitPrice?.amount} AZN</strong>
                </div>
              ))}
            </div>

            <div className="totals-box space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Məhsullar:</span>
                <span>{totalAmount} AZN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Çatdırılma:</span>
                <span>0.00 AZN (Pulsuz)</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Cəmi Məbləğ:</span>
                <span>{totalAmount} AZN</span>
              </div>
            </div>

            <button
              className="btn btn-lg primary w-full mt-6"
              disabled={submitting}
              onClick={handlePlaceOrder}
            >
              {submitting ? "İcra olunur..." : "Sifarişi Təsdiqlə"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
