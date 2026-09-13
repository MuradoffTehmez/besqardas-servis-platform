"use client";
import React, { useState } from "react";
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  Package,
  DollarSign,
  UserRound,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  X,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Sidebar } from "../../components/layout/sidebar";
import { StatusBadge } from "../../components/ui/status-badge";
import { Modal } from "../../components/ui/modal";

export interface TechnicianPortalProps {
  technicianUser?: any;
  orders: any[];
  vanInventory?: any[];
  locale?: "az" | "ru" | "en";
  onLogout: () => void;
  onUpdateOrderStatus?: (orderId: string, status: string) => Promise<void>;
  onConsumeMaterial?: (orderId: string, material: any) => Promise<void>;
}

export function TechnicianPortal({
  technicianUser,
  orders = [],
  vanInventory = [
    { id: "1", name: "R32 Ekoloji Freon Balonu (12 kq)", sku: "GAS-R32", availableQty: 8.5, unit: "kq" },
    { id: "2", name: "Mis Boru 1/4\" (50m Rulon)", sku: "PIPE-COP-01", availableQty: 32, unit: "m" },
    { id: "3", name: "Birləşdirici Fitinq Dəsti", sku: "FIT-SET-04", availableQty: 14, unit: "ədəd" },
    { id: "4", name: "Universal Kondisioner Pultu", sku: "REMOTE-UNI", availableQty: 5, unit: "ədəd" },
  ],
  locale = "az",
  onLogout,
  onUpdateOrderStatus,
  onConsumeMaterial,
}: TechnicianPortalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "schedule" | "inventory" | "earnings">("dashboard");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Execution console states
  const [executionStep, setExecutionStep] = useState<"ARRIVE" | "DIAGNOSE" | "REPAIR" | "COMPLETE">("ARRIVE");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [addedMaterials, setAddedMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(vanInventory[0]?.id || "");
  const [materialQty, setMaterialQty] = useState(1);
  const [cashCollected, setCashCollected] = useState("0.00");
  const [customerSignature, setCustomerSignature] = useState(false);

  const sidebarItems = [
    { id: "dashboard", label: "İcmal", href: "#dashboard", icon: LayoutDashboard },
    { id: "jobs", label: "Təyin Edilmiş İşlər", href: "#jobs", icon: Wrench, badge: orders.length },
    { id: "schedule", label: "İş Cədvəlim", href: "#schedule", icon: Calendar },
    { id: "inventory", label: "Maşın Anbarı", href: "#inventory", icon: Package, badge: vanInventory.length },
    { id: "earnings", label: "Qazanc və Kassa", href: "#earnings", icon: DollarSign },
  ];

  const handleAddMaterialToJob = () => {
    const item = vanInventory.find((v) => v.id === selectedMaterialId);
    if (!item) return;
    setAddedMaterials([...addedMaterials, { ...item, quantity: materialQty }]);
  };

  return (
    <div className="portal-layout workspace">
      <Sidebar
        items={sidebarItems}
        currentPath={`#${activeTab}`}
        headerTitle="USTA SAHƏ KONSOLU"
        user={{
          name: technicianUser?.fullName || "Fuad Əliyev",
          email: "STAFF Usta · Bakı Filialı №1",
          role: "Kondisioner & Kombi Mütəxəssisi",
        }}
        onNavigate={(href) => setActiveTab(href.replace("#", "") as any)}
        onLogout={onLogout}
      />

      <main className="workspace-content p-6">
        <div className="workspace-header flex justify-between items-center mb-6">
          <div>
            <span className="eyebrow">Texniki Heyət Paneli</span>
            <h1 className="text-2xl font-bold">
              {activeTab === "dashboard" && "Bugünkü Servis Rejimi"}
              {activeTab === "jobs" && "Təyin Olunmuş İşlər və Təkliflər"}
              {activeTab === "schedule" && "Növbə və İş Cədvəli"}
              {activeTab === "inventory" && "Mobil Avtomobil Anbarı (§34)"}
              {activeTab === "earnings" && "Hesablaşma və Nağd Kassa Balansı (§50, §51)"}
            </h1>
          </div>
        </div>

        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid three stats gap-4">
              <div className="stat panel p-4">
                <Wrench size={24} className="text-brand mb-2" />
                <span className="text-muted text-xs block">Bugünkü Tapşırıqlar</span>
                <strong className="text-2xl font-bold">{orders.length}</strong>
              </div>
              <div className="stat panel p-4">
                <CheckCircle2 size={24} className="text-success mb-2" />
                <span className="text-muted text-xs block">Tamamlanan İşlər</span>
                <strong className="text-2xl font-bold">4</strong>
              </div>
              <div className="stat panel p-4">
                <DollarSign size={24} className="text-accent mb-2" />
                <span className="text-muted text-xs block">Üzərimdəki Nağd Balans (§50)</span>
                <strong className="text-2xl font-bold">145.00 AZN</strong>
              </div>
            </div>

            {/* Active Job Card */}
            {orders.length > 0 && (
              <div className="panel p-6 border-l-4 border-brand">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="badge badge-warning text-xs">Cari Aktiv İş</span>
                    <h3 className="text-xl font-bold mt-1">{orders[0].serviceName}</h3>
                    <p className="text-sm text-muted">{orders[0].number} · {orders[0].device?.modelName || "Kondisioner"}</p>
                  </div>
                  <button
                    className="btn btn-md primary"
                    onClick={() => {
                      setSelectedJob(orders[0]);
                      setExecutionStep("ARRIVE");
                    }}
                  >
                    İcra Konsolunu Aç <ArrowRight size={16} />
                  </button>
                </div>

                <div className="grid two text-sm text-muted gap-2 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-brand" />
                    <span>{orders[0].addressShort || "Bakı ş., Nərimanov r., Təbriz küç. 45"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-brand" />
                    <span>Müştəri: +994 (50) 888-22-11</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: JOBS */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            <div className="panel p-6">
              <h3 className="text-lg font-bold mb-4">Sifarişlərin Siyahısı</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sifariş №</th>
                      <th>Xidmət / Cihaz</th>
                      <th>Ünvan</th>
                      <th>Təyin Vaxtı</th>
                      <th>Status</th>
                      <th>Konsol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((job) => (
                      <tr key={job.id}>
                        <td><strong>{job.number}</strong></td>
                        <td>{job.serviceName}</td>
                        <td>{job.addressShort || "Bakı şəhəri"}</td>
                        <td>{new Date(job.scheduledAt || job.createdAt).toLocaleDateString("az-AZ")}</td>
                        <td>
                          <StatusBadge status={job.status} locale={locale} />
                        </td>
                        <td>
                          <button
                            className="btn btn-sm primary"
                            onClick={() => {
                              setSelectedJob(job);
                              setExecutionStep("ARRIVE");
                            }}
                          >
                            İcra Et
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INVENTORY */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="panel p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Avtomobil / Mobil Anbar Qalığı (§34)</h3>
                  <p className="text-xs text-muted">Ustanın üzərinə təhkim olunmuş ehtiyat hissələri və servis sərfiyyatı materialları.</p>
                </div>
                <span className="badge badge-info">Mobil Anbar №14</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU Kodu</th>
                      <th>Məhsulun / Materialın Adı</th>
                      <th>Mövcud Qalıq</th>
                      <th>Ölçü Vahidi</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vanInventory.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.sku}</strong></td>
                        <td>{item.name}</td>
                        <td><strong className="text-brand">{item.availableQty}</strong></td>
                        <td>{item.unit}</td>
                        <td>
                          <span className="badge badge-success text-xs">Mövcuddur</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: EARNINGS & CASH DESK */}
        {activeTab === "earnings" && (
          <div className="space-y-6 max-w-3xl">
            <div className="grid two gap-4">
              <div className="panel p-5 border-l-4 border-success">
                <span className="text-xs text-muted block">Aylıq İş Üzrə Qazanc və Bonuslar (§51.2)</span>
                <strong className="text-3xl font-extrabold text-success block my-2">1,240.00 AZN</strong>
                <small className="text-muted">Əmək haqqı və tamamlanmış 42 sifariş üzrə bonuslar</small>
              </div>

              <div className="panel p-5 border-l-4 border-accent">
                <span className="text-xs text-muted block">Şirkət Adına Qəbul Edilmiş Nağd Pul (§50)</span>
                <strong className="text-3xl font-extrabold text-accent block my-2">145.00 AZN</strong>
                <button
                  className="btn btn-sm outline mt-2"
                  onClick={() => alert("Filial kassasına təhvil aktı yaradıldı.")}
                >
                  Kassaya Təhvil Ver
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Field Execution Console Modal (PRD §18, §19, §22) */}
      {selectedJob && (
        <Modal
          open={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={`İcra Konsolu: ${selectedJob.number}`}
          subtitle={`${selectedJob.serviceName} — ${selectedJob.addressShort || "Ünvan"}`}
          maxWidth="xl"
        >
          <div className="execution-console space-y-6">
            {/* Stepper Header */}
            <div className="wizard-stepper mb-4">
              <div className={`wizard-step-pill ${executionStep === "ARRIVE" ? "active" : "done"}`}>
                <span>1. Gəliş</span>
              </div>
              <div className={`wizard-step-pill ${executionStep === "DIAGNOSE" ? "active" : executionStep === "REPAIR" || executionStep === "COMPLETE" ? "done" : ""}`}>
                <span>2. Diaqnostika</span>
              </div>
              <div className={`wizard-step-pill ${executionStep === "REPAIR" ? "active" : executionStep === "COMPLETE" ? "done" : ""}`}>
                <span>3. Material & Təmir</span>
              </div>
              <div className={`wizard-step-pill ${executionStep === "COMPLETE" ? "active" : ""}`}>
                <span>4. Təhvil & Çek</span>
              </div>
            </div>

            {/* STEP 1: ARRIVE */}
            {executionStep === "ARRIVE" && (
              <div className="panel bg-soft p-6 text-center space-y-4">
                <MapPin size={36} className="text-brand mx-auto" />
                <h3 className="text-lg font-bold">Müştərinin Ünvanındasınızmı?</h3>
                <p className="text-sm text-muted">
                  Ünvana çatdığınızı təsdiq etdikdə sifarişin statusu avtomatik <strong>ARRIVED</strong> olur və müştəriyə bildiriş göndərilir.
                </p>
                <button
                  className="btn btn-lg primary"
                  onClick={() => setExecutionStep("DIAGNOSE")}
                >
                  <Check size={18} /> Ünvana Çatdım (Diaqnostikaya Başla)
                </button>
              </div>
            )}

            {/* STEP 2: DIAGNOSIS & ESTIMATE */}
            {executionStep === "DIAGNOSE" && (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Aşkar Olunan Nasazlıq və Qeydlər *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Məsələn: Freon qaz təzyiqi normadan aşağıdır, kompressor giriş borusunda mikro-çat aşkar edildi..."
                    value={diagnosisNote}
                    onChange={(e) => setDiagnosisNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button className="btn outline" onClick={() => setExecutionStep("ARRIVE")}>Geri</button>
                  <button className="btn primary" onClick={() => setExecutionStep("REPAIR")}>
                    Smetanı Təsdiqə Göndər və Təmirə Başla <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REPAIR & MATERIAL CONSUMPTION */}
            {executionStep === "REPAIR" && (
              <div className="space-y-4">
                <div className="panel bg-soft p-4">
                  <h4 className="font-bold text-sm mb-3">Mobil Anbardan Material Sərfiyyatı (§22)</h4>
                  <div className="grid three gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-xs text-muted block mb-1">Ehtiyat Hissəsi / Material</label>
                      <select
                        className="form-input text-xs"
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                      >
                        {vanInventory.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (Qalıq: {v.availableQty} {v.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <button className="btn btn-sm primary w-full" onClick={handleAddMaterialToJob}>
                        <Plus size={14} /> Sərfiyyata Yaz
                      </button>
                    </div>
                  </div>

                  {addedMaterials.length > 0 && (
                    <div className="added-materials-list mt-3 pt-3 border-t space-y-1">
                      {addedMaterials.map((m, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b">
                          <span>{m.name}</span>
                          <strong className="text-brand">{m.quantity} {m.unit}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button className="btn outline" onClick={() => setExecutionStep("DIAGNOSE")}>Geri</button>
                  <button className="btn primary" onClick={() => setExecutionStep("COMPLETE")}>
                    Təmiri Bitir və Təhvilə Keç <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: COMPLETION & DIGITAL SIGNATURE */}
            {executionStep === "COMPLETE" && (
              <div className="space-y-4">
                <div className="panel bg-soft p-4 space-y-3">
                  <h4 className="font-bold text-sm">Yekun Hesablaşma və Təhvil Aktı (§49)</h4>
                  <div className="flex justify-between text-sm">
                    <span>Xidmət haqqı:</span>
                    <strong>40.00 AZN</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Material sərfiyyatı:</span>
                    <strong>35.00 AZN</strong>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 text-brand">
                    <span>Cəmi Ödəniləcək:</span>
                    <span>75.00 AZN</span>
                  </div>
                </div>

                <div className="signature-box panel p-4 border-dashed text-center">
                  <label className="checkbox-label cursor-pointer flex items-center justify-center gap-2">
                    <input
                      type="checkbox"
                      checked={customerSignature}
                      onChange={(e) => setCustomerSignature(e.target.checked)}
                    />
                    <strong className="text-sm">Müştəri işi qəbul etdi və elektron imza təsdiqləndi</strong>
                  </label>
                </div>

                <button
                  className="btn btn-lg primary w-full"
                  disabled={!customerSignature}
                  onClick={async () => {
                    if (onUpdateOrderStatus) await onUpdateOrderStatus(selectedJob.id, "COMPLETED");
                    setSelectedJob(null);
                    alert("Servis uğurla tamamlandı! QR zəmanət və fiskal çek müştərinin kabinetinə göndərildi.");
                  }}
                >
                  <CheckCircle2 size={18} /> İşi Rəsmi Təhvil Ver və Bağla
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
