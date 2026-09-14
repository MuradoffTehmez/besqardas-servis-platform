"use client";
import React, { useEffect, useState } from "react";
import { AlertCircle, CalendarClock, CreditCard, Crown, FileText, Heart, HardDrive, MapPin, Plus, QrCode, ShieldCheck, ShoppingBag, Star, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { del, patch, post, put, qs, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, Check, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stars, Stat, Tabs, TextArea, TextField, Toggle, errorText, useFormState } from "../kit/base";
import { ActionBar, ConfirmDialog, Dialog, ReasonDialog, ResourceTable } from "../kit/actions";
import { EstimateView, PlanComparison, SlotPicker, StageTimeline } from "../kit/domain";
import { FileDrop, MapView, OtpInput, PhoneField, ProductVisual, QuantityInput, type PickedFile } from "../kit/media";
import { ProductTile, ReviewDialog } from "./shop";
import { DocumentDialog, DocumentsList, HistoryList, ListCard, Progress, UsageBar, useOrderAction, usePayOnline, useRefresh } from "./common";

/* ------------------------------------------------------------------ */
/* İcmal (PRD §60.3)                                                   */
/* ------------------------------------------------------------------ */

export function AccountDashboardPage() {
  const { t, money, date, dateTime, enumLabel } = useI18n();
  const { user } = useSession();
  const q = useApi<any>("/account/dashboard");
  return (
    <>
      <PageHeader title={t("acc.dash.hello", { name: user?.firstName ?? "" })} subtitle={t("acc.dash.subtitle")} actions={<Link to="/services" className="btn primary"><Wrench size={16} /> {t("book")}</Link>} />
      <QueryView query={q} rows={6}>
        {(d) => (
          <>
            {d.pendingEstimates.map((e: any) => (
              <div key={e.orderId} className="alert kit-note warning mb-4 flex justify-between items-center gap-3 flex-wrap">
                <span className="flex items-center gap-2"><AlertCircle size={18} /> {t("acc.dash.estimateWaiting", { number: e.orderNumber, total: money(e.total), date: date(e.validUntil) })}</span>
                <Link to={`/account/services/${e.orderId}#estimate`} className="btn primary btn-sm">{t("acc.dash.reviewEstimate")}</Link>
              </div>
            ))}
            <Grid cols={4}>
              <Stat label={t("acc.dash.devices")} value={d.stats.devices} icon={HardDrive} to="/account/devices" />
              <Stat label={t("acc.dash.completed")} value={d.stats.completedOrders} icon={Wrench} tone="success" to="/account/services?tab=done" />
              <Stat label={t("acc.dash.warranties")} value={d.stats.activeWarranties} icon={ShieldCheck} tone="info" to="/account/warranties" />
              <Stat label={t("acc.dash.saved")} value={money(d.stats.savedAmount)} icon={Crown} tone="warning" hint={t("acc.dash.savedHint")} />
            </Grid>
            <div className="kit-split">
              <div className="kit-stack">
                <ListCard title={t("acc.dash.activeOrders")} to="/account/services" count={d.activeOrders.length} empty={!d.activeOrders.length}>
                  <ul className="kit-list">
                    {d.activeOrders.map((o: any) => (
                      <li key={o.id}>
                        <Link to={`/account/services/${o.id}`} className="grow">
                          <strong>{o.number} · {o.serviceName}</strong>
                          <small className="block text-muted">{o.stageName}{o.scheduledAt ? ` · ${dateTime(o.scheduledAt)}` : ""}</small>
                          <Progress value={o.progress} />
                        </Link>
                        <EnumBadge group="OrderStatus" code={o.status} />
                      </li>
                    ))}
                  </ul>
                </ListCard>
                <ListCard title={t("acc.dash.upcoming")} empty={!d.upcoming.length}>
                  <ul className="kit-list">
                    {d.upcoming.map((u: any) => (
                      <li key={`${u.kind}-${u.id}`}>
                        <Link to={u.href} className="grow entity-row">
                          <CalendarClock size={18} className="text-muted" />
                          <span><strong>{u.title}</strong><small>{dateTime(u.date)}</small></span>
                        </Link>
                        <span className="badge">{t(`acc.dash.kind.${u.kind}`)}</span>
                      </li>
                    ))}
                  </ul>
                </ListCard>
              </div>
              <div className="kit-stack">
                <Card title={t("acc.dash.plan")}>
                  <div className="flex justify-between items-center gap-2">
                    <strong className="text-xl">{typeof d.subscription.planName === "string" ? d.subscription.planName : d.subscription.planName?.az}</strong>
                    <EnumBadge group="SubscriptionStatus" code={d.subscription.status} />
                  </div>
                  {d.subscription.renewsAt && <p className="text-sm text-muted mt-2">{t("acc.sub.renewsAt", { date: date(d.subscription.renewsAt) })}</p>}
                  <Link to="/account/subscription" className="btn outline btn-sm mt-3">{d.subscription.tier < 2 ? t("acc.dash.upgrade") : t("acc.dash.managePlan")}</Link>
                </Card>
                {d.expiringWarranties.length > 0 && (
                  <Card title={t("acc.dash.expiring")}>
                    <ul className="kit-list">
                      {d.expiringWarranties.map((w: any) => <li key={w.id}><span className="grow">{w.deviceName}</span><small>{date(w.endsAt)}</small></li>)}
                    </ul>
                  </Card>
                )}
                <Card title={t("acc.dash.quick")}>
                  <div className="quick-grid">
                    <Link to="/services"><Wrench size={18} />{t("book")}</Link>
                    <Link to="/account/devices?add=1"><HardDrive size={18} />{t("acc.devices.add")}</Link>
                    <Link to="/shop"><ShoppingBag size={18} />{t("nav.shop")}</Link>
                    <Link to="/account/warranties"><ShieldCheck size={18} />{t("acc.warranty.claim")}</Link>
                  </div>
                </Card>
                <p className="text-sm text-muted">{t("acc.dash.unread", { count: d.unreadNotifications })} · <Link to="/account/notifications" className="text-brand">{enumLabel("NotificationChannel", "IN_APP")}</Link></p>
              </div>
            </div>
          </>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Profil                                                               */
/* ------------------------------------------------------------------ */

export function ProfilePage() {
  const { t } = useI18n();
  const q = useApi<any>("/account/profile");
  return (
    <>
      <PageHeader title={t("acc.profile.title")} subtitle={t("acc.profile.subtitle")} />
      <QueryView query={q}>{(p) => <ProfileForm profile={p} />}</QueryView>
    </>
  );
}

function ProfileForm({ profile }: { profile: any }) {
  const { t, date } = useI18n();
  const refresh = useRefresh();
  const { setLocale } = useRouter();
  const f = useFormState({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email ?? "", phone: profile.phone ?? "", locale: profile.locale, birthDate: profile.birthDate?.slice(0, 10) ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await patch("/account/profile", { ...f.values, email: f.values.email || null, birthDate: f.values.birthDate || undefined });
      await refresh();
      if (f.values.locale !== profile.locale) setLocale(f.values.locale);
      toast.success(t("common.saved"));
    } catch (err) {
      setError(err);
      f.fromError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="kit-split">
      <Card title={t("acc.profile.personal")}>
        <form onSubmit={submit} noValidate>
          <FormError error={error} />
          <div className="kit-form-grid">
            <TextField label={t("fields.firstName")} required value={f.values.firstName} onValue={(v) => f.set("firstName", v)} error={f.errors.firstName} autoComplete="given-name" />
            <TextField label={t("fields.lastName")} required value={f.values.lastName} onValue={(v) => f.set("lastName", v)} error={f.errors.lastName} autoComplete="family-name" />
            <TextField label={t("fields.email")} type="email" value={f.values.email} onValue={(v) => f.set("email", v)} error={f.errors.email} hint={f.values.email !== (profile.email ?? "") ? t("acc.profile.reverify") : undefined} autoComplete="email" />
            <PhoneField label={t("fields.phone")} value={f.values.phone} onValue={(v) => f.set("phone", v)} error={f.errors.phone} hint={f.values.phone !== (profile.phone ?? "") ? t("acc.profile.reverify") : undefined} />
            <SelectField label={t("fields.language")} value={f.values.locale} onValue={(v) => f.set("locale", v)} options={[{ value: "az", label: "Azərbaycan" }, { value: "ru", label: "Русский" }, { value: "en", label: "English" }]} />
            <TextField label={t("fields.birthDate")} type="date" value={f.values.birthDate} onValue={(v) => f.set("birthDate", v)} />
          </div>
          <button type="submit" className="btn primary" disabled={busy}>{t("common.save")}</button>
        </form>
      </Card>
      <Card title={t("acc.profile.verification")}>
        <ul className="kit-list">
          <li><span className="grow">{t("fields.phone")}<small className="block text-muted">{profile.phone ?? "—"}</small></span>{profile.phoneVerified ? <span className="badge badge-success">{t("acc.profile.verified")}</span> : <Link to="/verify?type=phone" className="btn outline btn-sm">{t("acc.profile.verify")}</Link>}</li>
          <li><span className="grow">{t("fields.email")}<small className="block text-muted">{profile.email ?? "—"}</small></span>{profile.emailVerified ? <span className="badge badge-success">{t("acc.profile.verified")}</span> : profile.email ? <Link to="/verify?type=email" className="btn outline btn-sm">{t("acc.profile.verify")}</Link> : null}</li>
        </ul>
        <p className="text-sm text-muted mt-3">{t("acc.profile.memberSince", { date: date(profile.createdAt) })}</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ünvanlar (§52)                                                       */
/* ------------------------------------------------------------------ */

export function AddressesPage() {
  const { t } = useI18n();
  const q = useApi<any>("/account/addresses");
  const refresh = useRefresh();
  const [edit, setEdit] = useState<any | null>(null);
  const [remove, setRemove] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const count = q.data?.items.length ?? 0;
  const limitReached = q.data?.limit !== null && q.data?.limit !== undefined && count >= q.data.limit;
  return (
    <>
      <PageHeader
        title={t("acc.addresses.title")}
        subtitle={q.data ? (q.data.limit === null ? t("acc.addresses.unlimited", { count }) : t("acc.addresses.limit", { count, limit: q.data.limit })) : undefined}
        actions={<button type="button" className="btn primary" disabled={limitReached} onClick={() => setEdit({})}><Plus size={16} /> {t("acc.addresses.add")}</button>}
      />
      {limitReached && <div className="kit-note warning mb-4">{t("acc.addresses.limitReached")} <Link to="/account/subscription" className="text-brand">{t("acc.dash.upgrade")}</Link></div>}
      <QueryView query={q} empty={<EmptyState icon={MapPin} title={t("acc.addresses.empty")} />}>
        {(d) => (
          <Grid cols={2}>
            {d.items.map((a: any) => (
              <Card key={a.id} title={<span className="flex items-center gap-2"><MapPin size={16} /> {a.label}</span>} actions={a.isDefault ? <span className="badge badge-success">{t("acc.addresses.default")}</span> : undefined}>
                <p>{[a.city, a.street, a.building && `${t("fields.building")} ${a.building}`, a.apartment && `${t("fields.apartment")} ${a.apartment}`].filter(Boolean).join(", ")}</p>
                {(a.floor || a.entrance) && <p className="text-sm text-muted">{[a.entrance && `${t("fields.entrance")} ${a.entrance}`, a.floor && `${t("fields.floor")} ${a.floor}`].filter(Boolean).join(" · ")}</p>}
                {a.location && <MapView height={140} zoom={14} points={[{ id: a.id, lat: a.location.lat, lng: a.location.lng }]} className="mt-3" />}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button type="button" className="btn outline btn-sm" onClick={() => setEdit(a)}>{t("common.edit")}</button>
                  {!a.isDefault && <button type="button" className="btn ghost btn-sm" onClick={async () => { await patch(`/account/addresses/${a.id}`, { ...strip(a), isDefault: true }); await refresh(); }}>{t("acc.addresses.makeDefault")}</button>}
                  <button type="button" className="btn ghost btn-sm text-danger" onClick={() => setRemove(a)} aria-label={t("common.delete")}><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </QueryView>
      {edit && <AddressDialog address={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog
        open={!!remove}
        danger
        busy={busy}
        title={t("acc.addresses.deleteTitle")}
        text={t("acc.addresses.deleteText")}
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          setBusy(true);
          try { await del(`/account/addresses/${remove.id}`); await refresh(); toast.success(t("common.deleted")); setRemove(null); } catch (e) { toast.error(errorText(e, t("acc.addresses.deleteBlocked"))); } finally { setBusy(false); }
        }}
      />
    </>
  );
}

function strip(a: any) {
  const { id: _id, ownerId: _o, ...rest } = a;
  return rest;
}

export function AddressDialog({ address, onClose, onSaved }: { address: any; onClose: () => void; onSaved?: (a: any) => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const f = useFormState({ label: address.label ?? "", city: address.city ?? "Bakı", street: address.street ?? "", building: address.building ?? "", apartment: address.apartment ?? "", floor: address.floor ?? "", entrance: address.entrance ?? "", note: address.note ?? "", isDefault: !!address.isDefault, location: address.location ?? null });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    const body = Object.fromEntries(Object.entries(f.values).filter(([, v]) => v !== "" && v !== null));
    try {
      const r = address.id ? await patch(`/account/addresses/${address.id}`, body) : await post("/account/addresses", body);
      await refresh();
      toast.success(t("common.saved"));
      onSaved?.(r);
      onClose();
    } catch (e) {
      setError(e);
      f.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={address.id ? t("acc.addresses.edit") : t("acc.addresses.add")} size="lg" footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <TextField label={t("acc.addresses.label")} placeholder={t("acc.addresses.labelHint")} required value={f.values.label} onValue={(v) => f.set("label", v)} error={f.errors.label} />
        <SelectField label={t("fields.city")} value={f.values.city} onValue={(v) => f.set("city", v)} options={["Bakı", "Sumqayıt", "Gəncə", "Xırdalan", "Şirvan", "Lənkəran"].map((c) => ({ value: c, label: c }))} />
        <TextField label={t("fields.street")} required value={f.values.street} onValue={(v) => f.set("street", v)} error={f.errors.street} className="span-2" />
        <TextField label={t("fields.building")} value={f.values.building} onValue={(v) => f.set("building", v)} />
        <TextField label={t("fields.apartment")} value={f.values.apartment} onValue={(v) => f.set("apartment", v)} />
        <TextField label={t("fields.entrance")} value={f.values.entrance} onValue={(v) => f.set("entrance", v)} />
        <TextField label={t("fields.floor")} value={f.values.floor} onValue={(v) => f.set("floor", v)} />
      </div>
      <TextArea label={t("acc.addresses.note")} value={f.values.note} onValue={(v) => f.set("note", v)} rows={2} />
      <p className="form-label mb-2">{t("acc.addresses.pickOnMap")}</p>
      <MapView height={220} zoom={13} center={f.values.location ?? undefined} points={f.values.location ? [{ id: "p", ...f.values.location }] : []} onPick={(p) => f.set("location", p)} />
      <div className="mt-3"><Check label={t("acc.addresses.makeDefault")} checked={f.values.isDefault} onValue={(v) => f.set("isDefault", v)} /></div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Cihazlar (§53)                                                       */
/* ------------------------------------------------------------------ */

export function DevicesPage() {
  const { t, date } = useI18n();
  const { query, setQuery } = useRouter();
  const q = useApi<any>("/account/devices");
  const adding = query.get("add") === "1";
  const count = q.data?.items.length ?? 0;
  const limitReached = q.data?.limit !== null && q.data?.limit !== undefined && count >= q.data.limit;
  return (
    <>
      <PageHeader
        title={t("acc.devices.title")}
        subtitle={q.data ? (q.data.limit === null ? t("acc.devices.unlimited", { count }) : t("acc.devices.limit", { count, limit: q.data.limit })) : undefined}
        actions={<button type="button" className="btn primary" disabled={limitReached} onClick={() => setQuery({ add: 1 })}><Plus size={16} /> {t("acc.devices.add")}</button>}
      />
      {limitReached && <div className="kit-note warning mb-4">{t("acc.devices.limitReached")} <Link to="/account/subscription" className="text-brand">{t("acc.dash.upgrade")}</Link></div>}
      <QueryView query={q} empty={<EmptyState icon={HardDrive} title={t("acc.devices.empty")} text={t("acc.devices.emptyText")} action={<button type="button" className="btn primary" onClick={() => setQuery({ add: 1 })}>{t("acc.devices.add")}</button>} />}>
        {(d) => (
          <div className="tech-grid">
            {d.items.map((dev: any) => (
              <Link key={dev.id} to={`/account/devices/${dev.id}`} className="tech-card">
                <div className="entity-row">
                  <ProductVisual kind={dev.categoryName?.includes("Kombi") ? "boiler" : "ac"} tone={dev.imageTone} size="sm" />
                  <span>
                    <strong>{dev.nickname ?? dev.modelName}</strong>
                    <small>{dev.modelName}</small>
                  </span>
                </div>
                <KeyValue cols={2} items={[[t("acc.devices.address"), dev.addressLabel], [t("acc.devices.serial"), dev.serialNumber], [t("acc.devices.nextService"), dev.nextServiceAt ? date(dev.nextServiceAt) : null], [t("acc.devices.warranty"), <EnumBadge key="w" group="WarrantyStatus" code={dev.warrantyStatus} />]]} />
                <div className="flex gap-2 flex-wrap">
                  <EnumBadge group="DeviceLocation" code={dev.location} tone="info" />
                  {dev.sharedWithFamily && <span className="badge">{t("acc.devices.shared")}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </QueryView>
      {adding && <DeviceDialog onClose={() => setQuery({ add: null })} />}
    </>
  );
}

export function DeviceDialog({ onClose, device }: { onClose: () => void; device?: any }) {
  const { t, text } = useI18n();
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const cats = useApi<any[]>("/equipment-categories");
  const brands = useApi<any[]>("/lookup/brands");
  const addresses = useApi<any>("/account/addresses");
  const f = useFormState({ addressId: device?.addressId ?? "", categoryId: device?.categoryId ?? "", brandId: device?.brandId ?? "", modelId: device?.modelId ?? "", modelName: "", nickname: device?.nickname ?? "", serialNumber: device?.serialNumber ?? "", purchasedAt: "", installedAt: "" });
  const models = useApi<any[]>(f.values.brandId ? `/lookup/models${qs({ brandId: f.values.brandId, categoryId: f.values.categoryId })}` : null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!f.values.addressId && addresses.data?.items?.length) f.set("addressId", addresses.data.items.find((a: any) => a.isDefault)?.id ?? addresses.data.items[0].id);
  }, [addresses.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(Object.entries(f.values).filter(([, v]) => v !== ""));
      const r = device ? await patch(`/account/devices/${device.id}`, body) : await post("/account/devices", body);
      await refresh();
      toast.success(t("common.saved"));
      onClose();
      if (!device) navigate(`/account/devices/${r.id}`);
    } catch (e) {
      setError(e);
      f.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={device ? t("acc.devices.edit") : t("acc.devices.add")} size="lg" footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{t("common.save")}</button></>}>
      <FormError error={error} />
      {!device && <p className="kit-note info mb-3 flex items-center gap-2"><QrCode size={16} /> {t("acc.devices.qrHint")}</p>}
      <div className="kit-form-grid">
        {!device && (
          <>
            <SelectField label={t("acc.devices.category")} required value={f.values.categoryId} onValue={(v) => f.set("categoryId", v)} error={f.errors.categoryId} placeholder={t("common.choose")} options={(cats.data ?? []).map((c) => ({ value: c.id, label: text(c.name) }))} />
            <SelectField label={t("acc.devices.brand")} required value={f.values.brandId} onValue={(v) => { f.set("brandId", v); f.set("modelId", ""); }} error={f.errors.brandId} placeholder={t("common.choose")} options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
            <SelectField label={t("acc.devices.model")} value={f.values.modelId} onValue={(v) => f.set("modelId", v)} placeholder={t("acc.devices.modelUnknown")} options={(models.data ?? []).map((m) => ({ value: m.id, label: m.fullName }))} disabled={!f.values.brandId} />
            {!f.values.modelId && <TextField label={t("acc.devices.modelName")} value={f.values.modelName} onValue={(v) => f.set("modelName", v)} />}
          </>
        )}
        <SelectField label={t("acc.devices.address")} required value={f.values.addressId} onValue={(v) => f.set("addressId", v)} error={f.errors.addressId} placeholder={t("common.choose")} options={(addresses.data?.items ?? []).map((a: any) => ({ value: a.id, label: `${a.label} — ${a.street}` }))} />
        <TextField label={t("acc.devices.nickname")} placeholder={t("acc.devices.nicknameHint")} value={f.values.nickname} onValue={(v) => f.set("nickname", v)} />
        <TextField label={t("acc.devices.serial")} value={f.values.serialNumber} onValue={(v) => f.set("serialNumber", v)} />
        {!device && (
          <>
            <TextField label={t("acc.devices.purchasedAt")} type="date" value={f.values.purchasedAt} onValue={(v) => f.set("purchasedAt", v)} />
            <TextField label={t("acc.devices.installedAt")} type="date" value={f.values.installedAt} onValue={(v) => f.set("installedAt", v)} />
          </>
        )}
      </div>
    </Dialog>
  );
}

export function DeviceDetailPage({ id }: { id: string }) {
  const { t, date, text, enumLabel } = useI18n();
  const { navigate, query, setQuery } = useRouter();
  const q = useApi<any>(`/account/devices/${id}`);
  const services = useApi<any>("/services?pageSize=100");
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const tab = query.get("tab") ?? "overview";
  return (
    <QueryView query={q} rows={8}>
      {(d) => (
        <>
          <PageHeader
            back="/account/devices"
            title={d.nickname ?? d.modelName}
            subtitle={`${d.modelName} · ${d.categoryName}`}
            badge={<EnumBadge group="WarrantyStatus" code={d.warrantyStatus} />}
            actions={
              <>
                <button type="button" className="btn primary" onClick={() => { const s = services.data?.items?.find((x: any) => x.categoryId === d.categoryId && x.type !== "INSTALLATION") ?? services.data?.items?.[0]; if (s) navigate(`/services/${s.slug}/book?deviceId=${d.id}`); }}>
                  <Wrench size={16} /> {t("acc.devices.bookService")}
                </button>
                {d.compatiblePartsCount > 0 && <Link to={`/shop?deviceId=${d.id}`} className="btn outline">{t("acc.devices.parts", { count: d.compatiblePartsCount })}</Link>}
                <button type="button" className="btn outline" onClick={() => setEditing(true)}>{t("common.edit")}</button>
                <button type="button" className="btn ghost text-danger" onClick={() => setRemoving(true)} aria-label={t("common.delete")}><Trash2 size={16} /></button>
              </>
            }
          />
          <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "overview", label: t("acc.devices.overview") }, { id: "history", label: t("acc.devices.history"), badge: d.history.length }, { id: "warranties", label: t("acc.devices.warranties"), badge: d.warranties.length }, { id: "documents", label: t("acc.devices.documents"), badge: d.documents.length }]} />
          {tab === "overview" && (
            <div className="kit-split">
              <Card title={t("acc.devices.info")}>
                <KeyValue items={[[t("acc.devices.brand"), d.brandName], [t("acc.devices.model"), d.modelName], [t("acc.devices.serial"), d.serialNumber], [t("acc.devices.address"), d.addressLabel], [t("acc.devices.purchasedAt"), date(d.purchasedAt)], [t("acc.devices.installedAt"), date(d.installedAt)], [t("acc.devices.nextService"), date(d.nextServiceAt)], [t("acc.devices.source"), enumLabel("DeviceSource", d.source)], [t("acc.devices.location"), enumLabel("DeviceLocation", d.location)], [t("acc.devices.owner"), d.ownerName]]} />
              </Card>
              <Card title={t("acc.devices.qr")}>
                <div className="text-center">
                  <QrCode size={96} aria-hidden className="mx-auto" />
                  <p className="font-bold mt-2">{d.qrCode}</p>
                  <p className="text-sm text-muted">{t("acc.devices.qrText")}</p>
                </div>
              </Card>
            </div>
          )}
          {tab === "history" && (
            <Card title={t("acc.devices.history")}>
              {!d.history.length ? <EmptyState /> : (
                <ol className="kit-timeline">
                  {d.history.map((h: any) => (
                    <li key={h.id} className={cn("kit-tl-item", ["COMPLETED", "CLOSED"].includes(h.status) && "done")}>
                      <span className="kit-tl-dot" aria-hidden><Wrench size={12} /></span>
                      <div className="kit-tl-body">
                        <div className="flex justify-between gap-2 flex-wrap">
                          <Link to={`/account/services/${h.orderId}`}><strong>{h.orderNumber} · {text(h.title)}</strong></Link>
                          <EnumBadge group="OrderStatus" code={h.status} />
                        </div>
                        <small className="text-muted">{date(h.date)}{h.technicianName ? ` · ${h.technicianName}` : ""}{h.photos ? ` · ${t("acc.devices.photos", { count: h.photos })}` : ""}</small>
                        {h.works.length > 0 && <p className="text-sm">{t("acc.devices.works")}: {h.works.map(text).join(", ")}</p>}
                        {h.materials.length > 0 && <p className="text-sm">{t("acc.devices.materials")}: {h.materials.map(text).join(", ")}</p>}
                        {h.warrantyUntil && <small className="text-success">{t("acc.devices.warrantyUntil", { date: date(h.warrantyUntil) })}</small>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
          {tab === "warranties" && <Card flush><WarrantyTable items={d.warranties} /></Card>}
          {tab === "documents" && <Card><DocumentsList docs={d.documents} /></Card>}
          {editing && <DeviceDialog device={d} onClose={() => setEditing(false)} />}
          <ConfirmDialog
            open={removing}
            danger
            title={t("acc.devices.deleteTitle")}
            text={t("acc.devices.deleteText")}
            onClose={() => setRemoving(false)}
            onConfirm={async () => { try { await del(`/account/devices/${d.id}`); toast.success(t("common.deleted")); navigate("/account/devices"); } catch (e) { toast.error(errorText(e, t("acc.devices.deleteBlocked"))); setRemoving(false); } }}
          />
        </>
      )}
    </QueryView>
  );
}

/* ------------------------------------------------------------------ */
/* Servis sifarişləri (§13, §18–19)                                     */
/* ------------------------------------------------------------------ */

const ACTIVE = ["NEW", "CONFIRMED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ON_HOLD"];

export function ServiceOrdersPage({ base = "/account/services", title }: { base?: string; title?: string }) {
  const { t, dateTime, money, text } = useI18n();
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "active";
  const q = useApi<any>("/service-orders?pageSize=200");
  const items = (q.data?.items ?? []).filter((o: any) => (tab === "active" ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status)));
  return (
    <>
      <PageHeader title={title ?? t("acc.orders.serviceTitle")} actions={<Link to="/services" className="btn primary"><Plus size={16} /> {t("book")}</Link>} />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "active", label: t("acc.orders.active"), badge: (q.data?.items ?? []).filter((o: any) => ACTIVE.includes(o.status)).length }, { id: "done", label: t("acc.orders.archive") }]} />
      <QueryView query={q} isEmpty={() => !items.length} empty={<EmptyState icon={Wrench} title={tab === "active" ? t("acc.orders.noActive") : t("acc.orders.noArchive")} action={<Link to="/services" className="btn primary">{t("book")}</Link>} />}>
        {() => (
          <div className="kit-stack">
            {items.map((o: any) => (
              <Link key={o.id} to={`${base}/${o.id}`} className="kit-card clickable">
                <div className="kit-card-body">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <strong className="text-lg">{text(o.serviceName)}</strong>
                      <div className="order-head mt-1">
                        <span>{o.number}</span>
                        {o.scheduledAt && <span>{dateTime(o.scheduledAt)}</span>}
                        {o.technicianName && <span>{o.technicianName}</span>}
                        {o.addressShort && <span>{o.addressShort}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {o.urgent && <span className="badge badge-danger">{t("acc.orders.urgent")}</span>}
                      {o.total && <strong>{money(o.total)}</strong>}
                      <EnumBadge group="OrderStatus" code={o.status} />
                    </div>
                  </div>
                  {ACTIVE.includes(o.status) && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm"><span>{o.currentStageName}</span><span>{o.progress}%</span></div>
                      <Progress value={o.progress} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </QueryView>
    </>
  );
}

export function ServiceOrderDetailPage({ id, back = "/account/services" }: { id: string; back?: string }) {
  const { t, dateTime, money, enumLabel, text, date } = useI18n();
  const q = useApi<any>(`/service-orders/${id}`, { refetchInterval: 20_000 });
  const logistics = useApi<any[]>(`/service-orders/${id}/logistics`);
  const run = useOrderAction(id);
  const payOnline = usePayOnline();
  const [declined, setDeclined] = useState<string[]>([]);
  const [decision, setDecision] = useState<null | "REJECT" | "QUESTION">(null);
  const [busy, setBusy] = useState(false);
  const [reschedule, setReschedule] = useState<any | null>(null);
  const [review, setReview] = useState(false);
  const { query, setQuery } = useRouter();
  const tabParam = query.get("tab");
  const setTab = (id: string) => setQuery({ tab: id });
  const refresh = useRefresh();
  const decide = async (d: "APPROVE" | "PARTIAL" | "REJECT" | "QUESTION", extra: { reasonCode?: string; comment?: string } = {}) => {
    setBusy(true);
    try {
      await post(`/service-orders/${id}/estimate/decision`, { decision: d, declinedLineIds: d === "PARTIAL" ? declined : [], channel: "CABINET", ...extra });
      await refresh();
      toast.success(t(`acc.estimate.done.${d}`));
      setDecision(null);
      setDeclined([]);
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  };
  return (
    <QueryView query={q} rows={10}>
      {(o) => {
        const est = o.estimate;
        const canDecide = est?.status === "SENT" && est.availableActions?.some((a: any) => a.code === "approve_estimate");
        const actions = (o.availableActions ?? []).filter((a: any) => !["approve_estimate", "partial_approve", "reject_estimate", "ask_question"].includes(a.code));
        const done = ["COMPLETED", "CLOSED"].includes(o.status);
        const canPay = actions.some((a: any) => a.code === "pay_online");
        const tabs = [
          { id: "progress", label: t("acc.orders.progress") },
          ...(est ? [{ id: "estimate", label: t("acc.estimate.title"), badge: canDecide ? "!" : null }] : []),
          { id: "payment", label: t("acc.orders.payment") },
          { id: "details", label: t("acc.orders.details") },
          { id: "documents", label: t("acc.orders.documents"), badge: o.documents?.length || null },
        ];
        const tab = tabs.some((x) => x.id === tabParam) ? tabParam! : canDecide ? "estimate" : "progress";
        return (
          <>
            <PageHeader
              back={back}
              title={`${o.number} · ${text(o.serviceName)}`}
              badge={<EnumBadge group="OrderStatus" code={o.status} />}
              subtitle={<span className="order-head"><span>{enumLabel("ExecutionForm", o.executionForm)}</span>{o.scheduledAt && <span>{dateTime(o.scheduledAt)}</span>}<span>{o.branchName}</span>{o.urgent && <span className="badge badge-danger">{t("acc.orders.urgent")}</span>}</span>}
              actions={
                <>
                  <ActionBar
                    actions={canPay ? actions.filter((a: any) => a.code !== "pay_online") : actions}
                    maxInline={2}
                    run={(a, extra) => run(a, extra)}
                    custom={{
                      reschedule: (a) => setReschedule(a),
                    }}
                  />
                </>
              }
            />
            {o.needsReschedule && <div className="kit-note warning mb-4">{t("acc.orders.needsReschedule")}</div>}
            {canDecide ? (
              <div className="next-step">
                <FileText size={22} aria-hidden />
                <div><strong>{t("acc.orders.nextEstimate")}</strong><p>{t("acc.orders.nextEstimateText")}</p></div>
                {tab !== "estimate" && <button type="button" className="btn primary" onClick={() => setTab("estimate")}>{t("acc.orders.openEstimate")}</button>}
              </div>
            ) : canPay ? (
              <div className="next-step">
                <CreditCard size={22} aria-hidden />
                <div><strong>{t("acc.orders.nextPay", { amount: money(o.dueAmount) })}</strong><p>{t("acc.orders.nextPayText")}</p></div>
                <button type="button" className="btn primary" onClick={() => payOnline("SERVICE", o.id)}>{t("actions.pay_online")}</button>
              </div>
            ) : done && o.technicianId ? (
              <div className="next-step calm">
                <Star size={22} aria-hidden />
                <div><strong>{t("acc.orders.nextReview")}</strong></div>
                <button type="button" className="btn outline" onClick={() => setReview(true)}>{t("acc.orders.rate")}</button>
              </div>
            ) : null}
            <div className="order-summary">
              <div><small>{t("acc.orders.progress")}</small><strong>{t("acc.orders.progressHint", { pct: o.progress })}</strong><Progress value={o.progress} /></div>
              <div><small>{t("acc.orders.scheduled")}</small><strong>{o.scheduledAt ? dateTime(o.scheduledAt) : t("acc.orders.notScheduled")}</strong></div>
              <div><small>{t("acc.orders.technician")}</small><strong>{o.technicianName ?? t("acc.orders.notAssigned")}</strong>{o.technicianPhoneVisible && o.technicianPhone && <a href={`tel:${o.technicianPhone}`} className="text-brand text-sm">{o.technicianPhone}</a>}</div>
              <div><small>{t("acc.orders.due")}</small><strong>{money(o.dueAmount)}</strong><EnumBadge group="PaymentStatus" code={o.paymentStatus} /></div>
            </div>
            <Tabs value={tab} onChange={setTab} tabs={tabs} />
            <div className="mt-4">
              {tab === "progress" && (
                <div className="kit-split">
                  <Card title={t("acc.orders.progress")} subtitle={t("acc.orders.progressHint", { pct: o.progress })}>
                    <StageTimeline stages={o.stages} mode="customer" />
                  </Card>
                  <Card title={t("acc.orders.history")}><HistoryList items={o.history} /></Card>
                </div>
              )}
              {tab === "estimate" && est && (
                <Card id="estimate" title={t("acc.estimate.title")} subtitle={canDecide ? t("acc.estimate.decideHint") : undefined}>
                  <EstimateView estimate={est} declined={canDecide ? declined : undefined} onToggleDecline={canDecide && est.lines.some((l: any) => l.optional) ? (lineId) => setDeclined((d) => (d.includes(lineId) ? d.filter((x) => x !== lineId) : [...d, lineId])) : undefined} />
                  {canDecide && (
                    <div className="kit-actionbar mt-4">
                      <button type="button" className="btn primary" disabled={busy} onClick={() => decide(declined.length ? "PARTIAL" : "APPROVE")}>{declined.length ? t("actions.partial_approve") : t("actions.approve_estimate")}</button>
                      <button type="button" className="btn outline" disabled={busy} onClick={() => setDecision("QUESTION")}>{t("actions.ask_question")}</button>
                      <button type="button" className="btn outline danger-outline" disabled={busy} onClick={() => setDecision("REJECT")}>{t("actions.reject_estimate")}</button>
                    </div>
                  )}
                  {est.decidedAt && <p className="text-sm text-muted mt-3">{t("acc.estimate.decided", { at: dateTime(est.decidedAt), channel: enumLabel("DecisionChannel", est.decisionChannel) })}{est.rejectReason ? ` — ${est.rejectReason}` : ""}</p>}
                </Card>
              )}
              {tab === "payment" && (
                <Card title={t("acc.orders.payment")}>
                  <KeyValue cols={3} items={[[t("acc.orders.paymentStatus"), <EnumBadge key="ps" group="PaymentStatus" code={o.paymentStatus} />], [t("acc.orders.paid"), money(o.paidAmount)], [t("acc.orders.due"), <strong key="due">{money(o.dueAmount)}</strong>]]} />
                  {o.fees?.length > 0 && (
                    <ul className="kit-list mt-2">
                      {o.fees.map((f: any, i: number) => <li key={i}><span className="grow">{text(f.label)}</span><span className={cn(f.waived && "text-muted")}>{f.waived ? t("acc.orders.waived") : money(f.amount)}</span></li>)}
                    </ul>
                  )}
                  {o.payments?.length > 0 && (
                    <ul className="kit-list mt-2">
                      {o.payments.map((p: any) => <li key={p.id}><span className="grow">{p.number}<small className="block text-muted">{enumLabel("PaymentMethod", p.method)} · {date(p.createdAt)}</small></span><strong>{money(p.amount)}</strong><EnumBadge group="PaymentStatus" code={p.status} /></li>)}
                    </ul>
                  )}
                </Card>
              )}
              {tab === "details" && (
                <div className="kit-split">
                  <Card title={t("acc.orders.details")}>
                    <KeyValue
                      cols={1}
                      items={[
                        [t("acc.orders.device"), o.device ? <Link key="d" to={o.device.deviceId ? `/account/devices/${o.device.deviceId}` : "#"} className="text-brand">{o.device.modelName}</Link> : null],
                        [t("acc.orders.problem"), o.problem ? `${text(o.problem.label) || ""} ${o.problem.description ? `— ${o.problem.description}` : ""}` : null],
                        [t("acc.orders.address"), o.address ? [o.address.city, o.address.street, o.address.apartment].filter(Boolean).join(", ") : enumLabel("ExecutionForm", o.executionForm)],
                        [t("acc.orders.technician"), o.technicianName ? o.technicianName : o.preferredTechnicianName ? t("acc.orders.preferred", { name: o.preferredTechnicianName }) : t("acc.orders.notAssigned")],
                        [t("acc.orders.contact"), enumLabel("ContactChannel", o.contactChannel)],
                        [t("acc.orders.createdAt"), dateTime(o.createdAt)],
                        [t("acc.orders.warranty"), o.warrantyNumber],
                      ]}
                    />
                    {o.attachments?.length > 0 && <div className="photo-grid mt-3">{o.attachments.map((a: any) => <div key={a.id}>{a.name}</div>)}</div>}
                    {o.cancellationTerms && <p className="kit-note text-sm mt-3">{o.cancellationTerms}</p>}
                    {o.cancelReason && <p className="kit-note danger text-sm mt-3">{t("acc.orders.cancelReason")}: {o.cancelReason}</p>}
                  </Card>
                  <div className="kit-stack">
                    {o.materials?.length > 0 && (
                      <Card title={t("acc.orders.materials")}>
                        <ul className="kit-list">
                          {o.materials.map((m: any) => <li key={m.id}><span className="grow">{text(m.name)} <small className="text-muted">{m.sku}</small></span><span>{m.quantity} {m.unit}</span>{m.ownMaterial && <span className="badge badge-info">{t("estimate.ownMaterial")}</span>}</li>)}
                        </ul>
                      </Card>
                    )}
                    {(logistics.data?.length ?? 0) > 0 && (
                      <Card title={t("acc.orders.logistics")}>
                        <ul className="kit-list">
                          {logistics.data!.map((l) => <li key={l.id}><span className="grow">{enumLabel("LogisticsType", l.type)}<small className="block text-muted">{l.windowStart ? `${dateTime(l.windowStart)}` : ""}{l.assigneeName ? ` · ${l.assigneeName}` : ""}</small></span><EnumBadge group="LogisticsStatus" code={l.status} /></li>)}
                        </ul>
                      </Card>
                    )}
                  </div>
                </div>
              )}
              {tab === "documents" && <Card title={t("acc.orders.documents")}><DocumentsList docs={o.documents} /></Card>}
            </div>
            {decision === "REJECT" && <ReasonDialog open category="ESTIMATE_REJECT" title={t("actions.reject_estimate")} busy={busy} onClose={() => setDecision(null)} onSubmit={(reasonCode, note) => decide("REJECT", { reasonCode, comment: note })} extra={est?.applicableFees?.length ? <div className="kit-note warning text-sm mb-3">{est.applicableFees.map((f: any) => f.label).join("; ")}</div> : null} />}
            {decision === "QUESTION" && <QuestionDialog busy={busy} onClose={() => setDecision(null)} onSubmit={(comment) => decide("QUESTION", { comment })} />}
            {reschedule && <RescheduleDialog order={o} action={reschedule} onClose={() => setReschedule(null)} onSubmit={(extra) => run(reschedule, extra)} />}
            {review && <ReviewDialog target="TECHNICIAN" targetId={o.technicianId} orderId={o.id} title={t("acc.orders.rateTech", { name: o.technicianName })} onClose={() => setReview(false)} />}
          </>
        );
      }}
    </QueryView>
  );
}

function QuestionDialog({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (comment: string) => void; busy: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  return (
    <Dialog open onClose={onClose} title={t("actions.ask_question")} size="sm" footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || text.trim().length < 3} onClick={() => onSubmit(text)}>{t("common.send")}</button></>}>
      <TextArea label={t("acc.estimate.question")} value={text} onValue={setText} rows={4} />
    </Dialog>
  );
}

/** Vaxt dəyişmə: səbəb + yeni slot (§16, §18.4). */
export function RescheduleDialog({ order, action, onClose, onSubmit }: { order: any; action: any; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => Promise<unknown> }) {
  const { t, text } = useI18n();
  const slots = useApi<any[]>(`/services/${order.serviceId}/slots${qs({ addressId: order.address?.id, days: 7, executionForm: order.executionForm })}`);
  const reasons = useApi<any[]>(`/reason-codes?category=${action.reasonCategory ?? "RESCHEDULE"}`);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t("actions.reschedule")}
      footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!reason || busy} onClick={async () => { setBusy(true); setError(null); try { await onSubmit({ reasonCode: reason, note, scheduledAt: slot ?? undefined }); toast.success(t("actions.done", { action: t("actions.reschedule") })); onClose(); } catch (e) { setError(e); } finally { setBusy(false); } }}>{t("common.confirm")}</button></>}
    >
      <FormError error={error} />
      <SelectField label={t("common.reason")} required value={reason} onValue={setReason} placeholder={t("common.choose")} options={(reasons.data ?? []).map((r) => ({ value: r.code, label: text(r.label) }))} />
      <p className="form-label mb-2">{t("acc.orders.newTime")}</p>
      {slots.isLoading ? <Loading rows={3} /> : <SlotPicker days={slots.data ?? []} value={slot} onChange={setSlot} />}
      <div className="mt-3"><TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} /></div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Məhsul sifarişləri və qaytarma (§37–38)                              */
/* ------------------------------------------------------------------ */

export function SalesOrdersPage({ base = "/account/orders" }: { base?: string }) {
  const { t, date, money, enumLabel } = useI18n();
  return (
    <>
      <PageHeader title={t("acc.orders.salesTitle")} actions={<Link to="/shop" className="btn outline"><ShoppingBag size={16} /> {t("nav.shop")}</Link>} />
      <ResourceTable
        path="/account/orders"
        rowTo={(r: any) => `${base}/${r.id}`}
        filters={[{ key: "status", label: t("common.status"), options: ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "RETURN_REQUESTED"].map((s) => ({ value: s, label: enumLabel("SalesOrderStatus", s) })) }]}
        columns={[
          { key: "number", header: t("fields.number"), render: (r: any) => <strong>{r.number}</strong>, sortKey: "number" },
          { key: "createdAt", header: t("common.date"), render: (r: any) => date(r.createdAt), sortKey: "createdAt" },
          { key: "itemCount", header: t("acc.orders.items"), hideOnMobile: true },
          { key: "deliveryMethod", header: t("acc.orders.delivery"), render: (r: any) => enumLabel("DeliveryMethod", r.deliveryMethod), hideOnMobile: true },
          { key: "total", header: t("common.total"), render: (r: any) => money(r.total), className: "num", sortKey: "total" },
          { key: "paymentStatus", header: t("acc.orders.paymentStatus"), render: (r: any) => <EnumBadge group="PaymentStatus" code={r.paymentStatus} />, hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="SalesOrderStatus" code={r.status} /> },
        ]}
      />
    </>
  );
}

export function SalesOrderDetailPage({ id, back = "/account/orders" }: { id: string; back?: string }) {
  const { t, money, dateTime, enumLabel, text, qty } = useI18n();
  const q = useApi<any>(`/account/orders/${id}`);
  const { navigate } = useRouter();
  const payOnline = usePayOnline();
  const refresh = useRefresh();
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  return (
    <QueryView query={q} rows={8}>
      {(o) => (
        <>
          <PageHeader
            back={back}
            title={o.number}
            badge={<EnumBadge group="SalesOrderStatus" code={o.status} />}
            subtitle={dateTime(o.createdAt)}
            actions={
              <>
                {o.status === "PENDING_PAYMENT" && o.paymentMethod === "CARD_ONLINE" && <button type="button" className="btn primary" onClick={() => payOnline("SALES", o.id)}>{t("actions.pay")}</button>}
                {["DELIVERED", "COMPLETED"].includes(o.status) && o.lines.some((l: any) => l.returnable) && <button type="button" className="btn outline" onClick={() => setReturning(true)}>{t("actions.request_return")}</button>}
                <button type="button" className="btn outline" onClick={async () => { try { await post(`/sales-orders/${o.id}/reorder`); await refresh(); toast.success(t("cart.added")); navigate("/cart"); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{t("actions.reorder")}</button>
                {["PENDING_PAYMENT", "CONFIRMED"].includes(o.status) && <button type="button" className="btn ghost text-danger" onClick={() => setCancelling(true)}>{t("common.cancel")}</button>}
              </>
            }
          />
          {o.trackingNote && <div className="kit-note info mb-4">{o.trackingNote}</div>}
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("acc.orders.items")} flush>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t("docs.item")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("estimate.unitPrice")}</th><th className="num">{t("common.total")}</th></tr></thead>
                    <tbody>
                      {o.lines.map((l: any) => (
                        <tr key={l.id}>
                          <td><div className="entity-row"><ProductVisual kind={l.imageUrl} tone={l.imageTone} size="sm" /><span><Link to={`/product/${l.slug}`}><strong>{text(l.name)}</strong></Link><small>{l.sku}{l.returnedQuantity ? ` · ${t("acc.orders.returned", { qty: l.returnedQuantity })}` : ""}</small></span></div></td>
                          <td className="num">{qty(l.quantity)}</td>
                          <td className="num">{money(l.unitPrice)}</td>
                          <td className="num">{money(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="kit-card-body">
                  <dl className="kit-totals">
                    <div><dt>{t("estimate.subtotal")}</dt><dd>{money(o.subtotal)}</dd></div>
                    {Number(o.discountTotal.amount) > 0 && <div className="text-success"><dt>{t("cart.discount")}</dt><dd>−{money(o.discountTotal)}</dd></div>}
                    {Number(o.deliveryTotal.amount) > 0 && <div><dt>{t("checkout.deliveryFee")}</dt><dd>{money(o.deliveryTotal)}</dd></div>}
                    {Number(o.installationTotal.amount) > 0 && <div><dt>{t("cart.installation")}</dt><dd>{money(o.installationTotal)}</dd></div>}
                    <div className="text-muted"><dt>{o.vatIncluded ? t("estimate.vatIncluded") : t("docs.vatTotal")}</dt><dd>{money(o.vatTotal)}</dd></div>
                    <div className="grand"><dt>{t("common.total")}</dt><dd>{money(o.total)}</dd></div>
                  </dl>
                </div>
              </Card>
              <Card title={t("acc.orders.history")}><HistoryList items={o.history} /></Card>
            </div>
            <div className="kit-stack">
              <Card title={t("acc.orders.details")}>
                <KeyValue cols={1} items={[[t("acc.orders.delivery"), enumLabel("DeliveryMethod", o.deliveryMethod)], [t("acc.orders.address"), o.address ? `${o.address.city}, ${o.address.street}` : o.pickupBranchName], [t("acc.orders.paymentMethod"), enumLabel("PaymentMethod", o.paymentMethod)], [t("acc.orders.paymentStatus"), <EnumBadge key="p" group="PaymentStatus" code={o.paymentStatus} />], [t("acc.orders.serviceOrder"), o.serviceOrderId ? <Link key="s" to={`/account/services/${o.serviceOrderId}`} className="text-brand">{o.serviceOrderNumber}</Link> : null]]} />
              </Card>
              <Card title={t("acc.orders.documents")}><DocumentsList docs={o.documents} /></Card>
            </div>
          </div>
          {returning && <ReturnDialog order={o} onClose={() => setReturning(false)} />}
          {cancelling && <ReasonDialog open category="CANCELLED" title={t("acc.orders.cancelOrder")} onClose={() => setCancelling(false)} onSubmit={async (reasonCode, note) => { try { await post(`/sales-orders/${o.id}/cancel`, { reasonCode, note }); await refresh(); toast.success(t("acc.orders.cancelled")); setCancelling(false); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }} />}
        </>
      )}
    </QueryView>
  );
}

function ReturnDialog({ order, onClose }: { order: any; onClose: () => void }) {
  const { t, text, unit } = useI18n();
  const refresh = useRefresh();
  const lines = order.lines.filter((l: any) => l.returnable);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await post("/account/returns", { salesOrderId: order.id, lines: Object.entries(picked).map(([lineId, quantity]) => ({ lineId, quantity })), reason, comment, photos: photos.map((p) => ({ name: p.name })) });
      await refresh();
      toast.success(t("acc.returns.created"));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={t("actions.request_return")} size="lg" footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy || !Object.keys(picked).length || reason.length < 3} onClick={submit}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{t("acc.returns.hint")}</p>
      <ul className="kit-list">
        {lines.map((l: any) => (
          <li key={l.id}>
            <Check label={text(l.name)} checked={picked[l.id] !== undefined} onValue={(v) => setPicked((p) => { const n = { ...p }; if (v) n[l.id] = l.quantity.value; else delete n[l.id]; return n; })} />
            {picked[l.id] !== undefined && <QuantityInput value={picked[l.id]!} onValue={(v) => setPicked((p) => ({ ...p, [l.id]: String(Math.min(Number(v), Number(l.quantity.value))) }))} unit={l.quantity.unit} />}
            <small className="text-muted">{l.quantity.value} {unit(l.quantity.unit)}</small>
          </li>
        ))}
      </ul>
      <SelectField label={t("common.reason")} required value={reason} onValue={setReason} placeholder={t("common.choose")} options={["defective", "wrongItem", "notAsDescribed", "changedMind"].map((k) => ({ value: t(`acc.returns.reasons.${k}`), label: t(`acc.returns.reasons.${k}`) }))} />
      <TextArea label={t("common.comment")} value={comment} onValue={setComment} rows={2} />
      <FileDrop files={photos} onChange={setPhotos} accept="image/*" max={5} label={t("acc.returns.photos")} />
    </Dialog>
  );
}

export function ReturnsPage() {
  const { t, date, money, qty, text, enumLabel } = useI18n();
  const q = useApi<any>("/account/returns");
  return (
    <>
      <PageHeader title={t("acc.returns.title")} subtitle={t("acc.returns.subtitle")} />
      <QueryView query={q} empty={<EmptyState title={t("acc.returns.empty")} text={t("acc.returns.emptyText")} />}>
        {(d) => (
          <div className="kit-stack">
            {d.items.map((r: any) => (
              <Card key={r.id} title={`${r.number} · ${r.salesOrderNumber}`} actions={<EnumBadge group="ReturnStatus" code={r.status} />}>
                <ul className="kit-list">
                  {r.lines.map((l: any, i: number) => <li key={i}><span className="grow">{text(l.name)}</span><span>{qty(l.quantity)}</span></li>)}
                </ul>
                <KeyValue cols={3} items={[[t("common.reason"), r.reason], [t("acc.returns.inspection"), r.inspectionResult ? enumLabel("InspectionResult", r.inspectionResult) : null], [t("acc.returns.refund"), r.refundAmount ? money(r.refundAmount) : null], [t("common.date"), date(r.createdAt)]]} />
                <details className="mt-3"><summary className="text-sm">{t("acc.orders.history")}</summary><HistoryList items={r.history} /></details>
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Abunəlik (§41–43)                                                    */
/* ------------------------------------------------------------------ */

export function SubscriptionPage() {
  const { t, date, money, text, enumLabel } = useI18n();
  const q = useApi<any>("/account/subscription");
  const refresh = useRefresh();
  const { navigate } = useRouter();
  const [period, setPeriod] = useState("MONTH_12");
  const [pending, setPending] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const change = async (plan: any) => {
    setBusy(plan.code);
    try {
      const r = await post("/account/subscription/change", { planId: plan.id, period });
      await refresh();
      if (r.status === "PAYMENT_REQUIRED") navigate(r.redirectUrl);
      else if (r.status === "SCHEDULED") toast.success(t("acc.sub.scheduled", { date: date(r.effectiveAt) }));
      else toast.success(t("acc.sub.changed"));
      setPending(null);
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHeader title={t("acc.sub.title")} subtitle={t("acc.sub.subtitle")} />
      <QueryView query={q} rows={8}>
        {(d) => {
          const s = d.subscription;
          const defs = Object.fromEntries(d.entitlementDefinitions.map((x: any) => [x.code, text(x.label)]));
          return (
            <>
              {d.staffLicense && <div className="kit-note info mb-4">{t("acc.sub.staffLicense", { branch: d.staffLicense.branchName, by: d.staffLicense.issuedBy })}</div>}
              <Grid cols={2}>
                <Card title={t("acc.sub.current")} actions={s && <EnumBadge group="SubscriptionStatus" code={s.status} />}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <strong className="text-2xl">{d.plan ? text(d.plan.name) : "Basic"}</strong>
                    {s && Number(s.price.amount) > 0 && <span className="text-muted">{money(s.price)} / {enumLabel("BillingPeriod", s.period)}</span>}
                  </div>
                  {s && (
                    <>
                      <KeyValue cols={2} items={[[t("acc.sub.startedAt"), date(s.startedAt)], [t("acc.sub.periodEnd"), date(s.currentPeriodEnd)], [t("acc.sub.pending"), s.pendingPlanCode], [t("acc.sub.grace"), s.graceUntil ? date(s.graceUntil) : null]]} />
                      {s.cancelAtPeriodEnd && <p className="kit-note warning text-sm mt-3">{t("acc.sub.cancelScheduled", { date: date(s.currentPeriodEnd) })}</p>}
                      {s.status === "PAST_DUE" && <p className="kit-note danger text-sm mt-3">{t("acc.sub.pastDue")}</p>}
                      <div className="flex gap-2 flex-wrap mt-4 items-center">
                        <Toggle label={t("acc.sub.autoRenew")} checked={s.autoRenew} onValue={async (v) => { await patch("/account/subscription", { autoRenew: v }); await refresh(); }} />
                        {s.cancelAtPeriodEnd || s.pendingPlanCode ? (
                          <button type="button" className="btn outline btn-sm" onClick={async () => { await post("/account/subscription/resume"); await refresh(); toast.success(t("acc.sub.resumed")); }}>{t("acc.sub.resume")}</button>
                        ) : d.plan?.tier > 0 && !d.staffLicense ? (
                          <button type="button" className="btn ghost btn-sm text-danger" onClick={() => setConfirmCancel(true)}>{t("acc.sub.cancel")}</button>
                        ) : null}
                      </div>
                    </>
                  )}
                </Card>
                <Card title={t("acc.sub.usage")}>
                  {s?.usage?.length ? s.usage.map((u: any) => <UsageBar key={u.code} label={defs[u.code] ?? u.code} used={u.used} limit={u.limit} />) : <EmptyState />}
                </Card>
              </Grid>
              {!d.staffLicense && (
                <Card title={t("acc.sub.compare")} actions={<div className="kit-segment" role="group" aria-label={t("acc.sub.period")}>{["MONTH_1", "MONTH_3", "MONTH_6", "MONTH_12"].map((p) => <button key={p} type="button" className={cn(period === p && "active")} onClick={() => setPeriod(p)}>{enumLabel("BillingPeriod", p)}</button>)}</div>}>
                  <PlanComparison plans={d.plans} definitions={d.entitlementDefinitions} period={period} currentCode={d.plan?.code} busyCode={busy} onSelect={(p) => setPending(p)} />
                </Card>
              )}
              {d.payments.length > 0 && (
                <Card title={t("acc.sub.payments")} className="mt-6">
                  <ul className="kit-list">{d.payments.map((p: any) => <li key={p.id}><span className="grow">{p.number}<small className="block text-muted">{date(p.createdAt)}</small></span><strong>{money(p.amount)}</strong><EnumBadge group="PaymentStatus" code={p.status} /></li>)}</ul>
                </Card>
              )}
              {pending && (
                <ConfirmDialog
                  open
                  busy={!!busy}
                  title={t("acc.sub.confirmTitle", { plan: text(pending.name) })}
                  text={pending.tier > (d.plan?.tier ?? 0) ? t("acc.sub.upgradeText", { price: money((pending.prices.find((x: any) => x.period === period) ?? pending.prices[0]).price) }) : t("acc.sub.downgradeText", { date: date(s?.currentPeriodEnd) })}
                  onClose={() => setPending(null)}
                  onConfirm={() => change(pending)}
                />
              )}
              <ConfirmDialog open={confirmCancel} danger title={t("acc.sub.cancel")} text={t("acc.sub.cancelText", { date: date(s?.currentPeriodEnd) })} onClose={() => setConfirmCancel(false)} onConfirm={async () => { await post("/account/subscription/cancel"); await refresh(); setConfirmCancel(false); toast.success(t("acc.sub.cancelDone")); }} />
            </>
          );
        }}
      </QueryView>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ödənişlər, zəmanətlər, sənədlər                                      */
/* ------------------------------------------------------------------ */

export function PaymentsPage({ path = "/account/payments" }: { path?: string }) {
  const { t, dateTime, money, enumLabel } = useI18n();
  const [doc, setDoc] = useState<string | null>(null);
  return (
    <>
      <PageHeader title={t("acc.payments.title")} subtitle={t("acc.payments.subtitle")} />
      <ResourceTable
        path={path}
        filters={[
          { key: "status", label: t("common.status"), options: ["PAID", "INITIATED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"].map((s) => ({ value: s, label: enumLabel("PaymentStatus", s) })) },
          { key: "method", label: t("acc.orders.paymentMethod"), options: ["CARD_ONLINE", "CASH", "CARD_POS", "BANK_TRANSFER", "INSTALLMENT"].map((s) => ({ value: s, label: enumLabel("PaymentMethod", s) })) },
        ]}
        columns={[
          { key: "number", header: t("fields.number"), render: (r: any) => <strong>{r.number}</strong> },
          { key: "createdAt", header: t("common.date"), render: (r: any) => dateTime(r.createdAt), sortKey: "createdAt" },
          { key: "orderNumber", header: t("acc.payments.order"), render: (r: any) => <span>{r.orderNumber}<small className="block">{enumLabel("OrderKind", r.orderType)}</small></span> },
          { key: "method", header: t("acc.orders.paymentMethod"), render: (r: any) => <span>{enumLabel("PaymentMethod", r.method)}{r.provider ? <small className="block">{r.provider}</small> : null}</span>, hideOnMobile: true },
          { key: "amount", header: t("common.total"), render: (r: any) => <span>{money(r.amount)}{Number(r.refundedAmount?.amount) > 0 && <small className="block text-danger">−{money(r.refundedAmount)}</small>}</span>, className: "num", sortKey: "amount" },
          { key: "fiscalNumber", header: t("acc.payments.fiscal"), render: (r: any) => r.fiscalNumber ?? "—", hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (r: any) => <span><EnumBadge group="PaymentStatus" code={r.status} />{r.failureReason && <small className="block text-danger">{r.failureReason}</small>}</span> },
        ]}
      />
      {doc && <DocumentDialog id={doc} onClose={() => setDoc(null)} />}
    </>
  );
}

function WarrantyTable({ items, onClaim }: { items: any[]; onClaim?: (w: any) => void }) {
  const { t, date, enumLabel } = useI18n();
  if (!items.length) return <EmptyState icon={ShieldCheck} />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t("fields.number")}</th><th>{t("acc.warranty.device")}</th><th>{t("acc.warranty.type")}</th><th>{t("acc.warranty.period")}</th><th>{t("common.status")}</th>{onClaim && <th />}</tr></thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id}>
              <td><strong>{w.number}</strong><small className="block">{w.code}</small></td>
              <td>{w.deviceName}<small className="block">{w.coverage}</small></td>
              <td>{enumLabel("WarrantyType", w.type)}</td>
              <td>{date(w.startsAt)} — {date(w.endsAt)}</td>
              <td><EnumBadge group="WarrantyStatus" code={w.status} /></td>
              {onClaim && <td>{w.canClaim && <button type="button" className="btn outline btn-sm" onClick={() => onClaim(w)}>{t("acc.warranty.claim")}</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WarrantiesPage() {
  const { t, date } = useI18n();
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "warranties";
  const w = useApi<any>("/account/warranties?pageSize=100");
  const claims = useApi<any[]>("/account/warranty-claims");
  const [claim, setClaim] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("acc.warranty.title")} subtitle={t("acc.warranty.subtitle")} actions={<Link to="/warranty/verify" className="btn outline"><QrCode size={16} /> {t("acc.warranty.verify")}</Link>} />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "warranties", label: t("acc.warranty.list"), badge: w.data?.meta?.total }, { id: "claims", label: t("acc.warranty.claims"), badge: claims.data?.length }]} />
      {tab === "warranties" ? (
        <Card flush><QueryView query={w}>{(d) => <WarrantyTable items={d.items} onClaim={setClaim} />}</QueryView></Card>
      ) : (
        <QueryView query={claims} empty={<EmptyState title={t("acc.warranty.noClaims")} />}>
          {(list) => (
            <div className="kit-stack">
              {list.map((c) => (
                <Card key={c.id} title={`${c.number} · ${c.warrantyNumber}`} actions={<EnumBadge group="ClaimStatus" code={c.status} />}>
                  <p>{c.description}</p>
                  {c.decisionNote && <p className="kit-note text-sm mt-2">{c.decisionNote}</p>}
                  <p className="text-sm text-muted mt-2">{date(c.createdAt)}{c.serviceOrderId && <> · <Link to={`/account/services/${c.serviceOrderId}`} className="text-brand">{c.serviceOrderNumber}</Link></>}</p>
                </Card>
              ))}
            </div>
          )}
        </QueryView>
      )}
      {claim && <ClaimDialog warranty={claim} onClose={() => setClaim(null)} onDone={() => setQuery({ tab: "claims" })} />}
    </>
  );
}

function ClaimDialog({ warranty, onClose, onDone }: { warranty: any; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={t("acc.warranty.claimTitle", { number: warranty.number })} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={async () => { setBusy(true); setError(null); try { await post("/account/warranty-claims", { warrantyId: warranty.id, description }); await refresh(); toast.success(t("acc.warranty.claimSent")); onDone(); onClose(); } catch (e) { setError(e); } finally { setBusy(false); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{warranty.deviceName} · {warranty.coverage}</p>
      <TextArea label={t("acc.warranty.problem")} required value={description} onValue={setDescription} rows={4} hint={t("acc.warranty.problemHint")} />
      <FileDrop files={photos} onChange={setPhotos} max={5} />
    </Dialog>
  );
}

export function DocumentsPage({ path = "/account/documents", title }: { path?: string; title?: string }) {
  const { t, date, money, enumLabel } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader title={title ?? t("acc.docs.title")} subtitle={t("acc.docs.subtitle")} />
      <ResourceTable
        path={path}
        filters={[{ key: "type", label: t("acc.docs.type"), options: ["INVOICE", "RECEIPT", "SERVICE_ACT", "INTAKE_ACT", "WARRANTY", "E_INVOICE", "CONTRACT", "RECONCILIATION_ACT", "CREDIT_NOTE"].map((s) => ({ value: s, label: enumLabel("DocumentType", s) })) }]}
        columns={[
          { key: "type", header: t("acc.docs.type"), render: (r: any) => <span className="entity-row"><FileText size={16} className="text-muted" />{enumLabel("DocumentType", r.type)}</span> },
          { key: "number", header: t("fields.number"), render: (r: any) => <strong>{r.number}</strong> },
          { key: "issuedAt", header: t("common.date"), render: (r: any) => date(r.issuedAt), sortKey: "issuedAt" },
          { key: "orderNumber", header: t("acc.payments.order"), render: (r: any) => r.orderNumber ?? "—", hideOnMobile: true },
          { key: "total", header: t("common.total"), render: (r: any) => money(r.total), className: "num", hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="DocumentStatus" code={r.status} /> },
          { key: "view", header: "", render: (r: any) => <button type="button" className="btn outline btn-sm" onClick={() => setOpen(r.id)}>{t("common.view")}</button> },
        ]}
      />
      {open && <DocumentDialog id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Seçilmişlər, bildirişlər, rəylər                                     */
/* ------------------------------------------------------------------ */

export function FavoritesPage() {
  const { t } = useI18n();
  const q = useApi<any>("/favorites?pageSize=100");
  return (
    <>
      <PageHeader title={t("acc.favorites.title")} />
      <QueryView query={q} empty={<EmptyState icon={Heart} title={t("acc.favorites.empty")} action={<Link to="/shop" className="btn primary">{t("nav.shop")}</Link>} />}>
        {(d) => <div className="shop-grid">{d.items.map((p: any) => <ProductTile key={p.id} p={p} />)}</div>}
      </QueryView>
    </>
  );
}

const PREF_GROUPS = ["ORDER_STATUS", "ESTIMATE", "PAYMENT", "REMINDERS", "MARKETING"];
const CHANNELS = ["IN_APP", "PUSH", "EMAIL", "SMS", "WHATSAPP"];

export function NotificationsPage() {
  const { t, relative } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const tab = query.get("tab") ?? "all";
  const page = Number(query.get("page") ?? 1);
  const q = useApi<any>(`/notifications${qs({ page, pageSize: 20, read: tab === "unread" ? "false" : undefined })}`);
  const refresh = useRefresh();
  return (
    <>
      <PageHeader title={t("panel.notificationsTitle")} actions={<button type="button" className="btn outline" onClick={async () => { await post("/notifications/read-all"); await refresh(); }}>{t("panel.markAllRead")}</button>} />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v, page: null })} tabs={[{ id: "all", label: t("common.all") }, { id: "unread", label: t("acc.notif.unread"), badge: q.data?.unread }, { id: "settings", label: t("acc.notif.settings") }]} />
      {tab === "settings" ? <NotificationPreferences /> : (
        <QueryView query={q} empty={<EmptyState title={t("panel.noNotifications")} />}>
          {(d) => (
            <Card flush>
              <ul className="kit-list">
                {(tab === "unread" ? d.items.filter((n: any) => !n.read) : d.items).map((n: any) => (
                  <li key={n.id} className={cn("px-4", !n.read && "bg-soft")}>
                    <button type="button" className="grow text-left" onClick={async () => { await post(`/notifications/${n.id}/read`); await refresh(); if (n.link?.startsWith("/")) navigate(n.link); }}>
                      <strong>{n.title}</strong>
                      <span className="block text-sm">{n.body}</span>
                      <small className="text-muted">{relative(n.createdAt)} · {n.channel}</small>
                    </button>
                    {!n.read && <span className="badge badge-info">{t("acc.notif.new")}</span>}
                  </li>
                ))}
              </ul>
              <div className="px-4">
                <div className="kit-pagination">
                  <span className="text-sm text-muted">{t("common.pageOf", { page: d.meta.page, pages: d.meta.totalPages, total: d.meta.total })}</span>
                  <div className="flex gap-2">
                    <button type="button" className="btn outline btn-sm" disabled={page <= 1} onClick={() => setQuery({ page: page - 1 })}>{t("common.prev")}</button>
                    <button type="button" className="btn outline btn-sm" disabled={page >= d.meta.totalPages} onClick={() => setQuery({ page: page + 1 })}>{t("common.next")}</button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </QueryView>
      )}
    </>
  );
}

function NotificationPreferences() {
  const { t, enumLabel } = useI18n();
  const q = useApi<any>("/notifications/preferences");
  const [prefs, setPrefs] = useState<any | null>(null);
  useEffect(() => { if (q.data) setPrefs(q.data); }, [q.data]);
  if (!prefs) return <Loading />;
  const toggle = (g: string, c: string, v: boolean) => setPrefs((p: any) => ({ ...p, channels: { ...p.channels, [g]: { ...p.channels[g], [c]: v } } }));
  return (
    <Card title={t("acc.notif.settings")} subtitle={t("acc.notif.settingsHint")}>
      <div className="table-wrap">
        <table className="kit-matrix">
          <thead><tr><th>{t("acc.notif.group")}</th>{CHANNELS.map((c) => <th key={c}>{enumLabel("NotificationChannel", c)}</th>)}</tr></thead>
          <tbody>
            {PREF_GROUPS.map((g) => (
              <tr key={g}>
                <td>{enumLabel("NotificationGroup", g)}</td>
                {CHANNELS.map((c) => (
                  <td key={c}><input type="checkbox" aria-label={`${enumLabel("NotificationGroup", g)} — ${enumLabel("NotificationChannel", c)}`} checked={!!prefs.channels?.[g]?.[c]} disabled={c === "IN_APP" && g !== "MARKETING"} onChange={(e) => toggle(g, c, e.target.checked)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-2">
        <Toggle label={t("acc.notif.marketing")} checked={prefs.marketingConsent} onValue={(v) => setPrefs({ ...prefs, marketingConsent: v })} />
        <Toggle label={t("acc.notif.quiet")} checked={prefs.quietHours.enabled} onValue={(v) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: v } })} />
        {prefs.quietHours.enabled && (
          <div className="flex gap-3 flex-wrap">
            <TextField label={t("acc.notif.from")} type="time" value={prefs.quietHours.from} onValue={(v) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, from: v } })} />
            <TextField label={t("acc.notif.to")} type="time" value={prefs.quietHours.to} onValue={(v) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, to: v } })} />
          </div>
        )}
      </div>
      <button type="button" className="btn primary mt-4" onClick={async () => { await put("/notifications/preferences", prefs); toast.success(t("common.saved")); }}>{t("common.save")}</button>
    </Card>
  );
}

export function MyReviewsPage() {
  const { t, date, enumLabel } = useI18n();
  const q = useApi<any>("/account/reviews");
  const [writing, setWriting] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("acc.reviews.title")} subtitle={t("acc.reviews.subtitle")} />
      <QueryView query={q} isEmpty={(d) => !d.mine.length && !d.pending.length}>
        {(d) => (
          <>
            {d.pending.length > 0 && (
              <Card title={t("acc.reviews.pending")} className="mb-6">
                <ul className="kit-list">
                  {d.pending.map((p: any) => (
                    <li key={p.orderId}>
                      <span className="grow"><strong>{p.targetName}</strong><small className="block text-muted">{p.orderNumber} · {date(p.completedAt)}</small></span>
                      <button type="button" className="btn primary btn-sm" onClick={() => setWriting(p)}><Star size={14} /> {t("acc.reviews.write")}</button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <div className="kit-reviews">
              {d.mine.map((r: any) => (
                <article key={r.id}>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <strong>{r.targetName} <small className="text-muted">· {enumLabel("ReviewTarget", r.target)}{r.orderNumber ? ` · ${r.orderNumber}` : ""}</small></strong>
                    <span className="flex gap-2 items-center"><Stars value={r.rating} /><EnumBadge group="ReviewStatus" code={r.status} /></span>
                  </div>
                  <p className="mt-2">{r.comment}</p>
                  {Object.keys(r.criteria ?? {}).length > 0 && <small className="text-muted">{Object.entries(r.criteria).map(([k, v]) => `${t(`reviews.${k}`)}: ${v}`).join(" · ")}</small>}
                  {r.reply && <p className="kit-note text-sm mt-2"><strong>{t("acc.reviews.reply")}:</strong> {r.reply}</p>}
                  <small className="block text-muted mt-1">{date(r.createdAt)}</small>
                </article>
              ))}
            </div>
          </>
        )}
      </QueryView>
      {writing && <ReviewDialog target={writing.target} targetId={writing.targetId} orderId={writing.orderId} title={t("acc.orders.rateTech", { name: writing.targetName })} onClose={() => setWriting(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ailə üzvləri (Premium) və təhlükəsizlik                               */
/* ------------------------------------------------------------------ */

export function FamilyPage() {
  const { t, date } = useI18n();
  const q = useApi<any>("/account/family");
  const devices = useApi<any>("/account/devices");
  const refresh = useRefresh();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title={t("acc.family.title")} subtitle={t("acc.family.subtitle")} actions={q.data?.allowed && <button type="button" className="btn primary" disabled={q.data.items.length >= q.data.limit} onClick={() => setAdding(true)}><Plus size={16} /> {t("acc.family.invite")}</button>} />
      <QueryView query={q} isEmpty={() => false}>
        {(d) =>
          !d.allowed ? (
            <EmptyState icon={Crown} title={t("acc.family.locked")} text={t("acc.family.lockedText")} action={<Link to="/account/subscription" className="btn primary">{t("acc.dash.upgrade")}</Link>} />
          ) : !d.items.length ? (
            <EmptyState title={t("acc.family.empty")} />
          ) : (
            <Grid cols={2}>
              {d.items.map((m: any) => (
                <Card key={m.id} title={m.name} subtitle={`${m.relation} · ${m.phone}`} actions={<EnumBadge group="UserStatus" code={m.status} />}>
                  <p className="text-sm">{t("acc.family.sharedDevices", { count: m.sharedDeviceIds.length })}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{m.sharedDeviceIds.map((id: string) => { const dev = devices.data?.items.find((x: any) => x.id === id); return <span key={id} className="badge">{dev?.nickname ?? dev?.modelName ?? id.slice(0, 6)}</span>; })}</div>
                  <div className="mt-3"><Toggle label={t("acc.family.canOrder")} checked={m.canCreateOrders} onValue={async (v) => { await patch(`/account/family/${m.id}`, { canCreateOrders: v }); await refresh(); }} /></div>
                  <small className="text-muted block mt-2">{t("acc.family.invitedAt", { date: date(m.invitedAt) })}</small>
                  <button type="button" className="btn ghost btn-sm text-danger mt-2" onClick={async () => { await del(`/account/family/${m.id}`); await refresh(); toast.success(t("common.deleted")); }}>{t("common.remove")}</button>
                </Card>
              ))}
            </Grid>
          )
        }
      </QueryView>
      {adding && <FamilyDialog devices={devices.data?.items ?? []} onClose={() => setAdding(false)} />}
    </>
  );
}

function FamilyDialog({ devices, onClose }: { devices: any[]; onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const f = useFormState({ name: "", phone: "", relation: "", sharedDeviceIds: [] as string[], canCreateOrders: true });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} title={t("acc.family.invite")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/account/family", f.values); await refresh(); toast.success(t("acc.family.invited")); onClose(); } catch (e) { setError(e); f.fromError(e); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <TextField label={t("fields.fullName")} required value={f.values.name} onValue={(v) => f.set("name", v)} error={f.errors.name} />
      <PhoneField label={t("fields.phone")} required value={f.values.phone} onValue={(v) => f.set("phone", v)} error={f.errors.phone} />
      <TextField label={t("acc.family.relation")} value={f.values.relation} onValue={(v) => f.set("relation", v)} />
      <p className="form-label mb-2">{t("acc.family.devices")}</p>
      {devices.map((d) => <Check key={d.id} label={d.nickname ?? d.modelName} checked={f.values.sharedDeviceIds.includes(d.id)} onValue={(v) => f.set("sharedDeviceIds", v ? [...f.values.sharedDeviceIds, d.id] : f.values.sharedDeviceIds.filter((x) => x !== d.id))} />)}
      <Toggle label={t("acc.family.canOrder")} checked={f.values.canCreateOrders} onValue={(v) => f.set("canCreateOrders", v)} />
    </Dialog>
  );
}

export function SecurityPage() {
  const { t, relative, date } = useI18n();
  const q = useApi<any>("/account/security");
  const refresh = useRefresh();
  const [twoFa, setTwoFa] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState<unknown>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <PageHeader title={t("acc.security.title")} subtitle={t("acc.security.subtitle")} />
      <QueryView query={q} rows={6}>
        {(s) => (
          <Grid cols={2}>
            <Card title={t("acc.security.twoFactor")} actions={<span className={cn("badge", s.twoFactorEnabled ? "badge-success" : "badge-warning")}>{s.twoFactorEnabled ? t("acc.security.on") : t("acc.security.off")}</span>}>
              <p className="text-sm text-muted">{s.twoFactorRequired ? t("acc.security.required") : t("acc.security.twoFactorHint")}</p>
              {s.twoFactorEnabled ? (
                !s.twoFactorRequired && <button type="button" className="btn outline btn-sm mt-3" onClick={async () => { try { await post("/account/security/2fa", { enabled: false }); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }}>{t("acc.security.disable")}</button>
              ) : !twoFa ? (
                <button type="button" className="btn primary btn-sm mt-3" onClick={() => setTwoFa(true)}>{t("acc.security.enable")}</button>
              ) : (
                <div className="mt-3">
                  <p className="text-sm">{t("acc.security.enterCode")}</p>
                  <OtpInput value={code} onChange={setCode} autoFocus />
                  <button type="button" className="btn primary btn-sm" disabled={code.length < 6} onClick={async () => { try { await post("/account/security/2fa", { enabled: true, code }); await refresh(); setTwoFa(false); toast.success(t("acc.security.enabled")); } catch (e) { toast.error(errorText(e, t("validation.otpInvalid"))); } }}>{t("common.confirm")}</button>
                </div>
              )}
            </Card>
            <Card title={t("acc.security.password")}>
              <form onSubmit={async (e) => { e.preventDefault(); setPwError(null); if (pw.newPassword !== pw.confirm) { setPwError(new Error(t("validation.passwordMatch"))); return; } try { await post("/account/security/password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); toast.success(t("auth.passwordChanged")); setPw({ currentPassword: "", newPassword: "", confirm: "" }); } catch (err) { setPwError(err); } }}>
                <FormError error={pwError} />
                {s.loginMethods.password && <TextField label={t("acc.security.current")} type="password" autoComplete="current-password" value={pw.currentPassword} onValue={(v) => setPw({ ...pw, currentPassword: v })} />}
                <TextField label={t("acc.security.new")} type="password" autoComplete="new-password" hint={t("auth.passwordHint")} value={pw.newPassword} onValue={(v) => setPw({ ...pw, newPassword: v })} />
                <TextField label={t("acc.security.confirm")} type="password" autoComplete="new-password" value={pw.confirm} onValue={(v) => setPw({ ...pw, confirm: v })} />
                <button type="submit" className="btn primary btn-sm">{t("common.save")}</button>
              </form>
            </Card>
            <Card title={t("acc.security.sessions")}>
              <ul className="kit-list">
                {s.sessions.map((x: any) => (
                  <li key={x.id}>
                    <span className="grow"><strong>{x.device}</strong><small className="block text-muted">{x.location} · {relative(x.lastActiveAt)}</small></span>
                    {x.current ? <span className="badge badge-success">{t("acc.security.thisDevice")}</span> : <button type="button" className="btn outline btn-sm" onClick={async () => { await post(`/account/security/sessions/${x.id}/revoke`); await refresh(); toast.success(t("acc.security.revoked")); }}>{t("acc.security.revoke")}</button>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={t("acc.security.privacy")}>
              <Toggle label={t("acc.security.personalData")} checked disabled onValue={() => undefined} />
              <Toggle label={t("acc.notif.marketing")} checked={s.consent.marketing} onValue={async (v) => { await put("/account/consent", { marketing: v }); await refresh(); }} />
              <div className="flex gap-2 flex-wrap mt-3">
                <button type="button" className="btn outline btn-sm" onClick={async () => { const r = await post("/account/data-requests", { type: "EXPORT" }); setRequests((x) => [r, ...x]); toast.success(t("acc.security.requestSent")); }}>{t("acc.security.export")}</button>
                <button type="button" className="btn ghost btn-sm text-danger" onClick={() => setDeleting(true)}>{t("acc.security.deleteAccount")}</button>
              </div>
              {requests.map((r) => <p key={r.id} className="text-sm mt-2">{t(`acc.security.req.${r.type}`)} · {r.status} · {t("acc.security.eta", { date: date(r.eta) })}</p>)}
              <ConfirmDialog open={deleting} danger title={t("acc.security.deleteAccount")} text={t("acc.security.deleteText")} onClose={() => setDeleting(false)} onConfirm={async () => { const r = await post("/account/data-requests", { type: "DELETION" }); setRequests((x) => [r, ...x]); setDeleting(false); toast.success(t("acc.security.requestSent")); }} />
            </Card>
          </Grid>
        )}
      </QueryView>
    </>
  );
}
