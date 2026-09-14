"use client";
import React from "react";
import {
  Award, BadgePercent, BarChart3, Bell, Boxes, Building2, CalendarDays, ClipboardCheck, ClipboardList, Coins, CreditCard, FileSpreadsheet, FileText, FolderTree, Gauge, GitBranch, Globe, HandCoins, KeyRound,
  LayoutDashboard, ListChecks, Map, MessageSquare, Package, PackageSearch, Palette, Plug, Receipt, RotateCcw, ScrollText, Settings, ShieldAlert, ShieldCheck, ShoppingCart, Star, Tag, Tags, Truck, Undo2, User,
  UserCog, Users, Wallet, Warehouse, Wrench, Workflow, Ruler, Link2, Layers, Percent, Image, HelpCircle, Timer, Plus, FileBadge, Handshake, ArrowLeftRight,
} from "lucide-react";
import { useI18n } from "./core/i18n";
import { useSession, INTERNAL_ROLES } from "./core/session";
import { AppProviders, RoutedApp, SystemPage, defaultShells, type ShellRender } from "./core/app";
import { PanelShell, type NavGroup } from "./core/shells";
import { useRouter, type RouteDef } from "./core/router";
import type { Command } from "./core/nav";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SelectModePage, TwoFactorPage } from "./pages/auth";
import { NotificationsPage } from "./pages/account";
import { Resource } from "./admin/resources";
import { AdminDashboardPage, AdminSchedulePage, AdminServiceOrderDetailPage, AdminServiceOrdersPage, CreateServiceOrderPage, DispatchPage, LogisticsPage, WarrantyClaimsAdminPage, WorkflowTemplateEditorPage, WorkflowTemplatesPage } from "./admin/ops";
import { CustomerDetailPage, LicensesPage, PartnershipsPage, RolesPage, TechnicianAdminDetailPage, TechniciansAdminPage, UsersPage, VerificationPage } from "./admin/people";
import { CompatibilityPage, CostingMethodsPage, InventoryPage, ProductEditorPage, ProductsAdminPage, PurchasesPage, QuotesAdminPage, SalesOrderAdminDetailPage, StockCountDetailPage, StockCountsPage, TransfersPage } from "./admin/commerce";
import { AdminProfilePage, BrandingPage, CashDesksPage, FinancePage, IntegrationsPage, ReportsPage, SettingsPage, SettlementsPage, SubscriptionPlansAdminPage } from "./admin/finance";

/**
 * CRM/ERP admin paneli (apps/admin, PRD §61). Menyu icazələrə görə süzülür; hər səhifənin qorunması backend-dədir (§70).
 */

