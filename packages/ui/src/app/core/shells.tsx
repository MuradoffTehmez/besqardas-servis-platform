"use client";
import React, { useEffect, useState } from "react";
import { Bell, Heart, Scale, CalendarDays, ChevronDown, ChevronRight, Compass, Globe, HardDrive, Home, LayoutDashboard, LayoutGrid, Package, Truck, Wallet, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings2, ShoppingBag, UserRound, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, put, useApi, useApiMutation, useQueryClient } from "@sp/api-client";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";
import { useI18n } from "./i18n";
import { Link, useRouter } from "./router";
import { INTERNAL_ROLES, useSession } from "./session";
import { Avatar, EmptyState, Loading } from "../kit/base";
import { notificationMeta } from "../../components/domain/notification-meta";
import { CommandPalette, UserMenu, fold, useCurrentRoute, useMedia, usePaletteHotkey, type Command, type MenuLink } from "./nav";

/* ------------------------------------------------------------------ */
/* Public shell                                                        */
/* ------------------------------------------------------------------ */

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t, enumLabel } = useI18n();
  const { path, locale, navigate, setLocale } = useRouter();
  const { session, user, logout } = useSession();
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  const nav = [
    { label: t("home"), href: "/" },
    { label: t("services"), href: "/services" },
    { label: t("nav.shop"), href: "/shop" },
    { label: t("technicians"), href: "/technicians" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.branches"), href: "/branches" },
    { label: t("contact"), href: "/contact" },
  ];
  const accountHref = user ? homeFor(user.activeRole) : "/login";
  const userMenu = user ? [...roleMenu(user.activeRole, t), ...(user.roles.some((r) => INTERNAL_ROLES.includes(r)) ? [{ label: t("panel.toAdmin"), href: adminUrl(), icon: LayoutGrid }] : []), { label: t("panel.platformMap"), href: "/demo", icon: Compass }] : undefined;
  return (
    <div className="site-wrapper">
      <a className="skip-link" href="#main-content">{t("common.skipToContent")}</a>
      <Header
        logoText={brand.data?.logoText ?? "besqardas"}
        navItems={nav}
        currentPath={path}
        locale={locale}
        cartCount={session?.cartCount ?? 0}
        user={user ? { fullName: user.fullName, email: user.email ?? undefined, role: user.activeRole, avatarUrl: user.avatarUrl } : null}
        onNavigate={(href) => navigate(href === "/account" || href === "/login" ? accountHref : href)}
        onLocaleChange={setLocale}
        onOpenCart={() => navigate("/cart")}
        compareCount={session?.compareCount ?? 0}
        onOpenCompare={() => navigate("/compare")}
        onOpenSearch={() => navigate("/search")}
        userMenu={userMenu}
        userMenuTitle={user ? user.companyName ?? enumLabel("Role", user.activeRole) : undefined}
        logoutLabel={t("logout")}
        onLogout={async () => { await logout(); navigate("/"); }}
      />
      <main id="main-content" tabIndex={-1} className="pub-main">
        {children}
      </main>
      <Footer companyName={brand.data?.companyName} phone={brand.data?.contacts?.phone} email={brand.data?.contacts?.email} address={brand.data?.contacts?.address} locale={locale} onNavigate={navigate} />
      <CookieNotice />
    </div>
  );
}

type MenuItem = { label: string; href: string; icon: React.ComponentType<{ size?: number }> };

