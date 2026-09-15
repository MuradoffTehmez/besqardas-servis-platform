"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BadgeCheck, CalendarClock, Check, CheckCircle2, ChevronDown, ClipboardList, Clock, CreditCard, Crown, FileText, Globe, Headset, HelpCircle, Languages,
  LocateFixed, Mail, MapPin, MessageCircle, Minus, Navigation, Phone, RotateCcw, Search, Send, ShieldCheck, Sparkles, Star, Store, Timer, Truck, Users, Wrench, X,
} from "lucide-react";
import { cn } from "@sp/utils";
import { useApi } from "@sp/api-client";
import { ServiceIcon } from "../../components/domain/service-icon";
import { useI18n } from "../core/i18n";
import { useMedia } from "../core/nav";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Avatar, ErrorState, Loading, QueryView, TextArea, TextField, useFormState } from "../kit/base";
import { MapView, PhoneField } from "../kit/media";
import { ReportReviewButton } from "./shop";

/* ------------------------------------------------------------------ */
/* Ortaq hissələr                                                       */
/* ------------------------------------------------------------------ */

type Crumb = { label: string; to?: string };

/** İnformasiya səhifələrinin başlıq bölməsi: yol xətti, başlıq, mətn və əlavə məzmun. */
export function InfoHero({ eyebrow, title, text, crumbs, children, aside, center }: { eyebrow: string; title: string; text?: string; crumbs?: Crumb[]; children?: React.ReactNode; aside?: React.ReactNode; center?: boolean }) {
  const { t } = useI18n();
  const trail: Crumb[] = [{ label: t("home"), to: "/" }, ...(crumbs ?? [{ label: title }])];
  return (
    <section className={cn("ih", center && "is-center")}>
      <div className="container">
        <nav className="pg-crumbs" aria-label={t("common.breadcrumbs")}>
          {trail.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && " › "}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
        <div className={cn("ih-grid", aside && "has-aside")}>
          <div className="ih-copy">
            <span className="ih-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            {text && <p className="ih-text">{text}</p>}
            {children}
          </div>
          {aside}
        </div>
      </div>
    </section>
  );
}

