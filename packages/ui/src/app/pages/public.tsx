"use client";
import React, { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Crown, MapPin, Megaphone, QrCode } from "lucide-react";
import { cn } from "@sp/utils";
import { idempotencyKey, post, qs, useApi, useQueryClient } from "@sp/api-client";
import { HomeView } from "../../views/public/home-view";
import { ServicesView } from "../../views/public/services-view";
import { ServiceDetailView } from "../../views/public/service-detail-view";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Avatar, Card, EmptyState, ErrorState, FormError, KeyValue, Loading, PageHeader, QueryView, Radios, SelectField, Stars, TextArea, TextField, useFormState, EnumBadge } from "../kit/base";
import { SlotPicker } from "../kit/domain";
import { FileDrop, type PickedFile } from "../kit/media";
import { useCartActions } from "./shop";

/* ------------------------------------------------------------------ */
/* Ana səhifə, servislər                                               */
/* ------------------------------------------------------------------ */

export function HomePage() {
  const { locale, t, num } = useI18n();
  const { navigate } = useRouter();
  const home = useApi<any>("/home");
  const cats = useApi<any[]>("/equipment-categories", { staleTime: 300_000 });
  const { add } = useCartActions();
  if (home.isLoading || cats.isLoading) return <div className="container py-12"><Loading rows={6} /></div>;
  if (home.error) return <div className="container py-12"><ErrorState error={home.error} onRetry={() => home.refetch()} /></div>;
  const d = home.data;
  const hero = d.banners.find((b: any) => b.placement === "HOME_HERO");
  return (
    <>
      {hero && (
        <div className={cn("pub-banner", `tone-${hero.tone}`)}>
          <div className="container flex justify-between items-center gap-3 flex-wrap">
            <span><Megaphone size={16} /> <strong>{hero.title}</strong> — {hero.subtitle}</span>
            <Link to={hero.ctaHref} className="btn btn-sm outline">{hero.ctaLabel}</Link>
          </div>
        </div>
      )}
      <HomeView services={d.popularServices} products={d.featuredProducts} technicians={d.topTechnicians} categories={cats.data ?? []} locale={locale} onNavigate={navigate} onBookService={(s) => navigate(s?.slug ? `/services/${s.slug}/book` : "/services")} onAddToCart={(p: any) => add(p.defaultVariantId, "1", p.baseUnit)} />
      <section className="container section">
        <div className="kit-grid cols-4">
          <div className="kit-stat"><span className="kit-stat-label">{t("homeExtra.completed")}</span><strong className="kit-stat-value">{num(d.stats.completedServices)}</strong></div>
          <div className="kit-stat"><span className="kit-stat-label">{t("homeExtra.technicians")}</span><strong className="kit-stat-value">{d.stats.technicians}</strong></div>
          <div className="kit-stat"><span className="kit-stat-label">{t("homeExtra.branches")}</span><strong className="kit-stat-value">{d.stats.branches}</strong></div>
          <div className="kit-stat"><span className="kit-stat-label">{t("homeExtra.rating")}</span><strong className="kit-stat-value">{d.stats.rating} / 5</strong></div>
        </div>
        {d.reviews.length > 0 && (
          <div className="mt-8">
            <h2>{t("homeExtra.reviewsTitle")}</h2>
            <div className="kit-grid cols-3">
              {d.reviews.slice(0, 3).map((r: any) => (
                <blockquote key={r.id} className="kit-card home-review"><Stars value={r.rating} /><p>“{r.comment}”</p><cite>{r.authorName}</cite></blockquote>
              ))}
            </div>
          </div>
        )}
        <div className="kit-grid cols-2 mt-8">
          <Card title={t("homeExtra.joinTitle")}><p>{t("homeExtra.joinText")}</p><Link to="/become-technician" className="btn primary mt-3">{t("auth.technicianApply")}</Link></Card>
          <Card title={t("homeExtra.b2bTitle")}><p>{t("homeExtra.b2bText")}</p><Link to="/business" className="btn outline mt-3">{t("auth.b2bApply")}</Link></Card>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "besqardasServis.az", url: "https://besqardasservis.az" }) }} />
    </>
  );
}