/** Sayt başlığındakı istifadəçi menyusu: aktiv rolun əsas bölmələrinə birbaşa keçid. */
function roleMenu(role: string, t: (k: string) => string): MenuItem[] {
  switch (role) {
    case "CUSTOMER":
      return [
        { label: t("acc.nav.dashboard"), href: "/account", icon: LayoutDashboard },
        { label: t("acc.nav.services"), href: "/account/services", icon: Wrench },
        { label: t("acc.nav.orders"), href: "/account/orders", icon: Package },
        { label: t("acc.nav.devices"), href: "/account/devices", icon: HardDrive },
        { label: t("acc.nav.favorites"), href: "/account/favorites", icon: Heart },
        { label: t("compare.title"), href: "/compare", icon: Scale },
        { label: t("acc.nav.notifications"), href: "/account/notifications", icon: Bell },
        { label: t("acc.nav.profile"), href: "/account/profile", icon: UserRound },
      ];
    case "TECHNICIAN":
      return [
        { label: t("tech.nav.dashboard"), href: "/technician/dashboard", icon: LayoutDashboard },
        { label: t("tech.nav.jobs"), href: "/technician/jobs", icon: Wrench },
        { label: t("tech.nav.schedule"), href: "/technician/schedule", icon: CalendarDays },
        { label: t("tech.nav.earnings"), href: "/technician/earnings", icon: Wallet },
        { label: t("tech.nav.settings"), href: "/technician/settings", icon: UserRound },
      ];
    case "CORPORATE_CUSTOMER":
      return [
        { label: t("b2b.nav.dashboard"), href: "/corporate", icon: LayoutDashboard },
        { label: t("b2b.nav.services"), href: "/corporate/services", icon: Wrench },
        { label: t("b2b.nav.devices"), href: "/corporate/devices", icon: HardDrive },
      ];
    case "PARTNER":
      return [
        { label: t("b2b.nav.dashboard"), href: "/partner", icon: LayoutDashboard },
        { label: t("b2b.nav.catalog"), href: "/partner/catalog", icon: ShoppingBag },
        { label: t("b2b.nav.orders"), href: "/partner/orders", icon: Package },
      ];
    case "WHOLESALE_CUSTOMER":
      return [
        { label: t("b2b.nav.dashboard"), href: "/wholesale", icon: LayoutDashboard },
        { label: t("b2b.nav.quickOrder"), href: "/wholesale/quick-order", icon: ShoppingBag },
        { label: t("b2b.nav.orders"), href: "/wholesale/orders", icon: Package },
      ];
    case "COURIER":
      return [{ label: t("courier.title"), href: "/courier", icon: Truck }];
    default:
      return [];
  }
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

type NavItem = NavGroup["items"][number];

/** Bu saydan çox bənd olduqda qruplar akkordeon kimi yığılır və menyu axtarışı göstərilir. */
const ACCORDION_FROM = 14;

export function PanelShell({ nav, title, children, homeLink = true, app = homeLink ? "web" : "admin", commands: extraCommands = [] }: { nav: NavGroup[]; title: string; children: React.ReactNode; homeLink?: boolean; app?: "web" | "admin"; commands?: Command[] }) {
  const { t, locale } = useI18n();
  const { path, navigate, setLocale } = useRouter();
  const { user, session, can } = useSession();
  const route = useCurrentRoute();
  const mobile = useMedia("(max-width: 640px)");
  const tablet = useMedia("(min-width: 641px) and (max-width: 1024px)");
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [filter, setFilter] = useState("");
  const [collapsedPref, setCollapsedPref] = useState(false);
  // İstifadəçinin açıb-bağladığı qruplar; seçilməyənlər yalnız aktiv səhifəni ehtiva edəndə açıqdır
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setCollapsedPref(localStorage.getItem("panel-collapsed") === "1"); } catch { /* yox */ } }, []);
  useEffect(() => { setOpen(false); setFilter(""); }, [path]);
  usePaletteHotkey(setPalette);

  const groups = nav
    .map((g, gi) => ({ ...g, key: g.label ?? `g${gi}`, items: g.items.filter((i) => !i.hidden && (!i.permission || (Array.isArray(i.permission) ? i.permission.some(can) : can(i.permission)))) }))
    .filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const accordion = total > ACCORDION_FROM;
  const matches = (to: string, exact?: boolean) => path === to || (!exact && to !== "/" && path.startsWith(`${to}/`));
  // Ən uzun uyğun gələn menyu bəndi aktiv sayılır (məs. /settings/branding → Brend, /settings deyil)
  let active: { item: NavItem; group: (typeof groups)[number] } | null = null;
  for (const g of groups) for (const item of g.items) if (matches(item.to, item.exact) && (!active || item.to.length > active.item.to.length)) active = { item, group: g };

  const rail = !open && !mobile && (tablet || collapsedPref);
  const toggleRail = () => {
    const v = !collapsedPref;
    setCollapsedPref(v);
    try { localStorage.setItem("panel-collapsed", v ? "1" : "0"); } catch { /* yox */ }
  };
  const toAdmin = () => { window.location.href = adminUrl(); };
  const goSite = () => { if (app === "admin") window.location.href = webUrl(); else navigate("/"); };
  const goMap = () => { if (app === "admin") window.location.href = webUrl("/demo"); else navigate("/demo"); };
  const internal = !!user?.roles.some((r) => INTERNAL_ROLES.includes(r));

  const quick = t("panel.quick");
  const commands: Command[] = [
    ...groups.flatMap((g) => g.items.map((i) => ({ id: `nav:${i.to}`, label: i.label, group: g.label ?? title, icon: i.icon, run: () => navigate(i.to) }))),
    ...extraCommands,
    ...(app === "web"
      ? [
          { id: "q:home", label: t("home"), group: quick, icon: Home, run: goSite },
          { id: "q:services", label: t("services"), group: quick, icon: Wrench, run: () => navigate("/services") },
          { id: "q:shop", label: t("nav.shop"), group: quick, icon: ShoppingBag, run: () => navigate("/shop") },
        ]
      : [{ id: "q:site", label: t("panel.toSite"), group: quick, icon: Home, run: goSite }]),
    ...(app === "web" && internal ? [{ id: "q:admin", label: t("panel.toAdmin"), group: quick, icon: LayoutGrid, run: toAdmin }] : []),
    { id: "q:map", label: t("panel.platformMap"), group: quick, icon: Compass, run: goMap },
  ];

  const profile = groups.flatMap((g) => g.items).find((i) => /\/(profile|settings)$/.test(i.to));
  const menuLinks: MenuLink[] = [
    ...(profile ? [{ label: profile.label, icon: UserRound, to: profile.to }] : []),
    ...(app === "web" && internal ? [{ label: t("panel.toAdmin"), icon: LayoutGrid, onClick: toAdmin }] : []),
    { label: t("panel.toSite"), icon: Home, onClick: goSite },
    { label: t("panel.platformMap"), icon: Compass, onClick: goMap },
  ];

  // Breadcrumb: panel › bölmə › səhifə › detal
  const home = groups[0]?.items[0];
  const crumbs: { label: string; to?: string }[] = [{ label: title, to: home && home.to !== path ? home.to : undefined }];
  if (active && active.item !== home) {
    if (active.group.label) crumbs.push({ label: active.group.label });
    crumbs.push({ label: active.item.label, to: active.item.to !== path ? active.item.to : undefined });
  }
  if (active && active.item.to !== path) {
    const routeTitle = route?.titleKey ? t(route.titleKey) : "";
    crumbs.push({ label: routeTitle && routeTitle !== active.item.label ? routeTitle : t("panel.detail") });
  }

  const q = fold(filter.trim());
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active?.item === item;
    return (
      <Link key={item.to} to={item.to} className={cn("sidebar-link", isActive && "active")} aria-current={isActive ? "page" : undefined} title={rail ? item.label : undefined}>
        <span className="sidebar-icon"><Icon size={17} /></span>
        <span className="sidebar-label">{item.label}</span>
        {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
      </Link>
    );
  };
  const found = q ? groups.flatMap((g) => g.items.filter((i) => fold(`${i.label} ${g.label ?? ""}`).includes(q))) : [];

  return (
    <div className="workspace-layout panel-layout">
      <a className="skip-link" href="#panel-content">{t("common.skipToContent")}</a>
      <aside className={cn("app-sidebar panel-sidebar", open && "open", rail && "rail")} aria-label={title}>
        <div className="panel-brand">
          <Link to={home?.to ?? "/"} className="brand-logo" title={rail ? title : undefined}>
            <span className="logo-icon">bq</span>
            <span className="logo-text">{title}</span>
          </Link>
          <button type="button" className="icon-button panel-close" onClick={() => setOpen(false)} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
        {accordion && !rail && (
          <label className="panel-filter">
            <Search size={14} aria-hidden />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("panel.filterMenu")} aria-label={t("panel.filterMenu")} />
            {filter && <button type="button" onClick={() => setFilter("")} aria-label={t("common.close")}><X size={13} /></button>}
          </label>
        )}
        <nav className="sidebar-nav panel-nav">
          {q
            ? found.length ? found.map(renderItem) : <p className="panel-filter-empty">{t("panel.noResults")}</p>
            : groups.map((g) => {
                const isOpen = rail || !accordion || !g.label || (toggled[g.key] ?? active?.group === g);
                return (
                  <div key={g.key} className="panel-nav-group">
                    {g.label &&
                      (accordion ? (
                        <button type="button" className={cn("panel-nav-label", active?.group === g && "has-active")} onClick={() => setToggled((s) => ({ ...s, [g.key]: !isOpen }))} aria-expanded={isOpen}>
                          {g.label} <ChevronDown size={13} className={cn(!isOpen && "rot")} />
                        </button>
                      ) : (
                        <span className="panel-nav-label">{g.label}</span>
                      ))}
                    {isOpen && g.items.map(renderItem)}
                  </div>
                );
              })}
        </nav>
        {!mobile && !tablet && (
          <div className="sidebar-footer">
            <button className="sidebar-link" type="button" onClick={toggleRail} title={rail ? t("panel.expand") : undefined}>
              <span className="sidebar-icon">{rail ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</span>
              <span className="sidebar-label">{t("panel.collapse")}</span>
            </button>
          </div>
        )}
      </aside>
      <div className="panel-main">
        <div className="panel-topbar">
          <button type="button" className="icon-button panel-menu" onClick={() => setOpen(true)} aria-label={t("common.menu")}>
            <Menu size={18} />
          </button>
          <nav className="panel-crumbs" aria-label={t("common.breadcrumbs")}>
            {crumbs.map((c, i) => (
              <span key={i} className={cn(i < crumbs.length - 1 && "mid")}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>}
                {i < crumbs.length - 1 && <ChevronRight size={13} aria-hidden />}
              </span>
            ))}
          </nav>
          <button type="button" className="panel-search" onClick={() => setPalette(true)} aria-label={t("panel.search")}>
            <Search size={15} aria-hidden />
            <span>{t("panel.searchShort")}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <label className="panel-locale">
            <Globe size={15} aria-hidden />
            <select value={locale} onChange={(e) => setLocale(e.target.value as "az")} aria-label={t("common.language")}>
              <option value="az">AZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
          <NotificationBell count={session?.unreadNotifications ?? 0} />
          <UserMenu links={menuLinks} onAdmin={toAdmin} />
        </div>
        <div id="panel-content" className="workspace-content panel-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      {open && <button type="button" className="panel-scrim" aria-label={t("common.close")} onClick={() => setOpen(false)} />}
      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={commands} />
    </div>
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
              {list.data.items.map((n: any) => {
                const m = notificationMeta(n.event);
                return (
                  <li key={n.id} className={cn(!n.read && "unread", `tone-${m.tone}`)}>
                    <button type="button" onClick={async () => { await post(`/notifications/${n.id}/read`); await qc.invalidateQueries({ queryKey: ["api"] }); setOpen(false); if (n.link?.startsWith("/")) navigate(n.link); }}>
                      <span className="kit-notif-icon"><m.icon size={17} aria-hidden /></span>
                      <strong>{n.title}</strong>
                      <span>{n.body}</span>
                      <small>{relative(n.createdAt)}</small>
                    </button>
                  </li>
                );
              })}
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
          {user && <Link to="/courier/profile" className="courier-avatar" aria-label={t("acc.nav.profile")}><Avatar name={user.fullName} tone={user.avatarTone} src={user.avatarUrl} size={34} /></Link>}
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
