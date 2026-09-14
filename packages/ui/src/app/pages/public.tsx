"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, CheckCircle2, Clock, Crown, Mail, MapPin, Megaphone, Phone, QrCode, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { ApiError, idempotencyKey, post, qs, useApi, useQueryClient } from "@sp/api-client";
import { HomeView } from "../../views/public/home-view";
import { ServicesView } from "../../views/public/services-view";
import { ServiceDetailView } from "../../views/public/service-detail-view";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Avatar, Card, EmptyState, ErrorState, FormError, KeyValue, Loading, PageHeader, QueryView, Radios, SearchBox, SelectField, Stars, TextArea, TextField, errorText, useFormState, EnumBadge } from "../kit/base";
import { PlanComparison, SlotPicker } from "../kit/domain";
import { FileDrop, MapView, PhoneField, type PickedFile } from "../kit/media";
import { useCartActions } from "./shop";

/* ------------------------------------------------------------------ */
/* Ana səhifə, servislər                                               */
/* ------------------------------------------------------------------ */

export function HomePage() {
  const { locale, t, text } = useI18n();
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
          <div className="kit-stat"><span className="kit-stat-label">{t("homeExtra.completed")}</span><strong className="kit-stat-value">{d.stats.completedServices.toLocaleString()}</strong></div>
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
  return (
    <QueryView query={services} rows={6}>
      {(d) => <ServicesView services={d.items} categories={cats.data ?? []} initialCategory={query.get("category") ?? ""} locale={locale} onNavigate={navigate} onBookService={(s) => navigate(`/services/${s.slug}/book`)} />}
    </QueryView>
  );
}

