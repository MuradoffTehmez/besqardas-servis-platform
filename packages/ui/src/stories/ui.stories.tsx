import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipboardList, Wallet, Wrench } from "lucide-react";
import { Avatar, Card, Check, EmptyState, EnumBadge, KeyValue, Loading, Pagination, SearchBox, SelectField, Spinner, Stars, Stat, Tabs, TextArea, TextField, Toggle } from "../app/kit/base";
import { Modal } from "../components/ui/modal";
import { Timeline } from "../components/ui/timeline";

/** Tətbiqin kit komponentləri: düymələr, statuslar, formalar, kartlar, modal və zaman xətti */
const meta: Meta = { title: "UI/Kit" };
export default meta;
type Story = StoryObj;

const row: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" };

export const Buttons: Story = {
  name: "Düymələr",
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        <button type="button" className="btn primary">Əsas</button>
        <button type="button" className="btn secondary">İkinci dərəcəli</button>
        <button type="button" className="btn outline">Kontur</button>
        <button type="button" className="btn ghost">Şəffaf</button>
        <button type="button" className="btn danger">Təhlükəli</button>
      </div>
      <div style={row}>
        <button type="button" className="btn primary btn-sm">Kiçik</button>
        <button type="button" className="btn primary">Orta</button>
        <button type="button" className="btn primary btn-lg">Böyük</button>
        <button type="button" className="btn primary" disabled><Spinner /> Göndərilir</button>
      </div>
    </div>
  ),
};

export const Statuses: Story = {
  name: "Status nişanları və reytinq",
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={row}>
        {["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ON_HOLD", "COMPLETED", "CANCELLED"].map((c) => <EnumBadge key={c} group="OrderStatus" code={c} />)}
      </div>
      <div style={row}>
        {["PENDING", "PAID", "PARTIALLY_PAID", "FAILED", "REFUNDED"].map((c) => <EnumBadge key={c} group="PaymentStatus" code={c} />)}
      </div>
      <div style={row}>
        <Stars value={4.8} count={214} />
        <Avatar name="Aysel Məmmədova" tone="rose" size={40} />
        <Avatar name="Elvin Həsənov" tone="sky" size={40} />
      </div>
    </div>
  ),
};

function FieldsDemo() {
  const [agree, setAgree] = useState(true);
  const [sms, setSms] = useState(false);
  const [branch, setBranch] = useState("nerimanov");
  const [q, setQ] = useState("");
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 440 }}>
      <SearchBox value={q} onChange={setQ} placeholder="Sifariş və ya müştəri axtar" />
      <TextField label="Ad və soyad" required placeholder="Aysel Məmmədova" onValue={() => {}} />
      <TextField label="Telefon" defaultValue="+994 50 123" error="Nömrə tam deyil" onValue={() => {}} />
      <SelectField label="Filial" value={branch} onValue={setBranch} options={[{ value: "nerimanov", label: "Nərimanov" }, { value: "yasamal", label: "Yasamal" }, { value: "xetai", label: "Xətai" }]} />
      <TextArea label="Problemin təsviri" hint="Ən azı 10 simvol" onValue={() => {}} />
      <Check label="İstifadə şərtlərini qəbul edirəm" checked={agree} onValue={setAgree} />
      <Toggle label="SMS bildirişləri" checked={sms} onValue={setSms} />
    </div>
  );
}

export const Fields: Story = { name: "Forma sahələri", render: () => <FieldsDemo /> };

function TabsDemo() {
  const [tab, setTab] = useState("active");
  const [page, setPage] = useState(2);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "active", label: "Aktiv", badge: 4 }, { id: "done", label: "Tamamlanmış" }, { id: "cancelled", label: "Ləğv edilmiş" }]} />
      <Pagination meta={{ page, totalPages: 8, total: 76, pageSize: 10 }} onPage={setPage} />
    </div>
  );
}

export const Navigation: Story = { name: "Tablar və səhifələmə", render: () => <TabsDemo /> };

export const Cards: Story = {
  name: "Kartlar və göstəricilər",
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        <Stat label="Bugünkü işlər" value="6" hint="2 təcili" icon={ClipboardList} />
        <Stat label="Aylıq qazanc" value="2 480 ₼" tone="success" icon={Wallet} />
        <Stat label="Açıq smetalar" value="3" tone="warning" icon={Wrench} />
      </div>
      <Card title="SV-1052 · Kondisioner təmiri" subtitle="Nərimanov r., Təbriz küç. 44" actions={<button type="button" className="btn outline btn-sm">Aç</button>}>
        <KeyValue items={[["Müştəri", "Aysel Məmmədova"], ["Usta", "Elvin Həsənov"], ["Vaxt", "16.09.2026 10:00"], ["Smeta", "227,32 ₼"]]} />
      </Card>
    </div>
  ),
};

export const States: Story = {
  name: "Yüklənmə və boş hal",
  render: () => (
    <div style={{ display: "grid", gap: 20, maxWidth: 520 }}>
      <Loading rows={3} />
      <EmptyState title="Bildiriş yoxdur" text="Yeni bildirişlər burada görünəcək." action={<button type="button" className="btn primary btn-sm">Yenilə</button>} />
    </div>
  ),
};

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>Modalı aç</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Smetanı təsdiqləyin" subtitle="SV-1052 · 227,32 ₼">
        <p>Təsdiqlədikdən sonra usta işə başlayacaq. Esc və ya bağla düyməsi modalı bağlayır, fokus düyməyə qayıdır.</p>
        <div style={{ ...row, marginTop: 16 }}>
          <button type="button" className="btn primary" onClick={() => setOpen(false)}>Təsdiqlə</button>
          <button type="button" className="btn outline" onClick={() => setOpen(false)}>İmtina</button>
        </div>
      </Modal>
    </>
  );
}

export const ModalStory: Story = { name: "Modal", render: () => <ModalDemo /> };

export const TimelineStory: Story = {
  name: "Zaman xətti",
  render: () => (
    <Timeline
      steps={[
        { id: "1", name: "Sifariş qəbul edildi", status: "COMPLETED", timestamp: "14.09.2026 10:00" },
        { id: "2", name: "Usta təyin olundu", status: "COMPLETED", assignee: "Elvin Həsənov", timestamp: "14.09.2026 11:20" },
        { id: "3", name: "Diaqnostika", status: "IN_PROGRESS", description: "Freon səviyyəsi yoxlanılır" },
        { id: "4", name: "Təhvil", status: "PENDING" },
      ]}
    />
  ),
};
