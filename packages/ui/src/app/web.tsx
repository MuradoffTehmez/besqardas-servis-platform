"use client";
import React from "react";
import { Award, Bell, CreditCard, FileText, Heart, HardDrive, LayoutDashboard, LifeBuoy, Lock, MapPin, Package, RotateCcw, ShieldCheck, Star, User, Users, Wrench, Crown } from "lucide-react";
import { useI18n } from "./core/i18n";
import { useSession } from "./core/session";
import { AppProviders, RoutedApp, SystemPage, defaultShells, type InitialAppState, type ShellRender } from "./core/app";
import { SiteWorkspace, type NavGroup } from "./core/shells";
import type { RouteDef } from "./core/router";
import { BecomeTechnicianPage, BusinessPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, SelectModePage, TwoFactorPage, VerifyPage } from "./pages/auth";
import { BookingPage, ContentPage, HomePage, ServiceDetailPage, ServicesPage, WarrantyVerifyPage } from "./pages/public";
import { BranchesPage, ContactPage, FaqPage, PricingPage, TechnicianProfilePage, TechniciansPage } from "./pages/info";
import { CartPage, CheckoutPage, CheckoutResultPage, PayPage, ProductPage, SearchPage, ShopPage } from "./pages/shop";
import { ComparePage } from "./pages/compare";
import { lazyPages } from "./core/lazy";
import { technicianRoutes, TechnicianShell } from "./pages/technician-routes";
import { CourierShell, courierRoutes } from "./pages/courier-routes";
import { b2bRoutes, B2BShell } from "./pages/b2b-routes";
import { DemoMapPage } from "./pages/demo";

// Müştəri kabineti səhifələri ayrıca chunk-dır — public səhifələrin JS yükünə düşmür
const Account = lazyPages(() => import("./pages/account"));
const Support = lazyPages(() => import("./pages/support"));
const Loyalty = lazyPages(() => import("./pages/loyalty"));

/**
 * Müştəri saytı (apps/web): public sayt, auth, kabinet, usta paneli, B2B kabinetləri və kuryer interfeysi (PRD §60).
 */

/** Müştəri kabineti — sayt qabığında (SiteWorkspace). */
function AccountShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { session, ent } = useSession();
  const nav: NavGroup[] = [
    {
      items: [
        { to: "/account", label: t("acc.nav.dashboard"), icon: LayoutDashboard, exact: true },
        { to: "/account/services", label: t("acc.nav.services"), icon: Wrench },
        { to: "/account/orders", label: t("acc.nav.orders"), icon: Package },
        { to: "/account/devices", label: t("acc.nav.devices"), icon: HardDrive },
        { to: "/account/addresses", label: t("acc.nav.addresses"), icon: MapPin },
      ],
    },
    {
      label: t("acc.nav.finance"),
      items: [
        { to: "/account/loyalty", label: t("loyalty.nav"), icon: Award },
        { to: "/account/subscription", label: t("acc.nav.subscription"), icon: Crown },
        { to: "/account/payments", label: t("acc.nav.payments"), icon: CreditCard },
        { to: "/account/documents", label: t("acc.nav.documents"), icon: FileText },
        { to: "/account/warranties", label: t("acc.nav.warranties"), icon: ShieldCheck },
        { to: "/account/returns", label: t("acc.nav.returns"), icon: RotateCcw },
      ],
    },
    {
      label: t("acc.nav.more"),
      items: [
        { to: "/account/support", label: t("support.nav"), icon: LifeBuoy },
        { to: "/account/favorites", label: t("acc.nav.favorites"), icon: Heart },
        { to: "/account/reviews", label: t("acc.nav.reviews"), icon: Star },
        { to: "/account/notifications", label: t("acc.nav.notifications"), icon: Bell, badge: session?.unreadNotifications || null },
        { to: "/account/family", label: t("acc.nav.family"), icon: Users, hidden: !Number(ent("family_members") ?? 0) },
        { to: "/account/profile", label: t("acc.nav.profile"), icon: User },
        { to: "/account/security", label: t("acc.nav.security"), icon: Lock },
      ],
    },
  ];
  const plan = session?.plan?.name as string | undefined;
  return <SiteWorkspace nav={nav} title={t("acc.title")} badge={plan ? { label: plan, to: "/account/subscription", icon: Crown } : null}>{children}</SiteWorkspace>;
}

const CUSTOMER = ["CUSTOMER"];

