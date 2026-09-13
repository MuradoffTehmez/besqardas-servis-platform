"use client";
import React from "react";
import { Wrench, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@sp/utils";

export interface FooterProps {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  className?: string;
}

export function Footer({
  companyName = "besqardasServis.az",
  phone = "+994 (12) 500-00-00",
  email = "info@besqardas.az",
  address = "Bakı şəhəri, Nərimanov r-nu",
  locale = "az",
  onNavigate,
  className,
}: FooterProps) {
  const t = {
    az: {
      services: "Xidmətlər",
      allServices: "Bütün xidmətlər",
      shop: "Məhsul və hissələr",
      technicians: "Peşəkar ustalar",
      pricing: "Abunəlik planları",
      company: "Şirkət",
      about: "Haqqımızda",
      branches: "Filiallar",
      contact: "Əlaqə",
      faq: "Tez-tez verilən suallar",
      customerCare: "Müştəri Xidmətləri",
      warrantyVerify: "Zəmanət yoxlanışı",
      becomeTech: "Usta kimi qoşul",
      corporate: "Korporativ müştərilər",
      rights: "Bütün hüquqlar qorunur.",
      guarantee: "Rəsmi zəmanət və peşəkar servis təminatı",
    },
    ru: {
      services: "Услуги",
      allServices: "Все услуги",
      shop: "Магазин и запчасти",
      technicians: "Мастера",
      pricing: "Тарифные планы",
      company: "Компания",
      about: "О нас",
      branches: "Филиалы",
      contact: "Контакты",
      faq: "Частые вопросы",
      customerCare: "Поддержка",
      warrantyVerify: "Проверка гарантии",
      becomeTech: "Стать мастером",
      corporate: "Корпоративным клиентам",
      rights: "Все права защищены.",
      guarantee: "Официальная гарантия и профессиональный сервис",
    },
    en: {
      services: "Services",
      allServices: "All services",
      shop: "Shop & spare parts",
      technicians: "Technicians",
      pricing: "Subscription plans",
      company: "Company",
      about: "About us",
      branches: "Branches",
      contact: "Contact",
      faq: "FAQ",
      customerCare: "Customer Care",
      warrantyVerify: "Warranty verification",
      becomeTech: "Become a technician",
      corporate: "Corporate clients",
      rights: "All rights reserved.",
      guarantee: "Official warranty & professional service delivery",
    },
  }[locale];

  return (
    <footer className={cn("site-footer", className)}>
      <div className="container footer-grid">
        {/* Brand Column */}
        <div className="footer-col brand-col">
          <button className="brand-logo" onClick={() => onNavigate("/")}>
            <span className="logo-icon">
              <Wrench size={22} />
            </span>
            <span className="logo-text">
              <strong>besqardas</strong>
              <span className="logo-sub">SERVİS</span>
            </span>
          </button>

          <p className="footer-tagline">
            Evinizin və müəssisənizin texniki avadanlıqlarının rəsmi quraşdırılması, təmiri və periodik servisi.
          </p>

          <div className="footer-guarantee">
            <ShieldCheck size={16} />
            <span>{t.guarantee}</span>
          </div>
        </div>

        {/* Services Links */}
        <div className="footer-col">
          <h4>{t.services}</h4>
          <ul className="footer-links">
            <li>
              <button onClick={() => onNavigate("/services")}>{t.allServices}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/shop")}>{t.shop}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/technicians")}>{t.technicians}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/pricing")}>{t.pricing}</button>
            </li>
          </ul>
        </div>

        {/* Company Links */}
        <div className="footer-col">
          <h4>{t.company}</h4>
          <ul className="footer-links">
            <li>
              <button onClick={() => onNavigate("/about")}>{t.about}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/branches")}>{t.branches}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/contact")}>{t.contact}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/faq")}>{t.faq}</button>
            </li>
          </ul>
        </div>

        {/* Customer Care & Contacts */}
        <div className="footer-col">
          <h4>{t.customerCare}</h4>
          <ul className="footer-links">
            <li>
              <button onClick={() => onNavigate("/warranty/verify")}>{t.warrantyVerify}</button>
            </li>
            <li>
              <button onClick={() => onNavigate("/become-technician")}>{t.becomeTech}</button>
            </li>
          </ul>

          <div className="footer-contacts">
            <div className="contact-item">
              <Phone size={15} />
              <strong>{phone}</strong>
            </div>
            <div className="contact-item">
              <Mail size={15} />
              <span>{email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          © {new Date().getFullYear()} {companyName}. {t.rights}
        </p>
        <div className="footer-bottom-links">
          <button onClick={() => onNavigate("/terms")}>İstifadə qaydaları</button>
          <span>·</span>
          <button onClick={() => onNavigate("/privacy")}>Məxfilik siyasəti</button>
        </div>
      </div>
    </footer>
  );
}
