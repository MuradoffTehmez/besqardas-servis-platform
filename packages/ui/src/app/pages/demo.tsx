"use client";
import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Building2, Globe, HardHat, KeyRound, LayoutDashboard, LogIn, Package, ShieldCheck, Truck, User, Users, Wrench } from "lucide-react";
import { cn } from "@sp/utils";
import { post, useQueryClient } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { useRouter } from "../core/router";
import { useSession } from "../core/session";
import { adminUrl } from "../core/shells";
import { errorText } from "../kit/base";

/**
 * Platforma xəritəsi: bütün modullar, onların səhifələri və bir kliklə demo girişi (PRD §65).
 * Hər keçid lazım olan rolla daxil olur və birbaşa həmin səhifəni açır.
 */

const DEMO_PASSWORD = "Demo1234!";
const DEMO_CODE = "123456";

interface DemoModule {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: string;
  account?: { login: string; role: string };
  admin?: boolean;
  links: [labelKey: string, to: string][];
}

const MODULES: DemoModule[] = [
  {
    id: "public", icon: Globe, tone: "sky",
    links: [["home", "/"], ["services", "/services"], ["nav.shop", "/shop"], ["search.title", "/search"], ["compare.title", "/compare"], ["cart.title", "/cart"], ["technicians", "/technicians"], ["nav.pricing", "/pricing"], ["nav.branches", "/branches"], ["faqPage.title", "/faq"], ["warrantyVerify.title", "/warranty/verify"], ["contact", "/contact"], ["about", "/about"], ["techApply.title", "/become-technician"], ["b2bApply.title", "/business"]],
  },
  {
    id: "auth", icon: KeyRound, tone: "violet",
    links: [["auth.loginTitle", "/login"], ["auth.registerTitle", "/register"], ["auth.forgotTitle", "/forgot-password"]],
  },
  {
    id: "customer", icon: User, tone: "teal", account: { login: "aysel@demo.az", role: "CUSTOMER" },
    links: [["acc.nav.dashboard", "/account"], ["acc.nav.services", "/account/services"], ["acc.nav.orders", "/account/orders"], ["acc.nav.devices", "/account/devices"], ["acc.nav.addresses", "/account/addresses"], ["acc.nav.subscription", "/account/subscription"], ["acc.nav.payments", "/account/payments"], ["acc.nav.documents", "/account/documents"], ["acc.nav.warranties", "/account/warranties"], ["acc.nav.returns", "/account/returns"], ["acc.nav.favorites", "/account/favorites"], ["acc.nav.reviews", "/account/reviews"], ["acc.nav.notifications", "/account/notifications"], ["acc.nav.family", "/account/family"], ["acc.nav.profile", "/account/profile"], ["acc.nav.security", "/account/security"], ["cart.title", "/cart"], ["checkout.title", "/checkout"]],
  },
  {
    id: "technician", icon: HardHat, tone: "amber", account: { login: "elvin@demo.az", role: "TECHNICIAN" },
    links: [["tech.nav.dashboard", "/technician/dashboard"], ["tech.nav.jobs", "/technician/jobs"], ["tech.nav.schedule", "/technician/schedule"], ["tech.nav.customers", "/technician/customers"], ["tech.nav.materials", "/technician/inventory"], ["tech.nav.reservations", "/technician/reservations"], ["tech.nav.specializations", "/technician/specializations"], ["tech.nav.earnings", "/technician/earnings"], ["tech.nav.statistics", "/technician/statistics"], ["tech.nav.reviews", "/technician/reviews"], ["tech.nav.documents", "/technician/documents"], ["tech.nav.subscription", "/technician/subscription"], ["tech.nav.settings", "/technician/settings"]],
  },
  {
    id: "staffTechnician", icon: Wrench, tone: "orange", account: { login: "kamran@demo.az", role: "TECHNICIAN" },
    links: [["tech.nav.dashboard", "/technician/dashboard"], ["tech.nav.jobs", "/technician/jobs"], ["tech.nav.inventory", "/technician/inventory"], ["tech.nav.license", "/technician/subscription"]],
  },
  {
    id: "courier", icon: Truck, tone: "slate", account: { login: "+994553334455", role: "COURIER" },
    links: [["courier.title", "/courier"]],
  },
  {
    id: "corporate", icon: Building2, tone: "indigo", account: { login: "corporate@demo.az", role: "CORPORATE_CUSTOMER" },
    links: [["b2b.nav.dashboard", "/corporate"], ["b2b.nav.services", "/corporate/services"], ["b2b.nav.schedule", "/corporate/schedule"], ["b2b.nav.sites", "/corporate/sites"], ["b2b.nav.devices", "/corporate/devices"], ["b2b.nav.contracts", "/corporate/contracts"], ["b2b.nav.reports", "/corporate/reports"], ["b2b.nav.documents", "/corporate/documents"], ["b2b.nav.users", "/corporate/users"]],
  },
  {
    id: "partner", icon: Users, tone: "rose", account: { login: "partner@demo.az", role: "PARTNER" },
    links: [["b2b.nav.dashboard", "/partner"], ["b2b.nav.catalog", "/partner/catalog"], ["b2b.nav.orders", "/partner/orders"], ["b2b.nav.services", "/partner/services"], ["b2b.nav.commissions", "/partner/commissions"], ["b2b.nav.balance", "/partner/balance"], ["b2b.nav.documents", "/partner/documents"], ["b2b.nav.users", "/partner/users"]],
  },
  {
    id: "wholesale", icon: Package, tone: "emerald", account: { login: "wholesale@demo.az", role: "WHOLESALE_CUSTOMER" },
    links: [["b2b.nav.dashboard", "/wholesale"], ["b2b.nav.catalog", "/wholesale/catalog"], ["b2b.nav.quickOrder", "/wholesale/quick-order"], ["b2b.nav.quotes", "/wholesale/quotes"], ["b2b.nav.orders", "/wholesale/orders"], ["b2b.nav.balance", "/wholesale/balance"], ["b2b.nav.documents", "/wholesale/documents"], ["b2b.nav.users", "/wholesale/users"]],
  },
  {
    id: "admin", icon: LayoutDashboard, tone: "brand", admin: true, account: { login: "superadmin@demo.az", role: "SUPER_ADMIN" },
    links: [["adm.nav.dashboard", "/"], ["adm.nav.serviceOrders", "/service-orders"], ["adm.orders.create", "/service-orders/new"], ["adm.nav.dispatch", "/dispatch"], ["adm.nav.schedule", "/schedule"], ["adm.nav.logistics", "/logistics"], ["adm.nav.warrantyClaims", "/warranty-claims"], ["adm.nav.workflowTemplates", "/workflow-templates"], ["adm.nav.customers", "/customers"], ["adm.nav.technicians", "/technicians"], ["adm.nav.verification", "/technicians/verification"], ["adm.nav.roles", "/roles"], ["adm.nav.products", "/products"], ["adm.nav.categories", "/categories"], ["adm.nav.compatibility", "/compatibility"], ["adm.nav.salesOrders", "/sales-orders"], ["adm.nav.quotes", "/quotes"], ["adm.nav.inventory", "/inventory"], ["adm.nav.transfers", "/transfers"], ["adm.nav.stockCounts", "/stock-counts"], ["adm.nav.purchases", "/purchases"], ["adm.nav.subscriptionPlans", "/subscription-plans"], ["adm.nav.finance", "/finance"], ["adm.nav.cashDesks", "/cash-desks"], ["adm.nav.technicianSettlements", "/technician-settlements"], ["adm.nav.contentPages", "/content/pages"], ["adm.nav.settings", "/settings"], ["adm.nav.branding", "/settings/branding"], ["adm.nav.integrations", "/integrations"], ["adm.nav.auditLogs", "/audit-logs"], ["adm.nav.reports", "/reports"]],
  },
];

