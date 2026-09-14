"use client";
import React, { createContext, useContext, useMemo } from "react";
import { post, useApi, useQueryClient } from "@sp/api-client";

/**
 * Sessiya konteksti. İcazələr `resurs:əməliyyat` formatında API-dən gəlir (PRD §8); frontend yalnız
 * UI-ı gizlədir/göstərir — əsas qoruma backend-dədir (§70). Plan imkanları `entitlements`-dən oxunur (§41.3).
 */

export interface SessionData {
  authenticated: boolean;
  user: null | {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    avatarTone?: string;
    avatarUrl?: string | null;
    locale: string;
    roles: string[];
    activeRole: string;
    segment: string | null;
    employmentType: string | null;
    branchId: string | null;
    branchName: unknown;
    companyId: string | null;
    companyName: string | null;
    companyRole: string | null;
    twoFactorEnabled: boolean;
  };
  permissions: string[];
  scopes: Record<string, string>;
  entitlements: Record<string, boolean | number | string>;
  plan: { code: string; name: string; tier: number } | null;
  cartCount: number;
  compareCount?: number;
  favoritesCount?: number;
  unreadNotifications: number;
  addresses: any[];
  redirectTo: string | null;
}

interface SessionCtx {
  session: SessionData | null;
  loading: boolean;
  user: SessionData["user"];
  role: string;
  can: (permission: string) => boolean;
  ent: (code: string) => boolean | number | string | undefined;
  entLimit: (code: string) => number | null;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export const INTERNAL_ROLES = ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN"];

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const q = useApi<SessionData>("/auth/session", { staleTime: 30_000 });
  const value = useMemo<SessionCtx>(() => {
    const s = q.data ?? null;
    return {
      session: s,
      loading: q.isLoading,
      user: s?.user ?? null,
      role: s?.user?.activeRole ?? "GUEST",
      can: (p) => !!s && (s.permissions.includes("*") || s.permissions.includes(p) || s.permissions.includes(`${p.split(":")[0]}:*`)),
      ent: (code) => s?.entitlements?.[code],
      entLimit: (code) => {
        const v = s?.entitlements?.[code];
        return v === undefined || v === "UNLIMITED" ? null : Number(v);
      },
      refresh: () => qc.invalidateQueries({ queryKey: ["api"] }),
      logout: async () => {
        await post("/auth/logout");
        qc.clear();
        await qc.invalidateQueries();
      },
    };
  }, [q.data, q.isLoading, qc]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SessionProvider yoxdur");
  return ctx;
}

/** `CanView`, `CanEdit` və s. kimi UI icazə komponenti (§70). */
export function Can({ permission, children, fallback = null }: { permission: string | string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = useSession();
  const list = Array.isArray(permission) ? permission : [permission];
  return <>{list.some(can) ? children : fallback}</>;
}
