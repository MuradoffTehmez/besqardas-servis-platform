"use client";
import React, { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, AlertCircle, Calendar, Wrench } from "lucide-react";

export interface WarrantyVerifyViewProps {
  initialCode?: string;
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
}

export function WarrantyVerifyView({
  initialCode = "",
  locale = "az",
  onNavigate,
}: WarrantyVerifyViewProps) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<any | null>(
    initialCode ? {
      code: initialCode,
      status: "ACTIVE",
      deviceName: "LG DualCool Inverter 18000 BTU",
      serialNumber: "SN-94829104",
      serviceDate: "12.05.2026",
      warrantyUntil: "12.05.2027",
      coverage: "Kompressor və qaz təzyiq boruları (iş və hissə zəmanəti)",
      issuer: "besqardasServis.az Rəsmi Servis",
    } : null
  );

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    // Simulate verification check
    setResult({
      code: code.trim(),
      status: "ACTIVE",
      deviceName: "Kombi Bosch Condens 7000",
      serialNumber: "SN-8839210",
      serviceDate: "04.09.2026",
      warrantyUntil: "04.09.2027",
      coverage: "Elektron lövhə və hidroqovşaq təmiri",
      issuer: "besqardasServis.az Rəsmi Servis",
    });
  };

  return (
    <div className="warranty-verify-view container py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="icon-circle mx-auto mb-3 bg-soft p-3 rounded-full inline-block">
            <ShieldCheck size={36} className="text-brand" />
          </div>
          <h1>Rəsmi Zəmanət Yoxlanışı</h1>
          <p className="text-muted">
            Servis aktı və ya cihazın üzərindəki QR kod / unikal zəmanət kodunu daxil edərək etibarlılığı yoxlayın (PRD §23.3).
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="panel p-6 mb-8">
          <div className="search-input mb-3">
            <Search size={18} />
            <input
              type="text"
              placeholder="Məsələn: WR-2026-88492"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn primary w-full">
            Zəmanəti Yoxla
          </button>
        </form>

        {/* Result Box */}
        {result && (
          <div className="verification-result panel p-6 border-brand">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <CheckCircle2 size={24} className="text-success" />
              <div>
                <strong className="text-base block">Zəmanət Qüvvədədir (Aktiv)</strong>
                <small className="text-muted">Sənəd kodu: {result.code}</small>
              </div>
            </div>

            <div className="result-details space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted">Cihaz:</span>
                <strong>{result.deviceName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted">Seriya Nömrəsi:</span>
                <span>{result.serialNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted">Təhvil Tarixi:</span>
                <span>{result.serviceDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted">Etibarlılıq Müddəti:</span>
                <strong className="text-success">{result.warrantyUntil}</strong>
              </div>
              <div className="py-2">
                <span className="text-muted block text-xs mb-1">Zəmanət Əhatəsi:</span>
                <p className="text-xs font-medium">{result.coverage}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted">
              <span>{result.issuer}</span>
              <button
                className="btn btn-sm outline"
                onClick={() => onNavigate("/services")}
              >
                Servis Müraciəti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