function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { session, can } = useSession();
  const { navigate } = useRouter();
  const n = (k: string) => t(`adm.nav.${k}`);
  const nav: NavGroup[] = [
    { items: [{ to: "/", label: n("dashboard"), icon: LayoutDashboard, exact: true }, { to: "/notifications", label: n("notifications"), icon: Bell, badge: session?.unreadNotifications || null }] },
    { label: n("gOps"), items: [
      { to: "/service-orders", label: n("serviceOrders"), icon: ClipboardList, permission: "service_orders:view" },
      { to: "/dispatch", label: n("dispatch"), icon: Map, permission: ["assignments:view", "assignments:assign"] },
      { to: "/schedule", label: n("schedule"), icon: CalendarDays, permission: "service_orders:view" },
      { to: "/estimates", label: n("estimates"), icon: FileSpreadsheet, permission: "service_orders:view" },
      { to: "/logistics", label: n("logistics"), icon: Truck, permission: "logistics_tasks:view" },
      { to: "/warranty-claims", label: n("warrantyClaims"), icon: ShieldAlert, permission: "service_orders:view" },
    ] },
    { label: n("gServiceConfig"), items: [
      { to: "/services", label: n("services"), icon: Wrench, permission: "catalog:view" },
      { to: "/workflow-templates", label: n("workflowTemplates"), icon: Workflow, permission: "workflow_templates:view" },
      { to: "/fee-rules", label: n("feeRules"), icon: Coins, permission: "fee_rules:view" },
      { to: "/reason-codes", label: n("reasonCodes"), icon: ListChecks, permission: "reason_codes:view" },
    ] },
    { label: n("gUsers"), items: [
      { to: "/customers", label: n("customers"), icon: Users, permission: "customers:view" },
      { to: "/technicians", label: n("technicians"), icon: UserCog, permission: "technicians:view" },
      { to: "/technicians/verification", label: n("verification"), icon: ShieldCheck, permission: "technicians:view" },
      { to: "/technicians/licenses", label: n("licenses"), icon: FileBadge, permission: "technicians:view" },
      { to: "/technicians/partnerships", label: n("partnerships"), icon: Handshake, permission: "technicians:view" },
      { to: "/couriers", label: n("couriers"), icon: Truck, permission: "logistics_tasks:view" },
      { to: "/employees", label: n("employees"), icon: Award, permission: "users:view" },
      { to: "/b2b-accounts", label: n("b2bAccounts"), icon: Building2, permission: "b2b_accounts:view" },
      { to: "/partner-types", label: n("partnerTypes"), icon: Tags, permission: "b2b_accounts:view" },
      { to: "/users", label: n("users"), icon: User, permission: "users:view" },
      { to: "/roles", label: n("roles"), icon: KeyRound, permission: ["roles:view", "users:view"] },
    ] },
    { label: n("gCatalog"), items: [
      { to: "/products", label: n("products"), icon: Package, permission: "catalog:view" },
      { to: "/categories", label: n("categories"), icon: FolderTree, permission: "catalog:view" },
      { to: "/brands", label: n("brands"), icon: Tag, permission: "catalog:view" },
      { to: "/series", label: n("series"), icon: Layers, permission: "catalog:view" },
      { to: "/models", label: n("models"), icon: PackageSearch, permission: "catalog:view" },
      { to: "/attributes", label: n("attributes"), icon: ListChecks, permission: "catalog:view" },
      { to: "/compatibility", label: n("compatibility"), icon: Link2, permission: "catalog:view" },
      { to: "/units", label: n("units"), icon: Ruler, permission: "catalog:view" },
      { to: "/unit-conversions", label: t("adm.pages.unitConversions"), icon: ArrowLeftRight, permission: "catalog:view" },
    ] },
    { label: n("gSales"), items: [
      { to: "/sales-orders", label: n("salesOrders"), icon: ShoppingCart, permission: "sales_orders:view" },
      { to: "/returns", label: n("returns"), icon: Undo2, permission: "sales_orders:view" },
      { to: "/quotes", label: n("quotes"), icon: ScrollText, permission: "sales_orders:view" },
      { to: "/price-lists", label: n("priceLists"), icon: BadgePercent, permission: "price_rules:view" },
      { to: "/promotions", label: n("promotions"), icon: Percent, permission: "price_rules:view" },
    ] },
    { label: n("gWarehouse"), items: [
      { to: "/inventory", label: n("inventory"), icon: Boxes, permission: "inventory:view" },
      { to: "/warehouses", label: n("warehouses"), icon: Warehouse, permission: "inventory:view" },
      { to: "/stock-movements", label: n("stockMovements"), icon: GitBranch, permission: "inventory:view" },
      { to: "/reservations", label: n("reservations"), icon: Timer, permission: "inventory:view" },
      { to: "/transfers", label: n("transfers"), icon: RotateCcw, permission: "inventory:view" },
      { to: "/stock-counts", label: n("stockCounts"), icon: ClipboardCheck, permission: "inventory:view" },
      { to: "/purchases", label: n("purchases"), icon: Receipt, permission: "purchases:view" },
      { to: "/suppliers", label: n("suppliers"), icon: Building2, permission: "purchases:view" },
    ] },
    { label: n("gSubscriptions"), items: [
      { to: "/subscription-plans", label: n("subscriptionPlans"), icon: Star, permission: "subscription_plans:view" },
      { to: "/subscriptions", label: n("subscriptions"), icon: CreditCard, permission: "subscription_plans:view" },
    ] },
    { label: n("gFinance"), items: [
      { to: "/finance", label: n("finance"), icon: Gauge, permission: "finance_reports:view" },
      { to: "/payments", label: n("payments"), icon: CreditCard, permission: "payments:view" },
      { to: "/invoices", label: n("invoices"), icon: FileText, permission: "payments:view" },
      { to: "/fiscal-receipts", label: n("fiscalReceipts"), icon: Receipt, permission: "payments:view" },
      { to: "/cash-desks", label: n("cashDesks"), icon: Wallet, permission: "payments:view" },
      { to: "/technician-settlements", label: n("technicianSettlements"), icon: HandCoins, permission: "technician_settlements:view" },
      { to: "/partner-commissions", label: n("partnerCommissions"), icon: Percent, permission: "partner_commissions:view" },
      { to: "/costing-methods", label: n("costingMethods"), icon: Coins, permission: ["finance_reports:view", "inventory:view"] },
      { to: "/tax-settings", label: n("taxSettings"), icon: FileSpreadsheet, permission: "finance_reports:view" },
    ] },
    { label: n("gCommunication"), items: [
      { to: "/notification-templates", label: n("notificationTemplates"), icon: MessageSquare, permission: "notification_templates:view" },
      { to: "/reviews", label: n("reviews"), icon: Star, permission: "reviews:view" },
    ] },
    { label: n("gContent"), items: [
      { to: "/content/pages", label: n("contentPages"), icon: FileText, permission: "content:view" },
      { to: "/content/faq", label: n("contentFaq"), icon: HelpCircle, permission: "content:view" },
      { to: "/content/banners", label: n("contentBanners"), icon: Image, permission: "content:view" },
    ] },
    { label: n("gOrganization"), items: [
      { to: "/branches", label: n("branches"), icon: Building2, permission: "branches:view" },
      { to: "/warehouse-groups", label: n("warehouseGroups"), icon: Warehouse, permission: "inventory:view" },
      { to: "/service-zones", label: n("serviceZones"), icon: Globe, permission: "branches:view" },
      { to: "/settings", label: n("settings"), icon: Settings, permission: "settings:view" },
      { to: "/settings/branding", label: n("branding"), icon: Palette, permission: "settings:view" },
      { to: "/integrations", label: n("integrations"), icon: Plug, permission: "integrations:view" },
      { to: "/audit-logs", label: n("auditLogs"), icon: ShieldCheck, permission: "audit_logs:view" },
    ] },
    { label: n("gReports"), items: [
      { to: "/reports", label: n("reports"), icon: BarChart3, permission: ["finance_reports:view", "kpi_targets:view"] },
      { to: "/kpi-targets", label: n("kpiTargets"), icon: Gauge, permission: "kpi_targets:view" },
    ] },
    { items: [{ to: "/profile", label: n("profile"), icon: User }] },
  ];
  const quick = t("panel.quick");
  const commands: Command[] = [
    ...(can("service_orders:create") ? [{ id: "a:new-order", label: t("adm.orders.create"), group: quick, icon: Plus, run: () => navigate("/service-orders/new") }] : []),
    ...(can("technicians:view") ? [{ id: "a:verification", label: n("verification"), group: quick, icon: ShieldCheck, run: () => navigate("/technicians/verification") }] : []),
  ];
  return <PanelShell nav={nav} title="CRM" app="admin" homeLink={false} commands={commands}>{children}</PanelShell>;
}

