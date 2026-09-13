"use client";
import React, { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Users,
  Package,
  DollarSign,
  Settings,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Sidebar } from "../../components/layout/sidebar";
import { DataTable } from "../../components/ui/data-table";
import { StatusBadge } from "../../components/ui/status-badge";
import { Modal } from "../../components/ui/modal";
import { Timeline } from "../../components/ui/timeline";
import { resolveTechnicianName, resolveText, getInitials } from "../../utils/i18n";

export interface AdminPortalProps {
  orders: any[];
  technicians?: any[];
  inventory?: any[];
  locale?: "az" | "ru" | "en";
  onLogout: () => void;
  onUpdateOrderStage?: (orderId: string, stageId: string, status: string) => Promise<void>;
  onAssignTechnician?: (orderId: string, technicianId: string) => Promise<void>;
}

export function AdminPortal({
  orders = [],
  technicians = [],
  inventory = [],
  locale = "az",
  onLogout,
  onUpdateOrderStage,
  onAssignTechnician,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "service-orders" | "dispatch" | "catalog" | "inventory" | "technicians" | "finance" | "settings"
  >("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [assignModalOrder, setAssignModalOrder] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState("");

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", href: "#dashboard", icon: LayoutDashboard },
    { id: "service-orders", label: "Servis Sifarişləri", href: "#service-orders", icon: ClipboardList, badge: orders.length },
    { id: "dispatch", label: "Dispetçer Lövhəsi", href: "#dispatch", icon: Calendar },
    { id: "catalog", label: "PIM Kataloq", href: "#catalog", icon: Layers },
    { id: "inventory", label: "Anbar və Transferlər", href: "#inventory", icon: Package },
    { id: "technicians", label: "Ustalar və Rollar", href: "#technicians", icon: Users, badge: technicians.length },
    { id: "finance", label: "Maliyyə və Hesablaşma", href: "#finance", icon: DollarSign },
    { id: "settings", label: "Sistem Ayarları", href: "#settings", icon: Settings },
  ];

  const unassignedOrders = orders.filter((o) => !o.technicianId && o.status === "CONFIRMED");
  const inProgressOrders = orders.filter((o) => ["IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(o.status));

  // Columns for Service Orders DataTable
  const orderColumns = [
    {
      key: "number",
      header: "Sifariş №",
      sortable: true,
      render: (o: any) => <strong>{o.number}</strong>,
    },
    {
      key: "serviceName",
      header: "Xidmət / Cihaz",
      render: (o: any) => (
        <div>
          <div className="font-semibold">{o.serviceName}</div>
          <small className="text-muted">{o.device?.modelName || o.categoryName || "Avadanlıq"}</small>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Müştəri",
      render: (o: any) => <span>{o.customerName || "Fərdi Müştəri"}</span>,
    },
    {
      key: "technician",
      header: "Təyin Edilmiş Usta",
      render: (o: any) =>
        o.technician ? (
          <span className="text-sm font-medium text-brand">{resolveTechnicianName(o.technician)}</span>
        ) : (
          <button
            className="btn btn-sm outline text-xs py-0.5 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setAssignModalOrder(o);
            }}
          >
            + Usta Təyin Et
          </button>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (o: any) => <StatusBadge status={o.status} locale={locale} />,
    },
    {
      key: "total",
      header: "Məbləğ",
      render: (o: any) => (
        <strong>
          {o.total?.amount || "0.00"} {o.total?.currency || "AZN"}
        </strong>
      ),
    },
    {
      key: "actions",
      header: "İdarə",
      render: (o: any) => (
        <button
          className="btn btn-sm outline text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(o);
          }}
        >
          Konsol <ArrowUpRight size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="portal-layout workspace admin-portal">
      <Sidebar
        items={sidebarItems}
        currentPath={`#${activeTab}`}
        headerTitle="ADMIN CRM / ERP"
        user={{
          name: "Sistem Admini",
          email: "admin@demo.az",
          role: "Super Admin · Mərkəzi Təşkilat",
        }}
        onNavigate={(href) => setActiveTab(href.replace("#", "") as any)}
        onLogout={onLogout}
      />

      <main className="workspace-content p-6">
        <div className="workspace-header flex justify-between items-center mb-6">
          <div>
            <span className="eyebrow">Əməliyyat İdarəetməsi</span>
            <h1 className="text-2xl font-bold">
              {activeTab === "dashboard" && "Əməliyyat İcmalı (KPI Dashboard)"}
              {activeTab === "service-orders" && "Servis Sifarişlərinin İdarəsi (§13, §18)"}
              {activeTab === "dispatch" && "Dispetçer Lövhəsi və Qrafik (§16)"}
              {activeTab === "catalog" && "PIM Məhsul və Xidmət Kataloqu (§24, §25)"}
              {activeTab === "inventory" && "Anbar, Rezervasiya və Transferlər (§34–40)"}
              {activeTab === "technicians" && "Ustalar, Ştat və RBAC Rol İcazələri (§8, §12)"}
              {activeTab === "finance" && "Maliyyə, Kassa və Usta Hesablaşmaları (§50, §51)"}
              {activeTab === "settings" && "Brend, Haqq Qaydaları və İnteqrasiya Ayarları (§20, §56)"}
            </h1>
          </div>
        </div>

        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div className="grid four stats gap-4">
              <div className="stat panel p-4">
                <span className="text-muted text-xs block">Ümumi Sifarişlər</span>
                <strong className="text-2xl font-bold">{orders.length}</strong>
                <small className="text-success block text-xs mt-1">↑ 14% bu həftə</small>
              </div>
              <div className="stat panel p-4">
                <span className="text-muted text-xs block">Təyinat Gözləyənlər</span>
                <strong className="text-2xl font-bold text-accent">{unassignedOrders.length}</strong>
                <small className="text-muted block text-xs mt-1">SLA hədəfi: ≤30 dəqiqə</small>
              </div>
              <div className="stat panel p-4">
                <span className="text-muted text-xs block">İcrada Olan Servislər</span>
                <strong className="text-2xl font-bold text-brand">{inProgressOrders.length}</strong>
                <small className="text-muted block text-xs mt-1">Ünvanda və servis mərkəzində</small>
              </div>
              <div className="stat panel p-4">
                <span className="text-muted text-xs block">Kassalarda Nağd Balans</span>
                <strong className="text-2xl font-bold text-success">2,480.00 AZN</strong>
                <small className="text-muted block text-xs mt-1">Ustalarda və filial kassasında</small>
              </div>
            </div>

            {/* SLA Alert Card */}
            {unassignedOrders.length > 0 && (
              <div className="alert alert-warning p-4 border-l-4 border-accent flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} className="text-accent" />
                  <div>
                    <strong>{unassignedOrders.length} sifariş usta təyinatı gözləyir!</strong>
                    <p className="text-xs text-muted mb-0">Dispetçer lövhəsində uyğun ustalara yönləndirin.</p>
                  </div>
                </div>
                <button
                  className="btn btn-sm primary"
                  onClick={() => setActiveTab("dispatch")}
                >
                  Dispetçer Lövhəsinə Keç
                </button>
              </div>
            )}

            {/* Orders DataTable */}
            <div className="panel p-6">
              <h3 className="text-lg font-bold mb-4">Ən Son Servis Sifarişləri</h3>
              <DataTable
                columns={orderColumns}
                data={orders}
                searchKey="serviceName"
                searchPlaceholder="Xidmət və ya müştəri ilə axtar..."
                pageSize={6}
                onRowClick={(row) => setSelectedOrder(row)}
              />
            </div>
          </div>
        )}

        {/* TAB: SERVICE ORDERS */}
        {activeTab === "service-orders" && (
          <div className="panel p-6">
            <DataTable
              columns={orderColumns}
              data={orders}
              searchKey="serviceName"
              searchPlaceholder="Sifariş axtarışı..."
              pageSize={10}
              onRowClick={(row) => setSelectedOrder(row)}
            />
          </div>
        )}

        {/* TAB: DISPATCH BOARD (PRD §16) */}
        {activeTab === "dispatch" && (
          <div className="dispatch-board space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Left: Unassigned Backlog Queue */}
              <div className="panel p-4 lg:col-span-1">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} /> Təyin Olunmamış Sifarişlər ({unassignedOrders.length})
                </h4>
                <div className="space-y-3">
                  {unassignedOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="border p-3 rounded-lg bg-soft cursor-pointer hover:border-brand"
                      onClick={() => setAssignModalOrder(ord)}
                    >
                      <span className="text-xs font-mono font-bold text-brand">{ord.number}</span>
                      <strong className="block text-sm mt-0.5">{ord.serviceName}</strong>
                      <small className="text-muted block">{ord.addressShort || "Bakı şəhəri"}</small>
                      <button className="btn btn-sm primary w-full text-xs mt-2">
                        Usta Təyin Et
                      </button>
                    </div>
                  ))}
                  {unassignedOrders.length === 0 && (
                    <div className="text-xs text-muted text-center py-4">Bütün sifarişlər təyin olunub.</div>
                  )}
                </div>
              </div>

              {/* Right: Technicians Schedule Grid */}
              <div className="panel p-4 lg:col-span-3">
                <h4 className="font-bold text-sm mb-3">Ustaların Bugünkü Yükü və Boş Vaxt Slotları</h4>
                <div className="space-y-3">
                  {technicians.slice(0, 5).map((tech) => {
                    const techName = resolveTechnicianName(tech);
                    const initials = getInitials(techName);
                    const specs = (tech.specializations || [])
                      .map((s: any) => resolveText(s, "az"))
                      .filter(Boolean)
                      .join(", ") || "Kondisioner, Kombi";

                    return (
                      <div key={tech.id} className="border p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-soft flex items-center justify-center font-bold text-brand">
                            {initials}
                          </div>
                          <div>
                            <strong>{techName}</strong>
                            <small className="text-muted block text-xs">
                              İxtisas: {specs}
                            </small>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="badge badge-success text-xs">Boş slot var: 14:00 - 16:00</span>
                          <button
                            className="btn btn-sm outline text-xs"
                            onClick={() => alert(`Cədvəl baxışı: ${techName}`)}
                          >
                            Cədvələ Bax
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INVENTORY */}
        {activeTab === "inventory" && (
          <div className="panel p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">Anbar Qalıqları və Rezervasiyalar (§37, §39)</h3>
                <p className="text-xs text-muted">Mərkəzi anbar, filial anbarları və servis maşınları üzrə fiziki və istifadə edilə bilən qalıqlar.</p>
              </div>
              <button className="btn btn-sm primary" onClick={() => alert("Yeni anbar transferi yaradıldı.")}>
                <Plus size={15} /> Yeni Transfer
              </button>
            </div>

            <div className="grid three gap-4 mb-4">
              <div className="border p-4 rounded">
                <span className="text-xs text-muted block">Mərkəzi Anbar (Bakı)</span>
                <strong className="text-xl font-bold">1,840 ədəd</strong>
              </div>
              <div className="border p-4 rounded">
                <span className="text-xs text-muted block">Filial Anbarı (Sumqayıt)</span>
                <strong className="text-xl font-bold">420 ədəd</strong>
              </div>
              <div className="border p-4 rounded">
                <span className="text-xs text-muted block">Mobil Anbarlar (Servis maşınları)</span>
                <strong className="text-xl font-bold">310 ədəd</strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FINANCE & SETTLEMENTS */}
        {activeTab === "finance" && (
          <div className="panel p-6 space-y-4">
            <h3 className="text-lg font-bold mb-4">Müstəqil Usta Hesablaşmaları və Ödənişlər (§51.3)</h3>
            <p className="text-xs text-muted mb-4">
              Model yalnız abunə əsaslıdır. Müştəri ödənişi şirkətə daxil olur, ustaya çatacaq xidmət və material məbləği daxili hesablaşma ilə təsdiqlənir.
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hesablaşma №</th>
                    <th>Usta</th>
                    <th>Tamamlanmış İşlər</th>
                    <th>Ümumi Məbləğ</th>
                    <th>Status</th>
                    <th>Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>SET-2026-089</strong></td>
                    <td>Rəşad Quliyev (Müstəqil usta)</td>
                    <td>14 sifariş</td>
                    <td><strong>640.00 AZN</strong></td>
                    <td><span className="badge badge-warning">Təsdiq Gözləyir</span></td>
                    <td>
                      <button className="btn btn-sm primary text-xs" onClick={() => alert("Hesablaşma təsdiqləndi.")}>
                        Təsdiqlə və Ödə
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>SET-2026-088</strong></td>
                    <td>Elnur Həsənov (Müstəqil usta)</td>
                    <td>8 sifariş</td>
                    <td><strong>380.00 AZN</strong></td>
                    <td><span className="badge badge-success">Ödənilib</span></td>
                    <td>
                      <button className="btn btn-sm outline text-xs">Aktı Çap Et</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS & BRANDING */}
        {activeTab === "settings" && (
          <div className="panel p-6 max-w-2xl space-y-6">
            <h3 className="text-lg font-bold">Brend və Haqq Qaydaları Ayarları (§20, §56.3)</h3>
            <div className="space-y-4 text-sm">
              <div className="form-group">
                <label className="form-label">Şirkət Adı (Tenant)</label>
                <input type="text" className="form-input" defaultValue="besqardasServis.az" />
              </div>
              <div className="form-group">
                <label className="form-label">Əsas Rəng Tokeni (Primary Color)</label>
                <input type="text" className="form-input" defaultValue="#24594b" />
              </div>
              <div className="form-group">
                <label className="form-label">Standart Çağırış Haqqı Qaydası (§20.1)</label>
                <input type="text" className="form-input" defaultValue="Smetadan imtina edildikdə: 0 AZN (Pulsuz)" disabled />
              </div>
              <button className="btn primary" onClick={() => alert("Ayarlar yadda saxlanıldı.")}>
                Yadda Saxla
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Admin Order Console Modal with Workflow Controller */}
      {selectedOrder && (
        <Modal
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Admin Konsolu: ${selectedOrder.number}`}
          subtitle={`${selectedOrder.serviceName} — Müştəri: ${selectedOrder.customerName || "Aysel M."}`}
          maxWidth="xl"
        >
          <div className="admin-order-console space-y-6">
            <div className="flex justify-between items-center bg-soft p-4 rounded">
              <StatusBadge status={selectedOrder.status} locale={locale} />
              <div>
                <span className="text-xs text-muted block">Yekun Məbləğ:</span>
                <strong className="text-lg text-brand">
                  {selectedOrder.total?.amount || "0.00"} {selectedOrder.total?.currency || "AZN"}
                </strong>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-3">Workflow Mərhələləri və Müdaxilə (§17.3)</h4>
              <Timeline
                steps={(selectedOrder.stages || []).map((s: any, idx: number) => ({
                  id: s.id || String(idx),
                  name: s.name,
                  description: s.description,
                  status: s.status,
                  assignee: s.executorRole || "Operator / Usta",
                }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button className="btn outline" onClick={() => setSelectedOrder(null)}>
                Bağla
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  alert(`Sifariş statusu yeniləndi.`);
                  setSelectedOrder(null);
                }}
              >
                Mərhələni Tamamla / Təsdiqlə
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Technician Modal */}
      {assignModalOrder && (
        <Modal
          open={!!assignModalOrder}
          onClose={() => setAssignModalOrder(null)}
          title="Usta Təyin Et"
          subtitle={`Sifariş: ${assignModalOrder.number}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <label className="form-label">İxtisas və Zonaya Uyğun Ustalar (§15)</label>
            <select
              className="form-input"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              <option value="">Usta seçin...</option>
              {technicians.map((t) => {
                const tName = resolveTechnicianName(t);
                const tSpecs = (t.specializations || [])
                  .map((s: any) => resolveText(s, "az"))
                  .filter(Boolean)
                  .join(", ") || "Usta";
                return (
                  <option key={t.id} value={t.id}>
                    {tName} (Reytinq: {t.rating || 5.0} · {tSpecs})
                  </option>
                );
              })}
            </select>

            <div className="flex justify-end gap-2 pt-4">
              <button className="btn outline" onClick={() => setAssignModalOrder(null)}>İmtina</button>
              <button
                className="btn primary"
                disabled={!selectedTechId}
                onClick={async () => {
                  if (onAssignTechnician) {
                    await onAssignTechnician(assignModalOrder.id, selectedTechId);
                  }
                  setAssignModalOrder(null);
                  alert("Usta uğurla təyin edildi!");
                }}
              >
                Təyin Et
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
