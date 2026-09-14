"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Wrench,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  Search,
  ChevronDown,
  Globe,
  LogOut,
} from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../../app/core/i18n";
import { anchorProps } from "../nav-anchor";

export interface NavItem {
  label: string;
  href: string;
  badge?: string | number;
}

export interface HeaderProps {
  logoText?: string;
  navItems: NavItem[];
  currentPath: string;
  locale: "az" | "ru" | "en";
  cartCount?: number;
  user?: { fullName?: string; email?: string; role?: string; avatarUrl?: string | null } | null;
  /** Daxil olmuş istifadəçi üçün menyu bəndləri (kabinet bölmələri, panellər) */
  userMenu?: { label: string; href: string; icon?: React.ComponentType<{ size?: number }> }[];
  userMenuTitle?: string;
  logoutLabel?: string;
  onLogout?: () => void;
  onNavigate: (href: string) => void;
  onLocaleChange: (locale: "az" | "ru" | "en") => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

const LANGUAGE_NAMES = { az: "Azərbaycan", ru: "Русский", en: "English" } as const;

export function Header({
  logoText = "besqardas",
  navItems,
  currentPath,
  locale,
  cartCount = 0,
  user,
  onNavigate,
  onLocaleChange,
  onOpenCart,
  onOpenSearch,
  userMenu,
  userMenuTitle,
  logoutLabel,
  onLogout,
  className,
}: HeaderProps) {
  const { t } = useI18n();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!userOpen) return;
    const onDown = (e: MouseEvent) => { if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setUserOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [userOpen]);
  const hasMenu = !!user && !!userMenu?.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 1201px)");
    const closeOnResize = () => { if (media.matches) setMobileMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileMenuOpen(false); menuRef.current?.focus(); }
    };
    media.addEventListener("change", closeOnResize);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = overflow;
      media.removeEventListener("change", closeOnResize);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setLangDropdownOpen(false); langRef.current?.querySelector("button")?.focus(); }
    };
    if (langDropdownOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("keydown", handleEscape); };
    }
  }, [langDropdownOpen]);

  const link = (href: string) => anchorProps(locale, href, onNavigate, () => setMobileMenuOpen(false));
  const accountLabel = user ? user.fullName || t("site.myAccount") : t("login");

  return (
    <header className={cn("site-header", className)}>
      <div className="container header-inner">
        {/* Brend loqosu */}
        <a className="brand-logo" {...link("/")} aria-label={t("site.homeLink")}>
          <span className="logo-icon">
            <Wrench size={22} />
          </span>
          <span className="logo-text">
            <strong>{logoText}</strong>
            <span className="logo-sub">{t("site.logoSub")}</span>
          </span>
        </a>

        {/* Desktop naviqasiya */}
        <nav className="desktop-nav" aria-label={t("site.mainMenu")}>
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));
            return (
              <a
                key={item.href}
                className={cn("nav-link", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
                {...link(item.href)}
              >
                {item.label}
                {item.badge != null && <span className="nav-badge">{item.badge}</span>}
              </a>
            );
          })}
        </nav>

        {/* Əməliyyatlar */}
        <div className="header-actions">
          {onOpenSearch && (
            <button type="button" className="icon-button" aria-label={t("search.title")} onClick={onOpenSearch}>
              <Search size={20} />
            </button>
          )}

          {/* Dil seçimi */}
          <div className="lang-switcher" ref={langRef}>
            <button
              type="button"
              className="lang-toggle icon-button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-label={t("site.changeLanguage")}
              aria-expanded={langDropdownOpen}
              aria-controls="language-options"
            >
              <Globe size={18} />
              <span className="lang-current">{locale.toUpperCase()}</span>
              <ChevronDown size={14} />
            </button>

            {langDropdownOpen && (
              <div id="language-options" className="dropdown-menu lang-menu">
                {(["az", "ru", "en"] as const).map((l) => (
                  <button
                    type="button"
                    key={l}
                    lang={l}
                    className={cn("dropdown-item", locale === l && "active")}
                    onClick={() => {
                      onLocaleChange(l);
                      setLangDropdownOpen(false);
                    }}
                  >
                    {LANGUAGE_NAMES[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Səbət */}
          {onOpenCart && (
            <button type="button" className="cart-button icon-button" aria-label={t("site.cartWithCount", { count: cartCount })} onClick={onOpenCart}>
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}

          {/* İstifadəçi menyusu və ya giriş düyməsi */}
          <div className="lang-switcher" ref={userRef}>
            <button
              type="button"
              className="user-btn btn btn-sm outline"
              aria-haspopup={hasMenu ? "menu" : undefined}
              aria-expanded={hasMenu ? userOpen : undefined}
              onClick={() => (hasMenu ? setUserOpen((o) => !o) : onNavigate(user ? "/account" : "/login"))}
            >
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="user-btn-avatar" /> : <UserRound size={16} />}
              <span className="user-btn-label">{accountLabel}</span>
              {hasMenu && <ChevronDown size={14} />}
            </button>
            {hasMenu && userOpen && (
              <div className="dropdown-menu lang-menu header-user-menu" role="menu">
                {userMenuTitle && <div className="header-user-title">{userMenuTitle}</div>}
                {userMenu!.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button type="button" key={item.href + item.label} role="menuitem" className="dropdown-item" onClick={() => { setUserOpen(false); onNavigate(item.href); }}>
                      {Icon && <Icon size={15} />} {item.label}
                    </button>
                  );
                })}
                {onLogout && (
                  <button type="button" role="menuitem" className="dropdown-item danger" onClick={() => { setUserOpen(false); onLogout(); }}>
                    <LogOut size={15} /> {logoutLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobil menyu düyməsi */}
          <button
            type="button"
            className="mobile-toggle icon-button"
            ref={menuRef}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={t("common.menu")}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobil naviqasiya */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="mobile-drawer">
          <nav className="mobile-nav" aria-label={t("site.mobileMenu")}>
            {navItems.map((item) => (
              <a key={item.href} className={cn("mobile-nav-link", currentPath === item.href && "active")} {...link(item.href)}>
                {item.label}
              </a>
            ))}
            <div className="mobile-nav-divider" />
            {hasMenu ? (
              <>
                {userMenu!.map((item) => {
                  const Icon = item.icon ?? UserRound;
                  return (
                    <a key={item.href + item.label} className="mobile-nav-link" {...link(item.href)}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
                {onLogout && (
                  <button type="button" className="mobile-nav-link" onClick={() => { setMobileMenuOpen(false); onLogout(); }}>
                    <LogOut size={18} />
                    <span>{logoutLabel}</span>
                  </button>
                )}
              </>
            ) : (
              <a className="mobile-nav-link" {...link(user ? "/account" : "/login")}>
                <UserRound size={18} />
                <span>{accountLabel}</span>
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
