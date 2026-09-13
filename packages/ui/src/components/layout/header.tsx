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
  className,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    if (langDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
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
            >
              <Globe size={18} />
              <span className="lang-current">{locale.toUpperCase()}</span>
              <ChevronDown size={14} />
            </button>

            {langDropdownOpen && (
              <div className="dropdown-menu lang-menu">
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

          {/* User Account / Login button */}
          <button
            className="user-btn btn btn-sm outline"
            onClick={() => handleNavClick(user ? "/account" : "/login")}
          >
            <UserRound size={16} />
            <span className="user-btn-label">
              {user ? user.fullName || "Hesabım" : locale === "az" ? "Daxil ol" : locale === "ru" ? "Войти" : "Login"}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-toggle icon-button"
            aria-label="Menyu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <nav className="mobile-nav">
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
            <button
              className="mobile-nav-link"
              onClick={() => handleNavClick(user ? "/account" : "/login")}
            >
              <UserRound size={18} />
              <span>{user ? user.fullName || "Hesabım" : "Daxil ol"}</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