export function ServicesPage() {
  const { locale } = useI18n();
  const { navigate, query } = useRouter();
  const services = useApi<any>("/services?pageSize=100");
  const cats = useApi<any[]>("/equipment-categories");
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  return (
    <QueryView query={services} rows={6}>
      {(d) => <ServicesView services={d.items} categories={cats.data ?? []} initialCategory={query.get("category") ?? ""} locale={locale} supportPhone={brand.data?.contacts?.phone} onNavigate={navigate} onBookService={(s) => navigate(`/services/${s.slug}/book`)} />}
    </QueryView>
  );
}

export function ServiceDetailPage({ slug }: { slug: string }) {
  const { locale, enumLabel } = useI18n();
  const { navigate } = useRouter();
  const q = useApi<any>(`/services/${slug}`);
  const fees = useApi<any>(q.data ? `/services/${q.data.id}/fees` : null);
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  if (q.isLoading) return <div className="container py-8"><Loading rows={6} /></div>;
  if (q.error) return <div className="container py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const s = q.data;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: s.name, serviceType: enumLabel("ServiceType", s.serviceType), provider: { "@type": "LocalBusiness", name: "besqardasServis.az" }, areaServed: "Azerbaijan", aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.completedCount } }) }} />
      <ServiceDetailView service={s} fees={fees.data} locale={locale} supportPhone={brand.data?.contacts?.phone} onNavigate={navigate} onBook={(problem) => navigate(`/services/${slug}/book${problem ? `?problem=${encodeURIComponent(problem)}` : ""}`)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Servis sifarişi axını (§13, §14, §15, §16, §20)                      */
/* ------------------------------------------------------------------ */

export function BookingPage({ slug }: { slug: string }) {
  const { t, enumLabel, money, dateTime, minutes } = useI18n();
  const { query } = useRouter();
  const { session, ent, user } = useSession();
  const qc = useQueryClient();
  const service = useApi<any>(`/services/${slug}`);
  const devices = useApi<any>("/account/devices");
  const addresses = useApi<any>("/account/addresses");
  const brands = useApi<any[]>("/lookup/brands", { staleTime: 300_000 });
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [key] = useState(() => idempotencyKey());
  const [error, setError] = useState<unknown>(null);
  const [created, setCreated] = useState<any>(null);
  const form = useFormState({
    executionForm: "",
    deviceMode: "existing" as "existing" | "new",
    deviceId: query.get("deviceId") ?? "",
    categoryId: "",
    brandId: "",
    modelId: "",
    modelName: "",
    serialNumber: "",
    problemCode: query.get("problem") ?? "",
    description: "",
    addressMode: "saved" as "saved" | "oneTime",
    addressId: "",
    city: "Bakı",
    street: "",
    apartment: "",
    slotStart: "",
    urgent: false,
    technicianId: query.get("technicianId") ?? "",
    contactChannel: "CALL",
    note: "",
  });
  const v = form.values;
  const s = service.data;
  useEffect(() => {
    if (s && !v.executionForm) { form.set("executionForm", s.executionForms[0]); form.set("categoryId", s.categoryId); }
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const list = addresses.data?.items ?? [];
    if (list.length && !v.addressId) form.set("addressId", list.find((a: any) => a.isDefault)?.id ?? list[0].id);
    if (devices.data?.items && !devices.data.items.length) form.set("deviceMode", "new");
  }, [addresses.data, devices.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const models = useApi<any[]>(v.brandId ? `/lookup/models?brandId=${v.brandId}&categoryId=${v.categoryId}` : null);
  const slotParams = qs({ executionForm: v.executionForm, addressId: v.addressMode === "saved" ? v.addressId : undefined, city: v.addressMode === "oneTime" ? v.city : undefined, technicianId: v.technicianId || undefined });
  const slots = useApi<any[]>(s && step >= 3 && v.executionForm !== "CARRY_IN" ? `/services/${s.id}/slots${slotParams}` : null);
  const techs = useApi<any[]>(s && step >= 3 ? `/services/${s.id}/technicians${qs({ addressId: v.addressId, slot: v.slotStart || undefined })}` : null);
  const fees = useApi<any>(s ? `/services/${s.id}/fees` : null);
  if (service.isLoading) return <div className="container py-8"><Loading rows={6} /></div>;
  if (service.error) return <div className="container py-8"><ErrorState error={service.error} /></div>;

  const urgentAllowed = !!ent("urgent_service");
  const oneTimeAllowed = !!ent("one_time_address");
  const steps = [t("booking.stepForm"), t("booking.stepProblem"), t("booking.stepAddress"), t("booking.stepTime"), t("booking.stepConfirm")];
  const onSite = v.executionForm !== "CARRY_IN";
  const valid = [
    !!v.executionForm && (v.deviceMode === "existing" ? !!v.deviceId : !!v.brandId),
    v.description.trim().length >= 5,
    !onSite || (v.addressMode === "saved" ? !!v.addressId : v.street.trim().length >= 3),
    !onSite || !!v.slotStart || v.executionForm === "PICKUP_DELIVERY" && !!v.slotStart,
    true,
  ];
  const submit = async () => {
    setError(null);
    try {
      const r = await post("/service-orders", {
        serviceId: s.id,
        executionForm: v.executionForm,
        deviceId: v.deviceMode === "existing" ? v.deviceId : null,
        newDevice: v.deviceMode === "new" ? { categoryId: v.categoryId, brandId: v.brandId, modelId: v.modelId || undefined, modelName: v.modelName || undefined, serialNumber: v.serialNumber || undefined } : null,
        problemCode: v.problemCode || null,
        description: v.description,
        attachments: files.map((f) => ({ name: f.name, mimeType: f.mimeType, size: f.size })),
        addressId: onSite && v.addressMode === "saved" ? v.addressId : null,
        oneTimeAddress: onSite && v.addressMode === "oneTime" ? { city: v.city, street: v.street, apartment: v.apartment || undefined } : null,
        slotStart: onSite ? v.slotStart || null : null,
        technicianId: v.technicianId || null,
        urgent: v.urgent,
        contactChannel: v.contactChannel,
        note: v.note || undefined,
        idempotencyKey: key,
      });
      await qc.invalidateQueries({ queryKey: ["api"] });
      setCreated(r);
    } catch (e) {
      setError(e);
      form.fromError(e);
    }
  };
  if (created) {
    return (
      <div className="container py-10 max-w-xl mx-auto text-center">
        <CheckCircle2 size={56} className="text-success mx-auto" />
        <h1>{t("booking.createdTitle", { number: created.number })}</h1>
        <p>{t("booking.createdText")}</p>
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
          <Link to={`/account/services/${created.id}`} className="btn primary">{t("booking.trackOrder")}</Link>
          <Link to="/services" className="btn outline">{t("services")}</Link>
        </div>
      </div>
    );
  }
  const selectedTech = techs.data?.find((x) => x.id === v.technicianId);
  return (
    <div className="container py-6 booking-page">
      <PageHeader title={t("booking.title")} subtitle={s.name} crumbs={[{ label: t("services"), to: "/services" }, { label: s.name, to: `/services/${slug}` }, { label: t("booking.title") }]} />
      <ol className="wizard-stepper kit-stepper" aria-label={t("common.steps")}>
        {steps.map((st, i) => <li key={st} className={cn("wizard-step-pill", i === step && "active", i < step && "done")} aria-current={i === step ? "step" : undefined}>{i + 1}. {st}</li>)}
      </ol>
      <div className="cart-grid mt-4">
        <div className="kit-card">
          <div className="kit-card-body">
            <FormError error={error} />
            {step === 0 && (
              <>
                <h2>{t("booking.executionForm")}</h2>
                <Radios name="form" value={v.executionForm} onValue={(x) => { form.set("executionForm", x); form.set("slotStart", ""); }} columns={3} options={s.executionForms.map((f: string) => ({ value: f, label: enumLabel("ExecutionForm", f), hint: t(`booking.formHint.${f}`) }))} />
                <h2 className="mt-6">{t("booking.device")}</h2>
                <Radios name="deviceMode" value={v.deviceMode} onValue={(x) => form.set("deviceMode", x)} columns={2} options={[{ value: "existing", label: t("booking.myDevices"), disabled: !devices.data?.items?.length }, { value: "new", label: t("booking.newDevice") }]} />
                {v.deviceMode === "existing" ? (
                  devices.isLoading ? <Loading /> : (
                    <div className="mt-3"><Radios name="device" value={v.deviceId} onValue={(x) => form.set("deviceId", x)} columns={2} options={(devices.data?.items ?? []).map((d: any) => ({ value: d.id, label: d.nickname ?? d.modelName, hint: `${d.modelName} · ${d.addressLabel}${d.serialNumber ? ` · S/N ${d.serialNumber}` : ""}` }))} /></div>
                  )
                ) : (
                  <div className="kit-grid cols-2 mt-3">
                    <SelectField label={t("fields.brand")} required value={v.brandId} onValue={(x) => { form.set("brandId", x); form.set("modelId", ""); }} placeholder={t("common.choose")} options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
                    {models.data?.length ? (
                      <SelectField label={t("fields.model")} value={v.modelId} onValue={(x) => form.set("modelId", x)} placeholder={t("booking.modelUnknown")} options={models.data.map((m) => ({ value: m.id, label: m.fullName }))} />
                    ) : (
                      <TextField label={t("fields.model")} value={v.modelName} onValue={(x) => form.set("modelName", x)} />
                    )}
                    <TextField label={t("fields.serialNumber")} value={v.serialNumber} onValue={(x) => form.set("serialNumber", x)} />
                  </div>
                )}
              </>
            )}
            {step === 1 && (
              <>
                {s.problems?.length > 0 && (
                  <>
                    <h2>{t("booking.problem")}</h2>
                    <div className="kit-chip-grid mb-3">{s.problems.map((p: any) => <button key={p.code} type="button" className={cn("chip", v.problemCode === p.code && "active")} aria-pressed={v.problemCode === p.code} onClick={() => form.set("problemCode", v.problemCode === p.code ? "" : p.code)}>{p.label}</button>)}</div>
                  </>
                )}
                <TextArea label={t("booking.description")} required rows={4} value={v.description} onValue={(x) => form.set("description", x)} error={form.errors.description} hint={t("booking.descriptionHint")} />
                <h3>{t("booking.photos")}</h3>
                <FileDrop files={files} onChange={setFiles} accept="image/*,video/*" maxSizeMb={25} capture />
              </>
            )}
            {step === 2 && (
              onSite ? (
                <>
                  <h2>{t("booking.address")}</h2>
                  <p className="text-sm text-muted mb-3">{oneTimeAllowed ? t("checkout.addressRulePro") : t("checkout.addressRuleBasic")}</p>
                  <Radios name="addrMode" value={v.addressMode} onValue={(x) => form.set("addressMode", x)} columns={2} options={[{ value: "saved", label: t("checkout.savedAddress") }, { value: "oneTime", label: t("checkout.oneTimeAddress"), disabled: !oneTimeAllowed, badge: !oneTimeAllowed ? <span className="badge badge-warning">Pro / Premium</span> : undefined }]} />
                  <div className="mt-3">
                    {v.addressMode === "saved" ? (
                      <Radios name="address" value={v.addressId} onValue={(x) => { form.set("addressId", x); form.set("slotStart", ""); }} options={(addresses.data?.items ?? []).map((a: any) => ({ value: a.id, label: a.label, hint: `${a.city}, ${a.street}${a.apartment ? `, ${t("fields.apartment")} ${a.apartment}` : ""}` }))} />
                    ) : (
                      <div className="kit-grid cols-2">
                        <TextField label={t("fields.city")} value={v.city} onValue={(x) => form.set("city", x)} />
                        <TextField label={t("fields.street")} required value={v.street} onValue={(x) => form.set("street", x)} error={form.errors["oneTimeAddress.street"]} />
                        <TextField label={t("fields.apartment")} value={v.apartment} onValue={(x) => form.set("apartment", x)} />
                      </div>
                    )}
                    <Link to="/account/addresses" className="btn ghost btn-sm mt-2">{t("booking.manageAddresses")}</Link>
                  </div>
                </>
              ) : (
                <div className="kit-note"><MapPin size={18} /> {t("booking.carryInNote")}</div>
              )
            )}
            {step === 3 && (
              <>
                {onSite ? (
                  <>
                    <h2>{t("booking.time")}</h2>
                    {urgentAllowed ? (
                      <label className="kit-check mb-3"><input type="checkbox" checked={v.urgent} onChange={(e) => form.set("urgent", e.target.checked)} /><span><Crown size={14} /> {t("booking.urgent")}</span></label>
                    ) : (
                      <p className="kit-note text-sm"><Crown size={14} /> {t("booking.urgentPremium")} <Link to="/pricing" className="text-brand">{t("nav.pricing")}</Link></p>
                    )}
                    {slots.isLoading ? <Loading /> : slots.error ? <ErrorState error={slots.error} onRetry={() => slots.refetch()} /> : <SlotPicker days={slots.data ?? []} value={v.slotStart || null} onChange={(x) => form.set("slotStart", x)} />}
                  </>
                ) : (
                  <p className="kit-note">{t("booking.carryInTime")}</p>
                )}
                <h2 className="mt-6">{t("booking.technician")}</h2>
                <p className="text-sm text-muted">{t("booking.technicianHint")}</p>
                {techs.isLoading ? <Loading /> : !techs.data?.length ? <EmptyState title={t("booking.noTechnicians")} /> : (
                  <div className="booking-techs">
                    <label className={cn("choice-card", !v.technicianId && "active")}>
                      <input type="radio" name="tech" checked={!v.technicianId} onChange={() => form.set("technicianId", "")} className="sr-only" />
                      <strong>{t("booking.anyTechnician")}</strong>
                      <small className="text-muted">{t("booking.anyTechnicianHint")}</small>
                    </label>
                    {techs.data.map((x) => (
                      <label key={x.id} className={cn("choice-card booking-tech", v.technicianId === x.id && "active")}>
                        <input type="radio" name="tech" checked={v.technicianId === x.id} onChange={() => form.set("technicianId", x.id)} className="sr-only" />
                        <span className="flex gap-2 items-center">
                          <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} />
                          <span className="flex-1"><strong>{x.fullName}</strong><small className="block text-muted">{x.specializations.slice(0, 2).join(" · ")}</small></span>
                          {x.promoted && <span className="badge badge-warning">{t("booking.ad")}</span>}
                        </span>
                        <span className="flex gap-3 flex-wrap text-sm"><Stars value={x.rating} count={x.reviewCount} /><span>{t("booking.jobs", { count: x.completedJobs })}</span>{x.nextAvailableAt && <span><Clock size={12} /> {dateTime(x.nextAvailableAt)}</span>}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 4 && (
              <>
                <h2>{t("booking.confirmTitle")}</h2>
                <KeyValue items={[
                  [t("booking.service"), s.name],
                  [t("booking.executionForm"), enumLabel("ExecutionForm", v.executionForm)],
                  [t("booking.device"), v.deviceMode === "existing" ? devices.data?.items?.find((d: any) => d.id === v.deviceId)?.modelName : `${brands.data?.find((b) => b.id === v.brandId)?.name ?? ""} ${models.data?.find((m) => m.id === v.modelId)?.fullName ?? v.modelName}`],
                  [t("booking.problem"), `${s.problems?.find((p: any) => p.code === v.problemCode)?.label ?? ""} ${v.description}`],
                  [t("booking.address"), onSite ? (v.addressMode === "saved" ? addresses.data?.items?.find((a: any) => a.id === v.addressId)?.street : `${v.city}, ${v.street}`) : t("booking.serviceCenter")],
                  [t("booking.time"), v.slotStart ? dateTime(v.slotStart) : "—"],
                  [t("booking.technician"), selectedTech?.fullName ?? t("booking.anyTechnician")],
                  [t("booking.photos"), String(files.length)],
                ]} />
                <SelectField label={t("booking.contactChannel")} value={v.contactChannel} onValue={(x) => form.set("contactChannel", x)} options={["CALL", "SMS", "WHATSAPP", "EMAIL"].map((c) => ({ value: c, label: enumLabel("ContactChannel", c) }))} />
                <TextArea label={t("common.note")} rows={2} value={v.note} onValue={(x) => form.set("note", x)} />
                <div className="kit-note">
                  <strong>{t("booking.priceTitle")}</strong>
                  <p>{enumLabel("PriceModel", s.priceModel)}{s.price ? ` · ${s.priceModel === "STARTING_FROM" ? t("serviceInfo.from", { price: money(s.price) }) : money(s.price)}` : ` · ${t("booking.afterDiagnostics")}`}</p>
                  {fees.data && <><strong>{t("serviceInfo.feesTitle")}</strong><ul>{fees.data.fees.map((f: any, i: number) => <li key={i}>{f.label}</li>)}</ul><p className="text-sm">{fees.data.cancellationTerms}</p></>}
                </div>
              </>
            )}
          </div>
          <div className="wizard-footer kit-card-foot">
            <button type="button" className="btn outline" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>{t("common.back")}</button>
            {step < steps.length - 1 ? <button type="button" className="btn primary" disabled={!valid[step]} onClick={() => setStep((x) => x + 1)}>{t("continue")}</button> : <button type="button" className="btn primary" onClick={submit}>{t("booking.submit")}</button>}
          </div>
        </div>
        <aside className="kit-card cart-summary-card">
          <div className="kit-card-body">
            <h3>{s.name}</h3>
            <p className="text-sm">{s.shortDescription}</p>
            <KeyValue cols={1} items={[[t("serviceInfo.duration"), minutes(s.estimatedDurationMinutes)], [t("serviceInfo.warranty"), s.workWarrantyMonths ? t("shop.warrantyMonths", { months: s.workWarrantyMonths }) : "—"], [t("plans.yourPlan"), session?.plan?.name ?? "—"]]} />
            {v.slotStart && <p className="mt-2"><CalendarClock size={14} /> {dateTime(v.slotStart)}</p>}
            {user && <p className="text-sm text-muted mt-2">{t("booking.limits", { max: String(ent("max_active_orders") ?? "—") })}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zəmanət yoxlaması                                                    */
/* ------------------------------------------------------------------ */

export function WarrantyVerifyPage({ code: initial }: { code?: string }) {
  const { t, enumLabel, date } = useI18n();
  const { navigate } = useRouter();
  const [code, setCode] = useState(initial ?? "");
  const q = useApi<any>(initial ? `/warranty/verify/${encodeURIComponent(initial)}` : null);
  return (
    <div className="container py-8 max-w-xl mx-auto">
      <PageHeader title={t("warrantyVerify.title")} subtitle={t("warrantyVerify.text")} />
      <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/warranty/verify/${code.trim()}`); }}>
        <input className="form-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="W30012AB12" aria-label={t("warrantyVerify.code")} />
        <button className="btn primary"><QrCode size={16} /> {t("warrantyVerify.check")}</button>
      </form>
      {initial && (q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : q.data && (
        <div className={cn("kit-card", q.data.valid ? "border-success" : "border-danger")}>
          <div className="kit-card-body">
            <h2 className={q.data.valid ? "text-success" : "text-danger"}>{q.data.status ? (q.data.valid ? t("warrantyVerify.valid") : t("warrantyVerify.invalid")) : t("warrantyVerify.notFound")}</h2>
            {q.data.status && <KeyValue items={[[t("warrantyVerify.status"), <EnumBadge key="s" group="WarrantyStatus" code={q.data.status} />], [t("warrantyVerify.type"), enumLabel("WarrantyType", q.data.type)], [t("booking.device"), q.data.deviceName], [t("fields.serialNumber"), q.data.serialMasked], [t("warrantyVerify.period"), `${date(q.data.startsAt)} — ${date(q.data.endsAt)}`], [t("warrantyVerify.coverage"), q.data.coverage], [t("warrantyVerify.issuer"), q.data.issuer]]} />}
            <p className="text-sm text-muted mt-3">{t("warrantyVerify.privacy")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Məzmun səhifələri                                                    */
/* ------------------------------------------------------------------ */

export function ContentPage({ slug }: { slug: "about" | "terms" | "privacy" }) {
  const q = useApi<any>(`/content/pages/${slug}`);
  return (
    <div className="container py-8 max-w-4xl mx-auto content-page">
      <QueryView query={q}>
        {(p) => (
          <article>
            <h1>{p.title}</h1>
            {p.body.split("\n\n").map((para: string, i: number) => <p key={i} style={{ whiteSpace: "pre-line" }}>{para}</p>)}
          </article>
        )}
      </QueryView>
    </div>
  );
}
