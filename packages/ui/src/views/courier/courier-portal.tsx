"use client";
import React, { useState } from "react";
import {
  Truck,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  Navigation,
  Clock,
  ShieldCheck,
  Check,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { Modal } from "../../components/ui/modal";

export interface CourierTask {
  id: string;
  number: string;
  type: "PICKUP" | "DELIVERY" | "TRANSFER";
  status: "ASSIGNED" | "ON_THE_WAY" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";
  customerName: string;
  customerPhone: string;
  address: string;
  loadDescription: string;
  scheduledTime: string;
}

export interface CourierPortalProps {
  tasks?: CourierTask[];
  onLogout: () => void;
  onUpdateTaskStatus?: (taskId: string, status: string) => Promise<void>;
}

export function CourierPortal({
  tasks = [
    {
      id: "tsk-1",
      number: "LOG-1021",
      type: "PICKUP",
      status: "ASSIGNED",
      customerName: "Kənan Məmmədov",
      customerPhone: "+994 (50) 777-11-22",
      address: "Bakı ş., Yasamal r., C.Məmmədquluzadə küç. 102",
      loadDescription: "Kombi Bosch Condens 7000 (təmir üçün servis mərkəzinə götürülmə)",
      scheduledTime: "11:00 - 13:00",
    },
    {
      id: "tsk-2",
      number: "LOG-1022",
      type: "DELIVERY",
      status: "ON_THE_WAY",
      customerName: "Samir Əliyev",
      customerPhone: "+994 (55) 333-44-55",
      address: "Bakı ş., Nəsimi r., 28 May küç. 45, m. 12",
      loadDescription: "Təmir olunmuş LG DualCool Inverter kondisionerinin geri çatdırılması",
      scheduledTime: "14:00 - 16:00",
    },
  ],
  onLogout,
  onUpdateTaskStatus,
}: CourierPortalProps) {
  const [selectedTask, setSelectedTask] = useState<CourierTask | null>(null);
  const [signatureDone, setSignatureDone] = useState(false);

  const getStatusBadge = (status: CourierTask["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return <span className="badge badge-outline">Təyin olunub</span>;
      case "ON_THE_WAY":
        return <span className="badge badge-warning">Yoldadır</span>;
      case "PICKED_UP":
        return <span className="badge badge-info">Götürüldü</span>;
      case "IN_TRANSIT":
        return <span className="badge badge-info">Daşınır</span>;
      case "DELIVERED":
        return <span className="badge badge-success">Təhvil verildi</span>;
    }
  };

  return (
    <div className="courier-portal max-w-lg mx-auto p-4 min-h-screen bg-soft">
      {/* Mobile Top Header */}
      <header className="courier-header flex justify-between items-center bg-canvas p-4 rounded-xl shadow-sm mb-4">
        <div className="flex items-center gap-2">
          <Truck size={22} className="text-brand" />
          <strong className="text-base">Kuryer Marşrutu</strong>
        </div>
        <button className="btn btn-sm ghost text-xs" onClick={onLogout}>
          <LogOut size={16} /> Çıxış
        </button>
      </header>

      {/* Active Tasks List */}
      <div className="tasks-list space-y-3">
        <span className="text-xs text-muted font-bold block uppercase tracking-wider px-1">
          Bugünkü Tapşırıqlar ({tasks.length})
        </span>

        {tasks.map((task) => (
          <div
            key={task.id}
            className="task-card panel p-4 cursor-pointer hover:border-brand transition-all"
            onClick={() => setSelectedTask(task)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-mono font-bold text-brand">{task.number}</span>
                <strong className="block text-base mt-0.5">
                  {task.type === "PICKUP" ? "Cihazın Götürülməsi" : "Geri Çatdırılma"}
                </strong>
              </div>
              {getStatusBadge(task.status)}
            </div>

            <p className="text-xs text-muted mb-3 flex items-start gap-1">
              <MapPin size={14} className="text-brand shrink-0 mt-0.5" />
              <span>{task.address}</span>
            </p>

            <div className="flex justify-between items-center pt-2 border-t text-xs">
              <span className="text-muted flex items-center gap-1">
                <Clock size={12} /> {task.scheduledTime}
              </span>
              <span className="font-semibold text-brand flex items-center gap-1">
                Tapşırığı Aç <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Task Execution Modal */}
      {selectedTask && (
        <Modal
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`Tapşırıq: ${selectedTask.number}`}
          subtitle={selectedTask.type === "PICKUP" ? "Götürmə Aktı" : "Təhvil Aktı"}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="panel bg-soft p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Müştəri:</span>
                <strong>{selectedTask.customerName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Əlaqə:</span>
                <a
                  href={`tel:${selectedTask.customerPhone}`}
                  className="btn btn-sm outline text-xs flex items-center gap-1"
                >
                  <Phone size={13} /> Zəng et
                </a>
              </div>
              <div>
                <span className="text-muted block text-xs mb-1">Ünvan:</span>
                <strong className="block">{selectedTask.address}</strong>
              </div>
            </div>

            <div className="load-info p-3 border rounded">
              <span className="text-xs text-muted block mb-1">Daşınan Yük:</span>
              <p className="text-sm font-medium mb-0">{selectedTask.loadDescription}</p>
            </div>

            {/* Handover Signature checkbox */}
            <div className="signature-confirm p-3 border-dashed border rounded text-center">
              <label className="checkbox-label cursor-pointer flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  checked={signatureDone}
                  onChange={(e) => setSignatureDone(e.target.checked)}
                />
                <span className="text-xs font-semibold">
                  Müştəri cihazı təhvil verdi / aldı və elektron imza təsdiqləndi
                </span>
              </label>
            </div>

            {/* Status Progress Button */}
            <button
              className="btn btn-lg primary w-full"
              disabled={!signatureDone}
              onClick={async () => {
                if (onUpdateTaskStatus) {
                  await onUpdateTaskStatus(selectedTask.id, "DELIVERED");
                }
                setSelectedTask(null);
                alert("Logistika tapşırığı uğurla tamamlandı!");
              }}
            >
              <CheckCircle2 size={18} /> Tapşırığı Tamamla
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
