"use client";
import React from "react";
import { BarChart3, Bell, Building2, CalendarClock, ClipboardList, FileSignature, FileText, HardDrive, LayoutDashboard, Package, Percent, ShoppingBag, UserRound, Users, Wallet, Wrench, Zap } from "lucide-react";
import { useI18n } from "../core/i18n";
import { useSession } from "../core/session";
import { SiteWorkspace, type NavGroup } from "../core/shells";
import { lazyPages } from "../core/lazy";
import type { RouteDef } from "../core/router";
import { ShopPage } from "./shop";

// B2B kabinet səhifələri ayrıca chunk-dır — route cədvəli və qabıq yüngül qalır
const B2B = lazyPages(() => import("./b2b"));
const Account = lazyPages(() => import("./account"));

type Segment = "corporate" | "partner" | "wholesale";

function segmentOf(role: string): Segment {
  return role === "PARTNER" ? "partner" : role === "WHOLESALE_CUSTOMER" ? "wholesale" : "corporate";
}

export function B2BShell({ children }: { children: React.ReactNode }) {
  const { t, enumLabel } = useI18n();
  const { role, user, session } = useSession();
  const seg = segmentOf(role);
  const base = `/${seg}`;
  const common = [
    { to: `${base}/notifications`, label: t("acc.nav.notifications"), icon: Bell, badge: session?.unreadNotifications || null },
    { to: `${base}/documents`, label: t("b2b.nav.documents"), icon: FileText },
    { to: `${base}/users`, label: t("b2b.nav.users"), icon: Users },
    { to: `${base}/company`, label: t("b2b.nav.companyProfile"), icon: Building2 },
    { to: `${base}/profile`, label: t("acc.nav.profile"), icon: UserRound },
  ];
  const nav: Record<Segment, NavGroup[]> = {
    corporate: [
      { items: [{ to: base, label: t("b2b.nav.dashboard"), icon: LayoutDashboard, exact: true }, { to: `${base}/services`, label: t("b2b.nav.services"), icon: Wrench }, { to: `${base}/schedule`, label: t("b2b.nav.schedule"), icon: CalendarClock }, { to: `${base}/sites`, label: t("b2b.nav.sites"), icon: Building2 }, { to: `${base}/devices`, label: t("b2b.nav.devices"), icon: HardDrive }] },
      { label: t("b2b.nav.company"), items: [{ to: `${base}/contracts`, label: t("b2b.nav.contracts"), icon: FileSignature }, { to: `${base}/reports`, label: t("b2b.nav.reports"), icon: BarChart3 }, ...common] },
    ],
    partner: [
      { items: [{ to: base, label: t("b2b.nav.dashboard"), icon: LayoutDashboard, exact: true }, { to: `${base}/catalog`, label: t("b2b.nav.catalog"), icon: ShoppingBag }, { to: `${base}/orders`, label: t("b2b.nav.orders"), icon: Package }, { to: `${base}/services`, label: t("b2b.nav.services"), icon: Wrench }] },
      { label: t("b2b.nav.finance"), items: [{ to: `${base}/commissions`, label: t("b2b.nav.commissions"), icon: Percent }, { to: `${base}/balance`, label: t("b2b.nav.balance"), icon: Wallet }, ...common] },
    ],
    wholesale: [
      { items: [{ to: base, label: t("b2b.nav.dashboard"), icon: LayoutDashboard, exact: true }, { to: `${base}/catalog`, label: t("b2b.nav.catalog"), icon: ShoppingBag }, { to: `${base}/quick-order`, label: t("b2b.nav.quickOrder"), icon: Zap }, { to: `${base}/quotes`, label: t("b2b.nav.quotes"), icon: ClipboardList }, { to: `${base}/orders`, label: t("b2b.nav.orders"), icon: Package }] },
      { label: t("b2b.nav.finance"), items: [{ to: `${base}/balance`, label: t("b2b.nav.balance"), icon: Wallet }, ...common] },
    ],
  };
  return <SiteWorkspace nav={nav[seg]} title={user?.companyName ?? t(`b2b.${seg}`)} badge={{ label: enumLabel("Segment", seg.toUpperCase()), icon: Building2 }}>{children}</SiteWorkspace>;
}

const route = (roles: string[], pattern: string, render: RouteDef["render"], titleKey: string): RouteDef => ({ pattern, render, shell: "b2b", roles, titleKey });
const CORP = ["CORPORATE_CUSTOMER"];
const PART = ["PARTNER"];
const WHOLE = ["WHOLESALE_CUSTOMER"];

