"use client";
import React, { useState } from "react";
import {
  Wrench,
  Check,
  MapPin,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  UserRound,
} from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { resolveText, resolveTechnicianName, type AppLocale } from "../../utils/i18n";

export interface BookingWizardProps {
  open: boolean;
  onClose: () => void;
  service?: any;
  services?: any[];
  userDevices?: any[];
  userAddresses?: any[];
  technicians?: any[];
  locale?: "az" | "ru" | "en";
  onSubmitOrder: (orderData: any) => Promise<any>;
  onOrderSuccess: (createdOrder: any) => void;
}

export function BookingWizard({
  open,
  onClose,
  service: initialService,
  services = [],
  userDevices = [],
  userAddresses = [],
  technicians = [],
  locale = "az",
  onSubmitOrder,
  onOrderSuccess,
}: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState(
    initialService?.id || (services[0]?.id ?? "")
  );
  const [executionForm, setExecutionForm] = useState<"ON_SITE" | "CARRY_IN" | "PICKUP_DELIVERY">("ON_SITE");
  const [deviceId, setDeviceId] = useState(userDevices[0]?.id || "");
  const [customDevice, setCustomDevice] = useState({ brand: "", model: "", serialNumber: "" });
  const [description, setDescription] = useState("");
  const [addressId, setAddressId] = useState(userAddresses[0]?.id || "");
  const [customAddress, setCustomAddress] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [scheduledSlot, setScheduledSlot] = useState("10:00 - 12:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const timeSlots = [
    "09:00 - 11:00",
    "11:00 - 13:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
    "18:00 - 20:00",
  ];

  const currentService =
    services.find((s) => s.id === selectedServiceId) || initialService || services[0];

  const handleSubmit = async () => {
    setError("");
    if (!description.trim()) {
      setError("Zəhmət olmasa nasazlıq və ya tələb barədə qısa məlumat yazın.");
      return;
    }
    setSubmitting(true);
    try {
      const scheduledAt = `${scheduledDate}T${scheduledSlot.split(" - ")[0]}:00Z`;
      const result = await onSubmitOrder({
        serviceId: selectedServiceId,
        executionForm,
        deviceId: deviceId || undefined,
        description,
        addressId: addressId || undefined,
        customAddress: !addressId ? customAddress : undefined,
        technicianId: selectedTechId || undefined,
        scheduledAt,
      });
      setSubmitting(false);
      onOrderSuccess(result);
    } catch (e: any) {
      setSubmitting(false);
      setError(e.message || "Sifariş yaradılarkən xəta baş verdi.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Servis Sifarişi"
      subtitle={`Addım ${step} / 4 — ${
        step === 1
          ? "Xidmət və İcra Forması"
          : step === 2
          ? "Cihaz və Nasazlıq"
          : step === 3
          ? "Ünvan və Məkan"
          : "Vaxt Slotu və Təsdiq"
      }`}
      maxWidth="lg"
    >
      <div className="booking-wizard">
        {/* Step Indicator */}
        <div className="wizard-stepper">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`wizard-step-pill ${step === s ? "active" : step > s ? "done" : ""}`}
            >
              <span>{step > s ? "✓" : s}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-danger my-3" role="alert">
            {error}
          </div>
        )}

        {/* STEP 1: Service & Form */}
        {step === 1 && (
          <div className="wizard-step-content">
            <div className="form-group mb-4">
              <label className="form-label">Xidməti Seçin</label>
              <select
                className="form-input"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {resolveText(s.name, locale as AppLocale, "Xidmət")} ({s.price ? `${s.price.amount} ${s.price.currency}` : "Smeta ilə"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">İcra Forması (PRD §14)</label>
              <div className="grid three form-options">
                <div
                  className={`choice-card ${executionForm === "ON_SITE" ? "active" : ""}`}
                  onClick={() => setExecutionForm("ON_SITE")}
                >
                  <strong>Ünvanda Servis</strong>
                  <small>Usta göstərilən ünvana gəlir və təmiri yerində icra edir.</small>
                </div>
                <div
                  className={`choice-card ${executionForm === "CARRY_IN" ? "active" : ""}`}
                  onClick={() => setExecutionForm("CARRY_IN")}
                >
                  <strong>Servis Mərkəzinə Gətirmə</strong>
                  <small>Cihazı özünüz servis filialımıza təhvil verirsiniz.</small>
                </div>
                <div
                  className={`choice-card ${executionForm === "PICKUP_DELIVERY" ? "active" : ""}`}
                  onClick={() => setExecutionForm("PICKUP_DELIVERY")}
                >
                  <strong>Götürmə & Çatdırılma</strong>
                  <small>Kuryerimiz cihazı ünvandan götürür və təmirdən sonra qaytarır.</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Device & Description */}
        {step === 2 && (
          <div className="wizard-step-content">
            {userDevices.length > 0 && (
              <div className="form-group mb-4">
                <label className="form-label">Qeydiyyatdakı Cihazlarımdan Seçin</label>
                <select
                  className="form-input"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                >
                  <option value="">Yeni Cihaz Məlumatı Daxil Et</option>
                  {userDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.modelName || d.categoryName} ({d.serialNumber || "S/N yoxdur"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!deviceId && (
              <div className="grid two mb-4">
                <div className="form-group">
                  <label className="form-label">Marka və Model</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Məs: LG DualCool 18000"
                    value={customDevice.model}
                    onChange={(e) => setCustomDevice({ ...customDevice, model: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Seriya Nömrəsi (opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Məs: SN-9482910"
                    value={customDevice.serialNumber}
                    onChange={(e) =>
                      setCustomDevice({ ...customDevice, serialNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nasazlıq və ya İstək Haqqında Qeyd *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Cihazda hansı problem müşahidə olunur? (Məs: soyutmur, səs edir, kod göstərir...)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Address Selection */}
        {step === 3 && (
          <div className="wizard-step-content">
            {userAddresses.length > 0 ? (
              <div className="form-group mb-4">
                <label className="form-label">Yadda Saxlanılmış Ünvanlar</label>
                <div className="saved-addresses-list">
                  {userAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`choice-card address-choice ${addressId === addr.id ? "active" : ""}`}
                      onClick={() => setAddressId(addr.id)}
                    >
                      <MapPin size={16} />
                      <div>
                        <strong>{addr.label || "Ünvan"}</strong>
                        <small>{addr.city}, {addr.street || addr.addressLine}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Servis Ünvanı *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Şəhər, rayon, küçə, bina/mənzil"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Slot, Technician & Review */}
        {step === 4 && (
          <div className="wizard-step-content">
            <div className="grid two mb-4">
              <div className="form-group">
                <label className="form-label">Tarix Seçin</label>
                <input
                  type="date"
                  className="form-input"
                  value={scheduledDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vaxt Slotu</label>
                <select
                  className="form-input"
                  value={scheduledSlot}
                  onChange={(e) => setScheduledSlot(e.target.value)}
                >
                  {timeSlots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {technicians.length > 0 && (
              <div className="form-group mb-4">
                <label className="form-label">Xüsusi Usta Təyini (opsional)</label>
                <select
                  className="form-input"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                >
                  <option value="">Sistem tərəfindən ən yaxın uyğun usta (Tövsiyə olunur)</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {resolveTechnicianName(tech)} (Reytinq: {tech.rating || 5.0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Order Review Box */}
            <div className="review-box panel bg-soft p-4">
              <h4>Sifariş Xülasəsi</h4>
              <div className="review-row">
                <span>Xidmət:</span>
                <strong>{resolveText(currentService?.name, locale as AppLocale, "Xidmət")}</strong>
              </div>
              <div className="review-row">
                <span>İcra Forması:</span>
                <strong>
                  {executionForm === "ON_SITE"
                    ? "Ünvanda Servis"
                    : executionForm === "CARRY_IN"
                    ? "Servis Mərkəzi"
                    : "Götürmə və Çatdırılma"}
                </strong>
              </div>
              <div className="review-row">
                <span>Təyin Edilmiş Vaxt:</span>
                <strong>
                  {scheduledDate} ({scheduledSlot})
                </strong>
              </div>
              <div className="review-row highlight">
                <span>İlkin Xidmət Haqqı:</span>
                <strong>
                  {currentService?.price
                    ? `${currentService.price.amount} ${currentService.price.currency}`
                    : "Diaqnostika Smetası ilə"}
                </strong>
              </div>
              <small className="text-muted block mt-2">
                * Standart qaydalara əsasən, diaqnostikadan sonra smetanı təsdiq etmədiyiniz halda çağırış haqqı tutulmur (§20).
              </small>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="wizard-footer flex justify-between mt-6">
          {step > 1 ? (
            <button className="btn outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Geri
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              Növbəti <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn primary btn-lg"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Təsdiqlənir..." : "Sifarişi Təsdiqlə"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