const R = (pattern: string, render: RouteDef["render"], titleKey: string): RouteDef => ({ pattern, render, shell: "admin", roles: INTERNAL_ROLES, titleKey });
const res = (pattern: string, name: Parameters<typeof Resource>[0]["name"], titleKey: string) => R(pattern, () => <Resource key={name} name={name} />, titleKey);

export const adminRoutes: RouteDef[] = [
  { pattern: "/login", render: () => <LoginPage app="admin" />, shell: "bare", titleKey: "auth.loginTitle" },
  { pattern: "/forgot-password", render: () => <ForgotPasswordPage />, shell: "bare", titleKey: "auth.forgotTitle" },
  { pattern: "/reset-password", render: () => <ResetPasswordPage />, shell: "bare", titleKey: "auth.resetTitle" },
  { pattern: "/2fa", render: () => <TwoFactorPage />, shell: "bare", titleKey: "auth.twoFactorTitle" },
  { pattern: "/select-mode", render: () => <SelectModePage app="admin" />, shell: "bare", titleKey: "auth.selectModeTitle" },

  R("/", () => <AdminDashboardPage />, "adm.nav.dashboard"),
  R("/notifications", () => <NotificationsPage />, "adm.nav.notifications"),
  R("/profile", () => <AdminProfilePage />, "adm.nav.profile"),

  R("/service-orders", () => <AdminServiceOrdersPage />, "adm.nav.serviceOrders"),
  R("/service-orders/new", () => <CreateServiceOrderPage />, "adm.orders.create"),
  R("/service-orders/:id", (p) => <AdminServiceOrderDetailPage id={p.id!} />, "adm.nav.serviceOrders"),
  R("/dispatch", () => <DispatchPage />, "adm.nav.dispatch"),
  R("/schedule", () => <AdminSchedulePage />, "adm.nav.schedule"),
  res("/estimates", "estimates", "adm.nav.estimates"),
  R("/logistics", () => <LogisticsPage />, "adm.nav.logistics"),
  R("/warranty-claims", () => <WarrantyClaimsAdminPage />, "adm.nav.warrantyClaims"),

  res("/services", "services", "adm.nav.services"),
  R("/workflow-templates", () => <WorkflowTemplatesPage />, "adm.nav.workflowTemplates"),
  R("/workflow-templates/:id", (p) => <WorkflowTemplateEditorPage id={p.id!} />, "adm.nav.workflowTemplates"),
  res("/fee-rules", "feeRules", "adm.nav.feeRules"),
  res("/reason-codes", "reasonCodes", "adm.nav.reasonCodes"),

  res("/customers", "customers", "adm.nav.customers"),
  R("/customers/:id", (p) => <CustomerDetailPage id={p.id!} />, "adm.nav.customers"),
  R("/technicians", () => <TechniciansAdminPage />, "adm.nav.technicians"),
  R("/technicians/verification", () => <VerificationPage />, "adm.nav.verification"),
  R("/technicians/licenses", () => <LicensesPage />, "adm.nav.licenses"),
  R("/technicians/partnerships", () => <PartnershipsPage />, "adm.nav.partnerships"),
  R("/technicians/:id", (p) => <TechnicianAdminDetailPage id={p.id!} />, "adm.nav.technicians"),
  res("/couriers", "couriers", "adm.nav.couriers"),
  res("/employees", "employees", "adm.nav.employees"),
  res("/b2b-accounts", "b2bAccounts", "adm.nav.b2bAccounts"),
  res("/partner-types", "partnerTypes", "adm.nav.partnerTypes"),
  R("/users", () => <UsersPage />, "adm.nav.users"),
  R("/roles", () => <RolesPage />, "adm.nav.roles"),

  R("/products", () => <ProductsAdminPage />, "adm.nav.products"),
  R("/products/:id", (p) => <ProductEditorPage id={p.id!} />, "adm.nav.products"),
  res("/categories", "categories", "adm.nav.categories"),
  res("/brands", "brands", "adm.nav.brands"),
  res("/series", "series", "adm.nav.series"),
  res("/models", "models", "adm.nav.models"),
  res("/attributes", "attributes", "adm.nav.attributes"),
  R("/compatibility", () => <CompatibilityPage />, "adm.nav.compatibility"),
  res("/units", "units", "adm.nav.units"),
  res("/unit-conversions", "unitConversions", "adm.pages.unitConversions"),

  res("/sales-orders", "salesOrders", "adm.nav.salesOrders"),
  R("/sales-orders/:id", (p) => <SalesOrderAdminDetailPage id={p.id!} />, "adm.nav.salesOrders"),
  res("/returns", "returns", "adm.nav.returns"),
  R("/quotes", () => <QuotesAdminPage />, "adm.nav.quotes"),
  res("/price-lists", "priceLists", "adm.nav.priceLists"),
  res("/promotions", "promotions", "adm.nav.promotions"),

  R("/inventory", () => <InventoryPage />, "adm.nav.inventory"),
  res("/warehouses", "warehouses", "adm.nav.warehouses"),
  res("/stock-movements", "stockMovements", "adm.nav.stockMovements"),
  res("/reservations", "reservations", "adm.nav.reservations"),
  R("/transfers", () => <TransfersPage />, "adm.nav.transfers"),
  R("/stock-counts", () => <StockCountsPage />, "adm.nav.stockCounts"),
  R("/stock-counts/:id", (p) => <StockCountDetailPage id={p.id!} />, "adm.nav.stockCounts"),
  R("/purchases", () => <PurchasesPage />, "adm.nav.purchases"),
  res("/suppliers", "suppliers", "adm.nav.suppliers"),

  R("/subscription-plans", () => <SubscriptionPlansAdminPage />, "adm.nav.subscriptionPlans"),
  res("/subscriptions", "subscriptions", "adm.nav.subscriptions"),

  R("/finance", () => <FinancePage />, "adm.nav.finance"),
  res("/payments", "payments", "adm.nav.payments"),
  res("/invoices", "invoices", "adm.nav.invoices"),
  res("/fiscal-receipts", "fiscalReceipts", "adm.nav.fiscalReceipts"),
  R("/cash-desks", () => <CashDesksPage />, "adm.nav.cashDesks"),
  R("/technician-settlements", () => <SettlementsPage />, "adm.nav.technicianSettlements"),
  res("/partner-commissions", "commissions", "adm.nav.partnerCommissions"),
  R("/costing-methods", () => <CostingMethodsPage />, "adm.nav.costingMethods"),
  res("/tax-settings", "taxSettings", "adm.nav.taxSettings"),

  res("/notification-templates", "notificationTemplates", "adm.nav.notificationTemplates"),
  res("/reviews", "reviews", "adm.nav.reviews"),

  res("/content/pages", "pages", "adm.nav.contentPages"),
  res("/content/faq", "faq", "adm.nav.contentFaq"),
  res("/content/banners", "banners", "adm.nav.contentBanners"),

  res("/branches", "branches", "adm.nav.branches"),
  res("/warehouse-groups", "warehouseGroups", "adm.nav.warehouseGroups"),
  res("/service-zones", "zones", "adm.nav.serviceZones"),
  R("/settings", () => <SettingsPage />, "adm.nav.settings"),
  R("/settings/branding", () => <BrandingPage />, "adm.nav.branding"),
  R("/integrations", () => <IntegrationsPage />, "adm.nav.integrations"),
  res("/audit-logs", "auditLogs", "adm.nav.auditLogs"),

  R("/reports", () => <ReportsPage />, "adm.nav.reports"),
  res("/kpi-targets", "kpiTargets", "adm.nav.kpiTargets"),

  { pattern: "/403", render: () => <SystemPage code="403" />, shell: "bare" },
  { pattern: "/500", render: () => <SystemPage code="500" />, shell: "bare" },
  { pattern: "/maintenance", render: () => <SystemPage code="maintenance" />, shell: "bare" },
];

const adminShells: Record<string, ShellRender> = {
  ...defaultShells,
  admin: (c) => <AdminShell>{c}</AdminShell>,
  public: (c) => <AdminShell>{c}</AdminShell>,
};

export function AdminApp() {
  return (
    <AppProviders>
      <RoutedApp routes={adminRoutes} shells={adminShells} app="admin" />
    </AppProviders>
  );
}
