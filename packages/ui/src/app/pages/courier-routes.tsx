"use client";
import React from "react";
import { Bell, Package, Truck, UserRound } from "lucide-react";
import { useI18n } from "../core/i18n";
import { useSession } from "../core/session";
import { SiteWorkspace, type NavGroup } from "../core/shells";
import { lazyPages } from "../core/lazy";
import type { RouteDef } from "../core/router";

// Kuryer interfeysi səhifələri ayrıca chunk-dır
const Courier = lazyPages(() => import("./courier"));
const Account = lazyPages(() => import("./account"));

const COURIER = ["COURIER", "TECHNICIAN"];

/** Kuryer interfeysi də digər kabinetlər kimi sayt qabığında açılır. */
export function CourierShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { session } = useSession();
  const nav: NavGroup[] = [
    {
      items: [
        { to: "/courier", label: t("courier.tasksTitle"), icon: Package, exact: true },
        { to: "/courier/notifications", label: t("acc.nav.notifications"), icon: Bell, badge: session?.unreadNotifications || null },
        { to: "/courier/profile", label: t("acc.nav.profile"), icon: UserRound },
      ],
    },
  ];
  return <SiteWorkspace nav={nav} title={t("courier.title")} badge={{ label: t("courier.title"), icon: Truck }}>{children}</SiteWorkspace>;
}

export const courierRoutes: RouteDef[] = [
  { pattern: "/courier", render: () => <Courier.CourierTasksPage />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
  { pattern: "/courier/tasks", render: () => <Courier.CourierTasksPage />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
  { pattern: "/courier/profile", render: () => <Account.ProfilePage />, shell: "courier", roles: COURIER, titleKey: "acc.nav.profile" },
  { pattern: "/courier/notifications", render: () => <Account.NotificationsPage />, shell: "courier", roles: COURIER, titleKey: "acc.nav.notifications" },
  { pattern: "/courier/tasks/:id", render: (p) => <Courier.CourierTaskPage id={p.id!} />, shell: "courier", roles: COURIER, titleKey: "courier.title" },
];
