"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppLocale } from "@sp/i18n";
import { setApiLocale } from "@sp/api-client";

/**
 * Yüngül SPA router. URL-lər dil prefiksi ilə başlayır: /az/..., /ru/..., /en/... (PRD §62).
 * `path` həmişə prefikssiz saxlanılır.
 */

export interface RouteDef {
  pattern: string;
  render: (params: Record<string, string>) => React.ReactNode;
  shell?: string;
  roles?: string[];
  titleKey?: string;
}

interface RouterState {
  locale: AppLocale;
  path: string;
  search: string;
  query: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean; scroll?: boolean }) => void;
  setQuery: (patch: Record<string, string | number | null | undefined>, opts?: { replace?: boolean }) => void;
  setLocale: (l: AppLocale) => void;
  href: (to: string) => string;
}

const RouterCtx = createContext<RouterState | null>(null);
const ParamsCtx = createContext<Record<string, string>>({});

function parseLocation(): { locale: AppLocale; path: string; search: string } {
  if (typeof window === "undefined") return { locale: "az", path: "/", search: "" };
  const parts = window.location.pathname.split("/");
  const first = parts[1];
  const locale: AppLocale = first === "ru" || first === "en" || first === "az" ? first : "az";
  const path = (first === locale ? "/" + parts.slice(2).join("/") : window.location.pathname).replace(/\/+$/, "") || "/";
  return { locale, path, search: window.location.search };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState(() => ({ locale: "az" as AppLocale, path: "/", search: "" }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setLoc(parseLocation());
    sync();
    setReady(true);
    const first = window.location.pathname.split("/")[1];
    if (!["az", "ru", "en"].includes(first ?? "")) {
      // "/" ünvanı istifadəçinin seçdiyi və ya brauzerin dilinə yönləndirir
      let preferred: AppLocale = "az";
      try {
        const saved = localStorage.getItem("locale");
        const nav = navigator.language.slice(0, 2);
        preferred = (saved === "ru" || saved === "en" || saved === "az" ? saved : nav === "ru" || nav === "en" ? nav : "az") as AppLocale;
      } catch {
        /* localStorage əlçatan deyil */
      }
      window.history.replaceState({}, "", `/${preferred}${window.location.pathname === "/" ? "" : window.location.pathname}${window.location.search}`);
      sync();
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setApiLocale(loc.locale);
    document.documentElement.lang = loc.locale;
  }, [loc.locale]);

  const href = useCallback((to: string) => `/${loc.locale}${to === "/" ? "" : to}`, [loc.locale]);

  const navigate = useCallback(
    (to: string, opts: { replace?: boolean; scroll?: boolean } = {}) => {
      if (/^https?:\/\//.test(to)) {
        window.location.href = to;
        return;
      }
      const url = href(to);
      if (opts.replace) window.history.replaceState({}, "", url);
      else window.history.pushState({}, "", url);
      setLoc(parseLocation());
      if (opts.scroll !== false) window.scrollTo({ top: 0 });
    },
    [href],
  );

  const setQuery = useCallback(
    (patch: Record<string, string | number | null | undefined>, opts: { replace?: boolean } = { replace: true }) => {
      const sp = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") sp.delete(k);
        else sp.set(k, String(v));
      }
      const s = sp.toString();
      const url = `${window.location.pathname}${s ? `?${s}` : ""}`;
      if (opts.replace) window.history.replaceState({}, "", url);
      else window.history.pushState({}, "", url);
      setLoc(parseLocation());
    },
    [],
  );

  const setLocale = useCallback((l: AppLocale) => {
    try {
      localStorage.setItem("locale", l);
    } catch {
      /* əlçatan deyil */
    }
    const { path, search } = parseLocation();
    window.history.pushState({}, "", `/${l}${path === "/" ? "" : path}${search}`);
    setLoc(parseLocation());
  }, []);

  const value = useMemo<RouterState>(() => ({ ...loc, query: new URLSearchParams(loc.search), navigate, setQuery, setLocale, href }), [loc, navigate, setQuery, setLocale, href]);
  if (!ready) return null;
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterCtx);
  if (!ctx) throw new Error("RouterProvider yoxdur");
  return ctx;
}

export function useParams() {
  return useContext(ParamsCtx);
}

export function matchRoute(routes: RouteDef[], path: string): { route: RouteDef; params: Record<string, string> } | null {
  const segs = path.split("/").filter(Boolean);
  for (const route of routes) {
    const pSegs = route.pattern.split("/").filter(Boolean);
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < pSegs.length; i++) {
      const p = pSegs[i]!;
      if (p === "*") {
        params["*"] = segs.slice(i).join("/");
        i = pSegs.length;
        break;
      }
      const s = segs[i];
      if (s === undefined) { ok = false; break; }
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(s);
      else if (p !== s) { ok = false; break; }
    }
    if (ok && (pSegs.includes("*") || pSegs.length === segs.length)) return { route, params };
  }
  return null;
}

export function ParamsProvider({ params, children }: { params: Record<string, string>; children: React.ReactNode }) {
  return <ParamsCtx.Provider value={params}>{children}</ParamsCtx.Provider>;
}

export function Link({ to, children, className, onClick, ...rest }: { to: string; children: React.ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const { href, navigate } = useRouter();
  const external = /^https?:\/\//.test(to);
  return (
    <a
      href={external ? to : href(to)}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || external || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