export function ServiceDetailPage({ slug }: { slug: string }) {
  const { locale, t, money, text, enumLabel, minutes } = useI18n();
  const { navigate } = useRouter();
  const q = useApi<any>(`/services/${slug}`);
  const fees = useApi<any>(q.data ? `/services/${q.data.id}/fees` : null);
  if (q.isLoading) return <div className="container py-8"><Loading rows={6} /></div>;
  if (q.error) return <div className="container py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const s = q.data;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: s.name, serviceType: enumLabel("ServiceType", s.serviceType), provider: { "@type": "LocalBusiness", name: "besqardasServis.az" }, areaServed: "Azerbaijan", aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.completedCount } }) }} />
      <ServiceDetailView service={s} locale={locale} onBack={() => navigate("/services")} onBook={() => navigate(`/services/${slug}/book`)} />
      <div className="container pb-8">
        <div className="kit-grid cols-2">
          <Card title={t("serviceInfo.howItWorks")}>
            <KeyValue items={[
              [t("serviceInfo.priceModel"), `${enumLabel("PriceModel", s.priceModel)}${s.price ? ` · ${s.priceModel === "STARTING_FROM" ? t("serviceInfo.from", { price: money(s.price) }) : money(s.price)}` : ""}`],
              [t("serviceInfo.duration"), minutes(s.estimatedDurationMinutes)],
              [t("serviceInfo.forms"), s.executionForms.map((f: string) => enumLabel("ExecutionForm", f)).join(", ")],
              [t("serviceInfo.warranty"), s.workWarrantyMonths ? t("shop.warrantyMonths", { months: s.workWarrantyMonths }) : "—"],
            ]} />
          </Card>
          <Card title={t("serviceInfo.feesTitle")}>
            {fees.data ? (
              <>
                <ul className="kit-list">{fees.data.fees.map((f: any, i: number) => <li key={i}>{f.label}</li>)}</ul>
                <p className="text-sm text-muted mt-2">{fees.data.cancellationTerms}</p>
              </>
            ) : <Loading rows={2} />}
          </Card>
        </div>
        {s.faq?.length > 0 && (
          <Card title={t("serviceInfo.faq")} className="mt-4">
            {s.faq.map((f: any, i: number) => <details key={i} className="kit-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </Card>
        )}
        {s.related?.length > 0 && (
          <Card title={t("serviceInfo.related")} className="mt-4">
            <div className="kit-chip-grid">{s.related.map((r: any) => <Link key={r.id} to={`/services/${r.slug}`} className="chip">{r.name}</Link>)}</div>
          </Card>
        )}
        <div className="text-center mt-6"><Link to={`/services/${slug}/book`} className="btn primary btn-lg">{t("book")}</Link></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Servis sifarişi axını (§13, §14, §15, §16, §20)                      */
/* ------------------------------------------------------------------ */

export function BookingPage({ slug }: { slug: string }) {
  const { t, text, enumLabel, money, dateTime, minutes } = useI18n();
  const { navigate, query } = useRouter();
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
    problemCode: "",
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
/* Ustalar və profil (§15.4)                                            */
/* ------------------------------------------------------------------ */

export function TechniciansPage() {
  const { t, text } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const specs = useApi<any[]>("/specializations");
  const list = useApi<any>(`/technicians${qs({ q: query.get("q"), pageSize: 30, sort: query.get("sort") })}`);
  const spec = query.get("spec") ?? "";
  const items = (list.data?.items ?? []).filter((x: any) => !spec || x.specializationDetails.some((s: any) => s.specializationId === spec && s.active));
  return (
    <div className="container py-6">
      <PageHeader title={t("techniciansPage.title")} subtitle={t("techniciansPage.text")} />
      <div className="flex gap-2 flex-wrap mb-4">
        <SearchBox value={query.get("q") ?? ""} onChange={(v) => setQuery({ q: v })} placeholder={t("techniciansPage.search")} />
        <SelectField value={spec} onValue={(v) => setQuery({ spec: v })} placeholder={t("techniciansPage.allSpecs")} options={(specs.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <SelectField value={query.get("sort") ?? ""} onValue={(v) => setQuery({ sort: v })} placeholder={t("techniciansPage.sortRating")} options={[{ value: "-completedJobs", label: t("techniciansPage.sortJobs") }, { value: "-experienceYears", label: t("techniciansPage.sortExperience") }]} />
      </div>
      {list.isLoading ? <Loading rows={6} /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !items.length ? <EmptyState /> : (
        <div className="tech-grid">
          {items.map((x: any) => (
            <article key={x.id} className="kit-card tech-card">
              <div className="kit-card-body">
                <div className="flex gap-3 items-center">
                  <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} size={52} />
                  <div className="flex-1">
                    <h3><Link to={`/technicians/${x.id}`}>{x.fullName}</Link></h3>
                    <span className="flex gap-2 flex-wrap"><Stars value={x.rating} count={x.reviewCount} />{x.verified && <span className="badge badge-success"><BadgeCheck size={12} /> {t("verified")}</span>}{x.promoted && <span className="badge badge-warning">{t("booking.ad")}</span>}</span>
                  </div>
                </div>
                <p className="text-sm mt-2">{x.bio}</p>
                <div className="kit-chip-grid mt-2">{x.specializations.slice(0, 4).map((s: string) => <span key={s} className="chip">{s}</span>)}</div>
                <p className="text-sm text-muted mt-2">{t("booking.jobs", { count: x.completedJobs })} · {t("techniciansPage.experience", { years: x.experienceYears })} · {x.city}</p>
              </div>
              <div className="kit-card-foot flex gap-2">
                <Link to={`/technicians/${x.id}`} className="btn outline btn-sm">{t("details")}</Link>
                <button type="button" className="btn primary btn-sm" onClick={() => navigate(`/technicians/${x.id}#book`)}>{t("techniciansPage.choose")}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function TechnicianProfilePage({ id }: { id: string }) {
  const { t, text, enumLabel, date } = useI18n();
  const q = useApi<any>(`/technicians/${id}`);
  const services = useApi<any>("/services?pageSize=100");
  return (
    <div className="container py-6">
      <QueryView query={q}>
        {(x) => {
          const specIds = x.specializationDetails.filter((s: any) => s.active).map((s: any) => s.specializationId);
          const canDo = (services.data?.items ?? []).filter((s: any) => s.requiredSpecializationIds.every((r: string) => specIds.includes(r)));
          return (
            <>
              <div className="kit-card tech-profile-head">
                <div className="kit-card-body flex gap-4 items-center flex-wrap">
                  <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} size={84} />
                  <div className="flex-1">
                    <h1>{x.fullName}</h1>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Stars value={x.rating} count={x.reviewCount} />
                      {x.verified && <span className="badge badge-success"><ShieldCheck size={12} /> {t("verified")}</span>}
                      <span className="badge">{enumLabel("EmploymentType", x.employmentType)}</span>
                      {x.promoted && <span className="badge badge-warning">{t("booking.ad")}</span>}
                    </div>
                    <p className="mt-2">{x.bio}</p>
                    <p className="text-sm text-muted">{t("booking.jobs", { count: x.completedJobs })} · {t("techniciansPage.experience", { years: x.experienceYears })} · {x.zoneNames.join(", ")} · {x.languages.map((l: string) => l.toUpperCase()).join(" / ")}</p>
                    <p className="text-sm text-muted">{t("techniciansPage.phoneHidden")}</p>
                  </div>
                </div>
              </div>
              <div className="kit-grid cols-2 mt-4">
                <Card title={t("techniciansPage.specializations")}>
                  <ul className="kit-list">{x.specializationDetails.filter((s: any) => s.active).map((s: any) => <li key={s.id} className="flex justify-between"><span>{s.name}</span><EnumBadge group="ExperienceLevel" code={s.level} tone="info" /></li>)}</ul>
                  {x.skills.length > 0 && <div className="kit-chip-grid mt-3">{x.skills.map((s: string) => <span key={s} className="chip">{s}</span>)}</div>}
                </Card>
                <Card title={t("techniciansPage.bookWith")}>
                  <ul className="kit-list">{canDo.map((s: any) => <li key={s.id} className="flex justify-between items-center"><span>{s.name}</span><Link to={`/services/${s.slug}/book?technicianId=${x.id}`} className="btn btn-sm outline">{t("book")}</Link></li>)}</ul>
                </Card>
              </div>
              <Card title={t("techniciansPage.reviews")} className="mt-4">
                {!x.reviews.length ? <EmptyState title={t("shop.noReviews")} /> : (
                  <ul className="kit-reviews">{x.reviews.map((r: any) => <li key={r.id}><div className="flex justify-between"><strong>{r.authorName}</strong><Stars value={r.rating} /></div><p>{r.comment}</p>{r.reply && <p className="kit-note text-sm">{r.reply}</p>}<small className="text-muted">{date(r.createdAt)}</small></li>)}</ul>
                )}
              </Card>
            </>
          );
        }}
      </QueryView>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planlar, zəmanət yoxlaması                                           */
/* ------------------------------------------------------------------ */

export function PricingPage() {
  const { t, enumLabel } = useI18n();
  const { navigate, query, setQuery } = useRouter();
  const { user } = useSession();
  const group = query.get("group") ?? "CUSTOMER";
  const [period, setPeriod] = useState("MONTH_1");
  const plans = useApi<any[]>(`/plans?group=${group}`);
  const defs = useApi<any[]>("/entitlement-definitions", { staleTime: Infinity });
  return (
    <div className="container py-6">
      <PageHeader title={t("pricingPage.title")} subtitle={t("pricingPage.text")} />
      <div className="flex gap-3 flex-wrap mb-4 items-center">
        <div className="kit-segment">
          {["CUSTOMER", "TECHNICIAN"].map((g) => <button key={g} type="button" className={cn(group === g && "active")} onClick={() => setQuery({ group: g })}>{enumLabel("PlanGroup", g)}</button>)}
        </div>
        <div className="kit-segment">
          {["MONTH_1", "MONTH_3", "MONTH_6", "MONTH_12"].map((p) => <button key={p} type="button" className={cn(period === p && "active")} onClick={() => setPeriod(p)}>{enumLabel("BillingPeriod", p)}</button>)}
        </div>
      </div>
      <QueryView query={plans}>
        {(list) => <PlanComparison plans={list} definitions={(defs.data ?? []).filter((d) => d.group === group)} period={period} onSelect={() => navigate(!user ? `/login?next=${group === "TECHNICIAN" ? "/become-technician" : "/account/subscription"}` : group === "TECHNICIAN" ? (user.activeRole === "TECHNICIAN" ? "/technician/subscription" : "/become-technician") : "/account/subscription")} />}
      </QueryView>
      <p className="text-sm text-muted mt-4">{group === "TECHNICIAN" ? t("pricingPage.technicianNote") : t("pricingPage.customerNote")}</p>
    </div>
  );
}

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
/* Filiallar, məzmun, FAQ, əlaqə                                        */
/* ------------------------------------------------------------------ */

export function BranchesPage() {
  const { t, text } = useI18n();
  const q = useApi<any>("/branches");
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div className="container py-6">
      <PageHeader title={t("branchesPage.title")} subtitle={t("branchesPage.text")} />
      <QueryView query={q}>
        {(d) => {
          const f = d.items.find((b: any) => b.id === focus);
          return (
            <div className="branches-layout">
              <MapView height={420} zoom={f ? 13 : 8} center={f?.location} points={d.items.map((b: any) => ({ id: b.id, lat: b.location.lat, lng: b.location.lng, label: b.name, onClick: () => setFocus(b.id) }))} />
              <ul className="branches-list">
                {d.items.map((b: any) => (
                  <li key={b.id} className={cn("kit-card", focus === b.id && "active")}>
                    <button type="button" className="kit-card-body text-left w-full" onClick={() => setFocus(b.id)}>
                      <h3>{b.name}</h3>
                      <p><MapPin size={14} /> {b.city}, {b.address}</p>
                      <p><Phone size={14} /> {b.phone} · <Mail size={14} /> {b.email}</p>
                      <p className="text-sm">{b.workingHours.filter((h: any) => !h.closed).length ? b.workingHours.map((h: any) => (h.closed ? null : `${t(`days.${h.day}`).slice(0, 2)} ${h.from}–${h.to}`)).filter(Boolean).join(" · ") : ""}</p>
                      {b.hasServiceCenter && <span className="badge badge-info">{t("branchesPage.serviceCenter")}</span>}
                    </button>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: `besqardasServis.az — ${b.name}`, address: `${b.city}, ${b.address}`, telephone: b.phone, geo: { "@type": "GeoCoordinates", latitude: b.location.lat, longitude: b.location.lng } }) }} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }}
      </QueryView>
    </div>
  );
}

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

export function FaqPage() {
  const { t } = useI18n();
  const { query, setQuery } = useRouter();
  const q = useApi<any>(`/faq${qs({ q: query.get("q"), pageSize: 100 })}`);
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <PageHeader title={t("faqPage.title")} subtitle={t("faqPage.text")} />
      <SearchBox value={query.get("q") ?? ""} onChange={(v) => setQuery({ q: v })} />
      <div className="mt-4">
        <QueryView query={q}>
          {(d) => (
            <>
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: d.items.map((f: any) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }) }} />
              {d.items.map((f: any) => <details key={f.id} className="kit-faq kit-card"><summary>{f.question}</summary><p>{f.answer}</p></details>)}
            </>
          )}
        </QueryView>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { t } = useI18n();
  const brand = useApi<any>("/branding");
  const form = useFormState({ name: "", phone: "", message: "", consent: false });
  const [sent, setSent] = useState(false);
  const v = form.values;
  return (
    <div className="container py-8">
      <PageHeader title={t("contactPage.title")} subtitle={t("contactPage.text")} />
      <div className="kit-grid cols-2">
        <Card title={t("contactPage.channels")}>
          {brand.data && <KeyValue cols={1} items={[[t("contactPage.phone"), brand.data.contacts.phone], [t("contactPage.hotline"), brand.data.contacts.hotline], ["WhatsApp", brand.data.contacts.whatsapp], [t("email"), brand.data.contacts.email], [t("contactPage.address"), brand.data.contacts.address]]} />}
          <Link to="/branches" className="btn outline mt-3">{t("nav.branches")}</Link>
        </Card>
        <Card title={t("contactPage.write")}>
          {sent ? <div className="alert alert-success">{t("contactPage.sent")}</div> : (
            <form onSubmit={(e) => { e.preventDefault(); if (!v.name || v.message.length < 10 || !v.consent) { form.setErrors({ ...(v.name ? {} : { name: ["validation.required"] }), ...(v.message.length < 10 ? { message: ["validation.commentMin"] } : {}), ...(v.consent ? {} : { consent: ["validation.acceptTerms"] }) }); return; } setSent(true); }}>
              <TextField label={t("contactPage.name")} required value={v.name} onValue={(x) => form.set("name", x)} error={form.errors.name} />
              <PhoneField label={t("auth.phone")} value={v.phone} onValue={(x) => form.set("phone", x)} />
              <TextArea label={t("contactPage.message")} required rows={4} value={v.message} onValue={(x) => form.set("message", x)} error={form.errors.message} />
              <label className="kit-check"><input type="checkbox" checked={v.consent} onChange={(e) => form.set("consent", e.target.checked)} /><span>{t("contactPage.consent")}</span></label>
              {form.errors.consent && <p className="kit-field-error">{t("validation.acceptTerms")}</p>}
              <button className="btn primary mt-3">{t("contactPage.send")}</button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