const STAFF_ROLES: { login: string; role: string; to: string }[] = [
  { login: "operator@demo.az", role: "OPERATOR", to: "/service-orders" },
  { login: "dispatcher@demo.az", role: "DISPATCHER", to: "/dispatch" },
  { login: "warehouse@demo.az", role: "WAREHOUSE_EMPLOYEE", to: "/inventory" },
  { login: "sales@demo.az", role: "SALES_EMPLOYEE", to: "/sales-orders" },
  { login: "accountant@demo.az", role: "ACCOUNTANT", to: "/finance" },
  { login: "manager@demo.az", role: "MANAGER", to: "/reports" },
  { login: "admin@demo.az", role: "ADMIN", to: "/" },
];

const INITIAL_LINKS = 8;

export function DemoMapPage() {
  const { t, enumLabel } = useI18n();
  const { navigate } = useRouter();
  const { user, refresh } = useSession();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  /** Demo hesabı ilə daxil olur: şifrə və ya OTP, lazım olsa 2FA və rejim seçimi. */
  const signIn = async (login: string, role: string) => {
    let r: any;
    if (login.startsWith("+")) {
      const c: any = await post("/auth/otp/request", { phone: login, purpose: "LOGIN" });
      r = await post("/auth/otp/verify", { phone: login, code: c.devCode ?? DEMO_CODE, challengeId: c.challengeId });
    } else {
      r = await post("/auth/login", { email: login, password: DEMO_PASSWORD });
    }
    if (r?.status === "TWO_FACTOR_REQUIRED") r = await post("/auth/2fa", { challengeId: r.challengeId, code: DEMO_CODE });
    if (r?.status === "SELECT_MODE" || (r?.session?.user && r.session.user.activeRole !== role)) await post("/auth/select-mode", { role });
    await qc.invalidateQueries({ queryKey: ["api"] });
    await refresh();
  };

  const open = async (m: { account?: { login: string; role: string }; admin?: boolean }, to: string, key: string) => {
    const same = (login: string) => !!user && (user.email === login || user.phone?.replace(/\s/g, "") === login);
    const needLogin = !!m.account && !(same(m.account.login) && (m.admin || user!.activeRole === m.account.role));
    setBusy(key);
    try {
      if (m.account && needLogin) {
        await signIn(m.account.login, m.account.role);
        toast.success(t("demo.signedIn", { login: m.account.login }));
      }
      if (m.admin) {
        const base = adminUrl();
        window.location.href = to === "/" ? base : `${base}${to}`;
        return;
      }
      navigate(to);
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container py-8 demo-map">
      <header className="demo-hero">
        <div>
          <span className="demo-eyebrow">{t("demo.eyebrow")}</span>
          <h1>{t("demo.title")}</h1>
          <p>{t("demo.subtitle")}</p>
        </div>
        <div className="demo-cred">
          <ShieldCheck size={18} aria-hidden />
          <div>
            <strong>{t("demo.credTitle")}</strong>
            <span>{t("auth.demoHint")}</span>
            {user && <span>{t("demo.current", { name: user.fullName, role: enumLabel("Role", user.activeRole) })}</span>}
          </div>
        </div>
      </header>

      <nav className="demo-toc" aria-label={t("demo.title")}>
        {MODULES.map((m) => (
          <a key={m.id} href={`#demo-${m.id}`} className="chip">{t(`demo.m.${m.id}.title`)}</a>
        ))}
        <a href="#demo-staff" className="chip">{t("demo.staffTitle")}</a>
      </nav>

      <div className="demo-grid">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const all = expanded.includes(m.id);
          const links = all ? m.links : m.links.slice(0, INITIAL_LINKS);
          return (
            <section key={m.id} id={`demo-${m.id}`} className={cn("demo-card", `tone-${m.tone}`)}>
              <div className="demo-card-head">
                <span className="demo-icon"><Icon size={22} /></span>
                <div>
                  <h2>{t(`demo.m.${m.id}.title`)}</h2>
                  <p>{t(`demo.m.${m.id}.text`)}</p>
                </div>
              </div>
              {m.account ? (
                <div className="demo-account">
                  <span><strong>{m.account.login}</strong> · {enumLabel("Role", m.account.role)}</span>
                  <button type="button" className="btn primary btn-sm" disabled={!!busy} onClick={() => open(m, m.links[0]![1], `${m.id}:main`)}>
                    <LogIn size={14} /> {busy === `${m.id}:main` ? t("demo.signingIn") : t("demo.enter")}
                  </button>
                </div>
              ) : (
                <div className="demo-account muted"><span>{t("demo.noLogin")}</span></div>
              )}
              <ul className="demo-links">
                {links.map(([key, to]) => (
                  <li key={to + key}>
                    <button type="button" disabled={!!busy} onClick={() => open(m, to, `${m.id}:${to}`)}>
                      <span>{t(key)}</span>
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {m.links.length > INITIAL_LINKS && (
                <button type="button" className="btn ghost btn-sm demo-more" onClick={() => setExpanded((e) => (all ? e.filter((x) => x !== m.id) : [...e, m.id]))}>
                  {all ? t("demo.less") : t("demo.more", { count: m.links.length - INITIAL_LINKS })}
                </button>
              )}
            </section>
          );
        })}

        <section id="demo-staff" className="demo-card demo-staff tone-brand">
          <div className="demo-card-head">
            <span className="demo-icon"><Users size={22} /></span>
            <div>
              <h2>{t("demo.staffTitle")}</h2>
              <p>{t("demo.staffText")}</p>
            </div>
          </div>
          <ul className="demo-links">
            {STAFF_ROLES.map((s) => (
              <li key={s.login}>
                <button type="button" disabled={!!busy} onClick={() => open({ account: { login: s.login, role: s.role }, admin: true }, s.to, `staff:${s.login}`)}>
                  <span><strong>{enumLabel("Role", s.role)}</strong> <small>{s.login}</small></span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
