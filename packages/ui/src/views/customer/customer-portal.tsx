"use client";
import React, { useState } from "react";
import {
  LayoutDashboard,
  Box,
  ClipboardList,
  ShieldCheck,
  MapPin,
  FileText,
  UserRound,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Check,
} from "lucide-react";
import { Sidebar } from "../../components/layout/sidebar";
import { StatusBadge } from "../../components/ui/status-badge";
import { Timeline } from "../../components/ui/timeline";
import { DeviceCard } from "../../components/domain/device-card";
import { Modal } from "../../components/ui/modal";
import { resolveTechnicianName, resolveText } from "../../utils/i18n";

export interface CustomerPortalProps {
  user: any;
  orders: any[];
  devices: any[];
  addresses: any[];
  locale?: "az" | "ru" | "en";
  onLogout: () => void;
  onBookService: () => void;
  onApproveEstimate?: (orderId: string) => Promise<void>;
  onRejectEstimate?: (orderId: string, reason: string) => Promise<void>;
}

export function CustomerPortal({
  user,
  orders = [],
  devices = [],
  addresses = [],
  locale = "az",
  onLogout,
  onBookService,
  onApproveEstimate,
  onRejectEstimate,
}: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "devices" | "services" | "warranties" | "addresses" | "documents" | "profile"
  >("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [estimateModalOrder, setEstimateModalOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const sidebarItems = [
    { id: "dashboard", label: "İcmal", href: "#dashboard", icon: LayoutDashboard },
    { id: "services", label: "Servis Sifarişləri", href: "#services", icon: ClipboardList, badge: orders.length },
    { id: "devices", label: "Mənim Cihazlarım", href: "#devices", icon: Box, badge: devices.length },
    { id: "warranties", label: "Zəmanətlər", href: "#warranties", icon: ShieldCheck },
    { id: "addresses", label: "Ünvanlarım", href: "#addresses", icon: MapPin },
    { id: "documents", label: "Sənədlər və Aktlar", href: "#documents", icon: FileText },
    { id: "profile", label: "Profil və Ayarlar", href: "#profile", icon: UserRound },
  ];

  const activeOrders = orders.filter((o) => ["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status));
  const completedOrders = orders.filter((o) => ["COMPLETED", "CLOSED"].includes(o.status));

  return (
    <div className="portal-layout workspace">
      <Sidebar
        items={sidebarItems}
        currentPath={`#${activeTab}`}
        headerTitle="MÜŞTƏRİ KABİNETİ"
        user={{
          name: user?.fullName || "Aysel Məmmədova",
          email: user?.email || "aysel@demo.az",
          role: user?.planCode ? `Plan: ${user.planCode.replace("CUSTOMER_", "")}` : "Basic Müştəri",
        }}
        onNavigate={(href) => setActiveTab(href.replace("#", "") as any)}
        onLogout={onLogout}
      />

      <main className="workspace-content p-6">
        {/* Top bar with quick actions */}
        <div className="workspace-header flex justify-between items-center mb-6">
          <div>
            <span className="eyebrow">Şəxsi Kabinet</span>
            <h1 className="text-2xl font-bold">
              {activeTab === "dashboard" && "Xoş gəlmisiniz!"}
              {activeTab === "services" && "Servis Sifarişlərim"}
              {activeTab === "devices" && "Qeydiyyatdakı Cihazlarım"}
              {activeTab === "warranties" && "Rəqəmsal Zəmanətlərim"}
              {activeTab === "addresses" && "Yadda Saxlanılan Ünvanlar"}
              {activeTab === "documents" && "Rəsmi Sənəd Arxivi"}
              {activeTab === "profile" && "Profil Məlumatları"}
            </h1>
          </div>

          <button className="btn primary" onClick={onBookService}>
            <Plus size={18} /> Yeni Servis Sifarişi
          </button>
        </div>

        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid three stats gap-4">
              <div className="stat panel p-4">
                <ClipboardList size={24} className="text-brand mb-2" />
                <span className="text-muted text-xs block">Aktiv Servislər</span>
                <strong className="text-2xl font-bold">{activeOrders.length}</strong>
              </div>
              <div className="stat panel p-4">
                <Box size={24} className="text-brand mb-2" />
                <span className="text-muted text-xs block">Qeydiyyatlı Cihaz</span>
                <strong className="text-2xl font-bold">{devices.length}</strong>
              </div>
              <div className="stat panel p-4">
                <ShieldCheck size={24} className="text-success mb-2" />
                <span className="text-muted text-xs block">Aktiv Zəmanət</span>
                <strong className="text-2xl font-bold">
                  {devices.filter((d) => d.isUnderWarranty !== false).length}
                </strong>
              </div>
            </div>

            {/* Waiting for approval alert if any */}
            {orders.some((o) => o.status === "WAITING_FOR_CUSTOMER") && (
              <div className="alert alert-warning p-4 border-l-4 border-accent flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <AlertCircle size={24} className="text-accent" />
                  <div>
                    <strong>Təsdiqiniz gözlənilən təmir smetası var!</strong>
                    <p className="text-xs text-muted mb-0">Usta diaqnostikanı tamamlayıb və smetanı təqdim edib.</p>
                  </div>
                </div>
                <button
                  className="btn btn-sm primary"
                  onClick={() => {
                    const order = orders.find((o) => o.status === "WAITING_FOR_CUSTOMER");
                    setEstimateModalOrder(order);
                  }}
                >
                  Smetanı Nəzərdən Keçir
                </button>
              </div>
            )}

            {/* Recent Orders List */}
            <div className="panel p-6">
              <h3 className="text-lg font-bold mb-4">Son Servis Müraciətləri</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sifariş №</th>
                      <th>Xidmət / Cihaz</th>
                      <th>Tarix</th>
                      <th>Status</th>
                      <th>Məbləğ</th>
                      <th>Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.number}</strong>
                        </td>
                        <td>
                          <div>{o.serviceName}</div>
                          <small className="text-muted">{o.device?.modelName || o.categoryName}</small>
                        </td>
                        <td>{new Date(o.scheduledAt || o.createdAt).toLocaleDateString("az-AZ")}</td>
                        <td>
                          <StatusBadge status={o.status} locale={locale} />
                        </td>
                        <td>
                          <strong>{o.total?.amount || "Smeta ilə"} {o.total?.currency || "AZN"}</strong>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm outline"
                            onClick={() => setSelectedOrder(o)}
                          >
                            Baxış
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

        {/* TAB: DEVICES */}
        {activeTab === "devices" && (
          <div className="space-y-6">
            <div className="grid three gap-4">
              {devices.map((d) => (
                <DeviceCard
                  key={d.id}
                  device={{
                    id: d.id,
                    brandName: d.brandName || "LG",
                    modelName: d.modelName || "DualCool 18000 BTU",
                    categoryName: d.categoryName || "Kondisioner",
                    serialNumber: d.serialNumber || "SN-8849201",
                    addressShort: d.addressShort || "Əsas Yaşayış Ünvanı",
                    warrantyUntil: "12.05.2027",
                    isUnderWarranty: true,
                    nextPeriodicServiceDate: "15.11.2026",
                  }}
                  locale={locale}
                  onBookService={() => onBookService()}
                  onViewHistory={() => setActiveTab("services")}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB: SERVICES */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="panel p-6">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sifariş №</th>
                      <th>Xidmət</th>
                      <th>İcra Forması</th>
                      <th>Tarix</th>
                      <th>Status</th>
                      <th>Məbləğ</th>
                      <th>Ətraflı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.number}</strong>
                        </td>
                        <td>{o.serviceName}</td>
                        <td>
                          <span className="badge badge-outline text-xs">
                            {o.executionForm === "ON_SITE" ? "Ünvanda" : "Servis Mərkəzi"}
                          </span>
                        </td>
                        <td>{new Date(o.scheduledAt || o.createdAt).toLocaleDateString("az-AZ")}</td>
                        <td>
                          <StatusBadge status={o.status} locale={locale} />
                        </td>
                        <td>{o.total?.amount || "0.00"} AZN</td>
                        <td>
                          <button
                            className="btn btn-sm outline"
                            onClick={() => setSelectedOrder(o)}
                          >
                            İzlə
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

        {/* TAB: WARRANTIES */}
        {activeTab === "warranties" && (
          <div className="space-y-4">
            <div className="grid two gap-4">
              {devices.map((d, i) => (
                <div key={d.id} className="panel p-5 border-l-4 border-success">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <strong className="text-base block">{d.brandName || "LG"} {d.modelName}</strong>
                      <small className="text-muted">Seriya: {d.serialNumber || "SN-849201"}</small>
                    </div>
                    <span className="badge badge-success">Zəmanətdədir</span>
                  </div>
                  <div className="text-xs text-muted space-y-1 my-3">
                    <div>Zəmanət müddəti: <strong>12.05.2027-dək</strong></div>
                    <div>Əhatə dairəsi: <strong>Bütün mexaniki hissələr və kompressor</strong></div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button className="btn btn-sm outline flex-1" onClick={onBookService}>
                      Zəmanət İddiası Aç
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ADDRESSES */}
        {activeTab === "addresses" && (
          <div className="space-y-4">
            <div className="grid two gap-4">
              {addresses.map((a) => (
                <div key={a.id} className="panel p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={18} className="text-brand" />
                    <strong>{a.label || "Ünvan"}</strong>
                  </div>
                  <p className="text-sm text-muted mb-3">{a.city}, {a.street || a.addressLine}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="panel p-6">
            <h3 className="text-lg font-bold mb-4">Rəsmi Maliyyə və Servis Sənədləri</h3>
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-brand" />
                    <div>
                      <strong>Təhvil-təslim Aktı & Elektron Çek ({o.number})</strong>
                      <small className="text-muted block">Tarix: {new Date(o.createdAt).toLocaleDateString("az-AZ")}</small>
                    </div>
                  </div>
                  <span className="badge badge-outline">PDF Hazırdır</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PROFILE */}
        {activeTab === "profile" && (
          <div className="panel p-6 max-w-xl">
            <h3 className="text-lg font-bold mb-4">Şəxsi Məlumatlar</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted">Ad və Soyad:</span>
                <strong>{user?.fullName || "Aysel Məmmədova"}</strong>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted">E-poçt:</span>
                <span>{user?.email || "aysel@demo.az"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted">Telefon:</span>
                <span>{user?.phone || "+994 (50) 123-45-67"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted">Abunəlik Planı:</span>
                <span className="badge badge-info">{user?.planCode || "Basic"}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Order Detail Modal with Interactive Timeline */}
      {selectedOrder && (
        <Modal
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Servis Sifarişi: ${selectedOrder.number}`}
          subtitle={`${selectedOrder.serviceName} — ${selectedOrder.device?.modelName || "Cihaz"}`}
          maxWidth="lg"
        >
          <div className="order-detail-modal space-y-6">
            <div className="flex justify-between items-center">
              <StatusBadge status={selectedOrder.status} locale={locale} />
              <strong className="text-lg">
                {selectedOrder.total?.amount || "0.00"} {selectedOrder.total?.currency || "AZN"}
              </strong>
            </div>

            <div className="panel bg-soft p-4 text-sm space-y-2">
              <div><strong>Ünvan:</strong> {selectedOrder.addressShort || "Bakı şəhəri"}</div>
              <div><strong>Təsvir:</strong> {selectedOrder.description || "Diaqnostika və profilaktika"}</div>
              {selectedOrder.technician && (
                <div><strong>Təyin Edilmiş Usta:</strong> {resolveTechnicianName(selectedOrder.technician)}</div>
              )}
            </div>

            <div>
              <h4 className="font-bold mb-3">Workflow Gedişatı</h4>
              <Timeline
                steps={(selectedOrder.stages || []).map((s: any, idx: number) => ({
                  id: s.id || String(idx),
                  name: resolveText(s.customerName || s.name, locale, "Mərhələ"),
                  description: resolveText(s.description, locale, ""),
                  status: s.status,
                  timestamp: s.completedAt ? new Date(s.completedAt).toLocaleTimeString("az-AZ") : undefined,
                }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Estimate Review & Approval Modal (PRD §19.3) */}
      {estimateModalOrder && (
        <Modal
          open={!!estimateModalOrder}
          onClose={() => setEstimateModalOrder(null)}
          title="Təmir Smetasının Təsdiqi (PRD §19.3)"
          subtitle={`Sifariş: ${estimateModalOrder.number}`}
          maxWidth="md"
        >
          <div className="estimate-modal space-y-4">
            <p className="text-sm text-muted">
              Usta diaqnostika nəticəsində tələb olunan ehtiyat hissələrini və iş haqqını hesablamışdır:
            </p>

            <div className="panel bg-soft p-4 space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span>Diaqnostika və usta xidməti:</span>
                <strong>35.00 AZN</strong>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>R32 Freon doldurulması (1.2 kq):</span>
                <strong>40.00 AZN</strong>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Mis boru lehimlənməsi və təmizləmə:</span>
                <strong>25.00 AZN</strong>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 text-brand">
                <span>Yekun Məbləğ:</span>
                <span>100.00 AZN</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="btn primary flex-1"
                onClick={async () => {
                  if (onApproveEstimate) await onApproveEstimate(estimateModalOrder.id);
                  setEstimateModalOrder(null);
                }}
              >
                <Check size={18} /> Smetanı Təsdiqlə
              </button>
              <button
                className="btn danger flex-1"
                onClick={async () => {
                  if (onRejectEstimate) await onRejectEstimate(estimateModalOrder.id, "Müştəri imtina etdi");
                  setEstimateModalOrder(null);
                }}
              >
                <X size={18} /> İmtina Et
              </button>
            </div>
            <small className="text-xs text-muted block text-center">
              * Smetadan imtina edildikdə standart qaydalara əsasən çağırış haqqı tutulmur (§20.1).
            </small>
          </div>
        </Modal>
      )}
    </div>
  );
}
