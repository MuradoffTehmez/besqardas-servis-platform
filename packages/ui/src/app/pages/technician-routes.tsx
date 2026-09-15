"use client";
import React from "react";
import { BadgeCheck, BarChart3, Bell, Boxes, CalendarDays, ClipboardList, Clock, Crown, FileBadge, LayoutDashboard, Settings, Star, UserRound, Users, Wallet } from "lucide-react";
import { useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { useSession } from "../core/session";
import { SiteWorkspace, type NavGroup } from "../core/shells";
import { lazyPages } from "../core/lazy";
import type { RouteDef } from "../core/router";

// Usta paneli səhifələri ayrıca chunk-dır — route cədvəli və qabıq yüngül qalır
const Technician = lazyPages(() => import("./technician"));
const Account = lazyPages(() => import("./account"));

/* ------------------------------------------------------------------ */
/* Shell və route-lar (PRD §60.4)                                       */
/* ------------------------------------------------------------------ */

export function TechnicianShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { user, session } = useSession();
  const dash = useApi<any>("/technician/dashboard", { staleTime: 30_000 });
  const staff = user?.employmentType === "STAFF";
  const nav: NavGroup[] = [
    {
      items: [
        { to: "/technician/dashboard", label: t("tech.nav.dashboard"), icon: LayoutDashboard },
        { to: "/technician/jobs", label: t("tech.nav.jobs"), icon: ClipboardList, badge: dash.data?.offers || null },
        { to: "/technician/schedule", label: t("tech.nav.schedule"), icon: CalendarDays },
        { to: "/technician/customers", label: t("tech.nav.customers"), icon: Users },
        { to: "/technician/notifications", label: t("acc.nav.notifications"), icon: Bell, badge: session?.unreadNotifications || null },
      ],
    },
    {
      label: t("tech.nav.work"),
      items: [
        { to: "/technician/inventory", label: staff ? t("tech.nav.inventory") : t("tech.nav.materials"), icon: Boxes },
        { to: "/technician/reservations", label: t("tech.nav.reservations"), icon: Clock },
        { to: "/technician/specializations", label: t("tech.nav.specializations"), icon: BadgeCheck },
        { to: "/technician/earnings", label: t("tech.nav.earnings"), icon: Wallet },
        { to: "/technician/statistics", label: t("tech.nav.statistics"), icon: BarChart3 },
      ],
    },
    {
      label: t("tech.nav.profile"),
      items: [
        { to: "/technician/profile", label: t("acc.nav.profile"), icon: UserRound },
        { to: "/technician/reviews", label: t("tech.nav.reviews"), icon: Star },
        { to: "/technician/documents", label: t("tech.nav.documents"), icon: FileBadge },
        { to: "/technician/subscription", label: staff ? t("tech.nav.license") : t("tech.nav.subscription"), icon: Crown },
        { to: "/technician/settings", label: t("tech.nav.settings"), icon: Settings },
      ],
    },
  ];
  const plan = staff ? t("tech.nav.license") : dash.data?.planName;
  return <SiteWorkspace nav={nav} title={t("tech.title")} badge={plan ? { label: plan, to: "/technician/subscription", icon: Crown } : null}>{children}</SiteWorkspace>;
}

const TECH = ["TECHNICIAN"];
const r = (pattern: string, render: RouteDef["render"], titleKey: string): RouteDef => ({ pattern, render, shell: "technician", roles: TECH, titleKey });

export const technicianRoutes: RouteDef[] = [
  r("/technician", () => <Technician.TechDashboardPage />, "tech.nav.dashboard"),
  r("/technician/dashboard", () => <Technician.TechDashboardPage />, "tech.nav.dashboard"),
  r("/technician/jobs", () => <Technician.JobsPage />, "tech.nav.jobs"),
  r("/technician/jobs/:id", (p) => <Technician.JobDetailPage id={p.id!} />, "tech.nav.jobs"),
  r("/technician/schedule", () => <Technician.SchedulePage />, "tech.nav.schedule"),
  r("/technician/specializations", () => <Technician.SpecializationsPage />, "tech.nav.specializations"),
  r("/technician/inventory", () => <Technician.InventoryPage />, "tech.nav.inventory"),
  r("/technician/reservations", () => <Technician.ReservationsPage />, "tech.nav.reservations"),
  r("/technician/customers", () => <Technician.CustomersPage />, "tech.nav.customers"),
  r("/technician/earnings", () => <Technician.EarningsPage />, "tech.nav.earnings"),
  r("/technician/subscription", () => <Account.SubscriptionPage />, "tech.nav.subscription"),
  r("/technician/reviews", () => <Technician.TechReviewsPage />, "tech.nav.reviews"),
  r("/technician/documents", () => <Technician.TechDocumentsPage />, "tech.nav.documents"),
  r("/technician/statistics", () => <Technician.StatisticsPage />, "tech.nav.statistics"),
  r("/technician/settings", () => <Technician.TechSettingsPage />, "tech.nav.settings"),
  r("/technician/profile", () => <Account.ProfilePage />, "acc.nav.profile"),
  r("/technician/notifications", () => <Account.NotificationsPage />, "acc.nav.notifications"),
];
