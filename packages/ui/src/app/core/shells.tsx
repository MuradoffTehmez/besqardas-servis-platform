"use client";
import React, { useEffect, useState } from "react";
import { Bell, ChevronDown, Globe, Home, LogOut, Menu, Repeat, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, put, useApi, useApiMutation, useQueryClient } from "@sp/api-client";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";
import { useI18n } from "./i18n";
import { Link, useRouter } from "./router";
import { INTERNAL_ROLES, useSession } from "./session";
import { Avatar, EmptyState, Loading } from "../kit/base";

/* ------------------------------------------------------------------ */
/* Public shell                                                        */
/* ------------------------------------------------------------------ */

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { path, locale, navigate, setLocale } = useRouter();
  const { session, user } = useSession();
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  const nav = [
    { label: t("home"), href: "/" },
    { label: t("services"), href: "/services" },
    { label: t("shop"), href: "/shop" },
    { label: t("technicians"), href: "/technicians" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.branches"), href: "/branches" },
    { label: t("contact"), href: "/contact" },
  ];
  const accountHref = user ? homeFor(user.activeRole) : "/login";
  return (
    <div className="site-wrapper">
      <a className="skip-link" href="#main-content">{t("common.skipToContent")}</a>
      <Header
        logoText={brand.data?.logoText ?? "besqardas"}
        navItems={nav}
        currentPath={path}
        locale={locale}
        cartCount={session?.cartCount ?? 0}
        user={user ? { fullName: user.fullName, email: user.email ?? undefined, role: user.activeRole } : null}
        onNavigate={(href) => navigate(href === "/account" || href === "/login" ? accountHref : href)}
        onLocaleChange={setLocale}
        onOpenCart={() => navigate("/cart")}
        onOpenSearch={() => navigate("/search")}
      />
      <main id="main-content" tabIndex={-1} className="pub-main">
        {children}
      </main>
      <Footer companyName={brand.data?.companyName} phone={brand.data?.contacts?.phone} email={brand.data?.contacts?.email} address={brand.data?.contacts?.address} locale={locale} onNavigate={navigate} />
      <CookieNotice />
    </div>
  );
}

export function homeFor(role: string) {
  switch (role) {
    case "CUSTOMER": return "/account";
    case "CORPORATE_CUSTOMER": return "/corporate";
    case "PARTNER": return "/partner";
    case "WHOLESALE_CUSTOMER": return "/wholesale";
    case "TECHNICIAN": return "/technician/dashboard";
    case "COURIER": return "/courier";
    default: return INTERNAL_ROLES.includes(role) ? "ADMIN_APP" : "/";
  }
}