export const b2bRoutes: RouteDef[] = [
  route(CORP, "/corporate", () => <B2B.B2BDashboardPage />, "b2b.nav.dashboard"),
  route(CORP, "/corporate/sites", () => <B2B.SitesPage />, "b2b.nav.sites"),
  route(CORP, "/corporate/devices", () => <B2B.B2BDevicesPage />, "b2b.nav.devices"),
  route(CORP, "/corporate/services", () => <B2B.B2BServicesPage base="/corporate/services" />, "b2b.nav.services"),
  route(CORP, "/corporate/services/:id", (p) => <Account.ServiceOrderDetailPage id={p.id!} back="/corporate/services" />, "b2b.nav.services"),
  route(CORP, "/corporate/schedule", () => <B2B.SchedulePlanPage />, "b2b.nav.schedule"),
  route(CORP, "/corporate/contracts", () => <B2B.ContractsPage />, "b2b.nav.contracts"),
  route(CORP, "/corporate/documents", () => <B2B.B2BDocumentsPage />, "b2b.nav.documents"),
  route(CORP, "/corporate/reports", () => <B2B.ReportsPage />, "b2b.nav.reports"),
  route(CORP, "/corporate/users", () => <B2B.CompanyUsersPage />, "b2b.nav.users"),
  route(CORP, "/corporate/company", () => <B2B.CompanyProfilePage />, "b2b.nav.companyProfile"),
  route(CORP, "/corporate/profile", () => <Account.ProfilePage />, "acc.nav.profile"),
  route(CORP, "/corporate/notifications", () => <Account.NotificationsPage />, "acc.nav.notifications"),

  route(PART, "/partner", () => <B2B.B2BDashboardPage />, "b2b.nav.dashboard"),
  route(PART, "/partner/catalog", () => <ShopPage base="/partner/catalog" />, "b2b.nav.catalog"),
  route(PART, "/partner/catalog/*", (p) => <ShopPage base="/partner/catalog" categoryPath={p["*"]} />, "b2b.nav.catalog"),
  route(PART, "/partner/orders", () => <Account.SalesOrdersPage base="/partner/orders" />, "b2b.nav.orders"),
  route(PART, "/partner/orders/:id", (p) => <Account.SalesOrderDetailPage id={p.id!} back="/partner/orders" />, "b2b.nav.orders"),
  route(PART, "/partner/services", () => <B2B.B2BServicesPage base="/partner/services" />, "b2b.nav.services"),
  route(PART, "/partner/services/:id", (p) => <Account.ServiceOrderDetailPage id={p.id!} back="/partner/services" />, "b2b.nav.services"),
  route(PART, "/partner/commissions", () => <B2B.CommissionsPage />, "b2b.nav.commissions"),
  route(PART, "/partner/documents", () => <B2B.B2BDocumentsPage />, "b2b.nav.documents"),
  route(PART, "/partner/balance", () => <B2B.BalancePage />, "b2b.nav.balance"),
  route(PART, "/partner/users", () => <B2B.CompanyUsersPage />, "b2b.nav.users"),
  route(PART, "/partner/company", () => <B2B.CompanyProfilePage />, "b2b.nav.companyProfile"),
  route(PART, "/partner/profile", () => <Account.ProfilePage />, "acc.nav.profile"),
  route(PART, "/partner/notifications", () => <Account.NotificationsPage />, "acc.nav.notifications"),

  route(WHOLE, "/wholesale", () => <B2B.B2BDashboardPage />, "b2b.nav.dashboard"),
  route(WHOLE, "/wholesale/catalog", () => <ShopPage base="/wholesale/catalog" />, "b2b.nav.catalog"),
  route(WHOLE, "/wholesale/catalog/*", (p) => <ShopPage base="/wholesale/catalog" categoryPath={p["*"]} />, "b2b.nav.catalog"),
  route(WHOLE, "/wholesale/quick-order", () => <B2B.QuickOrderPage />, "b2b.nav.quickOrder"),
  route(WHOLE, "/wholesale/quotes", () => <B2B.QuotesPage />, "b2b.nav.quotes"),
  route(WHOLE, "/wholesale/orders", () => <Account.SalesOrdersPage base="/wholesale/orders" />, "b2b.nav.orders"),
  route(WHOLE, "/wholesale/orders/:id", (p) => <Account.SalesOrderDetailPage id={p.id!} back="/wholesale/orders" />, "b2b.nav.orders"),
  route(WHOLE, "/wholesale/documents", () => <B2B.B2BDocumentsPage />, "b2b.nav.documents"),
  route(WHOLE, "/wholesale/balance", () => <B2B.BalancePage />, "b2b.nav.balance"),
  route(WHOLE, "/wholesale/users", () => <B2B.CompanyUsersPage />, "b2b.nav.users"),
  route(WHOLE, "/wholesale/company", () => <B2B.CompanyProfilePage />, "b2b.nav.companyProfile"),
  route(WHOLE, "/wholesale/profile", () => <Account.ProfilePage />, "acc.nav.profile"),
  route(WHOLE, "/wholesale/notifications", () => <Account.NotificationsPage />, "acc.nav.notifications"),
];
