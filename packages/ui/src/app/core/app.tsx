"use client";
import React, { Component, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Construction, Lock, SearchX, ServerCrash, WifiOff } from "lucide-react";
import { QueryClient, QueryClientProvider, isUnreachable, useApi, useQueryClient } from "@sp/api-client";
import { I18nProvider, useI18n } from "./i18n";
import { ParamsProvider, RouterProvider, matchRoute, useRouter, type RouteDef } from "./router";
import { SessionProvider, useSession } from "./session";
import { CourierShell, MockPanel, PublicShell, adminUrl, homeFor, webUrl } from "./shells";
import { Loading } from "../kit/base";
import { CurrentRouteProvider } from "./nav";

/**
 * Tətbiq kökü: provayderlər, route uyğunlaşdırma, rol əsaslı guard-lar (PRD §9.3, §70), sistem səhifələri (§60.7).
 */

export type ShellRender = (children: React.ReactNode, route: RouteDef) => React.ReactNode;

function LocaleBridge({ children }: { children: React.ReactNode }) {
  const { locale } = useRouter();
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 15_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <RouterProvider>
        <LocaleBridge>
          <SessionProvider>
            <ConnectionWatch />
            {children}
            <Toaster richColors closeButton position="top-right" />
            <MockPanel />
          </SessionProvider>
        </LocaleBridge>
      </RouterProvider>
    </QueryClientProvider>
  );
}

/**
 * API serveri əlçatan olmayanda üst zolaq göstərir, /health ilə yoxlayır və əlaqə bərpa olunan kimi
 * uğursuz sorğuları yenidən yükləyir — istifadəçi səhifəni yeniləmək məcburiyyətində qalmır.
 */
function ConnectionWatch() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [offline, setOffline] = useState(false);
  useEffect(
    () =>
      qc.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error" && isUnreachable(event.action.error)) setOffline(true);
      }),
    [qc],
  );
  useEffect(() => {
    if (!offline) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (!r.ok) return;
        setOffline(false);
        toast.success(t("errors.backOnline"));
        await qc.invalidateQueries();
      } catch {
        /* hələ də əlçatan deyil */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [offline]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!offline) return null;
  return (
    <div className="conn-banner" role="status" aria-live="polite">
      <WifiOff size={16} aria-hidden /> {t("errors.offlineBanner")}
    </div>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode; fallback: (reset: () => void) => React.ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  componentDidCatch(error: unknown) {
    console.error("[ui] render xətası", error);
  }
  render() {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}

export function SystemPage({ code }: { code: "404" | "403" | "500" | "maintenance" }) {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const Icon = code === "404" ? SearchX : code === "403" ? Lock : code === "500" ? ServerCrash : Construction;
  return (
    <div className="sys-page">
      <Icon size={48} aria-hidden />
      <span className="sys-code">{code === "maintenance" ? "" : code}</span>
      <h1>{t(`system.${code}.title`)}</h1>
      <p>{t(`system.${code}.text`)}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        <button type="button" className="btn primary" onClick={() => navigate("/")}>{t("system.home")}</button>
        {code === "500" && <button type="button" className="btn outline" onClick={() => window.location.reload()}>{t("common.retry")}</button>}
      </div>
    </div>
  );
}

/** Rol yoxlaması: girişsiz istifadəçi girişə yönləndirilir və sonra geri qaytarılır (§9.3). */
function Guard({ roles, children, app }: { roles?: string[]; children: React.ReactNode; app: "web" | "admin" }) {
  const { session, loading, user } = useSession();
  const { path, search, navigate } = useRouter();
  const { t, enumLabel } = useI18n();
  const need = !!roles?.length;
  useEffect(() => {
    if (!need || loading) return;
    if (!session?.authenticated) navigate(`/login?next=${encodeURIComponent(path + search)}`, { replace: true });
  }, [need, loading, session?.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!need) return <>{children}</>;
  if (loading || !session) return <Loading rows={4} />;
  if (!session.authenticated) return <Loading rows={2} />;
  const role = user!.activeRole;
  if (roles!.includes("*") || roles!.includes(role) || role === "SUPER_ADMIN" && app === "admin") return <>{children}</>;
  const alternative = user!.roles.find((r) => roles!.includes(r));
  return (
    <div className="sys-page">
      <Lock size={44} aria-hidden />
      <span className="sys-code">403</span>
      <h1>{t("system.403.title")}</h1>
      <p>{t("system.403.roleText", { role: enumLabel("Role", role) })}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        {alternative && <SwitchRoleButton role={alternative} />}
        <button type="button" className="btn outline" onClick={() => { const h = homeFor(role); if (h === "ADMIN_APP") window.location.href = app === "admin" ? "/" : adminUrl(); else if (app === "admin") window.location.href = webUrl(h); else navigate(h); }}>
          {t("system.myPanel")}
        </button>
      </div>
    </div>
  );
}

function SwitchRoleButton({ role }: { role: string }) {
  const { t, enumLabel } = useI18n();
  const { refresh } = useSession();
  return (
    <button type="button" className="btn primary" onClick={async () => { const { post } = await import("@sp/api-client"); await post("/auth/select-mode", { role }); await refresh(); }}>
      {t("system.switchTo", { role: enumLabel("Role", role) })}
    </button>
  );
}

export function RoutedApp({ routes, shells, app }: { routes: RouteDef[]; shells: Record<string, ShellRender>; app: "web" | "admin" }) {
  const { path, locale } = useRouter();
  const { t } = useI18n();
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  const match = matchRoute(routes, path);
  useEffect(() => {
    const name = brand.data?.companyName ?? "besqardasServis.az";
    const title = match?.route.titleKey ? t(match.route.titleKey) : null;
    document.title = title ? `${title} — ${name}` : name;
  }, [path, locale, brand.data?.companyName]); // eslint-disable-line react-hooks/exhaustive-deps
  const shellName = match?.route.shell ?? (app === "admin" ? "admin" : "public");
  const shell = shells[shellName] ?? ((c: React.ReactNode) => c);
  const content = match ? (
    <Guard roles={match.route.roles} app={app}>
      <ParamsProvider params={match.params}>{match.route.render(match.params)}</ParamsProvider>
    </Guard>
  ) : (
    <SystemPage code="404" />
  );
  const fakeRoute = match?.route ?? { pattern: "*", render: () => null };
  return (
    <ErrorBoundary resetKey={path} fallback={() => (shells.public ?? ((c: React.ReactNode) => c))(<SystemPage code="500" />, fakeRoute)}>
      <CurrentRouteProvider value={match?.route ?? null}>{shell(content, fakeRoute)}</CurrentRouteProvider>
    </ErrorBoundary>
  );
}

export const defaultShells: Record<string, ShellRender> = {
  public: (c) => <PublicShell>{c}</PublicShell>,
  bare: (c) => <>{c}</>,
  courier: (c) => <CourierShell>{c}</CourierShell>,
};