function CookieNotice() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(!localStorage.getItem("cookie-consent")); } catch { setOpen(false); }
  }, []);
  if (!open) return null;
  const decide = (v: string) => { try { localStorage.setItem("cookie-consent", v); } catch { /* yox */ } setOpen(false); };
  return (
    <div className="kit-cookie" role="dialog" aria-label={t("legal.cookieTitle")}>
      <p>{t("legal.cookieText")} <Link to="/privacy">{t("legal.privacy")}</Link></p>
      <div className="flex gap-2">
        <button className="btn outline btn-sm" type="button" onClick={() => decide("essential")}>{t("legal.essentialOnly")}</button>
        <button className="btn primary btn-sm" type="button" onClick={() => decide("all")}>{t("legal.acceptAll")}</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel shell (kabinet, usta, B2B, admin)                             */
/* ------------------------------------------------------------------ */

export interface NavGroup {
  label?: string;
  items: { to: string; label: string; icon: React.ComponentType<{ size?: number }>; badge?: number | string | null; permission?: string | string[]; exact?: boolean; hidden?: boolean }[];
}

export function PanelShell({ nav, title, children, homeLink = true }: { nav: NavGroup[]; title: string; children: React.ReactNode; homeLink?: boolean }) {
  const { t, enumLabel, locale } = useI18n();
  const { path, navigate, setLocale } = useRouter();
  const { user, session, can, logout } = useSession();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => setOpen(false), [path]);
  const doLogout = async () => {
    await logout();
    navigate("/login");
  };
  const groups = nav
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden && (!i.permission || (Array.isArray(i.permission) ? i.permission.some(can) : can(i.permission)))) }))
    .filter((g) => g.items.length);
  const isActive = (to: string, exact?: boolean) => (exact ? path === to : path === to || path.startsWith(`${to}/`));
  return (
    <div className="workspace-layout panel-layout">
      <a className="skip-link" href="#panel-content">{t("common.skipToContent")}</a>
      <aside className={cn("app-sidebar panel-sidebar", open && "open")} aria-label={title}>
        <div className="panel-brand">
          <Link to="/" className="brand-logo">
            <span className="logo-icon">bq</span>
            <span className="logo-text">{title}</span>
          </Link>
          <button type="button" className="icon-button panel-close" onClick={() => setOpen(false)} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
        {user && (
          <div className="sidebar-user-card">
            <Avatar name={user.fullName} tone={user.avatarTone} size={40} />
            <div className="user-details">
              <strong className="user-name">{user.fullName}</strong>
              <small className="user-role">{user.companyName ?? enumLabel("Role", user.activeRole)}</small>
            </div>
          </div>
        )}
        <nav className="sidebar-nav panel-nav">
          {groups.map((g, gi) => {
            const key = g.label ?? String(gi);
            const hiddenGroup = collapsed.includes(key);
            return (
              <div key={key} className="panel-nav-group">
                {g.label && (
                  <button type="button" className="panel-nav-label" onClick={() => setCollapsed((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]))} aria-expanded={!hiddenGroup}>
                    {g.label} <ChevronDown size={12} className={cn(hiddenGroup && "rot")} />
                  </button>
                )}
                {!hiddenGroup &&
                  g.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.exact);
                    return (
                      <Link key={item.to} to={item.to} className={cn("sidebar-link", active && "active")} aria-current={active ? "page" : undefined}>
                        <span className="sidebar-icon"><Icon size={17} /></span>
                        <span className="sidebar-label">{item.label}</span>
                        {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          {homeLink && (
            <Link to="/" className="sidebar-link">
              <span className="sidebar-icon"><Home size={17} /></span>
              <span className="sidebar-label">{t("panel.toSite")}</span>
            </Link>
          )}
          <button className="sidebar-link logout-link" type="button" onClick={doLogout}>
            <span className="sidebar-icon"><LogOut size={17} /></span>
            <span className="sidebar-label">{t("logout")}</span>
          </button>
        </div>
      </aside>
      <div className="panel-main">
        <div className="panel-topbar">
          <button type="button" className="icon-button panel-menu" onClick={() => setOpen(true)} aria-label={t("common.menu")}>
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <ModeSwitcher />
          <label className="panel-locale">
            <Globe size={15} aria-hidden />
            <select value={locale} onChange={(e) => setLocale(e.target.value as "az")} aria-label={t("common.language")}>
              <option value="az">AZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
          <NotificationBell count={session?.unreadNotifications ?? 0} />
        </div>
        <div id="panel-content" className="workspace-content panel-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      {open && <button type="button" className="panel-scrim" aria-label={t("common.close")} onClick={() => setOpen(false)} />}
    </div>
  );
}

/** Bir neçə rolu olan istifadəçi üçün rejim dəyişmə (PRD §6, §7.3). */
export function ModeSwitcher() {
  const { t, enumLabel } = useI18n();
  const { user, refresh } = useSession();
  const { navigate } = useRouter();
  const mutation = useApiMutation((role: string) => post("/auth/select-mode", { role }), {
    onSuccess: async (r: any) => {
      await refresh();
      const to = r.redirectTo;
      if (to === "ADMIN_APP") window.location.href = adminUrl();
      else navigate(to);
    },
  });
  if (!user || user.roles.length < 2) return null;
  return (
    <label className="panel-locale">
      <Repeat size={15} aria-hidden />
      <select value={user.activeRole} onChange={(e) => mutation.mutate(e.target.value)} aria-label={t("auth.switchMode")}>
        {user.roles.map((r) => <option key={r} value={r}>{enumLabel("Role", r)}</option>)}
      </select>
    </label>
  );
}

export function adminUrl() {
  if (typeof window === "undefined") return "/";
  const env = (process.env.NEXT_PUBLIC_ADMIN_URL as string | undefined) ?? "";
  if (env) return env;
  const u = new URL(window.location.href);
  u.port = "3001";
  u.pathname = `/${window.location.pathname.split("/")[1] || "az"}`;
  u.search = "";
  return u.toString();
}

export function webUrl(path = "") {
  if (typeof window === "undefined") return "/";
  const env = (process.env.NEXT_PUBLIC_WEB_URL as string | undefined) ?? "";
  const u = new URL(env || window.location.href);
  if (!env) u.port = "3000";
  u.pathname = `/${window.location.pathname.split("/")[1] || "az"}${path}`;
  u.search = "";
  return u.toString();
}

function NotificationBell({ count }: { count: number }) {
  const { t, relative } = useI18n();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const list = useApi<any>(open ? "/notifications?pageSize=8" : null);
  const qc = useQueryClient();
  const readAll = useApiMutation(() => post("/notifications/read-all"), { invalidate: ["/notifications", "/auth/session"] });
  return (
    <div className="kit-dropdown">
      <button type="button" className="icon-button panel-bell" onClick={() => setOpen((o) => !o)} aria-label={t("panel.notifications", { count })} aria-expanded={open}>
        <Bell size={17} />
        {count > 0 && <span className="cart-badge">{count}</span>}
      </button>
      {open && (
        <div className="kit-dropdown-menu wide" role="dialog" aria-label={t("panel.notificationsTitle")}>
          <div className="flex justify-between items-center mb-2">
            <strong>{t("panel.notificationsTitle")}</strong>
            <button type="button" className="btn ghost btn-sm" onClick={() => readAll.mutate(undefined)} disabled={!count}>{t("panel.markAllRead")}</button>
          </div>
          {list.isLoading ? <Loading rows={3} /> : !list.data?.items?.length ? <EmptyState title={t("panel.noNotifications")} /> : (
            <ul className="kit-notif-list">
              {list.data.items.map((n: any) => (
                <li key={n.id} className={cn(!n.read && "unread")}>
                  <button type="button" onClick={async () => { await post(`/notifications/${n.id}/read`); await qc.invalidateQueries({ queryKey: ["api"] }); setOpen(false); if (n.link?.startsWith("/")) navigate(n.link); }}>
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                    <small>{relative(n.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kuryer shell — sadə mobil interfeys (PRD §21.6)                      */
/* ------------------------------------------------------------------ */

export function CourierShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { user, logout } = useSession();
  const { navigate, locale, setLocale } = useRouter();
  return (
    <div className="courier-shell">
      <header className="courier-top">
        <Link to="/courier" className="brand-logo"><span className="logo-icon">bq</span><span className="logo-text">{t("courier.title")}</span></Link>
        <div className="flex items-center gap-2">
          <select className="form-input courier-lang" value={locale} onChange={(e) => setLocale(e.target.value as "az")} aria-label={t("common.language")}>
            <option value="az">AZ</option><option value="ru">RU</option><option value="en">EN</option>
          </select>
          <button type="button" className="icon-button" aria-label={t("logout")} onClick={async () => { await logout(); navigate("/login"); }}><LogOut size={18} /></button>
        </div>
      </header>
      {user && <p className="courier-user">{user.fullName}</p>}
      <main id="main-content" className="courier-main">{children}</main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock idarəetməsi — gecikmə, xəta, boş hallar (PRD §65.3)             */
/* ------------------------------------------------------------------ */

export function MockPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const cfg = useApi<{ delayMs: number; errorRate: number; forceError: number | null; emptyLists: boolean }>(open ? "/_mock/config" : null);
  const qc = useQueryClient();
  const save = async (patch: Record<string, unknown>) => {
    await put("/_mock/config", patch);
    await qc.invalidateQueries({ queryKey: ["api"] });
  };
  if (process.env.NEXT_PUBLIC_HIDE_MOCK_PANEL === "1") return null;
  return (
    <div className={cn("mock-panel", open && "open")}>
      <button type="button" className="mock-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Settings2 size={15} /> Mock
      </button>
      {open && cfg.data && (
        <div className="mock-body" role="dialog" aria-label={t("mock.title")}>
          <strong>{t("mock.title")}</strong>
          <label>
            {t("mock.delay", { ms: cfg.data.delayMs })}
            <input type="range" min={0} max={3000} step={100} defaultValue={cfg.data.delayMs} onMouseUp={(e) => save({ delayMs: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => save({ delayMs: Number((e.target as HTMLInputElement).value) })} />
          </label>
          <label>
            {t("mock.errorRate", { pct: Math.round(cfg.data.errorRate * 100) })}
            <input type="range" min={0} max={0.5} step={0.05} defaultValue={cfg.data.errorRate} onMouseUp={(e) => save({ errorRate: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => save({ errorRate: Number((e.target as HTMLInputElement).value) })} />
          </label>
          <label>
            {t("mock.forceError")}
            <select className="form-input" value={cfg.data.forceError ?? ""} onChange={(e) => save({ forceError: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{t("mock.none")}</option>
              <option value="400">400</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="500">500</option>
              <option value="503">503</option>
            </select>
          </label>
          <label className="kit-check">
            <input type="checkbox" checked={cfg.data.emptyLists} onChange={(e) => save({ emptyLists: e.target.checked })} />
            <span>{t("mock.emptyLists")}</span>
          </label>
          <button type="button" className="btn outline btn-sm" onClick={async () => { await post("/_mock/reset"); await qc.invalidateQueries(); toast.success(t("mock.resetDone")); }}>
            {t("mock.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
