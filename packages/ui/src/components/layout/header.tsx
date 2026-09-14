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
  user?: { fullName?: string; email?: string; role?: string } | null;
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

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    onNavigate(href);
  };

  return (
    <header className={cn("site-header", className)}>
      <div className="container header-inner">
        {/* Brand Logo */}
        <button
          className="brand-logo"
          onClick={() => handleNavClick("/")}
          aria-label="Ana Səhifə"
        >
          <span className="logo-icon">
            <Wrench size={22} />
          </span>
          <span className="logo-text">
            <strong>{logoText}</strong>
            <span className="logo-sub">SERVİS</span>
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Əsas Menyu">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));
            return (
              <button
                key={item.href}
                className={cn("nav-link", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNavClick(item.href)}
              >
                {item.label}
                {item.badge != null && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Actions Bar */}
        <div className="header-actions">
          {onOpenSearch && (
            <button
              className="icon-button"
              aria-label="Axtarış"
              onClick={onOpenSearch}
            >
              <Search size={20} />
            </button>
          )}

          {/* Language Switcher */}
          <div className="lang-switcher" ref={langRef}>
            <button
              className="lang-toggle icon-button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              aria-label="Dili dəyiş"
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
                    key={l}
                    className={cn("dropdown-item", locale === l && "active")}
                    onClick={() => {
                      onLocaleChange(l);
                      setLangDropdownOpen(false);
                    }}
                  >
                    {l === "az" ? "Azərbaycan" : l === "ru" ? "Русский" : "English"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Icon */}
          {onOpenCart && (
            <button
              className="cart-button icon-button"
              aria-label={`Səbət (${cartCount})`}
              onClick={onOpenCart}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}

          {/* İstifadəçi menyusu və ya giriş düyməsi */}
          <div className="lang-switcher" ref={userRef}>
            <button
              className="user-btn btn btn-sm outline"
              aria-haspopup={hasMenu ? "menu" : undefined}
              aria-expanded={hasMenu ? userOpen : undefined}
              onClick={() => (hasMenu ? setUserOpen((o) => !o) : handleNavClick(user ? "/account" : "/login"))}
            >
              <UserRound size={16} />
              <span className="user-btn-label">
                {user ? user.fullName || "Hesabım" : locale === "az" ? "Daxil ol" : locale === "ru" ? "Войти" : "Login"}
              </span>
              {hasMenu && <ChevronDown size={14} />}
            </button>
            {hasMenu && userOpen && (
              <div className="dropdown-menu lang-menu header-user-menu" role="menu">
                {userMenuTitle && <div className="header-user-title">{userMenuTitle}</div>}
                {userMenu!.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.href + item.label} role="menuitem" className="dropdown-item" onClick={() => { setUserOpen(false); handleNavClick(item.href); }}>
                      {Icon && <Icon size={15} />} {item.label}
                    </button>
                  );
                })}
                {onLogout && (
                  <button role="menuitem" className="dropdown-item danger" onClick={() => { setUserOpen(false); onLogout(); }}>
                    <LogOut size={15} /> {logoutLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle icon-button"
            ref={menuRef}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label="Menyu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="mobile-drawer">
          <nav className="mobile-nav" aria-label="Mobil menyu">
            {navItems.map((item) => (
              <button
                key={item.href}
                className={cn("mobile-nav-link", currentPath === item.href && "active")}
                onClick={() => handleNavClick(item.href)}
              >
                {item.label}
              </button>
            ))}
            <div className="mobile-nav-divider" />
            {hasMenu ? (
              <>
                {userMenu!.map((item) => {
                  const Icon = item.icon ?? UserRound;
                  return (
                    <button key={item.href + item.label} className="mobile-nav-link" onClick={() => handleNavClick(item.href)}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {onLogout && (
                  <button className="mobile-nav-link" onClick={() => { setMobileMenuOpen(false); onLogout(); }}>
                    <LogOut size={18} />
                    <span>{logoutLabel}</span>
                  </button>
                )}
              </>
            ) : (
              <button
                className="mobile-nav-link"
                onClick={() => handleNavClick(user ? "/account" : "/login")}
              >
                <UserRound size={18} />
                <span>{user ? user.fullName || "Hesabım" : "Daxil ol"}</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
