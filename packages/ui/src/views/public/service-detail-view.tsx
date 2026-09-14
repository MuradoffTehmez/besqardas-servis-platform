"use client";
import React from "react";
import { BadgeCheck, CalendarCheck, CheckCircle2, ChevronDown, Clock, FileText, MapPin, Phone, ShieldCheck, Star, UserCheck, Wrench } from "lucide-react";
import { cn } from "@sp/utils";
import { ServiceIcon } from "../../components/domain/service-icon";
import { anchorProps } from "../../components/nav-anchor";
import { useI18n } from "../../app/core/i18n";

export interface ServiceDetailViewProps {
  service: any;
  fees?: { fees: { label: string; amount?: { amount: string; currency: string } | null }[]; cancellationTerms?: string } | null;
  locale?: "az" | "ru" | "en";
  supportPhone?: string | null;
  onNavigate: (href: string) => void;
  onBook: (problemCode?: string) => void;
}

/** Xidmət detalı (§10, §14, §20): təsvir, problemlər, icra ardıcıllığı, haqlar, FAQ, rəylər və oxşar xidmətlər. */
export function ServiceDetailView({ service: s, fees, locale = "az", supportPhone, onNavigate, onBook }: ServiceDetailViewProps) {
  const { t, text, money, minutes, num, date, enumLabel } = useI18n();
  if (!s) return null;
  const k = (key: string, vars?: Record<string, string | number>) => t(`site.serviceDetail.${key}`, vars);
  const link = (href: string) => anchorProps(locale, href, onNavigate);
  const name = text(s.name);
  const priceTitle = !s.price ? t("site.card.price") : s.priceModel === "STARTING_FROM" ? k("priceFrom") : k("priceFixed");
  const steps = [1, 2, 3, 4, 5];
  const telHref = supportPhone ? `tel:${supportPhone.replace(/[^\d+*]/g, "")}` : null;

  return (
    <div className={cn("svd", `svc-tone-${s.imageTone ?? "teal"}`)}>
      <section className="svd-hero">
        <div className="container">
          <nav className="pg-crumbs" aria-label={t("common.breadcrumbs")}>
            <a {...link("/")}>{t("home")}</a> › <a {...link("/services")}>{t("services")}</a> › <span aria-current="page">{name}</span>
          </nav>
          <div className="svd-hero-grid">
            <div className="svd-hero-copy">
              <div className="svd-eyebrow">
                <span className="svc-card-icon"><ServiceIcon name={s.icon} size={24} /></span>
                <span>{text(s.categoryName)}</span>
              </div>
              <h1>{name}</h1>
              {s.shortDescription && <p className="svd-lead">{text(s.shortDescription)}</p>}
              <ul className="svd-facts">
                {s.rating ? <li><Star size={16} fill="currentColor" className="svc-star" aria-hidden /> <strong>{num(s.rating, 1)}</strong> <span>· {k("completed", { count: num(s.completedCount ?? 0) })}</span></li> : null}
                {s.estimatedDurationMinutes ? <li><Clock size={16} aria-hidden /> {minutes(s.estimatedDurationMinutes)}</li> : null}
                {s.workWarrantyMonths ? <li><ShieldCheck size={16} aria-hidden /> {k("warranty", { months: s.workWarrantyMonths })}</li> : null}
                {s.executionForms?.length ? <li><MapPin size={16} aria-hidden /> {s.executionForms.map((f: string) => enumLabel("ExecutionForm", f)).join(", ")}</li> : null}
                {s.assignmentMethod === "CUSTOMER_CHOICE" && <li><UserCheck size={16} aria-hidden /> {k("chooseTechnician")}</li>}
              </ul>

              {s.problems?.length > 0 && (
                <div className="svd-problems">
                  <h2>{k("problemsTitle")}</h2>
                  <p className="text-muted">{k("problemsHint")}</p>
                  <div className="svd-problem-list">
                    {s.problems.map((p: any) => (
                      <button key={p.code} type="button" className="svd-problem" onClick={() => onBook(p.code)}>
                        <Wrench size={15} aria-hidden /> {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="svd-book" aria-label={t("book")}>
              <div className="svd-book-card">
                <small className="svd-book-label">{priceTitle}</small>
                <strong className="svd-book-price">{s.price ? money(s.price) : k("afterDiagnostics")}</strong>
                <p className="svd-book-note">{s.priceModel === "STARTING_FROM" ? k("startingNote") : k("fixedNote")}</p>
                <button type="button" className="btn primary btn-lg w-full" onClick={() => onBook()}>
                  <CalendarCheck size={18} aria-hidden /> {t("book")}
                </button>
                {telHref && (
                  <a className="btn outline w-full" href={telHref}><Phone size={16} aria-hidden /> {supportPhone}</a>
                )}
                <ul className="svd-trust">
                  <li><CheckCircle2 size={16} aria-hidden /> {k("trust1")}</li>
                  <li><FileText size={16} aria-hidden /> {k("trust2")}</li>
                  <li><BadgeCheck size={16} aria-hidden /> {k("trust3")}</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="container svd-body">
        <section className="svd-section">
          <h2>{k("steps")}</h2>
          <ol className="svd-steps">
            {steps.map((n) => (
              <li key={n}>
                <span className="svd-step-num" aria-hidden>{n}</span>
                <div>
                  <h3>{k(`step${n}`)}</h3>
                  <p>{k(`step${n}Desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="svd-two">
          <section className="svd-section">
            <h2>{k("about")}</h2>
            {s.description && <p className="svd-text">{text(s.description)}</p>}
            <ul className="svd-included">
              {[1, 2, 3, 4].map((n) => <li key={n}><CheckCircle2 size={18} aria-hidden /> {k(`included${n}`)}</li>)}
            </ul>
          </section>

          <section className="svd-section">
            <h2>{t("serviceInfo.feesTitle")}</h2>
            {fees ? (
              <>
                {fees.fees.length > 0 && (
                  <ul className="svd-fees">
                    {fees.fees.map((f, i) => <li key={i}><span>{text(f.label)}</span>{f.amount && <strong>{Number(f.amount.amount) ? money(f.amount) : t("shop.free")}</strong>}</li>)}
                  </ul>
                )}
                {fees.cancellationTerms && <p className="svd-terms">{fees.cancellationTerms}</p>}
              </>
            ) : (
              <p className="text-muted">{t("common.loading")}</p>
            )}
          </section>
        </div>

        {s.faq?.length > 0 && (
          <section className="svd-section">
            <h2>{t("serviceInfo.faq")}</h2>
            <div className="svd-faq">
              {s.faq.map((f: any, i: number) => (
                <details key={i} open={i === 0}>
                  <summary>{f.q}<ChevronDown size={18} aria-hidden /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {s.reviews?.length > 0 && (
          <section className="svd-section">
            <h2>{k("reviewsTitle")}</h2>
            <div className="svd-reviews">
              {s.reviews.map((r: any) => (
                <article key={r.id} className="svd-review">
                  <div className="svd-review-head">
                    <span className="pdp-avatar" aria-hidden>{r.authorName?.[0]}</span>
                    <div>
                      <strong>{r.authorName}</strong>
                      <small className="text-muted">{date(r.createdAt)}</small>
                    </div>
                    <span className="svd-review-stars" aria-label={t("common.ratingOf", { value: r.rating })}>
                      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cn(n > r.rating && "off")}>★</span>)}
                    </span>
                  </div>
                  <p>“{r.comment}”</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {s.related?.length > 0 && (
          <section className="svd-section svd-related">
            <h2>{t("serviceInfo.related")}</h2>
            <div className="svd-related-list">
              {s.related.map((r: any) => (
                <a key={r.id} className={cn("svd-related-item", `svc-tone-${r.imageTone ?? "teal"}`)} {...link(`/services/${r.slug}`)}>
                  <span className="svc-card-icon"><ServiceIcon name={r.icon} size={20} /></span>
                  <span className="grow">
                    <strong>{text(r.nameI18n ?? r.name)}</strong>
                    <small>{r.price ? `${r.priceModel === "STARTING_FROM" ? `${k("priceFrom")}: ` : ""}${money(r.price)}` : k("afterDiagnostics")}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobil: altda sabit sifariş paneli */}
      <div className="svd-bar">
        <div>
          <small>{priceTitle}</small>
          <strong>{s.price ? money(s.price) : k("afterDiagnostics")}</strong>
        </div>
        <button type="button" className="btn primary" onClick={() => onBook()}>{t("site.card.book")}</button>
      </div>
    </div>
  );
}
