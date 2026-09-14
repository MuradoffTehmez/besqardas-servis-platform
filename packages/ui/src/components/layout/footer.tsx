"use client";
import React from "react";
import { Wrench, Phone, Mail, ShieldCheck, MapPin } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";

export interface FooterProps {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  className?: string;
}

export function Footer({ companyName = "besqardasServis.az", phone, email, address, locale = "az", onNavigate, className }: FooterProps) {
  const { t } = useI18n();
  const link = (href: string) => anchorProps(locale, href, onNavigate);
  const columns: { title: string; links: [string, string][] }[] = [
    { title: t("site.footer.services"), links: [["/services", t("site.footer.allServices")], ["/shop", t("site.footer.shop")], ["/technicians", t("site.footer.technicians")], ["/pricing", t("site.footer.pricing")]] },
    { title: t("site.footer.company"), links: [["/about", t("about")], ["/branches", t("nav.branches")], ["/contact", t("contact")], ["/faq", t("site.footer.faq")]] },
    { title: t("site.footer.customerCare"), links: [["/warranty/verify", t("site.footer.warrantyVerify")], ["/become-technician", t("site.footer.becomeTech")], ["/business", t("site.footer.corporate")], ["/demo", t("site.footer.platformMap")]] },
  ];

  return (
    <footer className={cn("site-footer", className)}>
      <div className="container footer-grid">
        <div className="footer-col brand-col">
          <a className="brand-logo" {...link("/")}>
            <span className="logo-icon">
              <Wrench size={22} />
            </span>
            <span className="logo-text">
              <strong>besqardas</strong>
              <span className="logo-sub">{t("site.logoSub")}</span>
            </span>
          </a>
          <p className="footer-tagline">{t("site.footer.tagline")}</p>
          <div className="footer-guarantee">
            <ShieldCheck size={16} />
            <span>{t("site.footer.guarantee")}</span>
          </div>
        </div>

        {columns.map((col, i) => (
          <div className="footer-col" key={col.title}>
            <h2 className="footer-heading">{col.title}</h2>
            <ul className="footer-links">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <a {...link(href)}>{label}</a>
                </li>
              ))}
            </ul>
            {i === columns.length - 1 && (phone || email || address) && (
              <address className="footer-contacts">
                {phone && (
                  <a className="contact-item" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={15} />
                    <strong>{phone}</strong>
                  </a>
                )}
                {email && (
                  <a className="contact-item" href={`mailto:${email}`}>
                    <Mail size={15} />
                    <span>{email}</span>
                  </a>
                )}
                {address && (
                  <span className="contact-item">
                    <MapPin size={15} />
                    <span>{address}</span>
                  </span>
                )}
              </address>
            )}
          </div>
        ))}
      </div>

      <div className="container footer-bottom">
        <p>
          © {new Date().getFullYear()} {companyName}. {t("site.footer.rights")}
        </p>
        <div className="footer-bottom-links">
          <a {...link("/terms")}>{t("legal.terms")}</a>
          <span aria-hidden>·</span>
          <a {...link("/privacy")}>{t("legal.privacy")}</a>
        </div>
      </div>
    </footer>
  );
}