function HeroStats({ items }: { items: { icon: React.ReactNode; value: React.ReactNode; label: string }[] }) {
  return (
    <dl className="ih-stats">
      {items.map((s, i) => (
        <div key={i}>
          <dt>{s.label}</dt>
          <dd><span className="ih-stat-icon" aria-hidden>{s.icon}</span>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Böyük axtarış xanası — URL-ə gecikmə ilə yazılır ki, hər hərfdə naviqasiya olmasın. */
function HeroSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { t } = useI18n();
  const [local, setLocal] = useState(value);
  const first = useRef(true);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (local === value) return;
    const h = setTimeout(() => onChange(local), 250);
    return () => clearTimeout(h);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="ih-search">
      <Search size={20} aria-hidden />
      <input type="search" aria-label={placeholder} placeholder={placeholder} value={local} onChange={(e) => setLocal(e.target.value)} />
      {local && <button type="button" className="ih-search-clear" aria-label={t("common.clear")} onClick={() => { setLocal(""); onChange(""); }}><X size={16} /></button>}
    </label>
  );
}

function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  const { t } = useI18n();
  const full = Math.round(value);
  return (
    <span className="star-row" role="img" aria-label={t("common.ratingOf", { value })}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill="currentColor" className={cn(n > full && "off")} aria-hidden />)}
    </span>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+*]/g, "")}`;

/* ------------------------------------------------------------------ */
/* Ustalar (§15.4)                                                      */
/* ------------------------------------------------------------------ */

type TechSort = "rating" | "jobs" | "experience";

export function TechniciansPage() {
  const { t, text, num, dateTime, enumLabel } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const specs = useApi<any[]>("/specializations");
  const cats = useApi<any[]>("/equipment-categories", { staleTime: 300_000 });
  const list = useApi<any>("/technicians?pageSize=30");
  const k = (key: string, vars?: Record<string, string | number>) => t(`techniciansPage.${key}`, vars);
  const search = query.get("q") ?? "";
  const cat = query.get("cat") ?? "";
  const sort = (query.get("sort") as TechSort) || "rating";

  const all: any[] = useMemo(() => list.data?.items ?? [], [list.data]);
  const specIdsOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of specs.data ?? []) map.set(s.categoryId, [...(map.get(s.categoryId) ?? []), s.id]);
    return map;
  }, [specs.data]);
  const worksIn = (x: any, catId: string) => x.specializationDetails.some((s: any) => s.active && (specIdsOf.get(catId) ?? []).includes(s.specializationId));

  const items = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    const rows = all.filter((x) => (!cat || worksIn(x, cat)) && (!q || `${x.fullName} ${x.specializations.join(" ")} ${x.city}`.toLocaleLowerCase().includes(q)));
    return rows.sort((a, b) => (sort === "jobs" ? b.completedJobs - a.completedJobs : sort === "experience" ? b.experienceYears - a.experienceYears : b.rating - a.rating || b.reviewCount - a.reviewCount));
  }, [all, search, cat, sort, specIdsOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = (cats.data ?? []).map((c) => ({ ...c, count: all.filter((x) => worksIn(x, c.id)).length })).filter((c) => c.count > 0);
  const avg = all.length ? all.reduce((n, x) => n + (x.rating ?? 0), 0) / all.length : 0;
  const jobs = all.reduce((n, x) => n + (x.completedJobs ?? 0), 0);

  return (
    <div className="info-page">
      <InfoHero
        eyebrow={k("eyebrow")}
        title={k("title")}
        text={k("heroText")}
        aside={<HeroStats items={[
          { icon: <Users size={18} />, value: num(all.length), label: k("statTechnicians") },
          { icon: <Star size={18} fill="currentColor" />, value: num(avg, 1), label: k("statRating") },
          { icon: <CheckCircle2 size={18} />, value: `${num(jobs)}+`, label: k("statJobs") },
        ]} />}
      >
        <HeroSearch value={search} onChange={(v) => setQuery({ q: v || null }, { replace: true })} placeholder={k("search")} />
        <ul className="ih-trust">
          <li><ShieldCheck size={16} aria-hidden /> {k("trust1")}</li>
          <li><Star size={16} aria-hidden /> {k("trust2")}</li>
          <li><BadgeCheck size={16} aria-hidden /> {k("trust3")}</li>
        </ul>
      </InfoHero>

      <div className="container info-body">
        {categories.length > 0 && (
          <nav className="info-chips" aria-label={k("specializations")}>
            <button type="button" className={cn("info-chip", !cat && "active")} aria-pressed={!cat} onClick={() => setQuery({ cat: null })}>
              <Wrench size={16} aria-hidden /> {k("allCategories")} <small>{all.length}</small>
            </button>
            {categories.map((c) => (
              <button key={c.id} type="button" className={cn("info-chip", cat === c.id && "active")} aria-pressed={cat === c.id} onClick={() => setQuery({ cat: c.id })}>
                <ServiceIcon name={c.icon} size={16} /> {text(c.nameI18n ?? c.name)} <small>{c.count}</small>
              </button>
            ))}
          </nav>
        )}

        <div className="info-toolbar">
          <strong>{k("resultCount", { count: items.length })}</strong>
          <label className="shop-sort">
            <span>{t("shop.sortLabel")}</span>
            <select className="form-input" value={sort} onChange={(e) => setQuery({ sort: e.target.value === "rating" ? null : e.target.value })}>
              <option value="rating">{k("sortRating")}</option>
              <option value="jobs">{k("sortJobs")}</option>
              <option value="experience">{k("sortExperience")}</option>
            </select>
          </label>
        </div>

        {list.isLoading ? <Loading rows={6} /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !items.length ? (
          <div className="info-empty" role="status">
            <Users size={40} aria-hidden />
            <h2>{k("emptyTitle")}</h2>
            <p>{k("emptyText")}</p>
            <button type="button" className="btn outline" onClick={() => setQuery({ q: null, cat: null })}>{k("clearFilters")}</button>
          </div>
        ) : (
          <div className="tch-grid">
            {items.map((x) => {
              const active = x.specializationDetails.filter((s: any) => s.active);
              return (
                <article key={x.id} className="tch-card">
                  <div className="tch-head">
                    <span className="tch-avatar">
                      <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} size={60} />
                      {x.verified && <span className="tch-check" title={t("verified")}><BadgeCheck size={16} aria-hidden /></span>}
                    </span>
                    <div className="tch-id">
                      <h3 className="tch-name"><Link to={`/technicians/${x.id}`}>{x.fullName}</Link></h3>
                      <span className="tch-sub"><MapPin size={13} aria-hidden /> {x.city} · {enumLabel("EmploymentType", x.employmentType)}</span>
                      <span className="tch-rating">
                        <Star size={15} fill="currentColor" className="svc-star" aria-hidden />
                        <strong>{num(x.rating, 1)}</strong>
                        <span>({k("reviewCount", { count: num(x.reviewCount) })})</span>
                      </span>
                    </div>
                    {x.promoted && <span className="tch-ad">{t("booking.ad")}</span>}
                  </div>
                  {x.bio && <p className="tch-bio">{x.bio}</p>}
                  <dl className="tch-stats">
                    <div><dt>{k("jobsLabel")}</dt><dd>{num(x.completedJobs)}</dd></div>
                    <div><dt>{k("yearsLabel")}</dt><dd>{x.experienceYears}</dd></div>
                    <div><dt>{k("onTimeLabel")}</dt><dd>{x.onTimeRate != null ? `${x.onTimeRate}%` : "—"}</dd></div>
                  </dl>
                  <ul className="tch-specs">
                    {active.slice(0, 3).map((s: any) => <li key={s.id}>{s.name}</li>)}
                    {active.length > 3 && <li className="more">+{active.length - 3}</li>}
                  </ul>
                  <div className="tch-foot">
                    {x.nextAvailableAt ? <span className="tch-next"><CalendarClock size={15} aria-hidden /> {k("nextSlot", { at: dateTime(x.nextAvailableAt) })}</span> : <span />}
                    <div className="tch-actions">
                      <Link to={`/technicians/${x.id}`} className="btn outline btn-sm">{k("profile")}</Link>
                      <button type="button" className="btn primary btn-sm" onClick={() => navigate(`/technicians/${x.id}#book`)}>{k("choose")}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="svc-help info-cta">
          <span className="svc-help-icon"><Wrench size={28} aria-hidden /></span>
          <div className="svc-help-copy">
            <h2>{k("joinTitle")}</h2>
            <p>{k("joinText")}</p>
          </div>
          <Link to="/become-technician" className="btn primary btn-lg">{k("joinCta")} <ArrowRight size={18} aria-hidden /></Link>
        </section>
      </div>
    </div>
  );
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function TechnicianProfilePage({ id }: { id: string }) {
  const { t, text, num, date, dateTime, money, enumLabel } = useI18n();
  const q = useApi<any>(`/technicians/${id}`);
  const services = useApi<any>("/services?pageSize=100");
  const k = (key: string, vars?: Record<string, string | number>) => t(`techniciansPage.${key}`, vars);

  // "Ustanı seç" düyməsi #book ilə gəlir — məlumat yüklənəndən sonra sifariş blokuna sürüşdürülür
  useEffect(() => {
    if (!q.data || typeof window === "undefined" || window.location.hash !== "#book") return;
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [q.data]);

  if (q.isLoading) return <div className="container py-12"><Loading rows={6} /></div>;
  if (q.error || !q.data) return <div className="container py-12"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const x = q.data;
  const active = x.specializationDetails.filter((s: any) => s.active);
  const specIds = active.map((s: any) => s.specializationId);
  const canDo = (services.data?.items ?? []).filter((s: any) => s.requiredSpecializationIds.every((r: string) => specIds.includes(r)));

  return (
    <div className="info-page tcp">
      <section className="ih tcp-hero">
        <div className="container">
          <nav className="pg-crumbs" aria-label={t("common.breadcrumbs")}>
            <Link to="/">{t("home")}</Link> › <Link to="/technicians">{t("technicians")}</Link> › <span aria-current="page">{x.fullName}</span>
          </nav>
          <div className="tcp-hero-grid">
            <div className="tcp-id">
              <span className="tch-avatar lg">
                <Avatar name={x.fullName} tone={x.avatarTone} src={x.avatarUrl} size={104} />
                {x.verified && <span className="tch-check" title={t("verified")}><BadgeCheck size={22} aria-hidden /></span>}
              </span>
              <div className="tcp-id-copy">
                <div className="tcp-badges">
                  {x.verified && <span className="tcp-badge ok"><ShieldCheck size={14} aria-hidden /> {t("verified")}</span>}
                  <span className="tcp-badge">{enumLabel("EmploymentType", x.employmentType)}</span>
                  {x.promoted && <span className="tcp-badge ad">{t("booking.ad")}</span>}
                </div>
                <h1>{x.fullName}</h1>
                <div className="tcp-rating">
                  <StarRow value={x.rating} size={18} />
                  <strong>{num(x.rating, 1)}</strong>
                  <span>{k("reviewCount", { count: num(x.reviewCount) })}</span>
                </div>
                <ul className="tcp-meta">
                  <li><MapPin size={15} aria-hidden /> {x.city}</li>
                  {x.languages?.length > 0 && <li><Languages size={15} aria-hidden /> {x.languages.map((l: string) => l.toUpperCase()).join(" / ")}</li>}
                  {x.joinedAt && <li><CalendarClock size={15} aria-hidden /> {k("memberSince", { date: date(x.joinedAt) })}</li>}
                </ul>
              </div>
            </div>
            <dl className="tcp-kpis">
              <div><dt>{k("statJobs")}</dt><dd>{num(x.completedJobs)}</dd></div>
              <div><dt>{k("yearsLabel")}</dt><dd>{x.experienceYears}</dd></div>
              <div><dt>{k("onTimeLabel")}</dt><dd>{x.onTimeRate != null ? `${x.onTimeRate}%` : "—"}</dd></div>
              <div><dt>{k("warrantyRate")}</dt><dd>{x.warrantyClaimRate != null ? `${num(x.warrantyClaimRate, 1)}%` : "—"}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <div className="container tcp-body">
        <div className="tcp-main">
          <section className="info-section">
            <h2>{k("about")}</h2>
            {x.bio && <p className="tcp-bio">{x.bio}</p>}
            <p className="tcp-note"><ShieldCheck size={16} aria-hidden /> {k("phoneHidden")}</p>
          </section>

          <section className="info-section">
            <h2>{k("specializations")}</h2>
            <ul className="tcp-specs">
              {active.map((s: any) => (
                <li key={s.id}>
                  <span className="tcp-spec-icon"><Wrench size={16} aria-hidden /></span>
                  <span className="tcp-spec-name"><strong>{s.name}</strong><small>{s.categoryName}</small></span>
                  <span className={cn("tcp-level", `lv-${String(s.level).toLowerCase()}`)}>{enumLabel("ExperienceLevel", s.level)}</span>
                </li>
              ))}
            </ul>
            {x.skills?.length > 0 && (
              <>
                <h3 className="tcp-sub">{k("skills")}</h3>
                <div className="tcp-chips">{x.skills.map((s: string) => <span key={s}><Check size={13} aria-hidden /> {s}</span>)}</div>
              </>
            )}
          </section>

          <section className="info-section">
            <div className="tcp-reviews-head">
              <h2>{k("reviews")}</h2>
              <span className="tcp-score"><strong>{num(x.rating, 1)}</strong><StarRow value={x.rating} size={14} /><small>{k("reviewCount", { count: num(x.reviewCount) })}</small></span>
            </div>
            {!x.reviews.length ? <p className="text-muted">{t("shop.noReviews")}</p> : (
              <div className="tcp-reviews">
                {x.reviews.map((r: any) => (
                  <article key={r.id} className="svd-review">
                    <div className="svd-review-head">
                      <span className="pdp-avatar" aria-hidden>{r.authorName?.[0]}</span>
                      <div>
                        <strong>{r.authorName}</strong>
                        <small className="text-muted">{date(r.createdAt)}</small>
                      </div>
                      <StarRow value={r.rating} size={13} />
                    </div>
                    <p>{r.comment}</p>
                    {r.reply && <p className="tcp-reply"><MessageCircle size={14} aria-hidden /> {r.reply}</p>}
                    <div className="tcp-review-foot"><ReportReviewButton reviewId={r.id} reported={r.reported} /></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="tcp-aside">
          <section className="tcp-book" id="book" aria-labelledby="tcp-book-title">
            <h2 id="tcp-book-title">{k("bookWith")}</h2>
            {x.nextAvailableAt && <p className="tch-next"><CalendarClock size={15} aria-hidden /> {k("nextSlot", { at: dateTime(x.nextAvailableAt) })}</p>}
            {services.isLoading ? <Loading rows={3} /> : !canDo.length ? <p className="text-muted">{k("noServices")}</p> : (
              <ul className="tcp-services">
                {canDo.map((s: any) => (
                  <li key={s.id} className={`svc-tone-${s.imageTone ?? "teal"}`}>
                    <span className="svc-card-icon"><ServiceIcon name={s.icon} size={18} /></span>
                    <span className="tcp-service-name">
                      <Link to={`/services/${s.slug}`}>{text(s.name)}</Link>
                      <small>{s.price ? money(s.price) : t("site.serviceDetail.afterDiagnostics")}</small>
                    </span>
                    <Link to={`/services/${s.slug}/book?technicianId=${x.id}`} className="btn btn-sm primary">{t("site.card.book")}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {x.workingHours?.length > 0 && (
            <section className="info-section compact">
              <h2><Clock size={18} aria-hidden /> {k("workingHours")}</h2>
              <ul className="hours-list">
                {WEEK.map((d) => {
                  const h = x.workingHours.find((w: any) => w.day === d);
                  return <li key={d}><span>{t(`days.${d}`)}</span>{!h || h.off ? <em>{k("dayOff")}</em> : <strong>{h.from}–{h.to}</strong>}</li>;
                })}
              </ul>
            </section>
          )}

          {x.zoneNames?.length > 0 && (
            <section className="info-section compact">
              <h2><MapPin size={18} aria-hidden /> {k("zones")}</h2>
              <ul className="tcp-zones">{x.zoneNames.map((z: string) => <li key={z}>{z}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planlar (§42–43)                                                     */
/* ------------------------------------------------------------------ */

const PERIODS: [string, number][] = [["MONTH_1", 1], ["MONTH_3", 3], ["MONTH_6", 6], ["MONTH_12", 12]];
const TIER_ICON = [Star, Sparkles, Crown];

export function PricingPage() {
  const { t, text, money, enumLabel } = useI18n();
  const { navigate, query, setQuery } = useRouter();
  const { user } = useSession();
  const group = query.get("group") === "TECHNICIAN" ? "TECHNICIAN" : "CUSTOMER";
  const [period, setPeriod] = useState("MONTH_1");
  const plans = useApi<any[]>(`/plans?group=${group}`);
  const defs = useApi<any[]>("/entitlement-definitions", { staleTime: Infinity });
  const faq = useApi<any>("/faq?pageSize=100");
  const k = (key: string, vars?: Record<string, string | number>) => t(`pricingPage.${key}`, vars);
  const months = PERIODS.find(([p]) => p === period)?.[1] ?? 1;

  const priceOf = (p: any, per: string) => p.prices.find((x: any) => x.period === per && x.enabled);
  const savingOf = (p: any, per: string, m: number) => {
    const base = Number(priceOf(p, "MONTH_1")?.price.amount ?? 0);
    const cur = Number(priceOf(p, per)?.price.amount ?? 0);
    return base && cur && m > 1 ? Math.round((1 - cur / (base * m)) * 100) : 0;
  };
  const maxSaving = (per: string, m: number) => Math.max(0, ...(plans.data ?? []).map((p) => savingOf(p, per, m)));

  const onSelect = () => navigate(!user ? `/login?next=${group === "TECHNICIAN" ? "/become-technician" : "/account/subscription"}` : group === "TECHNICIAN" ? (user.activeRole === "TECHNICIAN" ? "/technician/subscription" : "/become-technician") : "/account/subscription");
  const faqItems = (faq.data?.items ?? []).filter((f: any) => f.category === "subscription" || f.category === (group === "TECHNICIAN" ? "technicians" : "payment"));

  const cell = (d: any, v: unknown) => {
    if (v === undefined || v === false || v === 0 || v === "0") return <X size={16} className="prc-no" aria-label={t("plans.notIncluded")} />;
    if (v === true) return <CheckCircle2 size={18} className="prc-yes" aria-label={t("plans.included")} />;
    if (v === "UNLIMITED") return <strong>{t("plans.unlimited")}</strong>;
    return <strong>{d.valueType === "PERCENT" ? `${v}%` : String(v)}</strong>;
  };

  return (
    <div className="info-page prc">
      <InfoHero eyebrow={k("eyebrow")} title={k("title")} text={k("text")} center>
        <div className="prc-controls">
          <div className="prc-toggle" role="radiogroup" aria-label={k("audience")}>
            {["CUSTOMER", "TECHNICIAN"].map((g) => (
              <button key={g} type="button" role="radio" aria-checked={group === g} className={cn(group === g && "active")} onClick={() => setQuery({ group: g === "CUSTOMER" ? null : g })}>
                {g === "CUSTOMER" ? <Users size={16} aria-hidden /> : <Wrench size={16} aria-hidden />} {enumLabel("PlanGroup", g)}
              </button>
            ))}
          </div>
          <div className="prc-periods" role="radiogroup" aria-label={k("billing")}>
            {PERIODS.map(([p, m]) => {
              const s = maxSaving(p, m);
              return (
                <button key={p} type="button" role="radio" aria-checked={period === p} className={cn(period === p && "active")} onClick={() => setPeriod(p)}>
                  {enumLabel("BillingPeriod", p)}{s > 0 && <span className="prc-save">{k("save", { pct: s })}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </InfoHero>

      <div className="container info-body">
        <QueryView query={plans}>
          {(list) => {
            const groupDefs = (defs.data ?? []).filter((d) => d.group === group && list.some((p) => p.entitlements[d.code] !== undefined));
            return (
              <>
                <div className={cn("prc-plans", `n-${list.length}`)}>
                  {list.map((p) => {
                    const price = priceOf(p, period) ?? p.prices[0];
                    const free = Number(price.price.amount) === 0;
                    const Icon = TIER_ICON[Math.min(p.tier ?? 0, TIER_ICON.length - 1)] ?? Star;
                    const saving = savingOf(p, period, months);
                    const rows = groupDefs.slice(0, 8);
                    return (
                      <article key={p.id} className={cn("prc-plan", p.highlight && "is-featured")}>
                        {p.highlight && <span className="prc-flag"><Sparkles size={14} aria-hidden /> {t("plans.popular")}</span>}
                        <div className="prc-plan-head">
                          <span className="prc-plan-icon"><Icon size={20} aria-hidden /></span>
                          <h2>{text(p.name)}</h2>
                        </div>
                        <p className="prc-plan-desc">{text(p.description)}</p>
                        <div className="prc-price">
                          {free ? <strong>{t("plans.free")}</strong> : <><strong>{money(price.price)}</strong><span>/ {enumLabel("BillingPeriod", price.period)}</span></>}
                        </div>
                        <p className="prc-price-sub">
                          {!free && months > 1 ? k("perMonth", { price: money({ amount: (Number(price.price.amount) / months).toFixed(2), currency: price.price.currency }) }) : " "}
                          {saving > 0 && <span className="prc-save">{k("save", { pct: saving })}</span>}
                        </p>
                        <button type="button" className={cn("btn w-full btn-lg", p.highlight ? "primary" : "outline")} onClick={onSelect}>{t("plans.choose")}</button>
                        <p className="prc-trial">{p.trialDays ? <><Timer size={14} aria-hidden /> {t("plans.trial", { days: p.trialDays })}</> : " "}</p>
                        <h3 className="prc-inc">{k("highlights")}</h3>
                        <ul className="prc-features">
                          {rows.map((d) => {
                            const v = p.entitlements[d.code];
                            const off = v === undefined || v === false || v === 0;
                            return (
                              <li key={d.code} className={cn(off && "off")}>
                                {off ? <Minus size={16} aria-hidden /> : <Check size={16} aria-hidden />}
                                <span>{text(d.label)}{!off && typeof v !== "boolean" && <strong>{v === "UNLIMITED" ? t("plans.unlimited") : d.valueType === "PERCENT" ? `${v}%` : String(v)}</strong>}</span>
                              </li>
                            );
                          })}
                        </ul>
                        {groupDefs.length > rows.length && <a className="prc-more" href="#compare">{k("moreFeatures", { count: groupDefs.length - rows.length })} <ChevronDown size={14} aria-hidden /></a>}
                      </article>
                    );
                  })}
                </div>

                <ul className="prc-guarantees">
                  <li><RotateCcw size={18} aria-hidden /> {k("guarantee1")}</li>
                  <li><CreditCard size={18} aria-hidden /> {k("guarantee2")}</li>
                  <li><FileText size={18} aria-hidden /> {k("guarantee3")}</li>
                </ul>

                <section className="info-section prc-compare" id="compare">
                  <h2>{k("compareTitle")}</h2>
                  <div className="prc-table-wrap">
                    <table className="prc-table">
                      <thead>
                        <tr>
                          <th scope="col">{t("plans.feature")}</th>
                          {list.map((p) => {
                            const price = priceOf(p, period) ?? p.prices[0];
                            return (
                              <th key={p.id} scope="col" className={cn(p.highlight && "is-featured")}>
                                <span>{text(p.name)}</span>
                                <small>{Number(price.price.amount) === 0 ? t("plans.free") : money(price.price)}</small>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {groupDefs.map((d) => (
                          <tr key={d.code}>
                            <th scope="row">{text(d.label)}</th>
                            {list.map((p) => <td key={p.id} className={cn(p.highlight && "is-featured")}>{cell(d, p.entitlements[d.code])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="prc-note">{group === "TECHNICIAN" ? k("technicianNote") : k("customerNote")}</p>
                </section>
              </>
            );
          }}
        </QueryView>

        {faqItems.length > 0 && (
          <section className="info-section">
            <h2>{k("faqTitle")}</h2>
            <div className="svd-faq">
              {faqItems.map((f: any) => (
                <details key={f.id}>
                  <summary>{f.question}<ChevronDown size={18} aria-hidden /></summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="svc-help info-cta">
          <span className="svc-help-icon"><Headset size={28} aria-hidden /></span>
          <div className="svc-help-copy">
            <h2>{k("helpTitle")}</h2>
            <p>{k("helpText")}</p>
          </div>
          <Link to="/contact" className="btn primary btn-lg">{k("helpCta")} <ArrowRight size={18} aria-hidden /></Link>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filiallar                                                            */
/* ------------------------------------------------------------------ */

/** Bakı vaxtı ilə həftə günü və dəqiqə — SSR ilə uyğunsuzluq olmasın deyə yalnız mount-dan sonra hesablanır. */
function useBakuNow() {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => {
    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Baku", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      setNow({ day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) });
    };
    tick();
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, []);
  return now;
}

const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };

function openState(hours: any[], now: { day: number; minutes: number } | null) {
  if (!now) return null;
  const h = hours.find((x) => x.day === now.day);
  if (!h || h.closed || !h.from || !h.to) return { open: false as const };
  return now.minutes >= toMinutes(h.from) && now.minutes < toMinutes(h.to) ? { open: true as const, until: h.to as string } : { open: false as const };
}

/** Eyni saatlı ardıcıl günləri birləşdirir: "B.e.–C. 09:00–19:00". */
function groupHours(hours: any[]) {
  const out: { from: number; to: number; value: string | null }[] = [];
  for (const d of WEEK) {
    const h = hours.find((x) => x.day === d);
    const value = !h || h.closed ? null : `${h.from}–${h.to}`;
    const last = out[out.length - 1];
    if (last && last.value === value) last.to = d;
    else out.push({ from: d, to: d, value });
  }
  return out;
}

export function BranchesPage() {
  const { t } = useI18n();
  const q = useApi<any>("/branches");
  const [focus, setFocus] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const now = useBakuNow();
  const mobile = useMedia("(max-width: 767px)");
  const mapRef = useRef<HTMLDivElement>(null);
  const k = (key: string, vars?: Record<string, string | number>) => t(`branchesPage.${key}`, vars);
  const all: any[] = q.data?.items ?? [];
  const cities = [...new Set(all.map((b) => b.city))];

  const show = (id: string) => {
    setFocus(id);
    if (mobile) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="info-page brn">
      <InfoHero
        eyebrow={k("eyebrow")}
        title={k("title")}
        text={k("heroText")}
        aside={<HeroStats items={[
          { icon: <Store size={18} />, value: all.length, label: k("statBranches") },
          { icon: <MapPin size={18} />, value: cities.length, label: k("statCities") },
          { icon: <Wrench size={18} />, value: all.filter((b) => b.hasServiceCenter).length, label: k("statCenters") },
        ]} />}
      />

      <div className="container info-body">
        <QueryView query={q}>
          {(d) => {
            const items = d.items.filter((b: any) => !city || b.city === city);
            const f = d.items.find((b: any) => b.id === focus);
            return (
              <>
                {cities.length > 1 && (
                  <nav className="info-chips" aria-label={t("fields.city")}>
                    <button type="button" className={cn("info-chip", !city && "active")} aria-pressed={!city} onClick={() => { setCity(""); setFocus(null); }}>{k("allCities")} <small>{d.items.length}</small></button>
                    {cities.map((c) => (
                      <button key={c} type="button" className={cn("info-chip", city === c && "active")} aria-pressed={city === c} onClick={() => { setCity(c); setFocus(null); }}>
                        <MapPin size={15} aria-hidden /> {c} <small>{d.items.filter((b: any) => b.city === c).length}</small>
                      </button>
                    ))}
                  </nav>
                )}
                <div className="brn-layout">
                  <div className="brn-map" ref={mapRef}>
                    <MapView
                      height={mobile ? 280 : 600}
                      zoom={f ? 14 : city ? 11 : 7}
                      center={f?.location ?? (city && items.length ? { lat: items.reduce((s: number, b: any) => s + b.location.lat, 0) / items.length, lng: items.reduce((s: number, b: any) => s + b.location.lng, 0) / items.length } : undefined)}
                      points={items.map((b: any) => ({ id: b.id, lat: b.location.lat, lng: b.location.lng, label: b.name, tone: b.id === focus ? "accent" : undefined, onClick: () => setFocus(b.id) }))}
                    />
                    {f && (
                      <div className="brn-map-card">
                        <span className="brn-map-card-copy"><small>{k("selected")}</small><strong>{f.name}</strong></span>
                        <button type="button" className="btn btn-sm outline" onClick={() => setFocus(null)}><LocateFixed size={14} aria-hidden /> {k("allCities")}</button>
                      </div>
                    )}
                  </div>
                  <ul className="brn-list">
                    {items.map((b: any) => {
                      const st = openState(b.workingHours, now);
                      return (
                        <li key={b.id}>
                          <article className={cn("brn-card", focus === b.id && "is-active")}>
                            <div className="brn-head">
                              <span className="brn-icon">{b.hasServiceCenter ? <Wrench size={20} aria-hidden /> : <Store size={20} aria-hidden />}</span>
                              <div className="brn-title">
                                <h2>{b.name}</h2>
                                {b.hasServiceCenter && <span className="brn-tag">{k("serviceCenter")}</span>}
                              </div>
                              {st && <span className={cn("brn-status", st.open ? "open" : "closed")}>{st.open ? k("openNow", { time: st.until }) : k("closedNow")}</span>}
                            </div>
                            <ul className="brn-info">
                              <li><MapPin size={16} aria-hidden /> <span>{b.city}, {b.address}</span></li>
                              <li><Phone size={16} aria-hidden /> <a href={telHref(b.phone)}>{b.phone}</a></li>
                              {b.email && <li><Mail size={16} aria-hidden /> <a href={`mailto:${b.email}`}>{b.email}</a></li>}
                            </ul>
                            <div className="brn-hours">
                              <span className="brn-hours-title"><Clock size={16} aria-hidden /> {k("hours")}</span>
                              <dl>
                                {groupHours(b.workingHours).map((g) => (
                                  <div key={g.from} className={cn(!g.value && "closed")}>
                                    <dt>{g.from === g.to ? t(`daysShort.${g.from}`) : `${t(`daysShort.${g.from}`)}–${t(`daysShort.${g.to}`)}`}</dt>
                                    <dd>{g.value ?? k("closed")}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                            <ul className="brn-features">
                              {(b.hasServiceCenter ? ["featureDevice", "featureWarranty", "featurePickup"] : ["featurePickup", "featureConsult"]).map((key) => <li key={key}><Check size={14} aria-hidden /> {k(key)}</li>)}
                            </ul>
                            <div className="brn-actions">
                              <button type="button" className="btn btn-sm outline" onClick={() => show(b.id)} aria-pressed={focus === b.id}><MapPin size={15} aria-hidden /> {k("showOnMap")}</button>
                              <a className="btn btn-sm outline" href={`https://www.google.com/maps/dir/?api=1&destination=${b.location.lat},${b.location.lng}`} target="_blank" rel="noopener noreferrer"><Navigation size={15} aria-hidden /> {k("directions")}</a>
                              <a className="btn btn-sm primary" href={telHref(b.phone)}><Phone size={15} aria-hidden /> {k("call")}</a>
                            </div>
                            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: `besqardasServis.az — ${b.name}`, address: `${b.city}, ${b.address}`, telephone: b.phone, geo: { "@type": "GeoCoordinates", latitude: b.location.lat, longitude: b.location.lng } }) }} />
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            );
          }}
        </QueryView>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                  */
/* ------------------------------------------------------------------ */

const FAQ_ICONS: Record<string, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  orders: ClipboardList, estimate: FileText, payment: CreditCard, warranty: ShieldCheck, subscription: Crown, technicians: Users, delivery: Truck,
};
const FAQ_TOPICS = ["orders", "estimate", "payment", "warranty", "subscription", "technicians", "delivery"];

export function FaqPage() {
  const { t } = useI18n();
  const { query, setQuery } = useRouter();
  const q = useApi<any>("/faq?pageSize=100");
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  const k = (key: string, vars?: Record<string, string | number>) => t(`faqPage.${key}`, vars);
  const search = query.get("q") ?? "";
  const topic = query.get("topic") ?? "";
  const label = (c: string) => (FAQ_TOPICS.includes(c) ? k(`categories.${c}`) : k("categories.other"));
  const Icon = (c: string) => FAQ_ICONS[c] ?? HelpCircle;
  const phone = brand.data?.contacts?.phone as string | undefined;

  return (
    <div className="info-page faq">
      <InfoHero eyebrow={k("eyebrow")} title={k("title")} text={k("text")} center>
        <HeroSearch value={search} onChange={(v) => setQuery({ q: v || null }, { replace: true })} placeholder={k("searchPlaceholder")} />
      </InfoHero>

      <div className="container info-body">
        <QueryView query={q}>
          {(d) => {
            const needle = search.trim().toLocaleLowerCase();
            const all: any[] = d.items;
            const topics = [...new Set(all.map((f) => f.category as string))];
            const matches = all.filter((f) => !needle || `${f.question} ${f.answer}`.toLocaleLowerCase().includes(needle));
            const visible = matches.filter((f) => !topic || f.category === topic);
            const groups = topics.map((c) => ({ c, items: visible.filter((f) => f.category === c) })).filter((g) => g.items.length);
            return (
              <div className="faq-layout">
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: all.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }) }} />
                <aside className="faq-aside">
                  <nav className="faq-topics" aria-label={k("topics")}>
                    <button type="button" className={cn("faq-topic", !topic && "active")} aria-pressed={!topic} onClick={() => setQuery({ topic: null })}>
                      <span className="faq-topic-icon"><HelpCircle size={18} aria-hidden /></span>
                      <span className="faq-topic-name">{k("all")}</span>
                      <small>{matches.length}</small>
                    </button>
                    {topics.map((c) => {
                      const I = Icon(c);
                      return (
                        <button key={c} type="button" className={cn("faq-topic", topic === c && "active")} aria-pressed={topic === c} onClick={() => setQuery({ topic: c })}>
                          <span className="faq-topic-icon"><I size={18} aria-hidden /></span>
                          <span className="faq-topic-name">{label(c)}</span>
                          <small>{matches.filter((f) => f.category === c).length}</small>
                        </button>
                      );
                    })}
                  </nav>
                  <div className="faq-links">
                    <h2>{k("quickLinks")}</h2>
                    <Link to="/warranty/verify"><ShieldCheck size={16} aria-hidden /> {k("quickWarranty")} <ArrowRight size={14} aria-hidden /></Link>
                    <Link to="/pricing"><Crown size={16} aria-hidden /> {t("nav.pricing")} <ArrowRight size={14} aria-hidden /></Link>
                    <Link to="/branches"><Store size={16} aria-hidden /> {t("nav.branches")} <ArrowRight size={14} aria-hidden /></Link>
                  </div>
                </aside>

                <div className="faq-main">
                  <p className="faq-count" role="status">{k("resultCount", { count: visible.length })}</p>
                  {!groups.length ? (
                    <div className="info-empty">
                      <Search size={40} aria-hidden />
                      <h2>{k("emptyTitle")}</h2>
                      <p>{k("emptyText")}</p>
                      <Link to="/contact" className="btn outline">{k("writeUs")}</Link>
                    </div>
                  ) : groups.map((g) => {
                    const I = Icon(g.c);
                    return (
                      <section key={g.c} className="faq-group">
                        <h2><span className="faq-topic-icon"><I size={18} aria-hidden /></span> {label(g.c)}</h2>
                        <div className="svd-faq">
                          {g.items.map((f) => (
                            <details key={f.id} open={!!needle}>
                              <summary>{f.question}<ChevronDown size={18} aria-hidden /></summary>
                              <p>{f.answer}</p>
                            </details>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  <section className="faq-still">
                    <span className="svc-help-icon"><Headset size={26} aria-hidden /></span>
                    <div>
                      <h2>{k("stillTitle")}</h2>
                      <p>{k("stillText")}</p>
                    </div>
                    <div className="faq-still-actions">
                      <Link to="/contact" className="btn primary"><Send size={16} aria-hidden /> {k("writeUs")}</Link>
                      {phone && <a className="btn outline" href={telHref(phone)}><Phone size={16} aria-hidden /> {phone}</a>}
                    </div>
                  </section>
                </div>
              </div>
            );
          }}
        </QueryView>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Əlaqə                                                                */
/* ------------------------------------------------------------------ */

const TOPICS = ["General", "Order", "Warranty", "Business", "Feedback"];

export function ContactPage() {
  const { t } = useI18n();
  const brand = useApi<any>("/branding");
  const branches = useApi<any>("/branches");
  const form = useFormState({ name: "", phone: "", email: "", topic: "General", orderNumber: "", message: "", consent: false });
  const [sent, setSent] = useState(false);
  const v = form.values;
  const k = (key: string, vars?: Record<string, string | number>) => t(`contactPage.${key}`, vars);
  const c = brand.data?.contacts;
  const office = branches.data?.items?.find((b: any) => b.hasServiceCenter) ?? branches.data?.items?.[0];

  const channels = c ? [
    { key: "phone", icon: Phone, title: k("phone"), value: c.phone, desc: k("phoneDesc"), href: telHref(c.phone), action: k("callAction") },
    { key: "hotline", icon: Headset, title: k("hotline"), value: c.hotline, desc: k("hotlineDesc"), href: telHref(c.hotline), action: k("callAction") },
    { key: "whatsapp", icon: MessageCircle, title: "WhatsApp", value: c.whatsapp, desc: k("whatsappDesc"), href: `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}`, action: k("whatsappAction") },
    { key: "email", icon: Mail, title: t("email"), value: c.email, desc: k("emailDesc"), href: `mailto:${c.email}`, action: k("emailAction") },
  ].filter((x) => x.value) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      ...(v.name.trim() ? {} : { name: ["validation.required"] }),
      ...(v.message.trim().length < 10 ? { message: ["validation.commentMin"] } : {}),
      ...(v.consent ? {} : { consent: ["validation.acceptTerms"] }),
    };
    if (Object.keys(errors).length) { form.setErrors(errors); return; }
    setSent(true);
  };

  return (
    <div className="info-page cnt">
      <InfoHero eyebrow={k("eyebrow")} title={k("title")} text={k("text")} />

      <div className="container info-body">
        {channels.length > 0 && (
          <ul className="cnt-channels">
            {channels.map((ch) => (
              <li key={ch.key} className={`cnt-channel ch-${ch.key}`}>
                <span className="cnt-channel-icon"><ch.icon size={22} aria-hidden /></span>
                <span className="cnt-channel-title">{ch.title}</span>
                <strong className="cnt-channel-value">{ch.value}</strong>
                <span className="cnt-channel-desc">{ch.desc}</span>
                <a className="cnt-channel-action" href={ch.href} {...(ch.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{ch.action} <ArrowRight size={15} aria-hidden /></a>
              </li>
            ))}
          </ul>
        )}

        <div className="cnt-layout">
          <section className="info-section cnt-form" aria-labelledby="cnt-form-title">
            <h2 id="cnt-form-title">{k("write")}</h2>
            {sent ? (
              <div className="cnt-sent" role="status">
                <span className="cnt-sent-icon"><CheckCircle2 size={36} aria-hidden /></span>
                <h3>{k("sentTitle")}</h3>
                <p>{k("sent")}</p>
                <button type="button" className="btn outline" onClick={() => { form.reset(); setSent(false); }}>{k("sendAnother")}</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="cnt-form-text">{k("formText")}</p>
                <fieldset className="cnt-topics">
                  <legend>{k("topic")}</legend>
                  {TOPICS.map((tp) => (
                    <label key={tp} className={cn("cnt-topic", v.topic === tp && "active")}>
                      <input type="radio" name="topic" value={tp} checked={v.topic === tp} onChange={() => form.set("topic", tp)} />
                      {k(`topic${tp}`)}
                    </label>
                  ))}
                </fieldset>
                <div className="cnt-row">
                  <TextField label={k("name")} required value={v.name} onValue={(x) => form.set("name", x)} error={form.errors.name} autoComplete="name" />
                  <PhoneField label={t("auth.phone")} value={v.phone} onValue={(x) => form.set("phone", x)} />
                </div>
                <div className="cnt-row">
                  <TextField label={<>{t("email")} <small className="text-muted">({k("optional")})</small></>} type="email" value={v.email} onValue={(x) => form.set("email", x)} autoComplete="email" />
                  {v.topic === "Order" || v.topic === "Warranty" ? (
                    <TextField label={<>{k("orderNumber")} <small className="text-muted">({k("optional")})</small></>} value={v.orderNumber} onValue={(x) => form.set("orderNumber", x.toUpperCase())} placeholder="SV-1001" />
                  ) : <span className="cnt-row-spacer" />}
                </div>
                <TextArea label={k("message")} required rows={5} value={v.message} onValue={(x) => form.set("message", x)} error={form.errors.message} />
                <label className="kit-check"><input type="checkbox" checked={v.consent} onChange={(e) => form.set("consent", e.target.checked)} /><span>{k("consent")}</span></label>
                {form.errors.consent && <p className="kit-field-error">{t("validation.acceptTerms")}</p>}
                <button className="btn primary btn-lg cnt-submit"><Send size={18} aria-hidden /> {k("send")}</button>
              </form>
            )}
          </section>

          <aside className="cnt-aside">
            <section className="info-section compact cnt-office">
              <h2><Store size={18} aria-hidden /> {k("office")}</h2>
              {office && <MapView height={190} zoom={14} center={office.location} points={[{ id: office.id, lat: office.location.lat, lng: office.location.lng, label: office.name }]} className="cnt-map" />}
              {c?.address && <p className="cnt-line"><MapPin size={16} aria-hidden /> {c.address}</p>}
              {office && (
                <ul className="hours-list">
                  {groupHours(office.workingHours).map((g) => (
                    <li key={g.from}>
                      <span>{g.from === g.to ? t(`days.${g.from}`) : `${t(`days.${g.from}`)} – ${t(`days.${g.to}`)}`}</span>
                      {g.value ? <strong>{g.value}</strong> : <em>{t("branchesPage.closed")}</em>}
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/branches" className="btn outline w-full mt-3"><MapPin size={16} aria-hidden /> {t("nav.branches")}</Link>
            </section>

            {brand.data && (
              <section className="info-section compact">
                <h2><FileText size={18} aria-hidden /> {k("requisites")}</h2>
                <dl className="cnt-req">
                  <div><dt>{brand.data.legalName}</dt><dd>{t("docs.voen")}: {brand.data.voen}</dd></div>
                </dl>
                {brand.data.social && Object.keys(brand.data.social).length > 0 && (
                  <>
                    <h3 className="tcp-sub">{k("social")}</h3>
                    <div className="cnt-social">
                      {Object.entries(brand.data.social as Record<string, string>).map(([name, url]) => (
                        <a key={name} href={url} target="_blank" rel="noopener noreferrer"><Globe size={15} aria-hidden /> {name[0]!.toUpperCase() + name.slice(1)}</a>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