export const webRoutes: RouteDef[] = [
  // Public (§60.1)
  { pattern: "/", render: () => <HomePage /> },
  { pattern: "/services", render: () => <ServicesPage />, titleKey: "services" },
  { pattern: "/services/:slug/book", render: (p) => <BookingPage slug={p.slug!} />, titleKey: "booking.title", roles: ["CUSTOMER", "CORPORATE_CUSTOMER", "PARTNER"] },
  { pattern: "/services/:slug", render: (p) => <ServiceDetailPage slug={p.slug!} /> },
  { pattern: "/shop", render: () => <ShopPage />, titleKey: "nav.shop" },
  { pattern: "/shop/*", render: (p) => <ShopPage categoryPath={p["*"]} />, titleKey: "nav.shop" },
  { pattern: "/product/:slug", render: (p) => <ProductPage slug={p.slug!} /> },
  { pattern: "/search", render: () => <SearchPage />, titleKey: "search.title" },
  { pattern: "/compare", render: () => <ComparePage />, titleKey: "compare.title" },
  { pattern: "/cart", render: () => <CartPage />, titleKey: "cart.title" },
  { pattern: "/checkout", render: () => <CheckoutPage />, titleKey: "checkout.title" },
  { pattern: "/checkout/pay", render: () => <PayPage />, titleKey: "pay.title" },
  { pattern: "/checkout/result", render: () => <CheckoutResultPage />, titleKey: "result.title" },
  { pattern: "/technicians", render: () => <TechniciansPage />, titleKey: "technicians" },
  { pattern: "/technicians/:id", render: (p) => <TechnicianProfilePage id={p.id!} /> },
  { pattern: "/pricing", render: () => <PricingPage />, titleKey: "nav.pricing" },
  { pattern: "/warranty/verify", render: () => <WarrantyVerifyPage />, titleKey: "warrantyVerify.title" },
  { pattern: "/warranty/verify/:code", render: (p) => <WarrantyVerifyPage code={p.code} />, titleKey: "warrantyVerify.title" },
  { pattern: "/branches", render: () => <BranchesPage />, titleKey: "nav.branches" },
  { pattern: "/about", render: () => <ContentPage slug="about" />, titleKey: "about" },
  { pattern: "/terms", render: () => <ContentPage slug="terms" />, titleKey: "legal.terms" },
  { pattern: "/privacy", render: () => <ContentPage slug="privacy" />, titleKey: "legal.privacy" },
  { pattern: "/faq", render: () => <FaqPage />, titleKey: "faqPage.title" },
  { pattern: "/contact", render: () => <ContactPage />, titleKey: "contact" },
  { pattern: "/become-technician", render: () => <BecomeTechnicianPage />, titleKey: "techApply.title" },
  { pattern: "/business", render: () => <BusinessPage />, titleKey: "b2bApply.title" },
  { pattern: "/demo", render: () => <DemoMapPage />, titleKey: "demo.title" },

  // Auth (§60.2)
  { pattern: "/login", render: () => <LoginPage />, titleKey: "auth.loginTitle" },
  { pattern: "/register", render: () => <RegisterPage />, titleKey: "auth.registerTitle" },
  { pattern: "/forgot-password", render: () => <ForgotPasswordPage />, titleKey: "auth.forgotTitle" },
  { pattern: "/reset-password", render: () => <ResetPasswordPage />, titleKey: "auth.resetTitle" },
  { pattern: "/verify", render: () => <VerifyPage />, titleKey: "auth.verifyTitle" },
  { pattern: "/2fa", render: () => <TwoFactorPage />, titleKey: "auth.twoFactorTitle" },
  { pattern: "/select-mode", render: () => <SelectModePage />, titleKey: "auth.selectModeTitle" },

  // Müştəri kabineti (§60.3)
  { pattern: "/account", render: () => <Account.AccountDashboardPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.dashboard" },
  { pattern: "/account/profile", render: () => <Account.ProfilePage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.profile" },
  { pattern: "/account/addresses", render: () => <Account.AddressesPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.addresses" },
  { pattern: "/account/devices", render: () => <Account.DevicesPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.devices" },
  { pattern: "/account/devices/:id", render: (p) => <Account.DeviceDetailPage id={p.id!} />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.devices" },
  { pattern: "/account/services", render: () => <Account.ServiceOrdersPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.services" },
  { pattern: "/account/services/:id", render: (p) => <Account.ServiceOrderDetailPage id={p.id!} />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.services" },
  { pattern: "/account/orders", render: () => <Account.SalesOrdersPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.orders" },
  { pattern: "/account/orders/:id", render: (p) => <Account.SalesOrderDetailPage id={p.id!} />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.orders" },
  { pattern: "/account/returns", render: () => <Account.ReturnsPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.returns" },
  { pattern: "/account/subscription", render: () => <Account.SubscriptionPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.subscription" },
  { pattern: "/account/loyalty", render: () => <Loyalty.LoyaltyPage />, shell: "account", roles: CUSTOMER, titleKey: "loyalty.nav" },
  { pattern: "/account/payments", render: () => <Account.PaymentsPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.payments" },
  { pattern: "/account/warranties", render: () => <Account.WarrantiesPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.warranties" },
  { pattern: "/account/documents", render: () => <Account.DocumentsPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.documents" },
  { pattern: "/account/favorites", render: () => <Account.FavoritesPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.favorites" },
  { pattern: "/account/notifications", render: () => <Account.NotificationsPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.notifications" },
  { pattern: "/account/reviews", render: () => <Account.MyReviewsPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.reviews" },
  { pattern: "/account/family", render: () => <Account.FamilyPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.family" },
  { pattern: "/account/security", render: () => <Account.SecurityPage />, shell: "account", roles: CUSTOMER, titleKey: "acc.nav.security" },
  { pattern: "/account/support", render: () => <Support.SupportTicketsPage base="/account/support" />, shell: "account", roles: CUSTOMER, titleKey: "support.nav" },
  { pattern: "/account/support/:id", render: (p) => <Support.SupportTicketDetailPage id={p.id!} base="/account/support" />, shell: "account", roles: CUSTOMER, titleKey: "support.nav" },

  ...technicianRoutes,
  ...b2bRoutes,
  ...courierRoutes,

  // Sistem səhifələri (§60.7)
  { pattern: "/403", render: () => <SystemPage code="403" /> },
  { pattern: "/500", render: () => <SystemPage code="500" /> },
  { pattern: "/maintenance", render: () => <SystemPage code="maintenance" />, shell: "bare" },
];

const webShells: Record<string, ShellRender> = {
  ...defaultShells,
  account: (c) => <AccountShell>{c}</AccountShell>,
  technician: (c) => <TechnicianShell>{c}</TechnicianShell>,
  b2b: (c) => <B2BShell>{c}</B2BShell>,
  courier: (c) => <CourierShell>{c}</CourierShell>,
};

export function WebApp(ssr: InitialAppState) {
  return (
    <AppProviders {...ssr}>
      <RoutedApp routes={webRoutes} shells={webShells} app="web" />
    </AppProviders>
  );
}

